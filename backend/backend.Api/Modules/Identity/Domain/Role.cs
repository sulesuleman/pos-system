namespace backend.Api.Modules.Identity.Domain;

public class Role
{
    public Guid Id { get; set; }

    public Guid? MartId { get; set; }

    public required string Name { get; set; }

    public bool IsSystemDefault { get; set; }

    public DateTime CreatedAtUtc { get; set; }
}
