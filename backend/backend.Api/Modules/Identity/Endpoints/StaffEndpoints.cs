using System.Text.RegularExpressions;
using backend.Api.Infrastructure.Persistence;
using backend.Api.Modules.Identity.Domain;
using Microsoft.EntityFrameworkCore;

namespace backend.Api.Modules.Identity.Endpoints;

// The Owner's "Staff" screen: create a Manager account and list this Mart's staff. No Branch
// assignment yet (Branches/Story 1.6 don't exist) and no custom-Role/Permission CRUD (rest of
// Story 2.1) - this is the minimal slice that unblocks Manager creation/activation/login.
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
        var currentUserId = await RequireOwnerAsync(db, httpContext);
        if (currentUserId is null)
        {
            return Results.Unauthorized();
        }

        var martIdValue = httpContext.Session.GetString("MartId");
        var martId = Guid.Parse(martIdValue!);

        var errors = Validate(request);
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

        var staffId = await StaffIdGenerator.GenerateNextAsync(db, martId);
        var setupCode = SetupCodeGenerator.Generate();

        var manager = new User
        {
            Id = Guid.NewGuid(),
            MartId = martId,
            StaffId = staffId,
            RoleId = RoleIds.Manager,
            FirstName = request.FirstName.Trim(),
            LastName = request.LastName.Trim(),
            Email = email,
            Contact = request.Contact.Trim(),
            Cnic = NormalizeCnic(request.Cnic),
            SetupCodeHash = setupCode.Hash,
            SetupCodeExpiresAtUtc = setupCode.ExpiresAtUtc,
            CreatedByUserId = currentUserId,
            CreatedAtUtc = DateTime.UtcNow,
        };
        db.Users.Add(manager);
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
        var currentUserId = await RequireOwnerAsync(db, httpContext);
        if (currentUserId is null)
        {
            return Results.Unauthorized();
        }

        var staff = await db.Users
            .Join(db.Roles.IgnoreQueryFilters(), u => u.RoleId, r => r.Id, (u, r) => new { u, r.Name })
            .Select(x => new
            {
                id = x.u.Id,
                staffId = x.u.StaffId.ToString(),
                firstName = x.u.FirstName,
                lastName = x.u.LastName,
                email = x.u.Email,
                role = x.Name,
                active = x.u.PasswordHash != null || x.u.PinHash != null,
            })
            .ToListAsync();

        return Results.Ok(staff);
    }

    // Only a signed-in Owner may create or list staff - "manage staff" as a grantable Permission
    // is the rest of Story 2.1, not built yet, so this is Owner-only for now, not Permission-based.
    private static async Task<Guid?> RequireOwnerAsync(AppDbContext db, HttpContext httpContext)
    {
        var userIdValue = httpContext.Session.GetString("UserId");
        if (userIdValue is null)
        {
            return null;
        }

        var userId = Guid.Parse(userIdValue);
        var user = await db.Users.IgnoreQueryFilters().SingleOrDefaultAsync(u => u.Id == userId);

        return user is not null && user.RoleId == RoleIds.Owner ? userId : null;
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

    public record CreateStaffRequest(string FirstName, string LastName, string Email, string Contact, string Cnic);
}
