using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace School.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddFranchiseRoyaltyShare : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.EnsureSchema(name: "dbo");

            migrationBuilder.AddColumn<bool>(
                name: "IsFranchise",
                schema: "dbo",
                table: "tblCampusProfile",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<decimal>(
                name: "RoyaltySharePercent",
                schema: "dbo",
                table: "tblCampusProfile",
                type: "decimal(5,2)",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "tblFranchiseRoyaltyClosing",
                schema: "dbo",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    CalendarYear = table.Column<int>(type: "int", nullable: false),
                    CalendarMonth = table.Column<int>(type: "int", nullable: false),
                    TotalFeeCollected = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    RoyaltySharePercent = table.Column<decimal>(type: "decimal(5,2)", nullable: false),
                    RoyaltyAmount = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    ClosedAtPkt = table.Column<DateTime>(type: "datetime2(3)", nullable: false),
                    ClosedByUserId = table.Column<int>(type: "int", nullable: true),
                    ClosedByUserName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    VoucherNo = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    EntryUser = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    CreatedAtPkt = table.Column<DateTime>(type: "datetime2(3)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tblFranchiseRoyaltyClosing", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "UQ_FranchiseRoyaltyClosing_YearMonth",
                schema: "dbo",
                table: "tblFranchiseRoyaltyClosing",
                columns: new[] { "CalendarYear", "CalendarMonth" },
                unique: true);

            migrationBuilder.Sql(
                """
                IF DB_NAME() = N'dbSBS_DC'
                BEGIN
                    UPDATE dbo.tblCampusProfile
                    SET IsFranchise = 1,
                        RoyaltySharePercent = 6.00
                    WHERE ID = (SELECT TOP (1) ID FROM dbo.tblCampusProfile ORDER BY ID);
                END
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "tblFranchiseRoyaltyClosing",
                schema: "dbo");

            migrationBuilder.DropColumn(
                name: "IsFranchise",
                schema: "dbo",
                table: "tblCampusProfile");

            migrationBuilder.DropColumn(
                name: "RoyaltySharePercent",
                schema: "dbo",
                table: "tblCampusProfile");
        }
    }
}
