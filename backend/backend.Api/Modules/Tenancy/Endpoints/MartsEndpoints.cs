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
            var setupCode = OwnerSetupCodeGenerator.Generate();

            var owner = new Owner
            {
                Id = Guid.NewGuid(),
                MartId = mart.Id,
                StaffId = staffId,
                FirstName = request.OwnerFirstName.Trim(),
                LastName = request.OwnerLastName.Trim(),
                Email = request.OwnerEmail.Trim(),
                Contact = request.OwnerContact.Trim(),
                Cnic = NormalizeCnic(request.OwnerCnic),
                SetupCodeHash = setupCode.Hash,
                SetupCodeExpiresAtUtc = setupCode.ExpiresAtUtc,
                CreatedAtUtc = DateTime.UtcNow,
            };
            db.Owners.Add(owner);

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
