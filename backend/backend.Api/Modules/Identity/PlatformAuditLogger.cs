using backend.Api.Infrastructure.Persistence;
using backend.Api.Modules.Identity.Domain;

namespace backend.Api.Modules.Identity;

// The platform-level counterpart to AuditLog.AuditLogger - call this instead of constructing a
// PlatformAuditLogEntry by hand, so a shared-field change (IP/UserAgent capture, say) only needs
// to happen here, not at every one of the ~9 call sites across AuthEndpoints, MartsEndpoints and
// SuperAdminAuthEndpoints that used to build this object inline. Caller still owns calling
// db.SaveChangesAsync(); this only adds the entry to the DbContext.
public static class PlatformAuditLogger
{
    public static void Record(
        AppDbContext db,
        HttpContext httpContext,
        string action,
        Guid? superAdminId = null,
        string? attemptedEmail = null,
        string? attemptedMartCode = null)
    {
        db.PlatformAuditLogEntries.Add(new PlatformAuditLogEntry
        {
            Id = Guid.NewGuid(),
            OccurredAtUtc = DateTime.UtcNow,
            Action = action,
            SuperAdminId = superAdminId,
            AttemptedEmail = attemptedEmail,
            AttemptedMartCode = attemptedMartCode,
            IpAddress = httpContext.Connection.RemoteIpAddress?.ToString(),
            UserAgent = httpContext.Request.Headers.UserAgent.ToString(),
        });
    }
}
