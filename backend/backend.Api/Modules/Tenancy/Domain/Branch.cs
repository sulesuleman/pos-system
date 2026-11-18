namespace backend.Api.Modules.Tenancy.Domain;

public class Branch
{
    public Guid Id { get; set; }

    public Guid MartId { get; set; }

    public required string Name { get; set; }

    public required string Location { get; set; }

    public required string TimeZone { get; set; }

    public bool IsActive { get; set; }

    // A Branch must survive its creator being deleted (unlike Users.CreatedByUserId's Restrict).
    public Guid? CreatedByUserId { get; set; }

    public DateTime CreatedAtUtc { get; set; }

    public Mart Mart { get; set; } = null!;
}