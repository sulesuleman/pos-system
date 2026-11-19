using System.Text.RegularExpressions;
using backend.Api.Infrastructure.Persistence;
using backend.Api.Modules.Identity.Domain;
using backend.Api.Modules.Tenancy.Domain;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace backend.Api.Modules.Identity.Endpoints;

// Shared activate/sign-in/sign-out/session for every email+password Role (Owner, Manager) -
// renamed and generalized from OwnerAuthEndpoints. The flow is identical for both Roles and
// differs only in which Role the found User has, so one implementation serves both (AD-15).
// Counter-role (Cashier) login is Staff ID + PIN, a structurally different flow, and stays its
// own separate endpoint once built.
public static class AuthEndpoints
{
    // One message for every rejection path in activate/sign-in, so none of them accidentally
    // reveals which specific part (Mart code, email, setup code, password) was wrong.
    private const string GenericError = "That Mart code, email or setup code isn't right.";

    // At least 8 characters, a digit, a special character, an uppercase and a lowercase letter.
    private static readonly Regex PasswordPattern =
        new(@"^(?=.*[0-9])(?=.*[^a-zA-Z0-9\s])(?=.*[a-z])(?=.*[A-Z]).{8,}$");

    public static void MapAuthEndpoints(this IEndpointRouteBuilder group)
    {
        group.MapPost("/auth/activate", ActivateAsync);
        group.MapPost("/auth/sign-in", SignInAsync);
        group.MapPost("/auth/sign-out", SignOut);
        group.MapGet("/auth/session", GetSession);
    }

    private static async Task<IResult> ActivateAsync(ActivateUserRequest request, AppDbContext db)
    {
        if (string.IsNullOrEmpty(request.MartCode)
            || string.IsNullOrEmpty(request.Email)
            || string.IsNullOrEmpty(request.SetupCode)
            || string.IsNullOrEmpty(request.Password))
        {
            return Results.BadRequest(new { error = GenericError });
        }

        var martCode = request.MartCode.Trim().ToUpperInvariant();
        var mart = await db.Marts.SingleOrDefaultAsync(m => m.Code == martCode);

        if (mart is not null && mart.Status == MartStatus.Suspended)
        {
            return MartSuspendedResult();
        }

        if (mart is null)
        {
            return Results.BadRequest(new { error = GenericError });
        }

        var user = await db.Users
            .IgnoreQueryFilters()
            .SingleOrDefaultAsync(u => u.MartId == mart.Id && u.Email == request.Email);

        if (user is null || user.SetupCodeHash is null)
        {
            return Results.BadRequest(new { error = GenericError });
        }

        var hasher = new PasswordHasher<User>();
        var setupCodeResult = hasher.VerifyHashedPassword(user, user.SetupCodeHash, request.SetupCode);

        if (setupCodeResult == PasswordVerificationResult.Failed
            || user.SetupCodeUsedAtUtc is not null
            || user.SetupCodeExpiresAtUtc <= DateTime.UtcNow)
        {
            return Results.BadRequest(new { error = GenericError });
        }

        if (!PasswordPattern.IsMatch(request.Password))
        {
            return Results.BadRequest(new
            {
                error = "Password must be at least 8 characters and include a number, a special character, an uppercase and a lowercase letter.",
            });
        }

        user.PasswordHash = hasher.HashPassword(user, request.Password);
        user.SetupCodeUsedAtUtc = DateTime.UtcNow;
        await db.SaveChangesAsync();

        return Results.Ok();
    }

    private static async Task<IResult> SignInAsync(SignInUserRequest request, AppDbContext db, HttpContext httpContext)
    {
        var martCode = request.MartCode.Trim().ToUpperInvariant();
        var mart = await db.Marts.SingleOrDefaultAsync(m => m.Code == martCode);

        if (mart is not null && mart.Status == MartStatus.Suspended)
        {
            db.PlatformAuditLogEntries.Add(new PlatformAuditLogEntry
            {
                Id = Guid.NewGuid(),
                OccurredAtUtc = DateTime.UtcNow,
                Action = "UserSignInRefusedMartSuspended",
                AttemptedEmail = request.Email,
                AttemptedMartCode = martCode,
                IpAddress = httpContext.Connection.RemoteIpAddress?.ToString(),
                UserAgent = httpContext.Request.Headers.UserAgent.ToString(),
            });
            await db.SaveChangesAsync();
            return MartSuspendedResult();
        }

        User? user = null;
        if (mart is not null)
        {
            user = await db.Users
                .IgnoreQueryFilters()
                .SingleOrDefaultAsync(u => u.MartId == mart.Id && u.Email == request.Email);
        }

        var hasher = new PasswordHasher<User>();
        var verifyResult = user is null || user.PasswordHash is null
            ? PasswordVerificationResult.Failed
            : hasher.VerifyHashedPassword(user, user.PasswordHash, request.Password);

        if (user is null || user.PasswordHash is null || verifyResult == PasswordVerificationResult.Failed)
        {
            db.PlatformAuditLogEntries.Add(new PlatformAuditLogEntry
            {
                Id = Guid.NewGuid(),
                OccurredAtUtc = DateTime.UtcNow,
                Action = "UserSignInFailed",
                AttemptedEmail = request.Email,
                AttemptedMartCode = martCode,
                IpAddress = httpContext.Connection.RemoteIpAddress?.ToString(),
                UserAgent = httpContext.Request.Headers.UserAgent.ToString(),
            });
            await db.SaveChangesAsync();
            return Results.Unauthorized();
        }

        httpContext.Session.SetString("UserId", user.Id.ToString());
        httpContext.Session.SetString("MartId", mart!.Id.ToString());

        db.PlatformAuditLogEntries.Add(new PlatformAuditLogEntry
        {
            Id = Guid.NewGuid(),
            OccurredAtUtc = DateTime.UtcNow,
            Action = "UserSignInSucceeded",
            AttemptedEmail = request.Email,
            AttemptedMartCode = martCode,
            IpAddress = httpContext.Connection.RemoteIpAddress?.ToString(),
            UserAgent = httpContext.Request.Headers.UserAgent.ToString(),
        });
        await db.SaveChangesAsync();

        var role = await db.Roles.IgnoreQueryFilters().SingleAsync(r => r.Id == user.RoleId);

        return Results.Ok(new
        {
            userId = user.Id,
            martId = mart.Id,
            martName = mart.Name,
            firstName = user.FirstName,
            lastName = user.LastName,
            role = role.Name,
        });
    }

    private static async Task<IResult> SignOut(HttpContext httpContext, AppDbContext db)
    {
        db.PlatformAuditLogEntries.Add(new PlatformAuditLogEntry
        {
            Id = Guid.NewGuid(),
            OccurredAtUtc = DateTime.UtcNow,
            Action = "UserSignOut",
            IpAddress = httpContext.Connection.RemoteIpAddress?.ToString(),
            UserAgent = httpContext.Request.Headers.UserAgent.ToString(),
        });
        await db.SaveChangesAsync();

        httpContext.Session.Clear();
        return Results.NoContent();
    }

    private static async Task<IResult> GetSession(HttpContext httpContext, AppDbContext db)
    {
        var userIdValue = httpContext.Session.GetString("UserId");
        var martIdValue = httpContext.Session.GetString("MartId");

        if (userIdValue is null || martIdValue is null)
        {
            return Results.Unauthorized();
        }

        var user = await db.Users
            .IgnoreQueryFilters()
            .SingleOrDefaultAsync(u => u.Id == Guid.Parse(userIdValue));
        var mart = await db.Marts.SingleOrDefaultAsync(m => m.Id == Guid.Parse(martIdValue));

        if (user is null || mart is null)
        {
            return Results.Unauthorized();
        }

        if (mart.Status == MartStatus.Suspended)
        {
            return MartSuspendedResult();
        }

        var role = await db.Roles.IgnoreQueryFilters().SingleAsync(r => r.Id == user.RoleId);

        return Results.Ok(new
        {
            userId = user.Id,
            martId = mart.Id,
            martName = mart.Name,
            firstName = user.FirstName,
            lastName = user.LastName,
            role = role.Name,
        });
    }

    // Story 1.7 (FR-25): the one distinct message every refused login/API request for a
    // suspended Mart should show, as opposed to a generic invalid-credentials/unauthorized
    // response. 403, not 401 - the credentials/session are fine, the Mart itself is the reason.
    // The full user-facing sentence is sent from here (not a terse code the frontend maps
    // itself) so there is exactly one place that owns this wording.
    private static IResult MartSuspendedResult() =>
        Results.Json(
            new { error = "This Mart has been suspended. Contact the platform administrator for help." },
            statusCode: StatusCodes.Status403Forbidden);
}

public record ActivateUserRequest(string MartCode, string Email, string SetupCode, string Password);

public record SignInUserRequest(string MartCode, string Email, string Password);
