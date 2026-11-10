namespace backend.Api.Modules.Tenancy.Domain;

public class Mart
{
    public Guid Id { get; set; }

    public required string Name { get; set; }

    public DateTime CreatedAtUtc { get; set; }

    public ICollection<Branch> Branches { get; set; } = new List<Branch>();
}