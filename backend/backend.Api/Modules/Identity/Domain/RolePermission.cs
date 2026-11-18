namespace backend.Api.Modules.Identity.Domain;

// Join row granting one Permission to one Role. Composite PK (RoleId, PermissionId) - see
// AppDbContext config. Owner holds no rows here; Owner access stays the existing identity-check
// bypass (RoleId == RoleIds.Owner), never a Permission lookup.
public class RolePermission
{
    public Guid RoleId { get; set; }

    public Guid PermissionId { get; set; }
}
