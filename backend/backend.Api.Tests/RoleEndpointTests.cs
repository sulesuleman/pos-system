using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using backend.Api.Infrastructure.Persistence;
using backend.Api.Modules.Identity;
using backend.Api.Modules.Identity.Domain;
using backend.Api.Modules.Tenancy.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace backend.Api.Tests;

// Story 2.1 (FR-1, AD-5): the Owner builds Roles from the fixed 14-Permission list. Covers
// GET /roles, GET /permissions, POST /roles (custom Role) and PUT /roles/{id} - including the
// fork-on-edit behavior for the 3 globally-shared built-in Roles (see RoleEndpoints' own comment
// on why editing one can never mutate it in place).
public class RoleEndpointTests : ApiTestFixtureBase
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

    private async Task<(HttpClient Client, Guid MartId)> SignedInOwnerClientAsync()
    {
        var ownerEmail = $"owner-{Guid.NewGuid():N}@example.com";

        using var superAdminClient = _factory.CreateClient();
        await superAdminClient.PostAsJsonAsync("/api/v1/super-admin/sign-in", new { email = _superAdminEmail, password = SuperAdminPassword });
        var createResponse = await superAdminClient.PostAsJsonAsync("/api/v1/marts", ValidCreateMartBody($"Test Mart {Guid.NewGuid():N}", ownerEmail));
        var createBody = await createResponse.Content.ReadFromJsonAsync<JsonElement>();
        var martCode = createBody.GetProperty("martCode").GetString()!;
        var setupCode = createBody.GetProperty("setupCode").GetString()!;
        var martId = Guid.Parse(createBody.GetProperty("martId").GetString()!);

        var client = _factory.CreateClient();
        await client.PostAsJsonAsync("/api/v1/auth/activate", new { martCode, email = ownerEmail, setupCode, password = OwnerPassword });
        await client.PostAsJsonAsync("/api/v1/auth/sign-in", new { martCode, email = ownerEmail, password = OwnerPassword });

        return (client, martId);
    }

    [Fact]
    public async Task GetRoles_SignedInAsOwner_ListsTheThreeBuiltInRolesWithTheirPermissions()
    {
        var (ownerClient, _) = await SignedInOwnerClientAsync();

        var response = await ownerClient.GetAsync("/api/v1/roles");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var roles = (await response.Content.ReadFromJsonAsync<JsonElement>()).EnumerateArray().ToList();
        var manager = Assert.Single(roles, r => r.GetProperty("name").GetString() == "Manager");
        Assert.True(manager.GetProperty("isSystemDefault").GetBoolean());
        Assert.Equal(13, manager.GetProperty("permissionIds").GetArrayLength());
        var cashier = Assert.Single(roles, r => r.GetProperty("name").GetString() == "Cashier");
        Assert.Equal(2, cashier.GetProperty("permissionIds").GetArrayLength());
        Assert.Single(roles, r => r.GetProperty("name").GetString() == "Owner");
    }

    [Fact]
    public async Task GetPermissions_ReturnsAllFourteenFixedPermissions()
    {
        var (ownerClient, _) = await SignedInOwnerClientAsync();

        var response = await ownerClient.GetAsync("/api/v1/permissions");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var permissions = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(14, permissions.EnumerateArray().Count());
    }

    [Fact]
    public async Task CreateRole_WithValidData_CreatesACustomRoleScopedToThisMart()
    {
        var (ownerClient, _) = await SignedInOwnerClientAsync();

        var response = await ownerClient.PostAsJsonAsync(
            "/api/v1/roles",
            new { name = "Shift Lead", permissionIds = new[] { PermissionIds.Sell, PermissionIds.CloseShifts } });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("Shift Lead", body.GetProperty("name").GetString());
        Assert.False(body.GetProperty("isSystemDefault").GetBoolean());
        Assert.Equal(2, body.GetProperty("permissionIds").GetArrayLength());
    }

    [Fact]
    public async Task CreateRole_WithDuplicateNameInTheSameMart_ReturnsBadRequest()
    {
        var (ownerClient, _) = await SignedInOwnerClientAsync();
        await ownerClient.PostAsJsonAsync("/api/v1/roles", new { name = "Shift Lead", permissionIds = new[] { PermissionIds.Sell } });

        var response = await ownerClient.PostAsJsonAsync("/api/v1/roles", new { name = "Shift Lead", permissionIds = new[] { PermissionIds.CloseShifts } });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.True(body.GetProperty("errors").TryGetProperty("name", out _));
    }

    [Fact]
    public async Task CreateRole_WithNoPermissions_ReturnsBadRequest()
    {
        var (ownerClient, _) = await SignedInOwnerClientAsync();

        var response = await ownerClient.PostAsJsonAsync("/api/v1/roles", new { name = "Empty Role", permissionIds = Array.Empty<Guid>() });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.True(body.GetProperty("errors").TryGetProperty("permissionIds", out _));
    }

    [Fact]
    public async Task CreateRole_WithoutStaffAndRolesPermission_ReturnsUnauthorized()
    {
        using var client = _factory.CreateClient();

        var response = await client.PostAsJsonAsync("/api/v1/roles", new { name = "Shift Lead", permissionIds = new[] { PermissionIds.Sell } });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task UpdateRole_CustomRole_RenamesAndReplacesItsPermissions()
    {
        var (ownerClient, _) = await SignedInOwnerClientAsync();
        var createResponse = await ownerClient.PostAsJsonAsync("/api/v1/roles", new { name = "Shift Lead", permissionIds = new[] { PermissionIds.Sell } });
        var roleId = (await createResponse.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();

        var response = await ownerClient.PutAsJsonAsync(
            $"/api/v1/roles/{roleId}",
            new { name = "Senior Shift Lead", permissionIds = new[] { PermissionIds.Sell, PermissionIds.CloseShifts } });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(roleId, body.GetProperty("id").GetGuid());
        Assert.Equal("Senior Shift Lead", body.GetProperty("name").GetString());
        Assert.Equal(2, body.GetProperty("permissionIds").GetArrayLength());
    }

    [Fact]
    public async Task UpdateRole_OwnerRole_IsRefused()
    {
        var (ownerClient, _) = await SignedInOwnerClientAsync();

        var response = await ownerClient.PutAsJsonAsync(
            $"/api/v1/roles/{RoleIds.Owner}",
            new { name = "Owner", permissionIds = new[] { PermissionIds.Sell } });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    // The Manager Role is shared globally (Role.MartId == null) across every Mart. Editing it
    // must never mutate that shared row - instead it forks a new Mart-scoped Role, and every
    // User in THIS Mart who held the built-in Manager Role is re-pointed onto the fork, so the
    // "edit" actually takes effect for them.
    [Fact]
    public async Task UpdateRole_BuiltInManagerRole_ForksANewMartScopedRoleAndRepointsThisMartsUsers()
    {
        var (ownerClient, martId) = await SignedInOwnerClientAsync();

        Guid branchId;
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var branch = new Branch { Id = Guid.NewGuid(), MartId = martId, Name = "Main Branch", Location = "Test", TimeZone = "Asia/Karachi", IsActive = true, CreatedAtUtc = DateTime.UtcNow };
            db.Branches.Add(branch);
            await db.SaveChangesAsync();
            branchId = branch.Id;
        }

        var managerEmail = $"manager-{Guid.NewGuid():N}@example.com";
        var createStaffResponse = await ownerClient.PostAsJsonAsync(
            "/api/v1/staff",
            new { firstName = "Manager", lastName = "Person", email = managerEmail, contact = "03001234567", cnic = "12345-1234567-1", roleId = RoleIds.Manager, branchId });
        var managerId = Guid.Parse((await createStaffResponse.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("userId").GetString()!);

        var response = await ownerClient.PutAsJsonAsync(
            $"/api/v1/roles/{RoleIds.Manager}",
            new { name = "Manager", permissionIds = new[] { PermissionIds.Sell } });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        var forkedRoleId = body.GetProperty("id").GetGuid();
        Assert.NotEqual(RoleIds.Manager, forkedRoleId);
        Assert.Single(body.GetProperty("permissionIds").EnumerateArray());

        using var verifyScope = _factory.Services.CreateScope();
        var verifyDb = verifyScope.ServiceProvider.GetRequiredService<AppDbContext>();
        var manager = await verifyDb.Users.IgnoreQueryFilters().SingleAsync(u => u.Id == managerId);
        Assert.Equal(forkedRoleId, manager.RoleId);

        // The global built-in Manager Role itself (and its original permission set) must still
        // exist unchanged, for every other Mart that still references it.
        var builtInManager = await verifyDb.Roles.IgnoreQueryFilters().SingleAsync(r => r.Id == RoleIds.Manager);
        Assert.Null(builtInManager.MartId);
        var builtInPermissionCount = await verifyDb.RolePermissions.CountAsync(rp => rp.RoleId == RoleIds.Manager);
        Assert.Equal(13, builtInPermissionCount);
    }

    [Fact]
    public async Task CreateStaff_WithACustomRoleId_AssignsThatRoleInsteadOfManager()
    {
        var (ownerClient, martId) = await SignedInOwnerClientAsync();
        var createRoleResponse = await ownerClient.PostAsJsonAsync(
            "/api/v1/roles",
            new { name = "Shift Lead", permissionIds = new[] { PermissionIds.Sell, PermissionIds.ManageStaffAndRoles } });
        var customRoleId = (await createRoleResponse.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();

        Guid branchId;
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var branch = new Branch { Id = Guid.NewGuid(), MartId = martId, Name = "Main Branch", Location = "Test", TimeZone = "Asia/Karachi", IsActive = true, CreatedAtUtc = DateTime.UtcNow };
            db.Branches.Add(branch);
            await db.SaveChangesAsync();
            branchId = branch.Id;
        }

        var response = await ownerClient.PostAsJsonAsync(
            "/api/v1/staff",
            new { firstName = "Shift", lastName = "Lead", email = $"lead-{Guid.NewGuid():N}@example.com", contact = "03001234567", cnic = "12345-1234567-1", roleId = customRoleId, branchId });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var userId = Guid.Parse((await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("userId").GetString()!);

        using var verifyScope = _factory.Services.CreateScope();
        var verifyDb = verifyScope.ServiceProvider.GetRequiredService<AppDbContext>();
        var user = await verifyDb.Users.IgnoreQueryFilters().SingleAsync(u => u.Id == userId);
        Assert.Equal(customRoleId, user.RoleId);
    }

    [Fact]
    public async Task CreateStaff_WithRoleIdOwner_ReturnsBadRequest()
    {
        var (ownerClient, martId) = await SignedInOwnerClientAsync();
        Guid branchId;
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var branch = new Branch { Id = Guid.NewGuid(), MartId = martId, Name = "Main Branch", Location = "Test", TimeZone = "Asia/Karachi", IsActive = true, CreatedAtUtc = DateTime.UtcNow };
            db.Branches.Add(branch);
            await db.SaveChangesAsync();
            branchId = branch.Id;
        }

        var response = await ownerClient.PostAsJsonAsync(
            "/api/v1/staff",
            new { firstName = "Blocked", lastName = "Owner", email = $"blocked-{Guid.NewGuid():N}@example.com", contact = "03001234567", cnic = "12345-1234567-1", roleId = RoleIds.Owner, branchId });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.True(body.GetProperty("errors").TryGetProperty("roleId", out _));
    }
}
