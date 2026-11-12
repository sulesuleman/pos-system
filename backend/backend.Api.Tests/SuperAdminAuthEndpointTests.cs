using System.Net;
using System.Net.Http.Json;
using backend.Api.Infrastructure.Persistence;
using backend.Api.Modules.Identity.Domain;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace backend.Api.Tests;

public class SuperAdminAuthEndpointTests : IAsyncLifetime
{
    private readonly WebApplicationFactory<Program> _factory = new();
    private readonly string _email = $"test-{Guid.NewGuid():N}@example.com";
    private const string Password = "Test-Password-123!";
    private Guid _superAdminId;

    public async Task InitializeAsync()
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var superAdmin = new SuperAdmin
        {
            Id = Guid.NewGuid(),
            Email = _email,
            PasswordHash = string.Empty,
            CreatedAtUtc = DateTime.UtcNow,
        };
        var hasher = new PasswordHasher<SuperAdmin>();
        superAdmin.PasswordHash = hasher.HashPassword(superAdmin, Password);

        db.SuperAdmins.Add(superAdmin);
        await db.SaveChangesAsync();
        _superAdminId = superAdmin.Id;
    }

    public async Task DisposeAsync()
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        db.PlatformAuditLogEntries.RemoveRange(
            db.PlatformAuditLogEntries.Where(e => e.SuperAdminId == _superAdminId));

        var superAdmin = await db.SuperAdmins.FindAsync(_superAdminId);
        if (superAdmin is not null)
        {
            db.SuperAdmins.Remove(superAdmin);
        }

        await db.SaveChangesAsync();
        await _factory.DisposeAsync();
    }

    [Fact]
    public async Task SignIn_WithCorrectCredentials_ReturnsOk()
    {
        using var client = _factory.CreateClient();

        var response = await client.PostAsJsonAsync(
            "/api/v1/super-admin/sign-in",
            new { email = _email, password = Password });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task SignIn_WithWrongPassword_ReturnsGenericUnauthorized()
    {
        using var client = _factory.CreateClient();

        var response = await client.PostAsJsonAsync(
            "/api/v1/super-admin/sign-in",
            new { email = _email, password = "wrong-password" });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task SignIn_WithUnknownEmail_ReturnsSameGenericUnauthorized()
    {
        using var client = _factory.CreateClient();

        var response = await client.PostAsJsonAsync(
            "/api/v1/super-admin/sign-in",
            new { email = $"unknown-{Guid.NewGuid():N}@example.com", password = Password });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Session_WithNoPriorSignIn_ReturnsUnauthorized()
    {
        using var client = _factory.CreateClient();

        var response = await client.GetAsync("/api/v1/super-admin/session");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Session_AfterSignIn_ReturnsOk()
    {
        using var client = _factory.CreateClient();
        await client.PostAsJsonAsync("/api/v1/super-admin/sign-in", new { email = _email, password = Password });

        var response = await client.GetAsync("/api/v1/super-admin/session");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task SignOut_ClearsSession()
    {
        using var client = _factory.CreateClient();
        await client.PostAsJsonAsync("/api/v1/super-admin/sign-in", new { email = _email, password = Password });

        var signOutResponse = await client.PostAsync("/api/v1/super-admin/sign-out", null);
        var sessionResponse = await client.GetAsync("/api/v1/super-admin/session");

        Assert.Equal(HttpStatusCode.NoContent, signOutResponse.StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, sessionResponse.StatusCode);
    }
}
