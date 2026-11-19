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
}
