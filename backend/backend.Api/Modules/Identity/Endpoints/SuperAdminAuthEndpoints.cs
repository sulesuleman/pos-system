using backend.Api.Infrastructure.Persistence;
using backend.Api.Modules.Identity.Domain;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace backend.Api.Modules.Identity.Endpoints;
    public static class SuperAdminAuthEndpoints
    {
        public static void MapSuperAdminAuthEndpoints(this IEndpointRouteBuilder group)
        {
            group.MapPost("/super-admin/sign-in", SignInAsync);
            group.MapPost("/super-admin/sign-out", SignOut);
            group.MapGet("/super-admin/session", GetSession);
        }
    private static async Task<IResult> SignInAsync(SignInRequest request, AppDbContext db, HttpContext httpContext)
    {
        var superAdmin = await db.SuperAdmins.SingleOrDefaultAsync(s => s.Email == request.Email);

        var hasher = new PasswordHasher<SuperAdmin>();
        var verifyResult = superAdmin is null
            ? PasswordVerificationResult.Failed
            : hasher.VerifyHashedPassword(superAdmin, superAdmin.PasswordHash, request.Password);

        if (superAdmin is null || verifyResult == PasswordVerificationResult.Failed)
        {
            db.PlatformAuditLogEntries.Add(new PlatformAuditLogEntry
            {
                Id = Guid.NewGuid(),
                OccurredAtUtc = DateTime.UtcNow,
                Action = "SuperAdminSignInFailed",
                AttemptedEmail = request.Email,
                IpAddress = httpContext.Connection.RemoteIpAddress?.ToString(),
                UserAgent = httpContext.Request.Headers.UserAgent.ToString(),
            });
            await db.SaveChangesAsync();
            return Results.Unauthorized();
        }

        httpContext.Session.SetString("SuperAdminId", superAdmin.Id.ToString());


        db.PlatformAuditLogEntries.Add(new PlatformAuditLogEntry
        {
            Id = Guid.NewGuid(),
            OccurredAtUtc = DateTime.UtcNow,
            Action = "SuperAdminSignInSucceeded",
            SuperAdminId = superAdmin.Id,
            IpAddress = httpContext.Connection.RemoteIpAddress?.ToString(),
            UserAgent = httpContext.Request.Headers.UserAgent.ToString(),
        });
        await db.SaveChangesAsync();

        return Results.Ok();
    }

    private static async Task<IResult> SignOut(HttpContext httpContext, AppDbContext db)
    {
        var superAdminIdValue = httpContext.Session.GetString("SuperAdminId");

        db.PlatformAuditLogEntries.Add(new PlatformAuditLogEntry
        {
            Id = Guid.NewGuid(),
            OccurredAtUtc = DateTime.UtcNow,
            Action = "SuperAdminSignOut",
            SuperAdminId = superAdminIdValue is null ? null : Guid.Parse(superAdminIdValue),
            IpAddress = httpContext.Connection.RemoteIpAddress?.ToString(),
            UserAgent = httpContext.Request.Headers.UserAgent.ToString(),
        });
        await db.SaveChangesAsync();

        httpContext.Session.Clear();
        return Results.NoContent();
    }


    private static IResult GetSession(HttpContext httpContext)
    {
        var superAdminId = httpContext.Session.GetString("SuperAdminId");
        return superAdminId is null ? Results.Unauthorized() : Results.Ok();
    }
}

public record SignInRequest(string Email, string Password);
