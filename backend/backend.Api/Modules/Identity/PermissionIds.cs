namespace backend.Api.Modules.Identity;

// Fixed, well-known GUIDs for the 14 Permissions from PRD FR-1, seeded once via
// AppDbContext.HasData. Not Mart-customizable at this level - only which Permissions a Role
// bundles (via RolePermissions) is customizable, later.
public static class PermissionIds
{
    public static readonly Guid Sell = Guid.Parse("00000000-0000-0000-0000-000000000101");
    public static readonly Guid RequestReturn = Guid.Parse("00000000-0000-0000-0000-000000000102");
    public static readonly Guid ApproveReturn = Guid.Parse("00000000-0000-0000-0000-000000000103");
    public static readonly Guid ManageProducts = Guid.Parse("00000000-0000-0000-0000-000000000104");
    public static readonly Guid ManageDeliveries = Guid.Parse("00000000-0000-0000-0000-000000000105");
    public static readonly Guid ManageSuppliers = Guid.Parse("00000000-0000-0000-0000-000000000106");
    public static readonly Guid RunSpotCounts = Guid.Parse("00000000-0000-0000-0000-000000000107");
    public static readonly Guid CloseShifts = Guid.Parse("00000000-0000-0000-0000-000000000108");
    public static readonly Guid ViewDashboard = Guid.Parse("00000000-0000-0000-0000-000000000109");
    public static readonly Guid ViewExceptionsReport = Guid.Parse("00000000-0000-0000-0000-000000000110");
    public static readonly Guid ViewAuditLog = Guid.Parse("00000000-0000-0000-0000-000000000111");
    public static readonly Guid ManageStaffAndRoles = Guid.Parse("00000000-0000-0000-0000-000000000112");
    public static readonly Guid ResetPins = Guid.Parse("00000000-0000-0000-0000-000000000113");
    public static readonly Guid ManageBranchesAndDevices = Guid.Parse("00000000-0000-0000-0000-000000000114");
}
