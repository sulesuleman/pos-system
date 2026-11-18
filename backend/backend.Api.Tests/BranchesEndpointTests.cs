using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using backend.Api.Infrastructure.Persistence;
using backend.Api.Modules.Identity.Domain;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace backend.Api.Tests;

public class BranchesEndpointTests : IAsyncLifetime
{
    private readonly string _connectionString;
    private readonly WebApplicationFactory<Program> _factory;
    private readonly string _superAdminEmail = $"test-{Guid.NewGuid():N}@example.com";
    private const string SuperAdminPassword = "Test-Password-123!";
    private const string OwnerPassword = "Owner-Pass1!";
    private const string ManagerPassword = "Manager-Pass1!";

    public BranchesEndpointTests()
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

    private static Dictionary<string, string> ValidCreateMartBody(string martName, string ownerEmail) => new()
    {
        ["martName"] = martName,
        ["ownerFirstName"] = "Test",
        ["ownerLastName"] = "Owner",
        ["ownerEmail"] = ownerEmail,
        ["ownerContact"] = "03001234567",
        ["ownerCnic"] = "12345-1234567-1",
    };

    private async Task<(string MartCode, string SetupCode, Guid MartId)> CreateMartAndOwnerAsync(string ownerEmail)
    {
        using var superAdminClient = _factory.CreateClient();
        var signInResponse = await superAdminClient.PostAsJsonAsync(
            "/api/v1/super-admin/sign-in",
            new { email = _superAdminEmail, password = SuperAdminPassword });
        Assert.Equal(HttpStatusCode.OK, signInResponse.StatusCode);

        var createResponse = await superAdminClient.PostAsJsonAsync(
            "/api/v1/marts",
            ValidCreateMartBody($"Test Mart {Guid.NewGuid():N}", ownerEmail));
        Assert.Equal(HttpStatusCode.Created, createResponse.StatusCode);

        var body = await createResponse.Content.ReadFromJsonAsync<JsonElement>();
        return (
            body.GetProperty("martCode").GetString()!,
            body.GetProperty("setupCode").GetString()!,
            Guid.Parse(body.GetProperty("martId").GetString()!));
    }

    private async Task<(HttpClient Client, Guid UserId, Guid MartId)> SignedInOwnerClientAsync()
    {
        var ownerEmail = $"owner-{Guid.NewGuid():N}@example.com";
        var (martCode, setupCode, martId) = await CreateMartAndOwnerAsync(ownerEmail);

        var client = _factory.CreateClient();
        var activateResponse = await client.PostAsJsonAsync(
            "/api/v1/auth/activate",
            new { martCode, email = ownerEmail, setupCode, password = OwnerPassword });
        Assert.Equal(HttpStatusCode.OK, activateResponse.StatusCode);

        var signInResponse = await client.PostAsJsonAsync(
            "/api/v1/auth/sign-in",
            new { martCode, email = ownerEmail, password = OwnerPassword });
        Assert.Equal(HttpStatusCode.OK, signInResponse.StatusCode);

        var body = await signInResponse.Content.ReadFromJsonAsync<JsonElement>();
        var userId = Guid.Parse(body.GetProperty("userId").GetString()!);

        return (client, userId, martId);
    }

    private async Task<Guid> CreateBranchAsync(HttpClient ownerClient, string name = "Main Branch")
    {
        var response = await ownerClient.PostAsJsonAsync(
            "/api/v1/branches",
            new { name, location = "Test Location", timeZone = "Asia/Karachi" });
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        return Guid.Parse(body.GetProperty("id").GetString()!);
    }

    // Manager's seeded RolePermissions already include "manage Branches and devices" (AD-16).
    private async Task<HttpClient> SignedInManagerClientAsync(string martCode, HttpClient ownerClient, Guid branchId)
    {
        var managerEmail = $"manager-{Guid.NewGuid():N}@example.com";
        var createResponse = await ownerClient.PostAsJsonAsync(
            "/api/v1/staff",
            new { firstName = "Manager", lastName = "Person", email = managerEmail, contact = "03001234567", cnic = "12345-1234567-1", branchId });
        Assert.Equal(HttpStatusCode.Created, createResponse.StatusCode);
        var body = await createResponse.Content.ReadFromJsonAsync<JsonElement>();
        var setupCode = body.GetProperty("setupCode").GetString()!;

        var managerClient = _factory.CreateClient();
        await managerClient.PostAsJsonAsync(
            "/api/v1/auth/activate",
            new { martCode, email = managerEmail, setupCode, password = ManagerPassword });
        await managerClient.PostAsJsonAsync(
            "/api/v1/auth/sign-in",
            new { martCode, email = managerEmail, password = ManagerPassword });

        return managerClient;
    }

    [Fact]
    public async Task CreateBranch_AsOwner_Succeeds()
    {
        var (ownerClient, _, _) = await SignedInOwnerClientAsync();

        var response = await ownerClient.PostAsJsonAsync(
            "/api/v1/branches",
            new { name = "Main Branch", location = "123 Street", timeZone = "Asia/Karachi" });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("Main Branch", body.GetProperty("name").GetString());
        Assert.True(body.GetProperty("isActive").GetBoolean());
    }

    [Fact]
    public async Task CreateBranch_AsManager_ReturnsUnauthorized()
    {
        var (ownerClient, _, martId) = await SignedInOwnerClientAsync();
        var ownerBranchId = await CreateBranchAsync(ownerClient);
        var martCode = await GetMartCodeAsync(martId);
        var managerClient = await SignedInManagerClientAsync(martCode, ownerClient, ownerBranchId);

        var response = await managerClient.PostAsJsonAsync(
            "/api/v1/branches",
            new { name = "Second Branch", location = "456 Street", timeZone = "Asia/Karachi" });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task GetBranches_AsBranchScopedManager_OnlyReturnsOwnBranch()
    {
        var (ownerClient, _, martId) = await SignedInOwnerClientAsync();
        var branchAId = await CreateBranchAsync(ownerClient, "Branch A");
        await CreateBranchAsync(ownerClient, "Branch B");
        var martCode = await GetMartCodeAsync(martId);
        var managerClient = await SignedInManagerClientAsync(martCode, ownerClient, branchAId);

        var response = await managerClient.GetAsync("/api/v1/branches");

        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        var branch = Assert.Single(body.EnumerateArray());
        Assert.Equal(branchAId.ToString(), branch.GetProperty("id").GetString());
    }

    [Fact]
    public async Task GetBranches_AsOwner_ListsAllBranches()
    {
        var (ownerClient, _, _) = await SignedInOwnerClientAsync();
        await CreateBranchAsync(ownerClient, "Branch A");
        await CreateBranchAsync(ownerClient, "Branch B");

        var response = await ownerClient.GetAsync("/api/v1/branches");

        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(2, body.GetArrayLength());
    }

    [Fact]
    public async Task UpdateBranch_AsOwner_Succeeds()
    {
        var (ownerClient, _, _) = await SignedInOwnerClientAsync();
        var branchId = await CreateBranchAsync(ownerClient);

        var response = await ownerClient.PutAsJsonAsync(
            $"/api/v1/branches/{branchId}",
            new { name = "Renamed Branch" });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("Renamed Branch", body.GetProperty("name").GetString());
    }

    [Fact]
    public async Task UpdateBranch_AsManagerWithPermission_OwnBranch_Succeeds()
    {
        var (ownerClient, _, martId) = await SignedInOwnerClientAsync();
        var branchId = await CreateBranchAsync(ownerClient);
        var martCode = await GetMartCodeAsync(martId);
        var managerClient = await SignedInManagerClientAsync(martCode, ownerClient, branchId);

        var response = await managerClient.PutAsJsonAsync(
            $"/api/v1/branches/{branchId}",
            new { location = "Updated Location" });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task UpdateBranch_AsManagerWithPermission_OtherBranch_ReturnsUnauthorized()
    {
        var (ownerClient, _, martId) = await SignedInOwnerClientAsync();
        var ownBranchId = await CreateBranchAsync(ownerClient, "Own Branch");
        var otherBranchId = await CreateBranchAsync(ownerClient, "Other Branch");
        var martCode = await GetMartCodeAsync(martId);
        var managerClient = await SignedInManagerClientAsync(martCode, ownerClient, ownBranchId);

        var response = await managerClient.PutAsJsonAsync(
            $"/api/v1/branches/{otherBranchId}",
            new { location = "Hijacked" });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task UpdateBranch_AsUserWithoutPermission_ReturnsUnauthorized()
    {
        var (ownerClient, _, martId) = await SignedInOwnerClientAsync();
        var branchId = await CreateBranchAsync(ownerClient);
        var martCode = await GetMartCodeAsync(martId);

        const string traineePassword = "Trainee-Pass1!";
        var traineeEmail = $"trainee-{Guid.NewGuid():N}@example.com";
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var traineeRole = new Role { Id = Guid.NewGuid(), MartId = martId, Name = "Trainee", IsSystemDefault = false, CreatedAtUtc = DateTime.UtcNow };
            db.Roles.Add(traineeRole);

            var trainee = new User
            {
                Id = Guid.NewGuid(),
                MartId = martId,
                StaffId = 99,
                RoleId = traineeRole.Id,
                BranchId = branchId,
                FirstName = "Trainee",
                LastName = "Person",
                Email = traineeEmail,
                Contact = "03001234567",
                Cnic = "12345123456711",
                CreatedAtUtc = DateTime.UtcNow,
            };
            var hasher = new PasswordHasher<User>();
            trainee.PasswordHash = hasher.HashPassword(trainee, traineePassword);
            db.Users.Add(trainee);
            await db.SaveChangesAsync();
        }

        using var traineeClient = _factory.CreateClient();
        await traineeClient.PostAsJsonAsync(
            "/api/v1/auth/sign-in",
            new { martCode, email = traineeEmail, password = traineePassword });

        var response = await traineeClient.PutAsJsonAsync(
            $"/api/v1/branches/{branchId}",
            new { location = "Blocked" });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task DeactivateBranch_AsOwner_Succeeds()
    {
        var (ownerClient, _, _) = await SignedInOwnerClientAsync();
        var branchId = await CreateBranchAsync(ownerClient);

        var response = await ownerClient.PostAsync($"/api/v1/branches/{branchId}/deactivate", null);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.False(body.GetProperty("isActive").GetBoolean());
    }

    [Fact]
    public async Task DeactivateBranch_AsManager_ReturnsUnauthorized()
    {
        var (ownerClient, _, martId) = await SignedInOwnerClientAsync();
        var branchId = await CreateBranchAsync(ownerClient);
        var martCode = await GetMartCodeAsync(martId);
        var managerClient = await SignedInManagerClientAsync(martCode, ownerClient, branchId);

        var response = await managerClient.PostAsync($"/api/v1/branches/{branchId}/deactivate", null);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task DeactivateBranch_WritesAnAuditLogEntry()
    {
        var (ownerClient, ownerId, martId) = await SignedInOwnerClientAsync();
        var branchId = await CreateBranchAsync(ownerClient);

        await ownerClient.PostAsync($"/api/v1/branches/{branchId}/deactivate", null);

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var entry = await db.AuditLogEntries
            .IgnoreQueryFilters()
            .SingleAsync(e => e.MartId == martId && e.EntityType == "Branch" && e.EntityId == branchId && e.Action == "Deactivated");
        Assert.Equal(ownerId, entry.UserId);
    }

    private async Task<string> GetMartCodeAsync(Guid martId)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var mart = await db.Marts.SingleAsync(m => m.Id == martId);
        return mart.Code;
    }
}
