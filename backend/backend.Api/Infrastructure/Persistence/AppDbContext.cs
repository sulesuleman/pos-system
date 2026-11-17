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
    public DbSet<Owner> Owners => Set<Owner>();     

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<SuperAdmin>()
            .HasIndex(s => s.Email)
            .IsUnique();

        modelBuilder.Entity<Mart>()
            .HasIndex(m => m.Code)
            .IsUnique();

        modelBuilder.Entity<Owner>()
            .HasIndex(o => new { o.MartId, o.StaffId })
            .IsUnique();

        modelBuilder.Entity<Owner>()
            .HasQueryFilter(o => o.MartId == _currentMartId);

        modelBuilder.Entity<Owner>()
            .HasIndex(o => new { o.MartId, o.Email })
            .IsUnique();

    }
}
