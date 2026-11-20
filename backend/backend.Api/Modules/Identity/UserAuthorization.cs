using backend.Api.Infrastructure.Persistence;
using backend.Api.Modules.Identity.Domain;
using Microsoft.EntityFrameworkCore;

namespace backend.Api.Modules.Identity;

// Shared Owner-bypass + RolePermissions check, used wherever an endpoint needs "Owner, or a User
// whose Role grants a specific Permission" (e.g. StaffEndpoints, BranchesEndpoints).
public static class UserAuthorization
{
    public static async Task<User?> GetSignedInUserAsync(AppDbContext db, HttpContext httpContext)
    {
        var userIdValue = httpContext.Session.GetString("UserId");
        if (userIdValue is null || !Guid.TryParse(userIdValue, out var userId))
        {
            return null;
        }

        return await db.Users.IgnoreQueryFilters().SingleOrDefaultAsync(u => u.Id == userId);
    }

    // Owner always passes (holds no RolePermissions rows - the identity bypass). Anyone else
    // needs a RolePermissions row for the given Permission.
    public static async Task<bool> HasPermissionAsync(AppDbContext db, User user, Guid permissionId)
    {
        if (user.RoleId == RoleIds.Owner)
        {
            return true;
        }

        return await db.RolePermissions.AnyAsync(rp => rp.RoleId == user.RoleId && rp.PermissionId == permissionId);
    }

    // Story 2.5 (FR-1): "a Role is lower when its Permissions are a strict subset of the
    // resetter's" - works for any custom Role too, not just the 3 built-ins, since it compares
    // actual RolePermissions sets rather than hardcoding Role names. The Owner can never be the
    // target (nobody disables/resets the Owner); the Owner acting always outranks everyone else;
    // two Users on the exact same Role never outrank each other.
    public static async Task<bool> IsStrictlyHigherRoleAsync(AppDbContext db, User actingUser, User targetUser)
    {
        if (targetUser.RoleId == RoleIds.Owner)
        {
            return false;
        }

        if (actingUser.RoleId == RoleIds.Owner)
        {
            return true;
        }

        if (actingUser.RoleId == targetUser.RoleId)
        {
            return false;
        }

        var actingPermissionIds = await db.RolePermissions
            .Where(rp => rp.RoleId == actingUser.RoleId)
            .Select(rp => rp.PermissionId)
            .ToListAsync();
        var targetPermissionIds = await db.RolePermissions
            .Where(rp => rp.RoleId == targetUser.RoleId)
            .Select(rp => rp.PermissionId)
            .ToListAsync();

        return targetPermissionIds.ToHashSet().IsProperSubsetOf(actingPermissionIds.ToHashSet());
    }
}
