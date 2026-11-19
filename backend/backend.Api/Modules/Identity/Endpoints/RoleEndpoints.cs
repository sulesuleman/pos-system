using backend.Api.Infrastructure.Persistence;
using backend.Api.Modules.AuditLog;
using backend.Api.Modules.Identity.Domain;
using Microsoft.EntityFrameworkCore;

namespace backend.Api.Modules.Identity.Endpoints;

// Story 2.1 (FR-1, AD-5): the Owner builds Roles from the fixed 14-Permission list. The 3
// built-in Roles (Owner/Manager/Cashier, Role.MartId == null) are shared globally across every
// Mart, so they can never be mutated in place - editing one instead forks a new Mart-scoped copy
// (see UpdateRole) and re-points this Mart's existing Users onto it, leaving every other Mart's
// copy of the built-in Role untouched. The Owner Role itself can never be edited at all (its
// access is the identity bypass in UserAuthorization, never a RolePermissions row).
public static class RoleEndpoints
{
    public static void MapRoleEndpoints(this IEndpointRouteBuilder group)
    {
        group.MapGet("/permissions", GetPermissions);
        group.MapGet("/roles", GetRoles);
        group.MapPost("/roles", CreateRole);
        group.MapPut("/roles/{id:guid}", UpdateRole);
    }

    private static async Task<IResult> GetPermissions(AppDbContext db, HttpContext httpContext)
    {
        var user = await RequireStaffAndRolesPermissionAsync(db, httpContext);
        if (user is null)
        {
            return Results.Unauthorized();
        }

        var permissions = await db.Permissions.OrderBy(p => p.Name).ToListAsync();
        return Results.Ok(permissions.Select(p => new { id = p.Id, name = p.Name }));
    }

    private static async Task<IResult> GetRoles(AppDbContext db, HttpContext httpContext)
    {
        var user = await RequireStaffAndRolesPermissionAsync(db, httpContext);
        if (user is null)
        {
            return Results.Unauthorized();
        }

        // Role's own query filter already restricts this to the global built-in Roles plus this
        // Mart's own custom Roles.
        var roles = await db.Roles.OrderBy(r => r.Name).ToListAsync();
        var permissionsByRole = await db.RolePermissions
            .Where(rp => roles.Select(r => r.Id).Contains(rp.RoleId))
            .ToListAsync();

        return Results.Ok(roles.Select(r => ToResponse(r, permissionsByRole)));
    }

    private static async Task<IResult> CreateRole(RoleRequest request, AppDbContext db, HttpContext httpContext)
    {
        var user = await RequireStaffAndRolesPermissionAsync(db, httpContext);
        if (user is null)
        {
            return Results.Unauthorized();
        }

        var errors = await ValidateAsync(db, user.MartId, request, roleIdBeingEdited: null);
        if (errors.Count > 0)
        {
            return Results.BadRequest(new { errors });
        }

        var role = new Role
        {
            Id = Guid.NewGuid(),
            MartId = user.MartId,
            Name = request.Name.Trim(),
            IsSystemDefault = false,
            CreatedAtUtc = DateTime.UtcNow,
        };
        db.Roles.Add(role);
        AddPermissionRows(db, role.Id, request.PermissionIds);

        AuditLogger.Record(
            db,
            user.MartId,
            user.Id,
            entityType: "Role",
            entityId: role.Id,
            action: "Created",
            oldValues: null,
            newValues: new { role.Name, request.PermissionIds },
            httpContext);

        await db.SaveChangesAsync();

        var permissions = await db.RolePermissions.Where(rp => rp.RoleId == role.Id).ToListAsync();
        return Results.Json(ToResponse(role, permissions), statusCode: StatusCodes.Status201Created);
    }

    private static async Task<IResult> UpdateRole(Guid id, RoleRequest request, AppDbContext db, HttpContext httpContext)
    {
        var user = await RequireStaffAndRolesPermissionAsync(db, httpContext);
        if (user is null)
        {
            return Results.Unauthorized();
        }

        if (id == RoleIds.Owner)
        {
            return Results.BadRequest(new { error = "The Owner Role cannot be edited." });
        }

        // The query filter already limits this to the global built-in Roles plus this Mart's own.
        var role = await db.Roles.SingleOrDefaultAsync(r => r.Id == id);
        if (role is null)
        {
            return Results.NotFound();
        }

        var errors = await ValidateAsync(db, user.MartId, request, roleIdBeingEdited: role.MartId is null ? null : role.Id);
        if (errors.Count > 0)
        {
            return Results.BadRequest(new { errors });
        }

        if (role.MartId is null)
        {
            // Built-in Role (Manager/Cashier): fork into a new Mart-scoped Role instead of
            // mutating the globally-shared row, then move this Mart's own Users (and nothing
            // else's) off the built-in Role onto the fork - otherwise they'd keep the old
            // permission set despite the "edit" appearing to have succeeded.
            var fork = new Role
            {
                Id = Guid.NewGuid(),
                MartId = user.MartId,
                Name = request.Name.Trim(),
                IsSystemDefault = false,
                CreatedAtUtc = DateTime.UtcNow,
            };
            db.Roles.Add(fork);
            AddPermissionRows(db, fork.Id, request.PermissionIds);

            var affectedUsers = await db.Users.Where(u => u.RoleId == role.Id).ToListAsync();
            foreach (var affectedUser in affectedUsers)
            {
                affectedUser.RoleId = fork.Id;
            }

            AuditLogger.Record(
                db,
                user.MartId,
                user.Id,
                entityType: "Role",
                entityId: fork.Id,
                action: "Created",
                oldValues: null,
                newValues: new { fork.Name, request.PermissionIds, ForkedFromRoleId = role.Id },
                httpContext);

            await db.SaveChangesAsync();

            var forkPermissions = await db.RolePermissions.Where(rp => rp.RoleId == fork.Id).ToListAsync();
            return Results.Ok(ToResponse(fork, forkPermissions));
        }

        var existingPermissionIds = await db.RolePermissions
            .Where(rp => rp.RoleId == role.Id)
            .Select(rp => rp.PermissionId)
            .ToListAsync();
        var oldValues = new { role.Name, PermissionIds = existingPermissionIds };

        role.Name = request.Name.Trim();
        db.RolePermissions.RemoveRange(db.RolePermissions.Where(rp => rp.RoleId == role.Id));
        AddPermissionRows(db, role.Id, request.PermissionIds);

        var newValues = new { role.Name, request.PermissionIds };
        if (!AuditLogger.ValuesEqual(oldValues, newValues))
        {
            AuditLogger.Record(
                db,
                user.MartId,
                user.Id,
                entityType: "Role",
                entityId: role.Id,
                action: "Updated",
                oldValues: oldValues,
                newValues: newValues,
                httpContext);
        }

        await db.SaveChangesAsync();

        var permissions = await db.RolePermissions.Where(rp => rp.RoleId == role.Id).ToListAsync();
        return Results.Ok(ToResponse(role, permissions));
    }

    private static void AddPermissionRows(AppDbContext db, Guid roleId, IReadOnlyCollection<Guid> permissionIds)
    {
        foreach (var permissionId in permissionIds.Distinct())
        {
            db.RolePermissions.Add(new RolePermission { RoleId = roleId, PermissionId = permissionId });
        }
    }

    private static async Task<Dictionary<string, string>> ValidateAsync(
        AppDbContext db,
        Guid martId,
        RoleRequest request,
        Guid? roleIdBeingEdited)
    {
        var errors = new Dictionary<string, string>();

        var name = request.Name?.Trim() ?? string.Empty;
        if (name.Length == 0)
        {
            errors["name"] = "This field is required.";
        }
        else
        {
            // Mirrors the DB's own filtered unique index (MartId, Name) WHERE MartId IS NOT NULL -
            // checked here too so the Owner gets a specific field message instead of a raw 500 on
            // the rare race, and so CreateRole/the fork path in UpdateRole can show it up front.
            var nameInUse = await db.Roles
                .Where(r => r.MartId == martId && r.Name == name)
                .Where(r => roleIdBeingEdited == null || r.Id != roleIdBeingEdited)
                .AnyAsync();
            if (nameInUse)
            {
                errors["name"] = "A Role with this name already exists in this Mart.";
            }
        }

        if (request.PermissionIds is null || request.PermissionIds.Count == 0)
        {
            errors["permissionIds"] = "Select at least one Permission.";
        }
        else
        {
            var validPermissionIds = await db.Permissions.Select(p => p.Id).ToListAsync();
            if (request.PermissionIds.Any(id => !validPermissionIds.Contains(id)))
            {
                errors["permissionIds"] = "One or more Permissions aren't recognized.";
            }
        }

        return errors;
    }

    // Owner always passes (holds no RolePermissions rows - the identity bypass). Anyone else
    // needs "manage staff and Roles" via their own Role.
    private static async Task<User?> RequireStaffAndRolesPermissionAsync(AppDbContext db, HttpContext httpContext)
    {
        var user = await UserAuthorization.GetSignedInUserAsync(db, httpContext);
        if (user is null)
        {
            return null;
        }

        var hasPermission = await UserAuthorization.HasPermissionAsync(db, user, PermissionIds.ManageStaffAndRoles);
        return hasPermission ? user : null;
    }

    private static object ToResponse(Role role, IReadOnlyCollection<RolePermission> permissions) => new
    {
        id = role.Id,
        name = role.Name,
        isSystemDefault = role.IsSystemDefault,
        permissionIds = permissions.Where(rp => rp.RoleId == role.Id).Select(rp => rp.PermissionId).ToList(),
    };

    public record RoleRequest(string Name, List<Guid> PermissionIds);
}
