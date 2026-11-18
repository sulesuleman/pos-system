namespace backend.Api.Modules.Identity.Domain;

public class Permission
{
    public Guid Id { get; set; }

    public required string Name { get; set; }
}
