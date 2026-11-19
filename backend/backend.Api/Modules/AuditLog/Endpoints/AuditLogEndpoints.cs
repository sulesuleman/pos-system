using backend.Api.Infrastructure.Persistence;
using backend.Api.Modules.Identity;
using Microsoft.EntityFrameworkCore;

namespace backend.Api.Modules.AuditLog.Endpoints;

// Owner, or a User whose Role grants the "view Audit Log" Permission (AD-16's
// PermissionIds.ViewAuditLog) - same UserAuthorization.HasPermissionAsync pattern
// BranchesEndpoints/StaffEndpoints already use, rather than the Owner-only check this started
// with before AD-16's Permission system existed.
public static class AuditLogEndpoints
{
    // Hard cap regardless of what the caller asks for, and the default when they ask for
    // nothing - GetAuditLog has no other limit on how much history it can return otherwise.
    private const int DefaultPageSize = 50;
    private const int MaxPageSize = 200;

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
        string? entityType,
        int? skip,
        int? take)
    {
        var user = await UserAuthorization.GetSignedInUserAsync(db, httpContext);
        if (user is null || !await UserAuthorization.HasPermissionAsync(db, user, PermissionIds.ViewAuditLog))
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

        // Clamped regardless of what the caller asks for - an unbounded or absurdly large `take`
        // would otherwise materialize this Mart's entire audit history in one response.
        var effectiveSkip = Math.Max(skip ?? 0, 0);
        var effectiveTake = Math.Clamp(take ?? DefaultPageSize, 1, MaxPageSize);

        var entries = await query
            .OrderByDescending(e => e.OccurredAtUtc)
            .Skip(effectiveSkip)
            .Take(effectiveTake)
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
}
