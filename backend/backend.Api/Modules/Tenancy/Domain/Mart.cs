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

    public DateTime CreatedAtUtc { get; set; }

    public ICollection<Branch> Branches { get; set; } = new List<Branch>();
}
