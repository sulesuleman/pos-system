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
        if (string.IsNullOrEmpty(request.MartCode) || string.IsNullOrEmpty(request.Email) || string.IsNullOrEmpty(request.Password))
        {
            return Results.Unauthorized();
        }

        var martCode = request.MartCode.Trim().ToUpperInvariant();
        var mart = await db.Marts.SingleOrDefaultAsync(m => m.Code == martCode);

        if (mart is not null && mart.Status == MartStatus.Suspended)
        {
            PlatformAuditLogger.Record(db, httpContext, "UserSignInRefusedMartSuspended", attemptedEmail: request.Email, attemptedMartCode: martCode);
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
            PlatformAuditLogger.Record(db, httpContext, "UserSignInFailed", attemptedEmail: request.Email, attemptedMartCode: martCode);
            await db.SaveChangesAsync();
            return Results.Unauthorized();
        }

        httpContext.Session.SetString("UserId", user.Id.ToString());
        httpContext.Session.SetString("MartId", mart!.Id.ToString());

        PlatformAuditLogger.Record(db, httpContext, "UserSignInSucceeded", attemptedEmail: request.Email, attemptedMartCode: martCode);
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
        PlatformAuditLogger.Record(db, httpContext, "UserSignOut");
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

        // This branch never actually fires in production: Program.cs's suspension-check
        // middleware already intercepts and 403s any request carrying a suspended Mart's session
        // MartId before this handler runs. Kept anyway as defense-in-depth for a direct call to
        // this handler (e.g. a test, or a future caller that bypasses the pipeline) - sharing
        // MartSuspendedMessage with that middleware (rather than each hardcoding its own copy)
        // means the two can never drift out of sync with each other.
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
    // Public so Program.cs's suspension-check middleware can reuse it instead of hand-duplicating
    // the sentence - there is exactly one place that owns this wording.
    public const string MartSuspendedMessage = "This Mart has been suspended. Contact the platform administrator for help.";

    private static IResult MartSuspendedResult() =>
        Results.Json(new { error = MartSuspendedMessage }, statusCode: StatusCodes.Status403Forbidden);
}

public record ActivateUserRequest(string MartCode, string Email, string SetupCode, string Password);

public record SignInUserRequest(string MartCode, string Email, string Password);
