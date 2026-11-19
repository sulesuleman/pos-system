using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using backend.Api.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace backend.Api.Tests;

public class MartSettingsEndpointTests : ApiTestFixtureBase
{
    private const string OwnerPassword = "Owner-Pass1!";

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

    [Fact]
    public async Task GetMartSettings_AsOwner_ReturnsDefaults()
    {
        var (ownerClient, _, _) = await SignedInOwnerClientAsync();

        var response = await ownerClient.GetAsync("/api/v1/mart-settings");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("PKR", body.GetProperty("currency").GetString());
        Assert.Equal("Asia/Karachi", body.GetProperty("defaultTimeZone").GetString());
        Assert.Equal(30, body.GetProperty("longPendingReturnMinutes").GetInt32());
    }

    [Fact]
    public async Task GetMartSettings_WithoutSignIn_ReturnsUnauthorized()
    {
        using var client = _factory.CreateClient();

        var response = await client.GetAsync("/api/v1/mart-settings");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task UpdateMartSettings_AsOwner_PersistsChanges()
    {
        var (ownerClient, ownerId, martId) = await SignedInOwnerClientAsync();

        var response = await ownerClient.PutAsJsonAsync(
            "/api/v1/mart-settings",
            new { currency = "USD", defaultTimeZone = "America/New_York", longPendingReturnMinutes = 45 });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("USD", body.GetProperty("currency").GetString());
        Assert.Equal("America/New_York", body.GetProperty("defaultTimeZone").GetString());
        Assert.Equal(45, body.GetProperty("longPendingReturnMinutes").GetInt32());

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var mart = await db.Marts.SingleAsync(m => m.Id == martId);
        Assert.Equal("USD", mart.Currency);

        var entry = await db.AuditLogEntries
            .IgnoreQueryFilters()
            .SingleAsync(e => e.MartId == martId && e.EntityType == "MartSettings" && e.Action == "Updated");
        Assert.Equal(ownerId, entry.UserId);
    }

    [Fact]
    public async Task UpdateMartSettings_WithInvalidLongPendingReturnMinutes_ReturnsBadRequest()
    {
        var (ownerClient, _, _) = await SignedInOwnerClientAsync();

        var response = await ownerClient.PutAsJsonAsync(
            "/api/v1/mart-settings",
            new { currency = "USD", defaultTimeZone = "Asia/Karachi", longPendingReturnMinutes = 0 });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task UpdateMartSettings_WithoutSignIn_ReturnsUnauthorized()
    {
        using var client = _factory.CreateClient();

        var response = await client.PutAsJsonAsync(
            "/api/v1/mart-settings",
            new { currency = "USD", defaultTimeZone = "Asia/Karachi", longPendingReturnMinutes = 45 });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }
}
