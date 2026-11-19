using System.Text.RegularExpressions;
using backend.Api.Infrastructure.Persistence;
using backend.Api.Modules.Identity;
using backend.Api.Modules.Identity.Domain;
using backend.Api.Modules.Tenancy.Domain;
using Microsoft.EntityFrameworkCore;

namespace backend.Api.Modules.Tenancy.Endpoints;
    public static class MartsEndpoints
    {

        // Same shapes the frontend validates with - backend validates independently, never trusts the client.
        private static readonly Regex EmailPattern = new(@"^[^\s@]+@[^\s@]+\.[^\s@]+$");
        private static readonly Regex ContactPattern = new(@"^\+?\d{7,15}$");
        private static readonly Regex CnicPattern = new(@"^\d{5}-\d{7}-\d{1}$");

        public static void MapMartsEndpoints(this IEndpointRouteBuilder group)
        {
            group.MapGet("/marts", GetMarts);
            group.MapPost("/marts", CreateMart);
            group.MapPost("/marts/{id:guid}/suspend", SuspendMart);
            group.MapPost("/marts/{id:guid}/reactivate", ReactivateMart);
        }

        private static async Task<IResult> GetMarts(AppDbContext db, HttpContext httpContext)
        {
            var superAdminIdValue = httpContext.Session.GetString("SuperAdminId");

            if (superAdminIdValue is null) {
                return Results.Unauthorized();
            }

            var marts = await db.Marts
                .Select(m => new { m.Id, m.Name, m.Code, Status = m.Status.ToString().ToLower() })
                .ToListAsync();

            return Results.Ok(marts);
        }

        private static async Task<IResult> CreateMart(CreateMartRequest request, AppDbContext db, HttpContext httpContext)
        {
            var superAdminIdValue = httpContext.Session.GetString("SuperAdminId");

            if (superAdminIdValue is null)
            {
                return Results.Unauthorized();
            }

            var errors = Validate(request);

            if (errors.Count > 0)
            {
                return Results.BadRequest(new { errors });
            }

            var martName = request.MartName.Trim();

            var nameExists = await db.Marts.AnyAsync(m => m.Name == martName);

            if (nameExists)
            {
                return Results.BadRequest(new
                {
                    errors = new Dictionary<string, string>
                    {
                        ["martName"] = "A Mart with this name already exists.",
                    },
                });
            }

            var martCode = await MartCodeGenerator.GenerateUniqueAsync(db);

            var mart = new Mart
            {
                Id = Guid.NewGuid(),
                Name = martName,
                Code = martCode,
                CreatedAtUtc = DateTime.UtcNow,
            };
            db.Marts.Add(mart);

            var staffId = await StaffIdGenerator.GenerateNextAsync(db, mart.Id);
            var setupCode = SetupCodeGenerator.Generate();

            var owner = new User
            {
                Id = Guid.NewGuid(),
                MartId = mart.Id,
                StaffId = staffId,
                RoleId = RoleIds.Owner,
                FirstName = request.OwnerFirstName.Trim(),
                LastName = request.OwnerLastName.Trim(),
                Email = request.OwnerEmail.Trim(),
                Contact = request.OwnerContact.Trim(),
                Cnic = NormalizeCnic(request.OwnerCnic),
                SetupCodeHash = setupCode.Hash,
                SetupCodeExpiresAtUtc = setupCode.ExpiresAtUtc,
                CreatedAtUtc = DateTime.UtcNow,
            };
            db.Users.Add(owner);

            db.PlatformAuditLogEntries.Add(new PlatformAuditLogEntry
            {
                Id = Guid.NewGuid(),
                OccurredAtUtc = DateTime.UtcNow,
                Action = "MartCreated",
                SuperAdminId = Guid.Parse(superAdminIdValue),
                IpAddress = httpContext.Connection.RemoteIpAddress?.ToString(),
                UserAgent = httpContext.Request.Headers.UserAgent.ToString(),
            });

            // One SaveChangesAsync - Mart, Owner and the audit entry commit together or not at all.
            await db.SaveChangesAsync();

            return Results.Json(
                new
                {
                    martId = mart.Id,
                    martCode = mart.Code,
                    ownerStaffId = owner.StaffId.ToString(),
                    setupCode = setupCode.PlaintextCode,
                },
                statusCode: StatusCodes.Status201Created);
        }

        // Story 1.7 (FR-25). Suspend/reactivate are Super Admin-only, same session check as
        // GetMarts/CreateMart. The actual request-refusal for the suspended Mart's own Users
        // happens elsewhere (AuthEndpoints for a fresh sign-in/activate, and Program.cs's
        // suspension-check middleware for every already-signed-in request) - this endpoint only
        // flips the Mart's own status and records it.
        private static async Task<IResult> SuspendMart(Guid id, AppDbContext db, HttpContext httpContext)
        {
            var superAdminIdValue = httpContext.Session.GetString("SuperAdminId");
            if (superAdminIdValue is null)
            {
                return Results.Unauthorized();
            }

            var mart = await db.Marts.SingleOrDefaultAsync(m => m.Id == id);
            if (mart is null)
            {
                return Results.NotFound();
            }

            if (mart.Status == MartStatus.Suspended)
            {
                return Results.BadRequest(new { error = "Mart is already suspended." });
            }

            mart.Status = MartStatus.Suspended;

            db.PlatformAuditLogEntries.Add(new PlatformAuditLogEntry
            {
                Id = Guid.NewGuid(),
                OccurredAtUtc = DateTime.UtcNow,
                Action = "MartSuspended",
                SuperAdminId = Guid.Parse(superAdminIdValue),
                AttemptedMartCode = mart.Code,
                IpAddress = httpContext.Connection.RemoteIpAddress?.ToString(),
                UserAgent = httpContext.Request.Headers.UserAgent.ToString(),
            });

            await db.SaveChangesAsync();

            return Results.Ok(new { id = mart.Id, name = mart.Name, code = mart.Code, status = mart.Status.ToString().ToLower() });
        }

        private static async Task<IResult> ReactivateMart(Guid id, AppDbContext db, HttpContext httpContext)
        {
            var superAdminIdValue = httpContext.Session.GetString("SuperAdminId");
            if (superAdminIdValue is null)
            {
                return Results.Unauthorized();
            }

            var mart = await db.Marts.SingleOrDefaultAsync(m => m.Id == id);
            if (mart is null)
            {
                return Results.NotFound();
            }

            if (mart.Status == MartStatus.Active)
            {
                return Results.BadRequest(new { error = "Mart is already active." });
            }

            mart.Status = MartStatus.Active;

            db.PlatformAuditLogEntries.Add(new PlatformAuditLogEntry
            {
                Id = Guid.NewGuid(),
                OccurredAtUtc = DateTime.UtcNow,
                Action = "MartReactivated",
                SuperAdminId = Guid.Parse(superAdminIdValue),
                AttemptedMartCode = mart.Code,
                IpAddress = httpContext.Connection.RemoteIpAddress?.ToString(),
                UserAgent = httpContext.Request.Headers.UserAgent.ToString(),
            });

            await db.SaveChangesAsync();

            return Results.Ok(new { id = mart.Id, name = mart.Name, code = mart.Code, status = mart.Status.ToString().ToLower() });
        }

        private static Dictionary<string, string> Validate(CreateMartRequest request)
        {
            var errors = new Dictionary<string, string>();

            if (string.IsNullOrWhiteSpace(request.MartName))
            {
                errors["martName"] = "This field is required.";
            }

            if (string.IsNullOrWhiteSpace(request.OwnerFirstName))
            {
                errors["ownerFirstName"] = "This field is required.";
            }

            if (string.IsNullOrWhiteSpace(request.OwnerLastName))
            {
                errors["ownerLastName"] = "This field is required.";
            }

            if (string.IsNullOrWhiteSpace(request.OwnerEmail))
            {
                errors["ownerEmail"] = "This field is required.";
            }
            else if (!EmailPattern.IsMatch(request.OwnerEmail.Trim()))
            {
                errors["ownerEmail"] = "Enter a valid email address.";
            }

            if (string.IsNullOrWhiteSpace(request.OwnerContact))
            {
                errors["ownerContact"] = "This field is required.";
            }
            else if (!ContactPattern.IsMatch(request.OwnerContact.Trim()))
            {
                errors["ownerContact"] = "Enter a valid phone number.";
            }

            if (string.IsNullOrWhiteSpace(request.OwnerCnic))
            {
                errors["ownerCnic"] = "This field is required.";
            }
            else if (!CnicPattern.IsMatch(request.OwnerCnic.Trim()))
            {
                errors["ownerCnic"] = "Enter a complete CNIC in the form 12345-1234567-1.";
            }

            return errors;
        }

        // Stores CNIC digits-only; the dashed canonical shape is re-applied for display only.
        private static string NormalizeCnic(string cnic) => cnic.Replace("-", string.Empty).Trim();

        public record CreateMartRequest(
            string MartName,
            string OwnerFirstName,
            string OwnerLastName,
            string OwnerEmail,
            string OwnerContact,
            string OwnerCnic);
    }
