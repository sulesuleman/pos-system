namespace backend.Api.Modules.Identity.Domain;

public class Owner
{
    public Guid Id { get; set; }

    public Guid MartId { get; set; }

    public int StaffId { get; set; }

    public required string FirstName { get; set; }

    public required string LastName { get; set; }

    public required string Email { get; set; }

    public required string Contact { get; set; }

    public required string Cnic { get; set; }

    public string? PasswordHash { get; set; }

    public required string SetupCodeHash { get; set; }

    public DateTime SetupCodeExpiresAtUtc { get; set; }

    public DateTime? SetupCodeUsedAtUtc { get; set; }

    public string Role { get; set; } = "Owner";

    public DateTime CreatedAtUtc { get; set; }
}
