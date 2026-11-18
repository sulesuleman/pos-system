namespace backend.Api.Modules.AuditLog.Domain;

// The one and only audit mechanism for Mart-level data (AD-17) - shared by every feature
// (Branches, Mart settings, Staff, Roles, ...), not a table per entity type. Append-only: no
// PUT/DELETE route exists anywhere in the API for this table.
public class AuditLogEntry
{
    public Guid Id { get; set; }

    public Guid MartId { get; set; }

    // Who made the change.
    public Guid UserId { get; set; }

    public required string EntityType { get; set; }

    // Null for Mart-wide settings changes with no separate entity id.
    public Guid? EntityId { get; set; }

    public required string Action { get; set; }

    // JSON of just the changed fields' old values; null on "Created".
    public string? OldValuesJson { get; set; }

    // JSON of just the changed fields' new values; null on "Deactivated" if nothing else changed.
    public string? NewValuesJson { get; set; }

    public DateTime OccurredAtUtc { get; set; }

    public string? UserAgent { get; set; }

    public string? IpAddress { get; set; }
}
