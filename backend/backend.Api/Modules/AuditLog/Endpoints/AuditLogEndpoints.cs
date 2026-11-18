using backend.Api.Infrastructure.Persistence;
using backend.Api.Modules.Identity;
using Microsoft.EntityFrameworkCore;

namespace backend.Api.Modules.AuditLog.Endpoints;

// Owner-only for now - "view Audit Log" as a grantable Permission is the AD-16 Permissions/
// RolePermissions slice, not built yet. Same pattern as StaffEndpoints.RequireOwnerAsync.
public static class AuditLogEndpoints
{
    public static void MapAuditLogEndpoints(this IEndpointRouteBuilder group)
    {
        group.MapGet("/audit-log", GetAuditLog);
    }

    private static async Task<IResult> GetAuditLog(
        AppDbContext db,
        HttpContext httpContext,
        DateTime? from,
        DateTime? to,
        Guid? userId,
        string? entityType)
    {
        var currentUserId = await RequireOwnerAsync(db, httpContext);
        if (currentUserId is null)
        {
            return Results.Unauthorized();
        }

        var query = db.AuditLogEntries.AsQueryable();

        if (from is not null)
        {
            query = query.Where(e => e.OccurredAtUtc >= from);
        }

        if (to is not null)
        {
            query = query.Where(e => e.OccurredAtUtc <= to);
        }

        if (userId is not null)
        {
            query = query.Where(e => e.UserId == userId);
        }

        if (!string.IsNullOrWhiteSpace(entityType))
        {
            query = query.Where(e => e.EntityType == entityType);
        }

        var entries = await query
            .OrderByDescending(e => e.OccurredAtUtc)
            // No IgnoreQueryFilters() here - Users is already correctly scoped to the same Mart,
            // and calling it on one side of a Join disables EF Core's tenant filter for the
            // WHOLE composed query, not just that side (confirmed root cause of a real
            // cross-Mart leak in StaffEndpoints.GetStaff, fixed alongside this).
            .Join(db.Users, e => e.UserId, u => u.Id, (e, u) => new
            {
                e.Id,
                e.EntityType,
                e.EntityId,
                e.Action,
                e.OldValuesJson,
                e.NewValuesJson,
                e.OccurredAtUtc,
                userName = u.FirstName + " " + u.LastName,
            })
            .ToListAsync();

        return Results.Ok(entries);
    }

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
}
