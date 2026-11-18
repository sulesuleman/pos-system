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

        modelBuilder.Entity<Role>()
            .HasQueryFilter(r => r.MartId == null || r.MartId == _currentMartId);

        modelBuilder.Entity<Role>()
            .HasIndex(r => new { r.MartId, r.Name })
            .IsUnique()
            .HasFilter("[MartId] IS NOT NULL");

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
    }
}
