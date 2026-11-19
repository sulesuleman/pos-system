using System.Linq;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using backend.Api.Infrastructure.Persistence;
using backend.Api.Modules.AuditLog.Domain;
using backend.Api.Modules.Identity.Domain;
using backend.Api.Modules.Tenancy.Domain;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace backend.Api.Tests;

public class AuditLogEndpointTests : ApiTestFixtureBase
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

    // Regression coverage for the fix that replaced this endpoint's hardcoded Owner-only check
    // with UserAuthorization.HasPermissionAsync(PermissionIds.ViewAuditLog) - same pattern
    // BranchesEndpoints/StaffEndpoints already use. Manager is seeded with ViewAuditLog (AD-16).
    [Fact]
    public async Task GetAuditLog_SignedInAsManager_WithViewAuditLogPermission_Succeeds()
    {
        var ownerEmail = $"owner-{Guid.NewGuid():N}@example.com";
        var (martCode, ownerSetupCode, martId) = await CreateMartAndOwnerAsync(ownerEmail);
        using var ownerClient = _factory.CreateClient();
        await ownerClient.PostAsJsonAsync("/api/v1/auth/activate", new { martCode, email = ownerEmail, setupCode = ownerSetupCode, password = OwnerPassword });
        var ownerSignInResponse = await ownerClient.PostAsJsonAsync("/api/v1/auth/sign-in", new { martCode, email = ownerEmail, password = OwnerPassword });
        var ownerBody = await ownerSignInResponse.Content.ReadFromJsonAsync<JsonElement>();
        var ownerId = Guid.Parse(ownerBody.GetProperty("userId").GetString()!);

        Guid branchId;
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var branch = new Branch
            {
                Id = Guid.NewGuid(),
                MartId = martId,
                Name = "Main Branch",
                Location = "Test Location",
                TimeZone = "Asia/Karachi",
                IsActive = true,
                CreatedByUserId = ownerId,
                CreatedAtUtc = DateTime.UtcNow,
            };
            db.Branches.Add(branch);
            await db.SaveChangesAsync();
            branchId = branch.Id;
        }

        var managerEmail = $"manager-{Guid.NewGuid():N}@example.com";
        var createStaffResponse = await ownerClient.PostAsJsonAsync(
            "/api/v1/staff",
            new { firstName = "Manager", lastName = "Person", email = managerEmail, contact = "03001234567", cnic = "12345-1234567-1", branchId });
        Assert.Equal(HttpStatusCode.Created, createStaffResponse.StatusCode);
        var staffBody = await createStaffResponse.Content.ReadFromJsonAsync<JsonElement>();
        var managerSetupCode = staffBody.GetProperty("setupCode").GetString()!;

        const string managerPassword = "Manager-Pass1!";
        using var managerClient = _factory.CreateClient();
        await managerClient.PostAsJsonAsync("/api/v1/auth/activate", new { martCode, email = managerEmail, setupCode = managerSetupCode, password = managerPassword });
        await managerClient.PostAsJsonAsync("/api/v1/auth/sign-in", new { martCode, email = managerEmail, password = managerPassword });

        var response = await managerClient.GetAsync("/api/v1/audit-log");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    // The negative side of the same fix - a custom Role with no RolePermissions row for
    // ViewAuditLog must still be refused (same throwaway-custom-Role technique AuthEndpointTests'
    // own CreateStaff_SignedInAsRoleWithoutStaffPermission_ReturnsUnauthorized uses).
    [Fact]
    public async Task GetAuditLog_SignedInAsRoleWithoutViewAuditLogPermission_ReturnsUnauthorized()
    {
        var ownerEmail = $"owner-{Guid.NewGuid():N}@example.com";
        var (martCode, _, martId) = await CreateMartAndOwnerAsync(ownerEmail);

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
        var signInResponse = await traineeClient.PostAsJsonAsync("/api/v1/auth/sign-in", new { martCode, email = traineeEmail, password = traineePassword });
        Assert.Equal(HttpStatusCode.OK, signInResponse.StatusCode);

        var response = await traineeClient.GetAsync("/api/v1/audit-log");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    // The new skip/take parameters, added alongside the Permission fix, cap how much history one
    // response can return - defaulting to DefaultPageSize (50) and clamped to MaxPageSize (200)
    // regardless of what the caller asks for.
    [Fact]
    public async Task GetAuditLog_Take_LimitsHowManyEntriesComeBack()
    {
        var (client, userId, martId) = await SignedInOwnerClientAsync();
        await AddEntryAsync(martId, userId, "Branch", "Created");
        await AddEntryAsync(martId, userId, "Branch", "Updated");
        await AddEntryAsync(martId, userId, "Branch", "Deactivated");

        var response = await client.GetAsync("/api/v1/audit-log?take=2");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var entries = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(2, entries.EnumerateArray().Count());
    }
}
