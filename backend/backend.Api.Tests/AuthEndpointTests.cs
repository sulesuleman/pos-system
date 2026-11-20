using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using backend.Api.Infrastructure.Persistence;
using backend.Api.Modules.Identity;
using backend.Api.Modules.Identity.Domain;
using backend.Api.Modules.Tenancy.Domain;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace backend.Api.Tests;

// Renamed/generalized from OwnerAuthEndpointTests - /auth/* now serves both Owner and Manager
// (AD-15), so these tests exercise the shared activate/sign-in/sign-out/session behavior through
// an Owner by default, plus a dedicated section proving a Manager works through the exact same
// endpoints (see "Manager via the shared /auth endpoints" below).
public class AuthEndpointTests : ApiTestFixtureBase
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
    public async Task Activate_AgainstSuspendedMart_ReturnsMartSuspendedForbidden()
    {
        var ownerEmail = $"owner-{Guid.NewGuid():N}@example.com";
        var (martCode, setupCode, martId) = await CreateMartAndOwnerAsync(ownerEmail);
        await SuspendMartAsync(martId);
        using var client = _factory.CreateClient();

        var response = await client.PostAsJsonAsync(
            "/api/v1/auth/activate",
            new { martCode, email = ownerEmail, setupCode, password = OwnerPassword });

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("This Mart has been suspended. Contact the platform administrator for help.", body.GetProperty("error").GetString());
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
    public async Task SignIn_AgainstSuspendedMart_ReturnsMartSuspendedForbidden()
    {
        var ownerEmail = $"owner-{Guid.NewGuid():N}@example.com";
        var (martCode, setupCode, martId) = await CreateMartAndOwnerAsync(ownerEmail);
        await ActivateAsync(martCode, ownerEmail, setupCode);
        await SuspendMartAsync(martId);
        using var client = _factory.CreateClient();

        var response = await client.PostAsJsonAsync(
            "/api/v1/auth/sign-in",
            new { martCode, email = ownerEmail, password = OwnerPassword });

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("This Mart has been suspended. Contact the platform administrator for help.", body.GetProperty("error").GetString());
    }

    [Fact]
    public async Task SignedInUser_AfterMartIsSuspendedMidSession_IsRefusedOnNextRequest()
    {
        var ownerEmail = $"owner-{Guid.NewGuid():N}@example.com";
        var (martCode, setupCode, martId) = await CreateMartAndOwnerAsync(ownerEmail);
        await ActivateAsync(martCode, ownerEmail, setupCode);
        using var client = _factory.CreateClient();
        var signInResponse = await client.PostAsJsonAsync(
            "/api/v1/auth/sign-in",
            new { martCode, email = ownerEmail, password = OwnerPassword });
        Assert.Equal(HttpStatusCode.OK, signInResponse.StatusCode);

        await SuspendMartAsync(martId);

        var response = await client.GetAsync("/api/v1/auth/session");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("This Mart has been suspended. Contact the platform administrator for help.", body.GetProperty("error").GetString());
    }

    [Fact]
    public async Task SuspendingOneMart_DoesNotAffectSignInToAnotherMart()
    {
        var suspendedOwnerEmail = $"owner-{Guid.NewGuid():N}@example.com";
        var unaffectedOwnerEmail = $"owner-{Guid.NewGuid():N}@example.com";
        var (suspendedMartCode, suspendedSetupCode, suspendedMartId) = await CreateMartAndOwnerAsync(suspendedOwnerEmail);
        var (unaffectedMartCode, unaffectedSetupCode, _) = await CreateMartAndOwnerAsync(unaffectedOwnerEmail);
        await ActivateAsync(suspendedMartCode, suspendedOwnerEmail, suspendedSetupCode);
        await ActivateAsync(unaffectedMartCode, unaffectedOwnerEmail, unaffectedSetupCode);
        await SuspendMartAsync(suspendedMartId);
        using var client = _factory.CreateClient();

        var response = await client.PostAsJsonAsync(
            "/api/v1/auth/sign-in",
            new { martCode = unaffectedMartCode, email = unaffectedOwnerEmail, password = OwnerPassword });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
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
        var branchId = await CreateBranchForOwnerAsync(ownerEmail);

        var response = await ownerClient.PostAsJsonAsync(
            "/api/v1/staff",
            new { firstName = "Manager", lastName = "Person", email = managerEmail, contact = "03001234567", cnic = "12345-1234567-1", roleId = RoleIds.Manager, branchId });
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        return (
            Guid.Parse(body.GetProperty("userId").GetString()!),
            body.GetProperty("staffId").GetString()!,
            body.GetProperty("setupCode").GetString()!);
    }

    // No Branch-creation endpoint exists yet (Story 1.6) - seed one directly so CreateStaff has
    // somewhere to assign the new Manager into, same as this story's Owner-must-choose-a-Branch rule.
    private async Task<Guid> CreateBranchForOwnerAsync(string ownerEmail)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var owner = await db.Users.IgnoreQueryFilters().SingleAsync(u => u.Email == ownerEmail);

        var branch = new Branch
        {
            Id = Guid.NewGuid(),
            MartId = owner.MartId,
            Name = "Main Branch",
            Location = "Test Location",
            TimeZone = "Asia/Karachi",
            IsActive = true,
            CreatedByUserId = owner.Id,
            CreatedAtUtc = DateTime.UtcNow,
        };
        db.Branches.Add(branch);
        await db.SaveChangesAsync();
        return branch.Id;
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
    public async Task CreateStaff_WritesAnAuditLogEntry()
    {
        var ownerEmail = $"owner-{Guid.NewGuid():N}@example.com";
        var (martCode, ownerSetupCode, martId) = await CreateMartAndOwnerAsync(ownerEmail);
        await ActivateAsync(martCode, ownerEmail, ownerSetupCode);
        using var ownerClient = _factory.CreateClient();
        await ownerClient.PostAsJsonAsync(
            "/api/v1/auth/sign-in",
            new { martCode, email = ownerEmail, password = OwnerPassword });

        var managerEmail = $"manager-{Guid.NewGuid():N}@example.com";
        var (managerId, _, _) = await CreateManagerAsync(martCode, ownerEmail, ownerClient, managerEmail);

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var entry = await db.AuditLogEntries
            .IgnoreQueryFilters()
            .SingleAsync(e => e.MartId == martId && e.EntityType == "User" && e.EntityId == managerId);
        Assert.Equal("Created", entry.Action);
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

    // AD-16: Manager's seeded RolePermissions include "manage staff and Roles" (every Permission
    // except "view dashboard"), so a Manager can now create staff too, inheriting their own
    // BranchId - this used to be Owner-only (AD-15 baseline) and is deliberately no longer.
    [Fact]
    public async Task CreateStaff_SignedInAsManager_WithStaffPermission_Succeeds()
    {
        var ownerEmail = $"owner-{Guid.NewGuid():N}@example.com";
        var (martCode, ownerSetupCode, _) = await CreateMartAndOwnerAsync(ownerEmail);
        await ActivateAsync(martCode, ownerEmail, ownerSetupCode);
        using var ownerClient = _factory.CreateClient();
        await ownerClient.PostAsJsonAsync(
            "/api/v1/auth/sign-in",
            new { martCode, email = ownerEmail, password = OwnerPassword });

        var managerEmail = $"manager-{Guid.NewGuid():N}@example.com";
        var (managerId, _, managerSetupCode) = await CreateManagerAsync(martCode, ownerEmail, ownerClient, managerEmail);
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
            new { firstName = "Another", lastName = "Manager", email = $"m2-{Guid.NewGuid():N}@example.com", contact = "03001234567", cnic = "12345-1234567-1", roleId = RoleIds.Manager });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var newStaff = await db.Users.IgnoreQueryFilters().SingleAsync(u => u.Id == managerId);
        var secondStaff = await response.Content.ReadFromJsonAsync<JsonElement>();
        var secondStaffUser = await db.Users.IgnoreQueryFilters()
            .SingleAsync(u => u.Id == Guid.Parse(secondStaff.GetProperty("userId").GetString()!));
        Assert.Equal(newStaff.BranchId, secondStaffUser.BranchId);
    }

    // A custom Role with no RolePermissions row for "manage staff and Roles" must be refused -
    // the negative side of the AD-16 Permission check (no custom-Role CRUD UI yet, so this seeds
    // the Role/User directly, same as CreateBranchForOwnerAsync does for Branches).
    [Fact]
    public async Task CreateStaff_SignedInAsRoleWithoutStaffPermission_ReturnsUnauthorized()
    {
        var ownerEmail = $"owner-{Guid.NewGuid():N}@example.com";
        var (martCode, ownerSetupCode, martId) = await CreateMartAndOwnerAsync(ownerEmail);
        await ActivateAsync(martCode, ownerEmail, ownerSetupCode);
        var branchId = await CreateBranchForOwnerAsync(ownerEmail);

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
        var signInResponse = await traineeClient.PostAsJsonAsync(
            "/api/v1/auth/sign-in",
            new { martCode, email = traineeEmail, password = traineePassword });
        Assert.Equal(HttpStatusCode.OK, signInResponse.StatusCode);

        var response = await traineeClient.PostAsJsonAsync(
            "/api/v1/staff",
            new { firstName = "Blocked", lastName = "Staff", email = $"blocked-{Guid.NewGuid():N}@example.com", contact = "03001234567", cnic = "12345-1234567-1" });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task CreateStaff_AsOwner_WithoutBranchId_ReturnsBadRequest()
    {
        var ownerEmail = $"owner-{Guid.NewGuid():N}@example.com";
        var (martCode, ownerSetupCode, _) = await CreateMartAndOwnerAsync(ownerEmail);
        await ActivateAsync(martCode, ownerEmail, ownerSetupCode);
        await CreateBranchForOwnerAsync(ownerEmail);
        using var ownerClient = _factory.CreateClient();
        await ownerClient.PostAsJsonAsync(
            "/api/v1/auth/sign-in",
            new { martCode, email = ownerEmail, password = OwnerPassword });

        var response = await ownerClient.PostAsJsonAsync(
            "/api/v1/staff",
            new { firstName = "Manager", lastName = "Person", email = $"manager-{Guid.NewGuid():N}@example.com", contact = "03001234567", cnic = "12345-1234567-1", roleId = RoleIds.Manager });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.True(body.GetProperty("errors").TryGetProperty("branchId", out _));
    }

    [Fact]
    public async Task CreateStaff_AsOwner_WithInactiveBranchId_ReturnsBadRequest()
    {
        var ownerEmail = $"owner-{Guid.NewGuid():N}@example.com";
        var (martCode, ownerSetupCode, martId) = await CreateMartAndOwnerAsync(ownerEmail);
        await ActivateAsync(martCode, ownerEmail, ownerSetupCode);
        using var ownerClient = _factory.CreateClient();
        await ownerClient.PostAsJsonAsync(
            "/api/v1/auth/sign-in",
            new { martCode, email = ownerEmail, password = OwnerPassword });

        Guid inactiveBranchId;
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var branch = new Branch
            {
                Id = Guid.NewGuid(),
                MartId = martId,
                Name = "Closed Branch",
                Location = "Test Location",
                TimeZone = "Asia/Karachi",
                IsActive = false,
                CreatedAtUtc = DateTime.UtcNow,
            };
            db.Branches.Add(branch);
            await db.SaveChangesAsync();
            inactiveBranchId = branch.Id;
        }

        var response = await ownerClient.PostAsJsonAsync(
            "/api/v1/staff",
            new { firstName = "Manager", lastName = "Person", email = $"manager-{Guid.NewGuid():N}@example.com", contact = "03001234567", cnic = "12345-1234567-1", roleId = RoleIds.Manager, branchId = inactiveBranchId });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    // Regression test for a real cross-Mart leak found 2026-11-18: GetStaff's Join used to call
    // IgnoreQueryFilters() on the Roles side, which disabled EF Core's tenant filter for the
    // whole composed query (including Users), so every Owner saw every Mart's staff. See the
    // fix's comment in StaffEndpoints.GetStaff.
    [Fact]
    public async Task GetStaff_IsolatedBetweenMarts_OnlyReturnsOwnMartsOwner()
    {
        var ownerEmailA = $"owner-{Guid.NewGuid():N}@example.com";
        var (martCodeA, setupCodeA, _) = await CreateMartAndOwnerAsync(ownerEmailA);
        await ActivateAsync(martCodeA, ownerEmailA, setupCodeA);
        using var clientA = _factory.CreateClient();
        await clientA.PostAsJsonAsync("/api/v1/auth/sign-in", new { martCode = martCodeA, email = ownerEmailA, password = OwnerPassword });

        var ownerEmailB = $"owner-{Guid.NewGuid():N}@example.com";
        var (martCodeB, setupCodeB, _) = await CreateMartAndOwnerAsync(ownerEmailB);
        await ActivateAsync(martCodeB, ownerEmailB, setupCodeB);
        using var clientB = _factory.CreateClient();
        await clientB.PostAsJsonAsync("/api/v1/auth/sign-in", new { martCode = martCodeB, email = ownerEmailB, password = OwnerPassword });

        var response = await clientA.GetAsync("/api/v1/staff");
        var staff = await response.Content.ReadFromJsonAsync<JsonElement>();
        var owner = Assert.Single(staff.EnumerateArray());
        Assert.Equal(ownerEmailA, owner.GetProperty("email").GetString());
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

    // Story 2.4 (AD-5): a Branch-scoped User (BranchId != null) must only ever see their own
    // Branch's data - GetStaff used to return the whole Mart's staff to anyone holding "manage
    // staff and Roles", including a Branch-scoped Manager. CreateManagerAsync seeds a fresh
    // Branch per call, so the two Managers here land in different Branches for free.
    [Fact]
    public async Task GetStaff_SignedInAsBranchScopedManager_OnlyListsOwnBranchsStaff()
    {
        var ownerEmail = $"owner-{Guid.NewGuid():N}@example.com";
        var (martCode, ownerSetupCode, _) = await CreateMartAndOwnerAsync(ownerEmail);
        await ActivateAsync(martCode, ownerEmail, ownerSetupCode);
        using var ownerClient = _factory.CreateClient();
        await ownerClient.PostAsJsonAsync(
            "/api/v1/auth/sign-in",
            new { martCode, email = ownerEmail, password = OwnerPassword });

        var manager1Email = $"manager1-{Guid.NewGuid():N}@example.com";
        var (_, _, manager1SetupCode) = await CreateManagerAsync(martCode, ownerEmail, ownerClient, manager1Email);
        var manager2Email = $"manager2-{Guid.NewGuid():N}@example.com";
        await CreateManagerAsync(martCode, ownerEmail, ownerClient, manager2Email);

        const string managerPassword = "Manager-Pass1!";
        using var manager1Client = _factory.CreateClient();
        await manager1Client.PostAsJsonAsync(
            "/api/v1/auth/activate",
            new { martCode, email = manager1Email, setupCode = manager1SetupCode, password = managerPassword });
        await manager1Client.PostAsJsonAsync(
            "/api/v1/auth/sign-in",
            new { martCode, email = manager1Email, password = managerPassword });

        var response = await manager1Client.GetAsync("/api/v1/staff");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var staff = await response.Content.ReadFromJsonAsync<JsonElement>();
        var entries = staff.EnumerateArray().ToList();
        var entry = Assert.Single(entries);
        Assert.Equal(manager1Email, entry.GetProperty("email").GetString());
    }
}
