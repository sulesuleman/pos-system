namespace backend.Api.Modules.Identity.Domain
{
    public class PlatformAuditLogEntry
    {
        public Guid Id { get; set; }

        public DateTime OccurredAtUtc { get; set; }

        public required string Action { get; set; }

        public Guid? SuperAdminId { get; set; }

        public string? AttemptedEmail { get; set; }

        public string? IpAddress { get; set; }

        public string? UserAgent { get; set; }
    }
}
