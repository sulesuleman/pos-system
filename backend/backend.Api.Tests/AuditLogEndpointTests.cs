using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using backend.Api.Infrastructure.Persistence;
using backend.Api.Modules.AuditLog.Domain;
using backend.Api.Modules.Identity;
using backend.Api.Modules.Identity.Domain;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace backend.Api.Tests;

public class AuditLogEndpointTests : IAsyncLifetime
{
    private readonly string _connectionString;
    private readonly WebApplicationFactory<Program> _factory;
    private readonly string _superAdminEmail = $"test-{Guid.NewGuid():N}@example.com";
    private const string SuperAdminPassword = "Test-Password-123!";
    private const string OwnerPassword = "Owner-Pass1!";

    public AuditLogEndpointTests()
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

    // Returns a client already signed in as the Mart's Owner, plus that Owner's userId/martId -
    // the shared setup every test here needs before it can call /audit-log.
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

    private async Task<AuditLogEntry> AddEntryAsync(Guid martId, Guid userId, string entityType, string action)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var entry = new AuditLogEntry
        {
            Id = Guid.NewGuid(),
            MartId = martId,
            UserId = userId,
            EntityType = entityType,
            Action = action,
            OccurredAtUtc = DateTime.UtcNow,
        };
        db.AuditLogEntries.Add(entry);
        await db.SaveChangesAsync();
        return entry;
    }

    [Fact]
    public async Task GetAuditLog_RoundTripsEntryFields()
    {
        var (client, userId, martId) = await SignedInOwnerClientAsync();
        await AddEntryAsync(martId, userId, "Branch", "Created");

        var response = await client.GetAsync("/api/v1/audit-log");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var entries = await response.Content.ReadFromJsonAsync<JsonElement>();
        var entry = Assert.Single(entries.EnumerateArray());
        Assert.Equal("Branch", entry.GetProperty("entityType").GetString());
        Assert.Equal("Created", entry.GetProperty("action").GetString());
        Assert.Equal("Test Owner", entry.GetProperty("userName").GetString());
    }

    [Fact]
    public async Task GetAuditLog_FilteredByEntityType_OnlyReturnsMatchingEntries()
    {
        var (client, userId, martId) = await SignedInOwnerClientAsync();
        await AddEntryAsync(martId, userId, "Branch", "Created");
        await AddEntryAsync(martId, userId, "MartSettings", "Updated");

        var response = await client.GetAsync("/api/v1/audit-log?entityType=Branch");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var entries = await response.Content.ReadFromJsonAsync<JsonElement>();
        var entry = Assert.Single(entries.EnumerateArray());
        Assert.Equal("Branch", entry.GetProperty("entityType").GetString());
    }

    [Fact]
    public async Task GetAuditLog_IsolatedBetweenMarts_OnlyReturnsOwnMartsEntries()
    {
        var (clientA, userIdA, martIdA) = await SignedInOwnerClientAsync();
        var (_, userIdB, martIdB) = await SignedInOwnerClientAsync();
        await AddEntryAsync(martIdA, userIdA, "Branch", "Created");
        await AddEntryAsync(martIdB, userIdB, "Branch", "Created");

        var response = await clientA.GetAsync("/api/v1/audit-log");

        var entries = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Single(entries.EnumerateArray());
    }

    [Fact]
    public async Task GetAuditLog_WithoutSignIn_ReturnsUnauthorized()
    {
        using var client = _factory.CreateClient();

        var response = await client.GetAsync("/api/v1/audit-log");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    // No PUT/DELETE/POST route exists anywhere for this table - the immutability mechanism is
    // simply never building one. ASP.NET Core routing matches the path but finds no handler for
    // these methods, hence 405 rather than 404 (same shape as Story 1.2's no-create-path test).
    [Fact]
    public async Task AuditLog_HasNoCreateOrModifyRoute()
    {
        var (client, _, _) = await SignedInOwnerClientAsync();

        var postResponse = await client.PostAsJsonAsync("/api/v1/audit-log", new { });
        var putResponse = await client.PutAsJsonAsync("/api/v1/audit-log", new { });
        var deleteResponse = await client.DeleteAsync("/api/v1/audit-log");

        Assert.Equal(HttpStatusCode.MethodNotAllowed, postResponse.StatusCode);
        Assert.Equal(HttpStatusCode.MethodNotAllowed, putResponse.StatusCode);
        Assert.Equal(HttpStatusCode.MethodNotAllowed, deleteResponse.StatusCode);
    }
}
