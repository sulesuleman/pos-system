namespace backend.Api.Modules.Identity;

// Fixed, well-known GUIDs for the three built-in Roles, seeded once via AppDbContext.HasData.
// App code references these directly (RoleIds.Owner) instead of looking a Role up by name.
public static class RoleIds
{
    public static readonly Guid Owner = Guid.Parse("00000000-0000-0000-0000-000000000001");
    public static readonly Guid Manager = Guid.Parse("00000000-0000-0000-0000-000000000002");
    public static readonly Guid Cashier = Guid.Parse("00000000-0000-0000-0000-000000000003");
}
