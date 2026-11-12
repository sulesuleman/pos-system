using backend.Api.Infrastructure.Persistence;
using backend.Api.Modules.Identity.Domain;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace backend.Api.Modules.Identity;

public class SuperAdminSeeder
{
    public static async Task EnsureSeededAsync(AppDbContext db, IConfiguration config)
    {
        if (await db.SuperAdmins.AnyAsync())
        {
            return;
        }

        var email = config["SuperAdmin:Email"];
        var password = config["SuperAdmin:Password"];
        if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(password))
        {
            throw new InvalidOperationException(
                 "SuperAdmin:Email and SuperAdmin:Password must be configured (e.g. via dotnet user-secrets) to seed the first Super Admin.");
        }

        var superAdmin = new SuperAdmin
        {
            Id = Guid.NewGuid(),
            Email = email,
            PasswordHash = string.Empty,
            CreatedAtUtc = DateTime.UtcNow,
        };

        var hasher = new PasswordHasher<SuperAdmin>();
        superAdmin.PasswordHash = hasher.HashPassword(superAdmin, password);

        db.SuperAdmins.Add(superAdmin);
        await db.SaveChangesAsync();
    }
}
