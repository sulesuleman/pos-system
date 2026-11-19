using backend.Api.Infrastructure.Persistence;
using backend.Api.Modules.Identity.Domain;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace backend.Api.Tests;

// The throwaway-database-per-test-method fixture every *EndpointTests class was hand-copying
// verbatim (AuthEndpointTests, AuditLogEndpointTests, BranchesEndpointTests, MartsEndpointTests,
// MartSettingsEndpointTests): a fresh SQL Server database per test method (xUnit creates a new
// class instance per [Fact]), migrated and seeded with one SuperAdmin through a raw AppDbContext
// BEFORE _factory.Services is ever touched - accessing the factory starts the real host, which
// runs Program.cs's own SuperAdminSeeder immediately against this database, and seeding our own
// SuperAdmin first means that seeder sees a non-empty table and no-ops (so it never needs
// SuperAdmin:Email/Password config, and never fails outright against a database with no
// SuperAdmins table yet).
//
// Field/const names are kept exactly as every derived class already used them (`_connectionString`,
// `_factory`, `_superAdminEmail`, `SuperAdminPassword`) so extracting this needed no renaming at
// any call site - only removing the duplicated declarations themselves.
public abstract class ApiTestFixtureBase : IAsyncLifetime
{
    protected readonly string _connectionString;
    protected readonly WebApplicationFactory<Program> _factory;
    protected readonly string _superAdminEmail = $"test-{Guid.NewGuid():N}@example.com";
    protected const string SuperAdminPassword = "Test-Password-123!";

    protected ApiTestFixtureBase()
    {
        var databaseName = $"PosSystem_ApiTests_{Guid.NewGuid():N}";
        var baseConnectionString = Environment.GetEnvironmentVariable("ConnectionStrings__DefaultConnection")
            ?? "Server=localhost;Database=PosSystem;Trusted_Connection=True;TrustServerCertificate=True;";
        var connectionStringBuilder = new SqlConnectionStringBuilder(baseConnectionString)
        {
            InitialCatalog = databaseName,
        };
        _connectionString = connectionStringBuilder.ConnectionString;

        _factory = new WebApplicationFactory<Program>().WithWebHostBuilder(builder =>
        {
            builder.UseSetting("ConnectionStrings:DefaultConnection", _connectionString);
        });
    }

    public async Task InitializeAsync()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlServer(_connectionString)
            .Options;

        await using var db = new AppDbContext(options, tenantContext: null);
        await db.Database.MigrateAsync();

        var superAdmin = new SuperAdmin
        {
            Id = Guid.NewGuid(),
            Email = _superAdminEmail,
            PasswordHash = string.Empty,
            CreatedAtUtc = DateTime.UtcNow,
        };
        var hasher = new PasswordHasher<SuperAdmin>();
        superAdmin.PasswordHash = hasher.HashPassword(superAdmin, SuperAdminPassword);

        db.SuperAdmins.Add(superAdmin);
        await db.SaveChangesAsync();
    }

    public async Task DisposeAsync()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlServer(_connectionString)
            .Options;

        await using (var db = new AppDbContext(options, tenantContext: null))
        {
            await db.Database.EnsureDeletedAsync();
        }

        await _factory.DisposeAsync();
    }
}
