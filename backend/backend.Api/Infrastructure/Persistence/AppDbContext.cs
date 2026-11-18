using backend.Api.Modules.AuditLog.Domain;
using backend.Api.Modules.Identity;
using backend.Api.Modules.Identity.Domain;
using backend.Api.Modules.Tenancy;
using backend.Api.Modules.Tenancy.Domain;
using Microsoft.EntityFrameworkCore;

namespace backend.Api.Infrastructure.Persistence;

public class AppDbContext : DbContext
{
    private readonly Guid? _currentMartId;

    public AppDbContext(DbContextOptions<AppDbContext> options)
        : this(options, tenantContext: null)
    {
    }

    public AppDbContext(DbContextOptions<AppDbContext> options, ITenantContext? tenantContext)
        : base(options)
    {
        _currentMartId = tenantContext?.CurrentMartId;
    }

    public DbSet<Mart> Marts => Set<Mart>();
    public DbSet<Branch> Branches => Set<Branch>();
    public DbSet<SuperAdmin> SuperAdmins => Set<SuperAdmin>();
    public DbSet<PlatformAuditLogEntry> PlatformAuditLogEntries => Set<PlatformAuditLogEntry>();
    public DbSet<User> Users => Set<User>();
    public DbSet<Role> Roles => Set<Role>();
    public DbSet<Permission> Permissions => Set<Permission>();
    public DbSet<RolePermission> RolePermissions => Set<RolePermission>();
    public DbSet<AuditLogEntry> AuditLogEntries => Set<AuditLogEntry>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<SuperAdmin>()
            .HasIndex(s => s.Email)
            .IsUnique();

        modelBuilder.Entity<Mart>()
            .HasIndex(m => m.Code)
            .IsUnique();

        modelBuilder.Entity<User>()
            .HasIndex(u => new { u.MartId, u.StaffId })
            .IsUnique();

        modelBuilder.Entity<User>()
            .HasQueryFilter(u => u.MartId == _currentMartId);

        modelBuilder.Entity<User>()
            .HasIndex(u => new { u.MartId, u.Email })
            .IsUnique();

        modelBuilder.Entity<User>()
            .HasIndex(u => u.RoleId);

        modelBuilder.Entity<User>()
            .HasOne<Role>()
            .WithMany()
            .HasForeignKey(u => u.RoleId)
            .OnDelete(DeleteBehavior.Restrict);

        // SQL Server rejects ON DELETE SET NULL on this self-referencing FK when combined with
        // the RoleId FK on the same table ("may cause cycles or multiple cascade paths") -
        // Restrict instead: deleting a User who created other Users is blocked at the DB level
        // rather than silently nulling CreatedByUserId out from under them.
        modelBuilder.Entity<User>()
            .HasOne<User>()
            .WithMany()
            .HasForeignKey(u => u.CreatedByUserId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<User>()
            .HasIndex(u => u.BranchId);

        modelBuilder.Entity<User>()
            .HasOne<Branch>()
            .WithMany()
            .HasForeignKey(u => u.BranchId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Role>()
            .HasQueryFilter(r => r.MartId == null || r.MartId == _currentMartId);

        modelBuilder.Entity<Role>()
            .HasIndex(r => new { r.MartId, r.Name })
            .IsUnique()
            .HasFilter("[MartId] IS NOT NULL");

        modelBuilder.Entity<Branch>(b =>
        {
            // Pre-existing gap, closed alongside AD-16: Branch had no tenant query filter at all.
            b.HasQueryFilter(br => br.MartId == _currentMartId);

            b.HasOne<User>()
                .WithMany()
                .HasForeignKey(br => br.CreatedByUserId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<Permission>()
            .HasIndex(p => p.Name)
            .IsUnique();

        modelBuilder.Entity<RolePermission>(rp =>
        {
            rp.HasKey(x => new { x.RoleId, x.PermissionId });

            rp.HasOne<Role>()
                .WithMany()
                .HasForeignKey(x => x.RoleId)
                .OnDelete(DeleteBehavior.Cascade);

            rp.HasOne<Permission>()
                .WithMany()
                .HasForeignKey(x => x.PermissionId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<AuditLogEntry>(e =>
        {
            e.HasQueryFilter(a => a.MartId == _currentMartId);
            e.HasIndex(a => new { a.MartId, a.OccurredAtUtc });
            e.HasIndex(a => new { a.MartId, a.UserId });
            e.HasIndex(a => new { a.MartId, a.EntityType });
            e.Property(a => a.EntityType).HasMaxLength(100);
            e.Property(a => a.Action).HasMaxLength(50);

            e.HasOne<Mart>()
                .WithMany()
                .HasForeignKey(a => a.MartId)
                .OnDelete(DeleteBehavior.Restrict);

            e.HasOne<User>()
                .WithMany()
                .HasForeignKey(a => a.UserId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        var seedTimestamp = new DateTime(2026, 11, 17, 0, 0, 0, DateTimeKind.Utc);
        modelBuilder.Entity<Role>().HasData(
            new Role { Id = RoleIds.Owner, MartId = null, Name = "Owner", IsSystemDefault = true, CreatedAtUtc = seedTimestamp },
            new Role { Id = RoleIds.Manager, MartId = null, Name = "Manager", IsSystemDefault = true, CreatedAtUtc = seedTimestamp },
            new Role { Id = RoleIds.Cashier, MartId = null, Name = "Cashier", IsSystemDefault = true, CreatedAtUtc = seedTimestamp }
        );

        modelBuilder.Entity<Permission>().HasData(
            new Permission { Id = PermissionIds.Sell, Name = "sell" },
            new Permission { Id = PermissionIds.RequestReturn, Name = "request Return" },
            new Permission { Id = PermissionIds.ApproveReturn, Name = "approve Return" },
            new Permission { Id = PermissionIds.ManageProducts, Name = "manage Products" },
            new Permission { Id = PermissionIds.ManageDeliveries, Name = "manage Deliveries" },
            new Permission { Id = PermissionIds.ManageSuppliers, Name = "manage suppliers" },
            new Permission { Id = PermissionIds.RunSpotCounts, Name = "run Spot Counts" },
            new Permission { Id = PermissionIds.CloseShifts, Name = "close Shifts" },
            new Permission { Id = PermissionIds.ViewDashboard, Name = "view dashboard" },
            new Permission { Id = PermissionIds.ViewExceptionsReport, Name = "view Exceptions Report" },
            new Permission { Id = PermissionIds.ViewAuditLog, Name = "view Audit Log" },
            new Permission { Id = PermissionIds.ManageStaffAndRoles, Name = "manage staff and Roles" },
            new Permission { Id = PermissionIds.ResetPins, Name = "reset PINs" },
            new Permission { Id = PermissionIds.ManageBranchesAndDevices, Name = "manage Branches and devices" }
        );

        // Manager: every Permission except "view dashboard" (AD-16). Cashier: sell + request Return.
        var managerPermissionIds = new[]
        {
            PermissionIds.Sell,
            PermissionIds.RequestReturn,
            PermissionIds.ApproveReturn,
            PermissionIds.ManageProducts,
            PermissionIds.ManageDeliveries,
            PermissionIds.ManageSuppliers,
            PermissionIds.RunSpotCounts,
            PermissionIds.CloseShifts,
            PermissionIds.ViewExceptionsReport,
            PermissionIds.ViewAuditLog,
            PermissionIds.ManageStaffAndRoles,
            PermissionIds.ResetPins,
            PermissionIds.ManageBranchesAndDevices,
        };
        modelBuilder.Entity<RolePermission>().HasData(
            managerPermissionIds.Select(permissionId => new RolePermission { RoleId = RoleIds.Manager, PermissionId = permissionId })
        );
        modelBuilder.Entity<RolePermission>().HasData(
            new RolePermission { RoleId = RoleIds.Cashier, PermissionId = PermissionIds.Sell },
            new RolePermission { RoleId = RoleIds.Cashier, PermissionId = PermissionIds.RequestReturn }
        );
    }
}
