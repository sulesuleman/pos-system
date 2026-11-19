using backend.Api.Infrastructure.Persistence;
using backend.Api.Modules.AuditLog;
using backend.Api.Modules.Identity;
using Microsoft.EntityFrameworkCore;

namespace backend.Api.Modules.Tenancy.Endpoints;

// Story 1.6 (FR-26/FR-19), Owner-only. Mart-wide settings, not Branch-scoped - no "manage
// Branches and devices" exception here, unlike BranchesEndpoints.UpdateBranch.
public static class MartSettingsEndpoints
{
    public static void MapMartSettingsEndpoints(this IEndpointRouteBuilder group)
    {
        group.MapGet("/mart-settings", GetMartSettings);
        group.MapPut("/mart-settings", UpdateMartSettings);
    }

    private static async Task<IResult> GetMartSettings(AppDbContext db, HttpContext httpContext)
    {
        var user = await UserAuthorization.GetSignedInUserAsync(db, httpContext);
        if (user is null || user.RoleId != RoleIds.Owner)
        {
            return Results.Unauthorized();
        }

        var mart = await db.Marts.SingleAsync(m => m.Id == user.MartId);

        return Results.Ok(new
        {
            currency = mart.Currency,
            defaultTimeZone = mart.DefaultTimeZone,
            longPendingReturnMinutes = mart.LongPendingReturnMinutes,
        });
    }

    private static async Task<IResult> UpdateMartSettings(UpdateMartSettingsRequest request, AppDbContext db, HttpContext httpContext)
    {
        var user = await UserAuthorization.GetSignedInUserAsync(db, httpContext);
        if (user is null || user.RoleId != RoleIds.Owner)
        {
            return Results.Unauthorized();
        }

        var errors = new Dictionary<string, string>();
        if (string.IsNullOrWhiteSpace(request.Currency))
        {
            errors["currency"] = "This field is required.";
        }
        if (string.IsNullOrWhiteSpace(request.DefaultTimeZone))
        {
            errors["defaultTimeZone"] = "This field is required.";
        }
        if (request.LongPendingReturnMinutes <= 0)
        {
            errors["longPendingReturnMinutes"] = "Must be a positive number of minutes.";
        }
        if (errors.Count > 0)
        {
            return Results.BadRequest(new { errors });
        }

        var mart = await db.Marts.SingleAsync(m => m.Id == user.MartId);
        var oldValues = new { mart.Currency, mart.DefaultTimeZone, mart.LongPendingReturnMinutes };

        mart.Currency = request.Currency.Trim();
        mart.DefaultTimeZone = request.DefaultTimeZone.Trim();
        mart.LongPendingReturnMinutes = request.LongPendingReturnMinutes;

        var newValues = new { mart.Currency, mart.DefaultTimeZone, mart.LongPendingReturnMinutes };

        // Only when something actually changed - see BranchesEndpoints.UpdateBranch for why.
        if (!AuditLogger.ValuesEqual(oldValues, newValues))
        {
            AuditLogger.Record(
                db,
                mart.Id,
                user.Id,
                entityType: "MartSettings",
                entityId: null,
                action: "Updated",
                oldValues: oldValues,
                newValues: newValues,
                httpContext);
        }

        await db.SaveChangesAsync();

        return Results.Ok(new
        {
            currency = mart.Currency,
            defaultTimeZone = mart.DefaultTimeZone,
            longPendingReturnMinutes = mart.LongPendingReturnMinutes,
        });
    }

    public record UpdateMartSettingsRequest(string Currency, string DefaultTimeZone, int LongPendingReturnMinutes);
}
