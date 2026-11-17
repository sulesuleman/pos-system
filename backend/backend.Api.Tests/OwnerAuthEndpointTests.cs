using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using backend.Api.Infrastructure.Persistence;
using backend.Api.Modules.Identity.Domain;
using backend.Api.Modules.Tenancy.Domain;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace backend.Api.Tests;

public class OwnerAuthEndpointTests : IAsyncLifetime
{
    private readonly string _connectionString;
    private readonly WebApplicationFactory<Program> _factory;
    private readonly string _superAdminEmail = $"test-{Guid.NewGuid():N}@example.com";
    private const string SuperAdminPassword = "Test-Password-123!";
    private const string OwnerPassword = "Owner-Pass1!";

    public OwnerAuthEndpointTests()
    {
        // Same fresh-throwaway-database-per-test-method technique as MartsEndpointTests - xUnit
        // creates a new class instance per [Fact], so each test gets its own Marts/Owners.
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
        // Migrate and seed a SuperAdmin through a raw AppDbContext BEFORE touching
        // _factory.Services - same ordering reason as MartsEndpointTests (accessing the factory
        // starts the host, which runs Program.cs's own SuperAdminSeeder immediately).
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

    private async Task SetOwnerFieldsAsync(string ownerEmail, Action<Owner> mutate)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var owner = await db.Owners.IgnoreQueryFilters().SingleAsync(o => o.Email == ownerEmail);
        mutate(owner);
        await db.SaveChangesAsync();
    }

    private async Task SuspendMartAsync(Guid martId)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var mart = await db.Marts.SingleAsync(m => m.Id == martId);
        mart.Status = MartStatus.Suspended;
        await db.SaveChangesAsync();
    }

    [Fact]
    public async Task Activate_WithValidSetupCode_ActivatesAndReturnsOk()
    {
        var ownerEmail = $"owner-{Guid.NewGuid():N}@example.com";
        var (martCode, setupCode, _) = await CreateMartAndOwnerAsync(ownerEmail);
        using var client = _factory.CreateClient();

        var response = await client.PostAsJsonAsync(
            "/api/v1/owners/activate",
            new { martCode, email = ownerEmail, setupCode, password = OwnerPassword });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task Activate_WithWrongSetupCode_ReturnsGenericBadRequest()
    {
        var ownerEmail = $"owner-{Guid.NewGuid():N}@example.com";
        var (martCode, _, _) = await CreateMartAndOwnerAsync(ownerEmail);
        using var client = _factory.CreateClient();

        var response = await client.PostAsJsonAsync(
            "/api/v1/owners/activate",
            new { martCode, email = ownerEmail, setupCode = "WRONG-CODE", password = OwnerPassword });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Activate_WithAlreadyUsedSetupCode_ReturnsGenericBadRequest()
    {
        var ownerEmail = $"owner-{Guid.NewGuid():N}@example.com";
        var (martCode, setupCode, _) = await CreateMartAndOwnerAsync(ownerEmail);
        using var client = _factory.CreateClient();
        var firstAttempt = await client.PostAsJsonAsync(
            "/api/v1/owners/activate",
            new { martCode, email = ownerEmail, setupCode, password = OwnerPassword });
        Assert.Equal(HttpStatusCode.OK, firstAttempt.StatusCode);

        var response = await client.PostAsJsonAsync(
            "/api/v1/owners/activate",
            new { martCode, email = ownerEmail, setupCode, password = OwnerPassword });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Activate_WithExpiredSetupCode_ReturnsGenericBadRequest()
    {
        var ownerEmail = $"owner-{Guid.NewGuid():N}@example.com";
        var (martCode, setupCode, _) = await CreateMartAndOwnerAsync(ownerEmail);
        await SetOwnerFieldsAsync(ownerEmail, o => o.SetupCodeExpiresAtUtc = DateTime.UtcNow.AddMinutes(-1));
        using var client = _factory.CreateClient();

        var response = await client.PostAsJsonAsync(
            "/api/v1/owners/activate",
            new { martCode, email = ownerEmail, setupCode, password = OwnerPassword });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Activate_WithUnknownMartCode_ReturnsGenericBadRequest()
    {
        var ownerEmail = $"owner-{Guid.NewGuid():N}@example.com";
        var (_, setupCode, _) = await CreateMartAndOwnerAsync(ownerEmail);
        using var client = _factory.CreateClient();

        var response = await client.PostAsJsonAsync(
            "/api/v1/owners/activate",
            new { martCode = "ZZZZZZ", email = ownerEmail, setupCode, password = OwnerPassword });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Activate_WithUnknownEmail_ReturnsGenericBadRequest()
    {
        var ownerEmail = $"owner-{Guid.NewGuid():N}@example.com";
        var (martCode, setupCode, _) = await CreateMartAndOwnerAsync(ownerEmail);
        using var client = _factory.CreateClient();

        var response = await client.PostAsJsonAsync(
            "/api/v1/owners/activate",
            new { martCode, email = $"unknown-{Guid.NewGuid():N}@example.com", setupCode, password = OwnerPassword });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Activate_WithWeakPassword_ReturnsComplexityError()
    {
        var ownerEmail = $"owner-{Guid.NewGuid():N}@example.com";
        var (martCode, setupCode, _) = await CreateMartAndOwnerAsync(ownerEmail);
        using var client = _factory.CreateClient();

        var response = await client.PostAsJsonAsync(
            "/api/v1/owners/activate",
            new { martCode, email = ownerEmail, setupCode, password = "weakpassword" });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Contains("Password must be at least 8 characters", body.GetProperty("error").GetString());
    }

    [Fact]
    public async Task Activate_AgainstSuspendedMart_ReturnsGenericBadRequest()
    {
        var ownerEmail = $"owner-{Guid.NewGuid():N}@example.com";
        var (martCode, setupCode, martId) = await CreateMartAndOwnerAsync(ownerEmail);
        await SuspendMartAsync(martId);
        using var client = _factory.CreateClient();

        var response = await client.PostAsJsonAsync(
            "/api/v1/owners/activate",
            new { martCode, email = ownerEmail, setupCode, password = OwnerPassword });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    private async Task ActivateOwnerAsync(string martCode, string ownerEmail, string setupCode)
    {
        using var client = _factory.CreateClient();
        var response = await client.PostAsJsonAsync(
            "/api/v1/owners/activate",
            new { martCode, email = ownerEmail, setupCode, password = OwnerPassword });
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task SignIn_AfterActivation_WithCorrectCredentials_ReturnsExpectedShape()
    {
        var ownerEmail = $"owner-{Guid.NewGuid():N}@example.com";
        var (martCode, setupCode, martId) = await CreateMartAndOwnerAsync(ownerEmail);
        await ActivateOwnerAsync(martCode, ownerEmail, setupCode);
        using var client = _factory.CreateClient();

        var response = await client.PostAsJsonAsync(
            "/api/v1/owners/sign-in",
            new { martCode, email = ownerEmail, password = OwnerPassword });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(martId.ToString(), body.GetProperty("martId").GetString());
        Assert.Equal("Test", body.GetProperty("firstName").GetString());
        Assert.Equal("Owner", body.GetProperty("lastName").GetString());
        Assert.False(string.IsNullOrWhiteSpace(body.GetProperty("martName").GetString()));
        Assert.False(string.IsNullOrWhiteSpace(body.GetProperty("ownerId").GetString()));
    }

    [Fact]
    public async Task SignIn_WithWrongPassword_ReturnsUnauthorized()
    {
        var ownerEmail = $"owner-{Guid.NewGuid():N}@example.com";
        var (martCode, setupCode, _) = await CreateMartAndOwnerAsync(ownerEmail);
        await ActivateOwnerAsync(martCode, ownerEmail, setupCode);
        using var client = _factory.CreateClient();

        var response = await client.PostAsJsonAsync(
            "/api/v1/owners/sign-in",
            new { martCode, email = ownerEmail, password = "wrong-password-1A!" });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task SignIn_WithUnknownMartCode_ReturnsUnauthorized()
    {
        var ownerEmail = $"owner-{Guid.NewGuid():N}@example.com";
        var (martCode, setupCode, _) = await CreateMartAndOwnerAsync(ownerEmail);
        await ActivateOwnerAsync(martCode, ownerEmail, setupCode);
        using var client = _factory.CreateClient();

        var response = await client.PostAsJsonAsync(
            "/api/v1/owners/sign-in",
            new { martCode = "ZZZZZZ", email = ownerEmail, password = OwnerPassword });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task SignIn_WithUnknownEmail_ReturnsUnauthorized()
    {
        var ownerEmail = $"owner-{Guid.NewGuid():N}@example.com";
        var (martCode, setupCode, _) = await CreateMartAndOwnerAsync(ownerEmail);
        await ActivateOwnerAsync(martCode, ownerEmail, setupCode);
        using var client = _factory.CreateClient();

        var response = await client.PostAsJsonAsync(
            "/api/v1/owners/sign-in",
            new { martCode, email = $"unknown-{Guid.NewGuid():N}@example.com", password = OwnerPassword });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task SignIn_BeforeActivation_ReturnsUnauthorized()
    {
        var ownerEmail = $"owner-{Guid.NewGuid():N}@example.com";
        var (martCode, _, _) = await CreateMartAndOwnerAsync(ownerEmail);
        using var client = _factory.CreateClient();

        var response = await client.PostAsJsonAsync(
            "/api/v1/owners/sign-in",
            new { martCode, email = ownerEmail, password = OwnerPassword });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task SignIn_AgainstSuspendedMart_ReturnsUnauthorized()
    {
        var ownerEmail = $"owner-{Guid.NewGuid():N}@example.com";
        var (martCode, setupCode, martId) = await CreateMartAndOwnerAsync(ownerEmail);
        await ActivateOwnerAsync(martCode, ownerEmail, setupCode);
        await SuspendMartAsync(martId);
        using var client = _factory.CreateClient();

        var response = await client.PostAsJsonAsync(
            "/api/v1/owners/sign-in",
            new { martCode, email = ownerEmail, password = OwnerPassword });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task SignIn_TwoOwnersInDifferentMarts_WithSameEmail_BothSignInIndependently()
    {
        var sharedEmail = $"owner-{Guid.NewGuid():N}@example.com";
        var (martCodeA, setupCodeA, martIdA) = await CreateMartAndOwnerAsync(sharedEmail);
        var (martCodeB, setupCodeB, martIdB) = await CreateMartAndOwnerAsync(sharedEmail);
        await ActivateOwnerAsync(martCodeA, sharedEmail, setupCodeA);
        await ActivateOwnerAsync(martCodeB, sharedEmail, setupCodeB);

        using var clientA = _factory.CreateClient();
        var responseA = await clientA.PostAsJsonAsync(
            "/api/v1/owners/sign-in",
            new { martCode = martCodeA, email = sharedEmail, password = OwnerPassword });
        using var clientB = _factory.CreateClient();
        var responseB = await clientB.PostAsJsonAsync(
            "/api/v1/owners/sign-in",
            new { martCode = martCodeB, email = sharedEmail, password = OwnerPassword });

        Assert.Equal(HttpStatusCode.OK, responseA.StatusCode);
        Assert.Equal(HttpStatusCode.OK, responseB.StatusCode);
        var bodyA = await responseA.Content.ReadFromJsonAsync<JsonElement>();
        var bodyB = await responseB.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(martIdA.ToString(), bodyA.GetProperty("martId").GetString());
        Assert.Equal(martIdB.ToString(), bodyB.GetProperty("martId").GetString());
    }

    [Fact]
    public async Task Session_WithNoPriorSignIn_ReturnsUnauthorized()
    {
        using var client = _factory.CreateClient();

        var response = await client.GetAsync("/api/v1/owners/session");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Session_AfterSignIn_ReturnsExpectedShape()
    {
        var ownerEmail = $"owner-{Guid.NewGuid():N}@example.com";
        var (martCode, setupCode, martId) = await CreateMartAndOwnerAsync(ownerEmail);
        await ActivateOwnerAsync(martCode, ownerEmail, setupCode);
        using var client = _factory.CreateClient();
        await client.PostAsJsonAsync(
            "/api/v1/owners/sign-in",
            new { martCode, email = ownerEmail, password = OwnerPassword });

        var response = await client.GetAsync("/api/v1/owners/session");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(martId.ToString(), body.GetProperty("martId").GetString());
        Assert.Equal("Test", body.GetProperty("firstName").GetString());
    }

    [Fact]
    public async Task SignOut_ClearsSession()
    {
        var ownerEmail = $"owner-{Guid.NewGuid():N}@example.com";
        var (martCode, setupCode, _) = await CreateMartAndOwnerAsync(ownerEmail);
        await ActivateOwnerAsync(martCode, ownerEmail, setupCode);
        using var client = _factory.CreateClient();
        await client.PostAsJsonAsync(
            "/api/v1/owners/sign-in",
            new { martCode, email = ownerEmail, password = OwnerPassword });

        var signOutResponse = await client.PostAsync("/api/v1/owners/sign-out", null);
        var sessionResponse = await client.GetAsync("/api/v1/owners/session");

        Assert.Equal(HttpStatusCode.NoContent, signOutResponse.StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, sessionResponse.StatusCode);
    }
}
