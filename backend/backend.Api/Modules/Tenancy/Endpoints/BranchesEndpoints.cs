using backend.Api.Infrastructure.Persistence;
using backend.Api.Modules.AuditLog;
using backend.Api.Modules.Identity;
using backend.Api.Modules.Tenancy.Domain;
using Microsoft.EntityFrameworkCore;

namespace backend.Api.Modules.Tenancy.Endpoints;

// Story 1.6 (FR-26). Create/deactivate are Owner-only; edit is Owner, or a Branch-scoped User
// holding "manage Branches and devices" editing their own BranchId only. No delete path exists -
// deactivation is one-way for now (no reactivate endpoint specified by FR-26/epics.md).
public static class BranchesEndpoints
{
    public static void MapBranchesEndpoints(this IEndpointRouteBuilder group)
    {
        group.MapPost("/branches", CreateBranch);
        group.MapGet("/branches", GetBranches);
        group.MapPut("/branches/{id:guid}", UpdateBranch);
        group.MapPost("/branches/{id:guid}/deactivate", DeactivateBranch);
    }

    private static async Task<IResult> CreateBranch(CreateBranchRequest request, AppDbContext db, HttpContext httpContext)
    {
        var user = await UserAuthorization.GetSignedInUserAsync(db, httpContext);
        if (user is null || user.RoleId != RoleIds.Owner)
        {
            return Results.Unauthorized();
        }

        var errors = new Dictionary<string, string>();
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            errors["name"] = "This field is required.";
        }
        if (string.IsNullOrWhiteSpace(request.Location))
        {
            errors["location"] = "This field is required.";
        }
        if (errors.Count > 0)
        {
            return Results.BadRequest(new { errors });
        }

        var branch = new Branch
        {
            Id = Guid.NewGuid(),
            MartId = user.MartId,
            Name = request.Name.Trim(),
            Location = request.Location.Trim(),
            TimeZone = string.IsNullOrWhiteSpace(request.TimeZone) ? "Asia/Karachi" : request.TimeZone.Trim(),
            IsActive = true,
            CreatedByUserId = user.Id,
            CreatedAtUtc = DateTime.UtcNow,
        };
        db.Branches.Add(branch);

        AuditLogger.Record(
            db,
            user.MartId,
            user.Id,
            entityType: "Branch",
            entityId: branch.Id,
            action: "Created",
            oldValues: null,
            newValues: new { branch.Name, branch.Location, branch.TimeZone },
            httpContext);

        await db.SaveChangesAsync();

        return Results.Json(ToResponse(branch), statusCode: StatusCodes.Status201Created);
    }

    private static async Task<IResult> GetBranches(AppDbContext db, HttpContext httpContext)
    {
        var user = await UserAuthorization.GetSignedInUserAsync(db, httpContext);
        if (user is null)
        {
            return Results.Unauthorized();
        }

        var query = db.Branches.AsQueryable();
        if (user.BranchId is not null)
        {
            query = query.Where(b => b.Id == user.BranchId);
        }

        var branches = await query.OrderBy(b => b.Name).ToListAsync();

        return Results.Ok(branches.Select(ToResponse));
    }

    private static async Task<IResult> UpdateBranch(Guid id, UpdateBranchRequest request, AppDbContext db, HttpContext httpContext)
    {
        var user = await UserAuthorization.GetSignedInUserAsync(db, httpContext);
        if (user is null)
        {
            return Results.Unauthorized();
        }

        if (user.RoleId != RoleIds.Owner)
        {
            var hasPermission = await UserAuthorization.HasPermissionAsync(db, user, PermissionIds.ManageBranchesAndDevices);
            if (!hasPermission || user.BranchId != id)
            {
                return Results.Unauthorized();
            }
        }

        // The global query filter already scopes this to the signed-in User's own Mart.
        var branch = await db.Branches.SingleOrDefaultAsync(b => b.Id == id);
        if (branch is null)
        {
            return Results.NotFound();
        }

        var oldValues = new { branch.Name, branch.Location, branch.TimeZone, branch.CutoverDate, branch.StockCheckLocalTime };

        var errors = new Dictionary<string, string>();
        if (request.Name is not null)
        {
            if (string.IsNullOrWhiteSpace(request.Name))
            {
                errors["name"] = "This field is required.";
            }
            else
            {
                branch.Name = request.Name.Trim();
            }
        }

        if (request.Location is not null)
        {
            if (string.IsNullOrWhiteSpace(request.Location))
            {
                errors["location"] = "This field is required.";
            }
            else
            {
                branch.Location = request.Location.Trim();
            }
        }

        if (request.TimeZone is not null)
        {
            if (string.IsNullOrWhiteSpace(request.TimeZone))
            {
                errors["timeZone"] = "This field is required.";
            }
            else
            {
                branch.TimeZone = request.TimeZone.Trim();
            }
        }

        if (errors.Count > 0)
        {
            return Results.BadRequest(new { errors });
        }

        if (request.CutoverDate.HasValue)
        {
            branch.CutoverDate = request.CutoverDate.Value;
        }

        if (request.StockCheckLocalTime.HasValue)
        {
            branch.StockCheckLocalTime = request.StockCheckLocalTime.Value;
        }

        AuditLogger.Record(
            db,
            branch.MartId,
            user.Id,
            entityType: "Branch",
            entityId: branch.Id,
            action: "Updated",
            oldValues: oldValues,
            newValues: new { branch.Name, branch.Location, branch.TimeZone, branch.CutoverDate, branch.StockCheckLocalTime },
            httpContext);

        await db.SaveChangesAsync();

        return Results.Ok(ToResponse(branch));
    }

    private static async Task<IResult> DeactivateBranch(Guid id, AppDbContext db, HttpContext httpContext)
    {
        var user = await UserAuthorization.GetSignedInUserAsync(db, httpContext);
        if (user is null || user.RoleId != RoleIds.Owner)
        {
            return Results.Unauthorized();
        }

        var branch = await db.Branches.SingleOrDefaultAsync(b => b.Id == id);
        if (branch is null)
        {
            return Results.NotFound();
        }

        var wasActive = branch.IsActive;
        branch.IsActive = false;

        if (wasActive)
        {
            AuditLogger.Record(
                db,
                branch.MartId,
                user.Id,
                entityType: "Branch",
                entityId: branch.Id,
                action: "Deactivated",
                oldValues: new { IsActive = true },
                newValues: new { IsActive = false },
                httpContext);
        }

        await db.SaveChangesAsync();

        return Results.Ok(ToResponse(branch));
    }

    private static object ToResponse(Branch branch) => new
    {
        id = branch.Id,
        name = branch.Name,
        location = branch.Location,
        timeZone = branch.TimeZone,
        isActive = branch.IsActive,
        cutoverDate = branch.CutoverDate,
        stockCheckLocalTime = branch.StockCheckLocalTime,
    };

    public record CreateBranchRequest(string Name, string Location, string? TimeZone);

    public record UpdateBranchRequest(string? Name, string? Location, string? TimeZone, DateOnly? CutoverDate, TimeOnly? StockCheckLocalTime);
}
