using backend.Api.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Data.SqlClient;
using Xunit;

namespace backend.IntegrationTests;

public class MigrationTests
{
    [Fact]
    public async Task ApplyingMigrations_CreatesMigrationsHistoryTable()
    {
        var databaseName = $"PosSystem_IntegrationTests_{Guid.NewGuid():N}";

        // Reuses whatever connection string points at the test SQL Server instance (local Windows Auth,
        // or CI's sa/password one via ConnectionStrings__DefaultConnection), swapping in a throwaway database name.
        var baseConnectionString = Environment.GetEnvironmentVariable("ConnectionStrings__DefaultConnection")
            ?? "Server=localhost;Database=PosSystem;Trusted_Connection=True;TrustServerCertificate=True;";
        var connectionStringBuilder = new SqlConnectionStringBuilder(baseConnectionString)
        {
            InitialCatalog = databaseName,
        };
        var connectionString = connectionStringBuilder.ConnectionString;

        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlServer(connectionString)
            .Options;

        try
        {
            await using (var context = new AppDbContext(options))
            {
                await context.Database.MigrateAsync();
            }

            await using var connection = new SqlConnection(connectionString);
            await connection.OpenAsync();
            await using var command = connection.CreateCommand();
            command.CommandText = "SELECT OBJECT_ID(N'[__EFMigrationsHistory]')";
            var result = await command.ExecuteScalarAsync();

            Assert.NotNull(result);
            Assert.IsNotType<DBNull>(result);
        }
        finally
        {
            await using var context = new AppDbContext(options);
            await context.Database.EnsureDeletedAsync();
        }
    }
}
