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

// Renamed/generalized from OwnerAuthEndpointTests - /auth/* now serves both Owner and Manager
// (AD-15), so these tests exercise the shared activate/sign-in/sign-out/session behavior through
// an Owner by default, plus a dedicated section proving a Manager works through the exact same
// endpoints (see "Manager via the shared /auth endpoints" below).
public class AuthEndpointTests : IAsyncLifetime
{
    private readonly string _connectionString;
    private readonly WebApplicationFactory<Program> _factory;
    private readonly string _superAdminEmail = $"test-{Guid.NewGuid():N}@example.com";
    private const string SuperAdminPassword = "Test-Password-123!";
    private const string OwnerPassword = "Owner-Pass1!";

    public AuthEndpointTests()
    {
        // Same fresh-throwaway-database-per-test-method technique as MartsEndpointTests - xUnit
        // creates a new class instance per [Fact], so each test gets its own Marts/Users.
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

    private async Task SetUserFieldsAsync(string email, Action<User> mutate)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var user = await db.Users.IgnoreQueryFilters().SingleAsync(u => u.Email == email);
        mutate(user);
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
            "/api/v1/auth/activate",
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
            "/api/v1/auth/activate",
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
            "/api/v1/auth/activate",
            new { martCode, email = ownerEmail, setupCode, password = OwnerPassword });
        Assert.Equal(HttpStatusCode.OK, firstAttempt.StatusCode);

        var response = await client.PostAsJsonAsync(
            "/api/v1/auth/activate",
            new { martCode, email = ownerEmail, setupCode, password = OwnerPassword });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Activate_WithExpiredSetupCode_ReturnsGenericBadRequest()
    {
        var ownerEmail = $"owner-{Guid.NewGuid():N}@example.com";
        var (martCode, setupCode, _) = await CreateMartAndOwnerAsync(ownerEmail);
        await SetUserFieldsAsync(ownerEmail, u => u.SetupCodeExpiresAtUtc = DateTime.UtcNow.AddMinutes(-1));
        using var client = _factory.CreateClient();

        var response = await client.PostAsJsonAsync(
            "/api/v1/auth/activate",
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
            "/api/v1/auth/activate",
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
            "/api/v1/auth/activate",
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
            "/api/v1/auth/activate",
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
            "/api/v1/auth/activate",
            new { martCode, email = ownerEmail, setupCode, password = OwnerPassword });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    private async Task ActivateAsync(string martCode, string email, string setupCode)
    {
        using var client = _factory.CreateClient();
        var response = await client.PostAsJsonAsync(
            "/api/v1/auth/activate",
            new { martCode, email, setupCode, password = OwnerPassword });
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task SignIn_AfterActivation_WithCorrectCredentials_ReturnsExpectedShape()
    {
        var ownerEmail = $"owner-{Guid.NewGuid():N}@example.com";
        var (martCode, setupCode, martId) = await CreateMartAndOwnerAsync(ownerEmail);
        await ActivateAsync(martCode, ownerEmail, setupCode);
        using var client = _factory.CreateClient();

        var response = await client.PostAsJsonAsync(
            "/api/v1/auth/sign-in",
            new { martCode, email = ownerEmail, password = OwnerPassword });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(martId.ToString(), body.GetProperty("martId").GetString());
        Assert.Equal("Test", body.GetProperty("firstName").GetString());
        Assert.Equal("Owner", body.GetProperty("lastName").GetString());
        Assert.False(string.IsNullOrWhiteSpace(body.GetProperty("martName").GetString()));
        Assert.False(string.IsNullOrWhiteSpace(body.GetProperty("userId").GetString()));
        Assert.Equal("Owner", body.GetProperty("role").GetString());
    }

    [Fact]
    public async Task SignIn_WithWrongPassword_ReturnsUnauthorized()
    {
        var ownerEmail = $"owner-{Guid.NewGuid():N}@example.com";
        var (martCode, setupCode, _) = await CreateMartAndOwnerAsync(ownerEmail);
        await ActivateAsync(martCode, ownerEmail, setupCode);
        using var client = _factory.CreateClient();

        var response = await client.PostAsJsonAsync(
            "/api/v1/auth/sign-in",
            new { martCode, email = ownerEmail, password = "wrong-password-1A!" });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task SignIn_WithUnknownMartCode_ReturnsUnauthorized()
    {
        var ownerEmail = $"owner-{Guid.NewGuid():N}@example.com";
        var (martCode, setupCode, _) = await CreateMartAndOwnerAsync(ownerEmail);
        await ActivateAsync(martCode, ownerEmail, setupCode);
        using var client = _factory.CreateClient();

        var response = await client.PostAsJsonAsync(
            "/api/v1/auth/sign-in",
            new { martCode = "ZZZZZZ", email = ownerEmail, password = OwnerPassword });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task SignIn_WithUnknownEmail_ReturnsUnauthorized()
    {
        var ownerEmail = $"owner-{Guid.NewGuid():N}@example.com";
        var (martCode, setupCode, _) = await CreateMartAndOwnerAsync(ownerEmail);
        await ActivateAsync(martCode, ownerEmail, setupCode);
        using var client = _factory.CreateClient();

        var response = await client.PostAsJsonAsync(
            "/api/v1/auth/sign-in",
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
            "/api/v1/auth/sign-in",
            new { martCode, email = ownerEmail, password = OwnerPassword });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task SignIn_AgainstSuspendedMart_ReturnsUnauthorized()
    {
        var ownerEmail = $"owner-{Guid.NewGuid():N}@example.com";
        var (martCode, setupCode, martId) = await CreateMartAndOwnerAsync(ownerEmail);
        await ActivateAsync(martCode, ownerEmail, setupCode);
        await SuspendMartAsync(martId);
        using var client = _factory.CreateClient();

        var response = await client.PostAsJsonAsync(
            "/api/v1/auth/sign-in",
            new { martCode, email = ownerEmail, password = OwnerPassword });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task SignIn_TwoOwnersInDifferentMarts_WithSameEmail_BothSignInIndependently()
    {
        var sharedEmail = $"owner-{Guid.NewGuid():N}@example.com";
        var (martCodeA, setupCodeA, martIdA) = await CreateMartAndOwnerAsync(sharedEmail);
        var (martCodeB, setupCodeB, martIdB) = await CreateMartAndOwnerAsync(sharedEmail);
        await ActivateAsync(martCodeA, sharedEmail, setupCodeA);
        await ActivateAsync(martCodeB, sharedEmail, setupCodeB);

        using var clientA = _factory.CreateClient();
        var responseA = await clientA.PostAsJsonAsync(
            "/api/v1/auth/sign-in",
            new { martCode = martCodeA, email = sharedEmail, password = OwnerPassword });
        using var clientB = _factory.CreateClient();
        var responseB = await clientB.PostAsJsonAsync(
            "/api/v1/auth/sign-in",
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

        var response = await client.GetAsync("/api/v1/auth/session");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Session_AfterSignIn_ReturnsExpectedShape()
    {
        var ownerEmail = $"owner-{Guid.NewGuid():N}@example.com";
        var (martCode, setupCode, martId) = await CreateMartAndOwnerAsync(ownerEmail);
        await ActivateAsync(martCode, ownerEmail, setupCode);
        using var client = _factory.CreateClient();
        await client.PostAsJsonAsync(
            "/api/v1/auth/sign-in",
            new { martCode, email = ownerEmail, password = OwnerPassword });

        var response = await client.GetAsync("/api/v1/auth/session");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(martId.ToString(), body.GetProperty("martId").GetString());
        Assert.Equal("Test", body.GetProperty("firstName").GetString());
        Assert.Equal("Owner", body.GetProperty("role").GetString());
    }

    [Fact]
    public async Task SignOut_ClearsSession()
    {
        var ownerEmail = $"owner-{Guid.NewGuid():N}@example.com";
        var (martCode, setupCode, _) = await CreateMartAndOwnerAsync(ownerEmail);
        await ActivateAsync(martCode, ownerEmail, setupCode);
        using var client = _factory.CreateClient();
        await client.PostAsJsonAsync(
            "/api/v1/auth/sign-in",
            new { martCode, email = ownerEmail, password = OwnerPassword });

        var signOutResponse = await client.PostAsync("/api/v1/auth/sign-out", null);
        var sessionResponse = await client.GetAsync("/api/v1/auth/session");

        Assert.Equal(HttpStatusCode.NoContent, signOutResponse.StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, sessionResponse.StatusCode);
    }

    // --- Manager via the shared /auth endpoints (AD-15: no separate /managers/* routes) ---

    private async Task<(Guid UserId, string StaffId, string SetupCode)> CreateManagerAsync(string ownerClient_MartCode, string ownerEmail, HttpClient ownerClient, string managerEmail)
    {
        var response = await ownerClient.PostAsJsonAsync(
            "/api/v1/staff",
            new { firstName = "Manager", lastName = "Person", email = managerEmail, contact = "03001234567", cnic = "12345-1234567-1" });
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        return (
            Guid.Parse(body.GetProperty("userId").GetString()!),
            body.GetProperty("staffId").GetString()!,
            body.GetProperty("setupCode").GetString()!);
    }

    [Fact]
    public async Task Manager_CanActivateAndSignIn_ThroughTheSharedAuthEndpoints()
    {
        var ownerEmail = $"owner-{Guid.NewGuid():N}@example.com";
        var (martCode, ownerSetupCode, _) = await CreateMartAndOwnerAsync(ownerEmail);
        await ActivateAsync(martCode, ownerEmail, ownerSetupCode);
        using var ownerClient = _factory.CreateClient();
        await ownerClient.PostAsJsonAsync(
            "/api/v1/auth/sign-in",
            new { martCode, email = ownerEmail, password = OwnerPassword });

        var managerEmail = $"manager-{Guid.NewGuid():N}@example.com";
        var (_, _, managerSetupCode) = await CreateManagerAsync(martCode, ownerEmail, ownerClient, managerEmail);

        const string managerPassword = "Manager-Pass1!";
        using var managerClient = _factory.CreateClient();
        var activateResponse = await managerClient.PostAsJsonAsync(
            "/api/v1/auth/activate",
            new { martCode, email = managerEmail, setupCode = managerSetupCode, password = managerPassword });
        Assert.Equal(HttpStatusCode.OK, activateResponse.StatusCode);

        var signInResponse = await managerClient.PostAsJsonAsync(
            "/api/v1/auth/sign-in",
            new { martCode, email = managerEmail, password = managerPassword });

        Assert.Equal(HttpStatusCode.OK, signInResponse.StatusCode);
        var body = await signInResponse.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("Manager", body.GetProperty("role").GetString());
    }

    [Fact]
    public async Task CreateStaff_WithoutOwnerSession_ReturnsUnauthorized()
    {
        using var client = _factory.CreateClient();

        var response = await client.PostAsJsonAsync(
            "/api/v1/staff",
            new { firstName = "Manager", lastName = "Person", email = "manager@example.com", contact = "03001234567", cnic = "12345-1234567-1" });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task CreateStaff_SignedInAsManager_ReturnsUnauthorized()
    {
        var ownerEmail = $"owner-{Guid.NewGuid():N}@example.com";
        var (martCode, ownerSetupCode, _) = await CreateMartAndOwnerAsync(ownerEmail);
        await ActivateAsync(martCode, ownerEmail, ownerSetupCode);
        using var ownerClient = _factory.CreateClient();
        await ownerClient.PostAsJsonAsync(
            "/api/v1/auth/sign-in",
            new { martCode, email = ownerEmail, password = OwnerPassword });

        var managerEmail = $"manager-{Guid.NewGuid():N}@example.com";
        var (_, _, managerSetupCode) = await CreateManagerAsync(martCode, ownerEmail, ownerClient, managerEmail);
        const string managerPassword = "Manager-Pass1!";
        using var managerClient = _factory.CreateClient();
        await managerClient.PostAsJsonAsync(
            "/api/v1/auth/activate",
            new { martCode, email = managerEmail, setupCode = managerSetupCode, password = managerPassword });
        await managerClient.PostAsJsonAsync(
            "/api/v1/auth/sign-in",
            new { martCode, email = managerEmail, password = managerPassword });

        var response = await managerClient.PostAsJsonAsync(
            "/api/v1/staff",
            new { firstName = "Another", lastName = "Manager", email = $"m2-{Guid.NewGuid():N}@example.com", contact = "03001234567", cnic = "12345-1234567-1" });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task GetStaff_SignedInAsOwner_ListsTheCreatedManager()
    {
        var ownerEmail = $"owner-{Guid.NewGuid():N}@example.com";
        var (martCode, ownerSetupCode, _) = await CreateMartAndOwnerAsync(ownerEmail);
        await ActivateAsync(martCode, ownerEmail, ownerSetupCode);
        using var ownerClient = _factory.CreateClient();
        await ownerClient.PostAsJsonAsync(
            "/api/v1/auth/sign-in",
            new { martCode, email = ownerEmail, password = OwnerPassword });

        var managerEmail = $"manager-{Guid.NewGuid():N}@example.com";
        await CreateManagerAsync(martCode, ownerEmail, ownerClient, managerEmail);

        var response = await ownerClient.GetAsync("/api/v1/staff");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var staff = await response.Content.ReadFromJsonAsync<JsonElement>();
        var entries = staff.EnumerateArray().ToList();
        Assert.Contains(entries, e => e.GetProperty("email").GetString() == managerEmail && e.GetProperty("role").GetString() == "Manager");
        Assert.Contains(entries, e => e.GetProperty("email").GetString() == ownerEmail && e.GetProperty("role").GetString() == "Owner");
    }
}
