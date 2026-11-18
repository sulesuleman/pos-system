namespace backend.Api.Modules.Tenancy.Domain;

public class Branch
{
    public Guid Id { get; set; }

    public Guid MartId { get; set; }

    public required string Name { get; set; }

    public required string Location { get; set; }

    public required string TimeZone { get; set; }

    public bool IsActive { get; set; }

    // Set once opening stock is loaded (FR-14, Story 6.1) - nullable until then.
    public DateOnly? CutoverDate { get; set; }

    // Story 6.5.
    public TimeOnly StockCheckLocalTime { get; set; } = new(3, 0);

    // A Branch must survive its creator being deleted (unlike Users.CreatedByUserId's Restrict).
    public Guid? CreatedByUserId { get; set; }

    public DateTime CreatedAtUtc { get; set; }

    public Mart Mart { get; set; } = null!;
}