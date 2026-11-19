using System.Text.Json;
using backend.Api.Infrastructure.Persistence;
using backend.Api.Modules.AuditLog.Domain;

namespace backend.Api.Modules.AuditLog;

// Call this right before SaveChangesAsync so the audit entry always lands in the same
// transaction as the change it describes - avoids every endpoint hand-rolling the JSON-diff
// logic separately.
public static class AuditLogger
{
    public static void Record(
        AppDbContext db,
        Guid martId,
        Guid userId,
        string entityType,
        Guid? entityId,
        string action,
        object? oldValues,
        object? newValues,
        HttpContext httpContext)
    {
        db.AuditLogEntries.Add(new AuditLogEntry
        {
            Id = Guid.NewGuid(),
            MartId = martId,
            UserId = userId,
            EntityType = entityType,
            EntityId = entityId,
            Action = action,
            OldValuesJson = oldValues is null ? null : JsonSerializer.Serialize(oldValues),
            NewValuesJson = newValues is null ? null : JsonSerializer.Serialize(newValues),
            OccurredAtUtc = DateTime.UtcNow,
            IpAddress = httpContext.Connection.RemoteIpAddress?.ToString(),
            UserAgent = httpContext.Request.Headers.UserAgent.ToString(),
        });
    }

    // For an endpoint to skip Record entirely when an update changed nothing (e.g. a resubmit of
    // the same values, or every optional field omitted) - compares the same way Record itself
    // would serialize each side, so "equal" here always means "would have produced identical
    // OldValuesJson/NewValuesJson".
    public static bool ValuesEqual(object? oldValues, object? newValues) =>
        JsonSerializer.Serialize(oldValues) == JsonSerializer.Serialize(newValues);
}
