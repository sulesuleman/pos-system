using System.Text.RegularExpressions;
using backend.Api.Infrastructure.Persistence;
using backend.Api.Modules.Identity.Domain;
using backend.Api.Modules.Tenancy.Domain;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace backend.Api.Modules.Identity.Endpoints;

public static class OwnerAuthEndpoints
{
    // One message for every rejection path in activate/sign-in, so none of them accidentally
    // reveals which specific part (Mart code, email, setup code, password) was wrong.
    private const string GenericError = "That Mart code, email or setup code isn't right.";

    // At least 8 characters, a digit, a special character, an uppercase and a lowercase letter.
    private static readonly Regex PasswordPattern =
        new(@"^(?=.*[0-9])(?=.*[^a-zA-Z0-9\s])(?=.*[a-z])(?=.*[A-Z]).{8,}$");

    public static void MapOwnerAuthEndpoints(this IEndpointRouteBuilder group)
    {
        group.MapPost("/owners/activate", ActivateAsync);
        group.MapPost("/owners/sign-in", SignInAsync);
        group.MapPost("/owners/sign-out", SignOut);
        group.MapGet("/owners/session", GetSession);
    }

    private static async Task<IResult> ActivateAsync(ActivateOwnerRequest request, AppDbContext db)
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

        if (mart is null || mart.Status == MartStatus.Suspended)
        {
            return Results.BadRequest(new { error = GenericError });
        }

        var owner = await db.Owners
            .IgnoreQueryFilters()
            .SingleOrDefaultAsync(o => o.MartId == mart.Id && o.Email == request.Email);

        if (owner is null)
        {
            return Results.BadRequest(new { error = GenericError });
        }

        var hasher = new PasswordHasher<Owner>();
        var setupCodeResult = hasher.VerifyHashedPassword(owner, owner.SetupCodeHash, request.SetupCode);

        if (setupCodeResult == PasswordVerificationResult.Failed
            || owner.SetupCodeUsedAtUtc is not null
            || owner.SetupCodeExpiresAtUtc <= DateTime.UtcNow)
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

        owner.PasswordHash = hasher.HashPassword(owner, request.Password);
        owner.SetupCodeUsedAtUtc = DateTime.UtcNow;
        await db.SaveChangesAsync();

        return Results.Ok();
    }

    // Stubs for now - filled in once we get to the sign-in step.
    private static async Task<IResult> SignInAsync(SignInOwnerRequest request, AppDbContext db, HttpContext httpContext)
    {
        var martCode = request.MartCode.Trim().ToUpperInvariant();
        var mart = await db.Marts.SingleOrDefaultAsync(m => m.Code == martCode);

        Owner? owner = null;
        if (mart is not null && mart.Status != MartStatus.Suspended)
        {
            owner = await db.Owners
                .IgnoreQueryFilters()
                .SingleOrDefaultAsync(o => o.MartId == mart.Id && o.Email == request.Email);
        }

        var hasher = new PasswordHasher<Owner>();
        var verifyResult = owner is null || owner.PasswordHash is null
            ? PasswordVerificationResult.Failed
            : hasher.VerifyHashedPassword(owner, owner.PasswordHash, request.Password);

        if (owner is null || owner.PasswordHash is null || verifyResult == PasswordVerificationResult.Failed)
        {
            db.PlatformAuditLogEntries.Add(new PlatformAuditLogEntry
            {
                Id = Guid.NewGuid(),
                OccurredAtUtc = DateTime.UtcNow,
                Action = "OwnerSignInFailed",
                AttemptedEmail = request.Email,
                AttemptedMartCode = martCode,
                IpAddress = httpContext.Connection.RemoteIpAddress?.ToString(),
                UserAgent = httpContext.Request.Headers.UserAgent.ToString(),
            });
            await db.SaveChangesAsync();
            return Results.Unauthorized();
        }

        httpContext.Session.SetString("OwnerId", owner.Id.ToString());
        httpContext.Session.SetString("MartId", mart!.Id.ToString());

        db.PlatformAuditLogEntries.Add(new PlatformAuditLogEntry
        {
            Id = Guid.NewGuid(),
            OccurredAtUtc = DateTime.UtcNow,
            Action = "OwnerSignInSucceeded",
            AttemptedEmail = request.Email,
            AttemptedMartCode = martCode,
            IpAddress = httpContext.Connection.RemoteIpAddress?.ToString(),
            UserAgent = httpContext.Request.Headers.UserAgent.ToString(),
        });
        await db.SaveChangesAsync();

        return Results.Ok(new
        {
            ownerId = owner.Id,
            martId = mart.Id,
            martName = mart.Name,
            firstName = owner.FirstName,
            lastName = owner.LastName,
        });

    }

    private static async Task<IResult> SignOut(HttpContext httpContext, AppDbContext db)
    {
        db.PlatformAuditLogEntries.Add(new PlatformAuditLogEntry
        {
            Id = Guid.NewGuid(),
            OccurredAtUtc = DateTime.UtcNow,
            Action = "OwnerSignOut",
            IpAddress = httpContext.Connection.RemoteIpAddress?.ToString(),
            UserAgent = httpContext.Request.Headers.UserAgent.ToString(),
        });
        await db.SaveChangesAsync();

        httpContext.Session.Clear();
        return Results.NoContent();
    }


    private static async Task<IResult> GetSession(HttpContext httpContext, AppDbContext db)
    {
        var ownerIdValue = httpContext.Session.GetString("OwnerId");
        var martIdValue = httpContext.Session.GetString("MartId");

        if (ownerIdValue is null || martIdValue is null)
        {
            return Results.Unauthorized();
        }

        var owner = await db.Owners
            .IgnoreQueryFilters()
            .SingleOrDefaultAsync(o => o.Id == Guid.Parse(ownerIdValue));
        var mart = await db.Marts.SingleOrDefaultAsync(m => m.Id == Guid.Parse(martIdValue));

        if (owner is null || mart is null)
        {
            return Results.Unauthorized();
        }

        return Results.Ok(new
        {
            ownerId = owner.Id,
            martId = mart.Id,
            martName = mart.Name,
            firstName = owner.FirstName,
            lastName = owner.LastName,
        });
    }
}

public record ActivateOwnerRequest(string MartCode, string Email, string SetupCode, string Password);

public record SignInOwnerRequest(string MartCode, string Email, string Password);
