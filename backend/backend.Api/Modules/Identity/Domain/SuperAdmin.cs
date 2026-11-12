namespace backend.Api.Modules.Identity.Domain;

public class SuperAdmin
{
    public Guid Id { get; set; }

    public required string Email { get; set; }

    public required string PasswordHash { get; set; }

    public DateTime CreatedAtUtc { get; set; }
}
