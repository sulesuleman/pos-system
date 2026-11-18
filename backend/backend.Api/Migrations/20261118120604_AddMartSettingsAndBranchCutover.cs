using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddMartSettingsAndBranchCutover : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Currency",
                table: "Marts",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "PKR");

            migrationBuilder.AddColumn<string>(
                name: "DefaultTimeZone",
                table: "Marts",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "Asia/Karachi");

            migrationBuilder.AddColumn<int>(
                name: "LongPendingReturnMinutes",
                table: "Marts",
                type: "int",
                nullable: false,
                defaultValue: 30);

            migrationBuilder.AddColumn<DateOnly>(
                name: "CutoverDate",
                table: "Branches",
                type: "date",
                nullable: true);

            migrationBuilder.AddColumn<TimeOnly>(
                name: "StockCheckLocalTime",
                table: "Branches",
                type: "time",
                nullable: false,
                defaultValue: new TimeOnly(3, 0, 0));
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Currency",
                table: "Marts");

            migrationBuilder.DropColumn(
                name: "DefaultTimeZone",
                table: "Marts");

            migrationBuilder.DropColumn(
                name: "LongPendingReturnMinutes",
                table: "Marts");

            migrationBuilder.DropColumn(
                name: "CutoverDate",
                table: "Branches");

            migrationBuilder.DropColumn(
                name: "StockCheckLocalTime",
                table: "Branches");
        }
    }
}
