using backend.Api.Infrastructure.Persistence;
using backend.Api.Modules.Identity.Domain;
using Microsoft.AspNetCore.Identity;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;

namespace backend.Api.Modules.Identity;

public class SuperAdminSeeder
{
    // SQL Server error numbers for a unique-index/constraint violation.
    private const int UniqueConstraintViolation = 2627;
    private const int UniqueIndexViolation = 2601;

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

        try
        {
            await db.SaveChangesAsync();
        }
        catch (DbUpdateException ex) when (ex.InnerException is SqlException sqlEx &&
            (sqlEx.Number == UniqueConstraintViolation || sqlEx.Number == UniqueIndexViolation))
        {
            // Two app instances (or, in tests, two concurrently-started WebApplicationFactory
            // hosts) can both see an empty table and both try to seed at once. The first one to
            // commit wins; this one lost the race, which is fine - the table is seeded either way.
        }
    }
}
