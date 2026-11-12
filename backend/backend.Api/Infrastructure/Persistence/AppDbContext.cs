using backend.Api.Modules.Identity.Domain;
using backend.Api.Modules.Tenancy.Domain;
using Microsoft.EntityFrameworkCore;

namespace backend.Api.Infrastructure.Persistence;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options)
        : base(options)
    {
    }

    public DbSet<Mart> Marts => Set<Mart>();
    public DbSet<Branch> Branches => Set<Branch>();
    public DbSet<SuperAdmin> SuperAdmins => Set<SuperAdmin>();
    public DbSet<PlatformAuditLogEntry> PlatformAuditLogEntries => Set<PlatformAuditLogEntry>();


    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<SuperAdmin>()
            .HasIndex(s => s.Email)
            .IsUnique();
    }
}
