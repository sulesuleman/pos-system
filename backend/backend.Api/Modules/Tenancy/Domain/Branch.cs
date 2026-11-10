namespace backend.Api.Modules.Tenancy.Domain;

public class Branch
{
    public Guid Id { get; set; }

    public Guid MartId { get; set; }

    public required string Name { get; set; }

    public DateTime CreatedAtUtc { get; set; }

    public Mart Mart { get; set; } = null!;
}