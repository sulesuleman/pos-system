using backend.Api.Infrastructure.Persistence;
using backend.Api.Modules.Identity.Domain;
using backend.Api.Modules.Tenancy;
using backend.Api.Modules.Tenancy.Domain;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace backend.IntegrationTests;

public class TenantIsolationTests : IAsyncLifetime
{
    private readonly string _connectionString;
    private readonly DbContextOptions<AppDbContext> _options;

    private Guid _martAId;
    private Guid _martBId;
    private Guid _ownerAId;
    private Guid _ownerBId;

    public TenantIsolationTests()
    {
        var databaseName = $"PosSystem_IntegrationTests_{Guid.NewGuid():N}";

        // Reuses whatever connection string points at the test SQL Server instance (local Windows Auth,
        // or CI's sa/password one via ConnectionStrings__DefaultConnection), swapping in a throwaway database name.
        var baseConnectionString = Environment.GetEnvironmentVariable("ConnectionStrings__DefaultConnection")
            ?? "Server=localhost;Database=PosSystem;Trusted_Connection=True;TrustServerCertificate=True;";
        var connectionStringBuilder = new SqlConnectionStringBuilder(baseConnectionString)
        {
            InitialCatalog = databaseName,
        };
        _connectionString = connectionStringBuilder.ConnectionString;

        _options = new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlServer(_connectionString)
            .Options;
    }

    public async Task InitializeAsync()
    {
        // tenantContext: null bypasses the Owner query filter (same as Super Admin) so seeding can see
        // across both Marts; the filter only ever restricts queries, never Add/SaveChanges.
        await using var context = new AppDbContext(_options, tenantContext: null);
        await context.Database.MigrateAsync();

        var martA = new Mart { Id = Guid.NewGuid(), Name = $"Mart A {Guid.NewGuid():N}", Code = "AAAAAA" };
        var martB = new Mart { Id = Guid.NewGuid(), Name = $"Mart B {Guid.NewGuid():N}", Code = "BBBBBB" };
        context.Marts.AddRange(martA, martB);

        var ownerA = NewOwner(martA.Id, staffId: 1);
        var ownerB = NewOwner(martB.Id, staffId: 1);
        context.Owners.AddRange(ownerA, ownerB);

        await context.SaveChangesAsync();

        _martAId = martA.Id;
        _martBId = martB.Id;
        _ownerAId = ownerA.Id;
        _ownerBId = ownerB.Id;
    }

    public async Task DisposeAsync()
    {
        await using var context = new AppDbContext(_options, tenantContext: null);
        await context.Database.EnsureDeletedAsync();
    }

    [Fact]
    public async Task Owners_ScopedToMartA_OnlyReturnsMartAOwner()
    {
        await using var context = new AppDbContext(_options, new FakeTenantContext(_martAId));

        var owners = await context.Owners.ToListAsync();

        var owner = Assert.Single(owners);
        Assert.Equal(_ownerAId, owner.Id);
    }

    [Fact]
    public async Task Owners_ScopedToMartB_OnlyReturnsMartBOwner()
    {
        await using var context = new AppDbContext(_options, new FakeTenantContext(_martBId));

        var owners = await context.Owners.ToListAsync();

        var owner = Assert.Single(owners);
        Assert.Equal(_ownerBId, owner.Id);
    }

    [Fact]
    public async Task Owners_ScopedToMartA_CannotReadMartBOwnerById()
    {
        await using var context = new AppDbContext(_options, new FakeTenantContext(_martAId));

        var owner = await context.Owners.SingleOrDefaultAsync(o => o.Id == _ownerBId);

        Assert.Null(owner);
    }

    [Fact]
    public async Task Owners_WithNoTenantContext_ReturnsNoRows()
    {
        // No MartId at all (e.g. an unauthenticated request) must fail closed, not open.
        await using var context = new AppDbContext(_options, tenantContext: null);

        var owners = await context.Owners.ToListAsync();

        Assert.Empty(owners);
    }

    private static Owner NewOwner(Guid martId, int staffId) => new()
    {
        Id = Guid.NewGuid(),
        MartId = martId,
        StaffId = staffId,
        FirstName = "Test",
        LastName = "Owner",
        Email = $"owner-{Guid.NewGuid():N}@example.com",
        Contact = "03001234567",
        Cnic = "1234512345671",
        SetupCodeHash = "placeholder-hash",
        SetupCodeExpiresAtUtc = DateTime.UtcNow.AddHours(1),
        CreatedAtUtc = DateTime.UtcNow,
    };

    private sealed class FakeTenantContext(Guid? currentMartId) : ITenantContext
    {
        public Guid? CurrentMartId { get; } = currentMartId;
    }
}
