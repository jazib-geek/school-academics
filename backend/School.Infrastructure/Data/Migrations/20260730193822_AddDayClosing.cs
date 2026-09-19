using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace School.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddDayClosing : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // AccountMaster / AccountGroup / TransactionMaster / VoucherType columns already
            // exist on campus DBs (legacy schema). Expanding stub entities must not AddColumn them.
            migrationBuilder.EnsureSchema(name: "dbo");

            migrationBuilder.CreateTable(
                name: "DayClosing",
                schema: "dbo",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ClosingDate = table.Column<DateOnly>(type: "date", nullable: false),
                    TotalCashCollected = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    TotalExpenses = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    RemainingCash = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    Narration = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    EntryUser = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    CreatedAtPkt = table.Column<DateTime>(type: "datetime2(3)", nullable: false),
                    UpdatedAtPkt = table.Column<DateTime>(type: "datetime2(3)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DayClosing", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "UQ_DayClosing_ClosingDate",
                schema: "dbo",
                table: "DayClosing",
                column: "ClosingDate",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "DayClosing",
                schema: "dbo");
        }
    }
}
