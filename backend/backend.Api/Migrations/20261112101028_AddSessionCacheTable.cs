using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddSessionCacheTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Backing table for ASP.NET Core Session via AddDistributedSqlServerCache. Not an
            // EF-mapped entity (SqlServerCache owns this schema itself), so it's created here as
            // raw DDL rather than via a DbSet. IF NOT EXISTS guards a machine where the table was
            // already created manually before this migration existed.
            migrationBuilder.Sql(
                """
                IF OBJECT_ID(N'[dbo].[SessionCache]') IS NULL
                BEGIN
                    CREATE TABLE [dbo].[SessionCache] (
                        [Id] NVARCHAR(449) NOT NULL,
                        [Value] VARBINARY(MAX) NOT NULL,
                        [ExpiresAtTime] DATETIMEOFFSET NOT NULL,
                        [SlidingExpirationInSeconds] BIGINT NULL,
                        [AbsoluteExpiration] DATETIMEOFFSET NULL,
                        CONSTRAINT [PK_SessionCache] PRIMARY KEY CLUSTERED ([Id] ASC)
                    );

                    CREATE NONCLUSTERED INDEX [IX_SessionCache_ExpiresAtTime]
                        ON [dbo].[SessionCache]([ExpiresAtTime]);
                END
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("DROP TABLE IF EXISTS [dbo].[SessionCache];");
        }
    }
}
