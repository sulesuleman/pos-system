using backend.Api.Infrastructure.Persistence;
using backend.Api.Modules.AuditLog.Domain;
using backend.Api.Modules.Identity;
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
    private Guid _userAId;
    private Guid _userBId;
    private Guid _auditEntryAId;
    private Guid _auditEntryBId;
    private Guid _branchAId;
    private Guid _branchBId;

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
        // tenantContext: null bypasses the User query filter (same as Super Admin) so seeding can see
        // across both Marts; the filter only ever restricts queries, never Add/SaveChanges.
        await using var context = new AppDbContext(_options, tenantContext: null);
        await context.Database.MigrateAsync();

        var martA = new Mart { Id = Guid.NewGuid(), Name = $"Mart A {Guid.NewGuid():N}", Code = "AAAAAA" };
        var martB = new Mart { Id = Guid.NewGuid(), Name = $"Mart B {Guid.NewGuid():N}", Code = "BBBBBB" };
        context.Marts.AddRange(martA, martB);

        var userA = NewOwner(martA.Id, staffId: 1);
        var userB = NewOwner(martB.Id, staffId: 1);
        context.Users.AddRange(userA, userB);

        var auditEntryA = NewAuditEntry(martA.Id, userA.Id);
        var auditEntryB = NewAuditEntry(martB.Id, userB.Id);
        context.AuditLogEntries.AddRange(auditEntryA, auditEntryB);

        var branchA = NewBranch(martA.Id, userA.Id);
        var branchB = NewBranch(martB.Id, userB.Id);
        context.Branches.AddRange(branchA, branchB);

        await context.SaveChangesAsync();

        _martAId = martA.Id;
        _martBId = martB.Id;
        _userAId = userA.Id;
        _userBId = userB.Id;
        _auditEntryAId = auditEntryA.Id;
        _auditEntryBId = auditEntryB.Id;
        _branchAId = branchA.Id;
        _branchBId = branchB.Id;
    }

    public async Task DisposeAsync()
    {
        await using var context = new AppDbContext(_options, tenantContext: null);
        await context.Database.EnsureDeletedAsync();
    }

    [Fact]
    public async Task Users_ScopedToMartA_OnlyReturnsMartAUser()
    {
        await using var context = new AppDbContext(_options, new FakeTenantContext(_martAId));

        var users = await context.Users.ToListAsync();

        var user = Assert.Single(users);
        Assert.Equal(_userAId, user.Id);
    }

    [Fact]
    public async Task Users_ScopedToMartB_OnlyReturnsMartBUser()
    {
        await using var context = new AppDbContext(_options, new FakeTenantContext(_martBId));

        var users = await context.Users.ToListAsync();

        var user = Assert.Single(users);
        Assert.Equal(_userBId, user.Id);
    }

    [Fact]
    public async Task Users_ScopedToMartA_CannotReadMartBUserById()
    {
        await using var context = new AppDbContext(_options, new FakeTenantContext(_martAId));

        var user = await context.Users.SingleOrDefaultAsync(u => u.Id == _userBId);

        Assert.Null(user);
    }

    [Fact]
    public async Task Users_WithNoTenantContext_ReturnsNoRows()
    {
        // No MartId at all (e.g. an unauthenticated request) must fail closed, not open.
        await using var context = new AppDbContext(_options, tenantContext: null);

        var users = await context.Users.ToListAsync();

        Assert.Empty(users);
    }

    [Fact]
    public async Task AuditLogEntries_ScopedToMartA_OnlyReturnsMartAEntry()
    {
        await using var context = new AppDbContext(_options, new FakeTenantContext(_martAId));

        var entries = await context.AuditLogEntries.ToListAsync();

        var entry = Assert.Single(entries);
        Assert.Equal(_auditEntryAId, entry.Id);
    }

    [Fact]
    public async Task AuditLogEntries_ScopedToMartA_CannotReadMartBEntryById()
    {
        await using var context = new AppDbContext(_options, new FakeTenantContext(_martAId));

        var entry = await context.AuditLogEntries.SingleOrDefaultAsync(e => e.Id == _auditEntryBId);

        Assert.Null(entry);
    }

    [Fact]
    public async Task AuditLogEntries_WithNoTenantContext_ReturnsNoRows()
    {
        await using var context = new AppDbContext(_options, tenantContext: null);

        var entries = await context.AuditLogEntries.ToListAsync();

        Assert.Empty(entries);
    }

    [Fact]
    public async Task Branches_ScopedToMartA_OnlyReturnsMartABranch()
    {
        await using var context = new AppDbContext(_options, new FakeTenantContext(_martAId));

        var branches = await context.Branches.ToListAsync();

        var branch = Assert.Single(branches);
        Assert.Equal(_branchAId, branch.Id);
    }

    [Fact]
    public async Task Branches_ScopedToMartA_CannotReadMartBBranchById()
    {
        await using var context = new AppDbContext(_options, new FakeTenantContext(_martAId));

        var branch = await context.Branches.SingleOrDefaultAsync(b => b.Id == _branchBId);

        Assert.Null(branch);
    }

    [Fact]
    public async Task Branches_WithNoTenantContext_ReturnsNoRows()
    {
        await using var context = new AppDbContext(_options, tenantContext: null);

        var branches = await context.Branches.ToListAsync();

        Assert.Empty(branches);
    }

    // Permissions/RolePermissions are deliberately global, fixed data (AD-16) - never
    // Mart-customized at this level, so there is no tenant filter to verify. This documents that
    // design choice rather than testing a leak: every Mart sees the same 14 Permissions and the
    // same built-in Roles' grants, regardless of tenant context.
    [Fact]
    public async Task Permissions_AreVisibleRegardlessOfTenantContext()
    {
        await using var context = new AppDbContext(_options, new FakeTenantContext(_martAId));

        var permissions = await context.Permissions.ToListAsync();
        var rolePermissions = await context.RolePermissions.ToListAsync();

        Assert.Equal(14, permissions.Count);
        Assert.NotEmpty(rolePermissions);
    }

    private static Branch NewBranch(Guid martId, Guid createdByUserId) => new()
    {
        Id = Guid.NewGuid(),
        MartId = martId,
        Name = $"Branch {Guid.NewGuid():N}",
        Location = "Test Location",
        TimeZone = "Asia/Karachi",
        IsActive = true,
        CreatedByUserId = createdByUserId,
        CreatedAtUtc = DateTime.UtcNow,
    };

    private static AuditLogEntry NewAuditEntry(Guid martId, Guid userId) => new()
    {
        Id = Guid.NewGuid(),
        MartId = martId,
        UserId = userId,
        EntityType = "Branch",
        Action = "Created",
        OccurredAtUtc = DateTime.UtcNow,
    };

    private static User NewOwner(Guid martId, int staffId) => new()
    {
        Id = Guid.NewGuid(),
        MartId = martId,
        StaffId = staffId,
        RoleId = RoleIds.Owner,
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
