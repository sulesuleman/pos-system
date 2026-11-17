using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace backend.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddRolesAndConvertOwnersToUsers : Migration
    {
        // Hand-edited after scaffolding: the scaffolded version did DropTable("Owners") then
        // CreateTable("Users"), which would destroy every existing Owner row (including the
        // live "Imtiaz Cash and Carry" one). Nothing holds a real FK into Owners.Id today
        // (PlatformAuditLogEntry stores plain AttemptedEmail/AttemptedMartCode strings, not an
        // Owner FK), so renaming the table in place is safe and preserves existing rows and Ids.
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Roles",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    MartId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    Name = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    IsSystemDefault = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Roles", x => x.Id);
                });

            migrationBuilder.InsertData(
                table: "Roles",
                columns: new[] { "Id", "CreatedAtUtc", "IsSystemDefault", "MartId", "Name" },
                values: new object[,]
                {
                    { new Guid("00000000-0000-0000-0000-000000000001"), new DateTime(2026, 11, 17, 0, 0, 0, 0, DateTimeKind.Utc), true, null, "Owner" },
                    { new Guid("00000000-0000-0000-0000-000000000002"), new DateTime(2026, 11, 17, 0, 0, 0, 0, DateTimeKind.Utc), true, null, "Manager" },
                    { new Guid("00000000-0000-0000-0000-000000000003"), new DateTime(2026, 11, 17, 0, 0, 0, 0, DateTimeKind.Utc), true, null, "Cashier" }
                });

            migrationBuilder.CreateIndex(
                name: "IX_Roles_MartId_Name",
                table: "Roles",
                columns: new[] { "MartId", "Name" },
                unique: true,
                filter: "[MartId] IS NOT NULL");

            // --- Owners -> Users, in place ---
            migrationBuilder.RenameTable(
                name: "Owners",
                newName: "Users");

            migrationBuilder.RenameIndex(
                name: "IX_Owners_MartId_StaffId",
                table: "Users",
                newName: "IX_Users_MartId_StaffId");

            migrationBuilder.RenameIndex(
                name: "IX_Owners_MartId_Email",
                table: "Users",
                newName: "IX_Users_MartId_Email");

            // Nullable, no default: cannot add a required FK column to a table with existing rows
            // in one step.
            migrationBuilder.AddColumn<Guid>(
                name: "RoleId",
                table: "Users",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PinHash",
                table: "Users",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "CreatedByUserId",
                table: "Users",
                type: "uniqueidentifier",
                nullable: true);

            // Backfills every existing row (today: the one live Owner) to the Owner Role before
            // RoleId becomes required.
            migrationBuilder.Sql(
                "UPDATE Users SET RoleId = '00000000-0000-0000-0000-000000000001' WHERE RoleId IS NULL");

            migrationBuilder.AlterColumn<Guid>(
                name: "RoleId",
                table: "Users",
                type: "uniqueidentifier",
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "uniqueidentifier",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "Email",
                table: "Users",
                type: "nvarchar(450)",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(450)");

            migrationBuilder.AlterColumn<string>(
                name: "SetupCodeHash",
                table: "Users",
                type: "nvarchar(max)",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.AlterColumn<DateTime>(
                name: "SetupCodeExpiresAtUtc",
                table: "Users",
                type: "datetime2",
                nullable: true,
                oldClrType: typeof(DateTime),
                oldType: "datetime2");

            migrationBuilder.DropColumn(
                name: "Role",
                table: "Users");

            // The old unique index was unfiltered (Email was required); recreate it filtered
            // now that Email is nullable - SQL Server treats NULLs as distinct by default even
            // without a filter, but the filter documents the intent explicitly.
            migrationBuilder.DropIndex(
                name: "IX_Users_MartId_Email",
                table: "Users");

            migrationBuilder.CreateIndex(
                name: "IX_Users_MartId_Email",
                table: "Users",
                columns: new[] { "MartId", "Email" },
                unique: true,
                filter: "[Email] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_Users_RoleId",
                table: "Users",
                column: "RoleId");

            migrationBuilder.CreateIndex(
                name: "IX_Users_CreatedByUserId",
                table: "Users",
                column: "CreatedByUserId");

            migrationBuilder.AddForeignKey(
                name: "FK_Users_Roles_RoleId",
                table: "Users",
                column: "RoleId",
                principalTable: "Roles",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Users_Users_CreatedByUserId",
                table: "Users",
                column: "CreatedByUserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(name: "FK_Users_Roles_RoleId", table: "Users");
            migrationBuilder.DropForeignKey(name: "FK_Users_Users_CreatedByUserId", table: "Users");
            migrationBuilder.DropIndex(name: "IX_Users_RoleId", table: "Users");
            migrationBuilder.DropIndex(name: "IX_Users_CreatedByUserId", table: "Users");
            migrationBuilder.DropIndex(name: "IX_Users_MartId_Email", table: "Users");

            migrationBuilder.AddColumn<string>(
                name: "Role",
                table: "Users",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "Owner");

            migrationBuilder.AlterColumn<DateTime>(
                name: "SetupCodeExpiresAtUtc",
                table: "Users",
                type: "datetime2",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, DateTimeKind.Unspecified),
                oldClrType: typeof(DateTime),
                oldType: "datetime2",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "SetupCodeHash",
                table: "Users",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "nvarchar(max)",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "Email",
                table: "Users",
                type: "nvarchar(450)",
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "nvarchar(450)",
                oldNullable: true);

            migrationBuilder.DropColumn(name: "RoleId", table: "Users");
            migrationBuilder.DropColumn(name: "PinHash", table: "Users");
            migrationBuilder.DropColumn(name: "CreatedByUserId", table: "Users");

            migrationBuilder.CreateIndex(
                name: "IX_Users_MartId_Email",
                table: "Users",
                columns: new[] { "MartId", "Email" },
                unique: true);

            migrationBuilder.RenameIndex(
                name: "IX_Users_MartId_StaffId",
                table: "Users",
                newName: "IX_Owners_MartId_StaffId");

            migrationBuilder.RenameIndex(
                name: "IX_Users_MartId_Email",
                table: "Users",
                newName: "IX_Owners_MartId_Email");

            migrationBuilder.RenameTable(
                name: "Users",
                newName: "Owners");

            migrationBuilder.DropTable(name: "Roles");
        }
    }
}
