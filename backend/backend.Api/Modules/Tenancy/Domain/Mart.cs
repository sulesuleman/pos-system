namespace backend.Api.Modules.Tenancy.Domain;

public enum MartStatus
{
    Active,
    Suspended,
}
public class Mart
{
    public Guid Id { get; set; }

    public required string Name { get; set; }

    public required string Code { get; set; }

    public MartStatus Status { get; set; } = MartStatus.Active;

    public string Currency { get; set; } = "PKR";

    // IANA zone, used for Mart-wide reports (AD-12, NFR-11).
    public string DefaultTimeZone { get; set; } = "Asia/Karachi";

    // FR-19.
    public int LongPendingReturnMinutes { get; set; } = 30;

    public DateTime CreatedAtUtc { get; set; }

    public ICollection<Branch> Branches { get; set; } = new List<Branch>();
}
