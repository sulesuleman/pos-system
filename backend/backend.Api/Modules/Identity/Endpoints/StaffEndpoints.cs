using System.Text.RegularExpressions;
using backend.Api.Infrastructure.Persistence;
using backend.Api.Modules.AuditLog;
using backend.Api.Modules.Identity.Domain;
using Microsoft.EntityFrameworkCore;

namespace backend.Api.Modules.Identity.Endpoints;

// The Owner's "Staff" screen: create a Manager account and list this Mart's staff. Creating
// staff requires the "manage staff and Roles" Permission (Owner always passes via the identity
// bypass - Owner holds no RolePermissions rows). No custom-Role/Permission CRUD yet (rest of
// Story 2.1) - this is the AD-16 slice that adds Branch assignment on top of AD-15's baseline.
public static class StaffEndpoints
{
    private static readonly Regex EmailPattern = new(@"^[^\s@]+@[^\s@]+\.[^\s@]+$");
    private static readonly Regex ContactPattern = new(@"^\+?\d{7,15}$");
    private static readonly Regex CnicPattern = new(@"^\d{5}-\d{7}-\d{1}$");

    public static void MapStaffEndpoints(this IEndpointRouteBuilder group)
    {
        group.MapPost("/staff", CreateStaff);
        group.MapGet("/staff", GetStaff);
    }

    private static async Task<IResult> CreateStaff(CreateStaffRequest request, AppDbContext db, HttpContext httpContext)
    {
        var currentUser = await RequireCreatorWithStaffPermissionAsync(db, httpContext);
        if (currentUser is null)
        {
            return Results.Unauthorized();
        }

        var martId = currentUser.MartId;

        var errors = Validate(request);
        if (request.RoleId == RoleIds.Owner)
        {
            errors["roleId"] = "Select a Role.";
        }
        else if (!await db.Roles.AnyAsync(r => r.Id == request.RoleId))
        {
            // The Role query filter already limits this to the global built-in Roles plus this
            // Mart's own custom ones - no need to re-check MartId by hand.
            errors["roleId"] = "Select a Role.";
        }
        if (errors.Count > 0)
        {
            return Results.BadRequest(new { errors });
        }

        var email = request.Email.Trim();
        var emailInUse = await db.Users.AnyAsync(u => u.MartId == martId && u.Email == email);
        if (emailInUse)
        {
            return Results.BadRequest(new
            {
                errors = new Dictionary<string, string>
                {
                    ["email"] = "A staff member with this email already exists in this Mart.",
                },
            });
        }

        // Branch-scoped creator (has their own BranchId): new staff inherits it, no choice
        // offered. Owner (BranchId == null): must supply a valid, active BranchId in this Mart -
        // the global query filter already scopes db.Branches to the current Mart.
        Guid branchId;
        if (currentUser.BranchId is not null)
        {
            branchId = currentUser.BranchId.Value;
        }
        else
        {
            if (request.BranchId is null)
            {
                return Results.BadRequest(new
                {
                    errors = new Dictionary<string, string> { ["branchId"] = "Select a Branch." },
                });
            }

            var branch = await db.Branches.SingleOrDefaultAsync(b => b.Id == request.BranchId && b.IsActive);
            if (branch is null)
            {
                return Results.BadRequest(new
                {
                    errors = new Dictionary<string, string> { ["branchId"] = "Select a valid, active Branch." },
                });
            }

            branchId = branch.Id;
        }

        var staffId = await StaffIdGenerator.GenerateNextAsync(db, martId);
        var setupCode = SetupCodeGenerator.Generate();

        var manager = new User
        {
            Id = Guid.NewGuid(),
            MartId = martId,
            StaffId = staffId,
            RoleId = request.RoleId,
            BranchId = branchId,
            FirstName = request.FirstName.Trim(),
            LastName = request.LastName.Trim(),
            Email = email,
            Contact = request.Contact.Trim(),
            Cnic = NormalizeCnic(request.Cnic),
            SetupCodeHash = setupCode.Hash,
            SetupCodeExpiresAtUtc = setupCode.ExpiresAtUtc,
            CreatedByUserId = currentUser.Id,
            CreatedAtUtc = DateTime.UtcNow,
        };
        db.Users.Add(manager);

        AuditLogger.Record(
            db,
            martId,
            currentUser.Id,
            entityType: "User",
            entityId: manager.Id,
            action: "Created",
            oldValues: null,
            newValues: new { manager.FirstName, manager.LastName, manager.Email, manager.BranchId, Role = "Manager" },
            httpContext);

        await db.SaveChangesAsync();

        return Results.Json(
            new
            {
                userId = manager.Id,
                staffId = manager.StaffId.ToString(),
                setupCode = setupCode.PlaintextCode,
            },
            statusCode: StatusCodes.Status201Created);
    }

    private static async Task<IResult> GetStaff(AppDbContext db, HttpContext httpContext)
    {
        var currentUser = await RequireCreatorWithStaffPermissionAsync(db, httpContext);
        if (currentUser is null)
        {
            return Results.Unauthorized();
        }

        // No IgnoreQueryFilters() anywhere in this composed query: calling it on one side of a
        // Join disables EF Core's tenant filter for the WHOLE query, not just that side -
        // confirmed root cause of a real cross-Mart leak here, fixed 2026-11-18 (see git history).
        var staff = await db.Users
            .Join(db.Roles, u => u.RoleId, r => r.Id, (u, r) => new { u, RoleName = r.Name })
            .GroupJoin(db.Branches, x => x.u.BranchId, b => (Guid?)b.Id, (x, branches) => new { x.u, x.RoleName, branches })
            .SelectMany(x => x.branches.DefaultIfEmpty(), (x, branch) => new
            {
                id = x.u.Id,
                staffId = x.u.StaffId.ToString(),
                firstName = x.u.FirstName,
                lastName = x.u.LastName,
                email = x.u.Email,
                role = x.RoleName,
                active = x.u.PasswordHash != null || x.u.PinHash != null,
                branchId = x.u.BranchId,
                branchName = branch != null ? branch.Name : null,
            })
            .ToListAsync();

        return Results.Ok(staff);
    }

    // Owner passes via the identity bypass (holds no RolePermissions rows). Anyone else needs
    // "manage staff and Roles" via their Role's RolePermissions.
    private static async Task<User?> RequireCreatorWithStaffPermissionAsync(AppDbContext db, HttpContext httpContext)
    {
        var user = await UserAuthorization.GetSignedInUserAsync(db, httpContext);
        if (user is null)
        {
            return null;
        }

        var hasStaffPermission = await UserAuthorization.HasPermissionAsync(db, user, PermissionIds.ManageStaffAndRoles);
        return hasStaffPermission ? user : null;
    }

    private static Dictionary<string, string> Validate(CreateStaffRequest request)
    {
        var errors = new Dictionary<string, string>();

        if (string.IsNullOrWhiteSpace(request.FirstName))
        {
            errors["firstName"] = "This field is required.";
        }

        if (string.IsNullOrWhiteSpace(request.LastName))
        {
            errors["lastName"] = "This field is required.";
        }

        if (string.IsNullOrWhiteSpace(request.Email))
        {
            errors["email"] = "This field is required.";
        }
        else if (!EmailPattern.IsMatch(request.Email.Trim()))
        {
            errors["email"] = "Enter a valid email address.";
        }

        if (string.IsNullOrWhiteSpace(request.Contact))
        {
            errors["contact"] = "This field is required.";
        }
        else if (!ContactPattern.IsMatch(request.Contact.Trim()))
        {
            errors["contact"] = "Enter a valid phone number.";
        }

        if (string.IsNullOrWhiteSpace(request.Cnic))
        {
            errors["cnic"] = "This field is required.";
        }
        else if (!CnicPattern.IsMatch(request.Cnic.Trim()))
        {
            errors["cnic"] = "Enter a complete CNIC in the form 12345-1234567-1.";
        }

        return errors;
    }

    private static string NormalizeCnic(string cnic) => cnic.Replace("-", string.Empty).Trim();

    public record CreateStaffRequest(string FirstName, string LastName, string Email, string Contact, string Cnic, Guid RoleId, Guid? BranchId = null);
}
