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

public class MartsEndpointTests : IAsyncLifetime
{
    private readonly string _connectionString;
    private readonly WebApplicationFactory<Program> _factory;
    private readonly string _superAdminEmail = $"test-{Guid.NewGuid():N}@example.com";
    private const string SuperAdminPassword = "Test-Password-123!";

    public MartsEndpointTests()
    {
        // A fresh throwaway database per test method (xUnit creates a new class instance per
        // [Fact]) - same technique as MigrationTests/TenantIsolationTests - so "list is empty"
        // is actually true, and tests never see another test's Marts.
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
        // Migrate and seed through a raw AppDbContext BEFORE touching _factory.Services -
        // accessing the factory starts the real host, which runs Program.cs's own
        // SuperAdminSeeder immediately against this database. If it doesn't exist/have the
        // SuperAdmins table yet, that seeder fails outright (same ordering issue MigrationTests
        // avoids the same way). Seeding our own SuperAdmin first also means the host's seeder
        // sees a non-empty table and no-ops, so it never needs SuperAdmin:Email/Password config.
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

    private async Task<HttpClient> SignedInClientAsync()
    {
        var client = _factory.CreateClient();
        var response = await client.PostAsJsonAsync(
            "/api/v1/super-admin/sign-in",
            new { email = _superAdminEmail, password = SuperAdminPassword });
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return client;
    }

    private static Dictionary<string, string> ValidCreateMartBody(string martName) => new()
    {
        ["martName"] = martName,
        ["ownerFirstName"] = "Test",
        ["ownerLastName"] = "Owner",
        ["ownerEmail"] = $"owner-{Guid.NewGuid():N}@example.com",
        ["ownerContact"] = "03001234567",
        ["ownerCnic"] = "12345-1234567-1",
    };

    [Fact]
    public async Task GetMarts_WithoutSession_ReturnsUnauthorized()
    {
        using var client = _factory.CreateClient();

        var response = await client.GetAsync("/api/v1/marts");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task GetMarts_WhenSignedIn_WithNoMarts_ReturnsEmptyList()
    {
        using var client = await SignedInClientAsync();

        var response = await client.GetAsync("/api/v1/marts");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var marts = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(JsonValueKind.Array, marts.ValueKind);
        Assert.Empty(marts.EnumerateArray());
    }

    [Fact]
    public async Task GetMarts_WhenSignedIn_AfterCreatingOne_ReturnsIt()
    {
        using var client = await SignedInClientAsync();
        var martName = $"Test Mart {Guid.NewGuid():N}";
        var createResponse = await client.PostAsJsonAsync("/api/v1/marts", ValidCreateMartBody(martName));
        Assert.Equal(HttpStatusCode.Created, createResponse.StatusCode);
        var created = await createResponse.Content.ReadFromJsonAsync<JsonElement>();
        var martId = created.GetProperty("martId").GetString();

        var listResponse = await client.GetAsync("/api/v1/marts");

        Assert.Equal(HttpStatusCode.OK, listResponse.StatusCode);
        var marts = await listResponse.Content.ReadFromJsonAsync<JsonElement>();
        var mart = Assert.Single(marts.EnumerateArray());
        Assert.Equal(martId, mart.GetProperty("id").GetString());
        Assert.Equal(martName, mart.GetProperty("name").GetString());
        Assert.Equal(6, mart.GetProperty("code").GetString()!.Length);
        // Contract's status values are lowercase ("active"/"suspended"), matching the frontend's
        // MartStatus type - not the raw C# enum member spelling.
        Assert.Equal("active", mart.GetProperty("status").GetString());
    }

    [Fact]
    public async Task CreateMart_WithoutSession_ReturnsUnauthorized()
    {
        using var client = _factory.CreateClient();

        var response = await client.PostAsJsonAsync("/api/v1/marts", ValidCreateMartBody($"Mart {Guid.NewGuid():N}"));

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task CreateMart_WithValidInput_CreatesMartAndOwner_WithGeneratedFields()
    {
        using var client = await SignedInClientAsync();
        var martName = $"Test Mart {Guid.NewGuid():N}";

        var response = await client.PostAsJsonAsync("/api/v1/marts", ValidCreateMartBody(martName));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();

        var martCode = body.GetProperty("martCode").GetString()!;
        Assert.Equal(6, martCode.Length);
        Assert.All(martCode, c => Assert.DoesNotContain(c, "0O1I"));

        Assert.Equal("1", body.GetProperty("ownerStaffId").GetString());
        Assert.False(string.IsNullOrWhiteSpace(body.GetProperty("setupCode").GetString()));

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var martId = Guid.Parse(body.GetProperty("martId").GetString()!);

        var owner = await db.Users.IgnoreQueryFilters().SingleAsync(u => u.MartId == martId);
        Assert.Equal("1234512345671", owner.Cnic); // stored digits-only, dashes stripped
        Assert.Equal(backend.Api.Modules.Identity.RoleIds.Owner, owner.RoleId);
        Assert.Null(owner.PasswordHash);
    }

    [Fact]
    public async Task CreateMart_WithDuplicateName_ReturnsMartNameError()
    {
        using var client = await SignedInClientAsync();
        var martName = $"Test Mart {Guid.NewGuid():N}";
        await client.PostAsJsonAsync("/api/v1/marts", ValidCreateMartBody(martName));

        var response = await client.PostAsJsonAsync("/api/v1/marts", ValidCreateMartBody(martName));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(
            "A Mart with this name already exists.",
            body.GetProperty("errors").GetProperty("martName").GetString());
    }

    [Theory]
    [InlineData("martName")]
    [InlineData("ownerFirstName")]
    [InlineData("ownerLastName")]
    [InlineData("ownerEmail")]
    [InlineData("ownerContact")]
    [InlineData("ownerCnic")]
    public async Task CreateMart_WithFieldMissing_ReturnsRequiredErrorForThatField(string missingField)
    {
        using var client = await SignedInClientAsync();
        var body = ValidCreateMartBody($"Mart {Guid.NewGuid():N}");
        body[missingField] = "";

        var response = await client.PostAsJsonAsync("/api/v1/marts", body);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var responseBody = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.True(responseBody.GetProperty("errors").TryGetProperty(missingField, out _));
    }

    [Theory]
    [InlineData("ownerEmail", "not-an-email")]
    [InlineData("ownerContact", "abc")]
    [InlineData("ownerCnic", "12345671234567")]
    public async Task CreateMart_WithInvalidFormat_ReturnsFormatErrorForThatField(string field, string invalidValue)
    {
        using var client = await SignedInClientAsync();
        var body = ValidCreateMartBody($"Mart {Guid.NewGuid():N}");
        body[field] = invalidValue;

        var response = await client.PostAsJsonAsync("/api/v1/marts", body);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var responseBody = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.True(responseBody.GetProperty("errors").TryGetProperty(field, out _));
    }
}
