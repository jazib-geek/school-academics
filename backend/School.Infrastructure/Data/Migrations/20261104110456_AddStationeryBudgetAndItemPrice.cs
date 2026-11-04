using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace School.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddStationeryBudgetAndItemPrice : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "UnitPrice",
                schema: "dbo",
                table: "tblStationeryItem",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.CreateTable(
                name: "tblStationeryBudget",
                schema: "dbo",
                columns: table => new
                {
                    ID = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Year = table.Column<int>(type: "int", nullable: false),
                    Month = table.Column<int>(type: "int", nullable: false),
                    Period = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    Notes = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    TotalAmount = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    EntryUser = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    CreatedAtPkt = table.Column<DateTime>(type: "datetime2(3)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tblStationeryBudget", x => x.ID);
                });

            migrationBuilder.CreateTable(
                name: "tblStationeryBudgetLine",
                schema: "dbo",
                columns: table => new
                {
                    ID = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    BudgetID = table.Column<int>(type: "int", nullable: false),
                    ItemID = table.Column<int>(type: "int", nullable: false),
                    Quantity = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    UnitPrice = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    LineTotal = table.Column<decimal>(type: "decimal(18,2)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tblStationeryBudgetLine", x => x.ID);
                    table.ForeignKey(
                        name: "FK_tblStationeryBudgetLine_tblStationeryBudget_BudgetID",
                        column: x => x.BudgetID,
                        principalSchema: "dbo",
                        principalTable: "tblStationeryBudget",
                        principalColumn: "ID",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_tblStationeryBudgetLine_tblStationeryItem_ItemID",
                        column: x => x.ItemID,
                        principalSchema: "dbo",
                        principalTable: "tblStationeryItem",
                        principalColumn: "ID",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_StationeryBudget_Period",
                schema: "dbo",
                table: "tblStationeryBudget",
                columns: new[] { "Year", "Month", "Period" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_StationeryBudgetLine_Budget",
                schema: "dbo",
                table: "tblStationeryBudgetLine",
                column: "BudgetID");

            migrationBuilder.CreateIndex(
                name: "IX_StationeryBudgetLine_Item",
                schema: "dbo",
                table: "tblStationeryBudgetLine",
                column: "ItemID");

            migrationBuilder.Sql(
                """
                UPDATE dbo.tblStationeryItem SET UnitPrice = 350 WHERE LOWER(LTRIM(RTRIM(Name))) = N'colour sheets';
                UPDATE dbo.tblStationeryItem SET UnitPrice = 1100 WHERE LOWER(LTRIM(RTRIM(Name))) = N'paper rim (printpaper bundle)';
                UPDATE dbo.tblStationeryItem SET UnitPrice = 300 WHERE LOWER(LTRIM(RTRIM(Name))) = N'glu';
                UPDATE dbo.tblStationeryItem SET UnitPrice = 300
                    WHERE LOWER(LTRIM(RTRIM(Name))) IN (N'tissue rolls', N'tissue roll', N'tissue paper', N'tissue papers');
                UPDATE dbo.tblStationeryItem SET UnitPrice = 720
                    WHERE LOWER(LTRIM(RTRIM(Name))) IN (N'duster', N'dustor');
                UPDATE dbo.tblStationeryItem SET UnitPrice = 280 WHERE LOWER(LTRIM(RTRIM(Name))) = N'red ball point';
                UPDATE dbo.tblStationeryItem SET UnitPrice = 280 WHERE LOWER(LTRIM(RTRIM(Name))) = N'blue ball point';
                UPDATE dbo.tblStationeryItem SET UnitPrice = 280 WHERE LOWER(LTRIM(RTRIM(Name))) = N'green pointers';
                UPDATE dbo.tblStationeryItem SET UnitPrice = 700 WHERE LOWER(LTRIM(RTRIM(Name))) = N'board marker black';
                UPDATE dbo.tblStationeryItem SET UnitPrice = 700 WHERE LOWER(LTRIM(RTRIM(Name))) = N'board marker green';
                UPDATE dbo.tblStationeryItem SET UnitPrice = 700 WHERE LOWER(LTRIM(RTRIM(Name))) = N'board marker red';
                UPDATE dbo.tblStationeryItem SET UnitPrice = 200 WHERE LOWER(LTRIM(RTRIM(Name))) = N'pencil';
                UPDATE dbo.tblStationeryItem SET UnitPrice = 200 WHERE LOWER(LTRIM(RTRIM(Name))) = N'sticko';
                UPDATE dbo.tblStationeryItem SET UnitPrice = 600 WHERE LOWER(LTRIM(RTRIM(Name))) = N'whitener';
                UPDATE dbo.tblStationeryItem SET UnitPrice = 480
                    WHERE LOWER(LTRIM(RTRIM(Name))) IN (N'marker ink (red)', N'marker inks (red)', N'board marker ink red');
                UPDATE dbo.tblStationeryItem SET UnitPrice = 480
                    WHERE LOWER(LTRIM(RTRIM(Name))) IN (N'marker ink (blue)', N'marker inks (blue)', N'board marker ink blue');
                UPDATE dbo.tblStationeryItem SET UnitPrice = 480
                    WHERE LOWER(LTRIM(RTRIM(Name))) IN (N'marker ink (black)', N'marker inks (black)', N'board marker ink black');
                UPDATE dbo.tblStationeryItem SET UnitPrice = 480
                    WHERE LOWER(LTRIM(RTRIM(Name))) IN (N'marker ink (green)', N'marker inks (green)', N'board marker ink green');

                IF NOT EXISTS (SELECT 1 FROM dbo.tblStationeryItem WHERE LOWER(LTRIM(RTRIM(Name))) IN (N'board marker ink red', N'marker ink (red)', N'marker inks (red)'))
                    INSERT INTO dbo.tblStationeryItem (Name, Category, Unit, UnitPrice, IsActive) VALUES (N'Board marker ink Red', N'Writing', N'pcs', 480, 1);
                IF NOT EXISTS (SELECT 1 FROM dbo.tblStationeryItem WHERE LOWER(LTRIM(RTRIM(Name))) IN (N'board marker ink blue', N'marker ink (blue)', N'marker inks (blue)'))
                    INSERT INTO dbo.tblStationeryItem (Name, Category, Unit, UnitPrice, IsActive) VALUES (N'Board marker ink Blue', N'Writing', N'pcs', 480, 1);
                IF NOT EXISTS (SELECT 1 FROM dbo.tblStationeryItem WHERE LOWER(LTRIM(RTRIM(Name))) IN (N'board marker ink black', N'marker ink (black)', N'marker inks (black)'))
                    INSERT INTO dbo.tblStationeryItem (Name, Category, Unit, UnitPrice, IsActive) VALUES (N'Board marker ink Black', N'Writing', N'pcs', 480, 1);
                IF NOT EXISTS (SELECT 1 FROM dbo.tblStationeryItem WHERE LOWER(LTRIM(RTRIM(Name))) IN (N'board marker ink green', N'marker ink (green)', N'marker inks (green)'))
                    INSERT INTO dbo.tblStationeryItem (Name, Category, Unit, UnitPrice, IsActive) VALUES (N'Board marker ink Green', N'Writing', N'pcs', 480, 1);
                IF NOT EXISTS (SELECT 1 FROM dbo.tblStationeryItem WHERE LOWER(LTRIM(RTRIM(Name))) = N'stapler pins (small)')
                    INSERT INTO dbo.tblStationeryItem (Name, Category, Unit, UnitPrice, IsActive) VALUES (N'Stapler pins (small)', N'Tools', N'pcs', 90, 1);
                IF NOT EXISTS (SELECT 1 FROM dbo.tblStationeryItem WHERE LOWER(LTRIM(RTRIM(Name))) = N'stapler pins (big)')
                    INSERT INTO dbo.tblStationeryItem (Name, Category, Unit, UnitPrice, IsActive) VALUES (N'Stapler pins (big)', N'Tools', N'pcs', 120, 1);
                IF NOT EXISTS (SELECT 1 FROM dbo.tblStationeryItem WHERE LOWER(LTRIM(RTRIM(Name))) = N'mosquito spray')
                    INSERT INTO dbo.tblStationeryItem (Name, Category, Unit, UnitPrice, IsActive) VALUES (N'Mosquito spray', N'Cleaning', N'pcs', 0, 1);
                IF NOT EXISTS (SELECT 1 FROM dbo.tblStationeryItem WHERE LOWER(LTRIM(RTRIM(Name))) IN (N'air freshener', N'air freshner'))
                    INSERT INTO dbo.tblStationeryItem (Name, Category, Unit, UnitPrice, IsActive) VALUES (N'Air freshener', N'Cleaning', N'pcs', 0, 1);
                IF NOT EXISTS (SELECT 1 FROM dbo.tblStationeryItem WHERE LOWER(LTRIM(RTRIM(Name))) = N'surf')
                    INSERT INTO dbo.tblStationeryItem (Name, Category, Unit, UnitPrice, IsActive) VALUES (N'Surf', N'Cleaning', N'pcs', 0, 1);
                IF NOT EXISTS (SELECT 1 FROM dbo.tblStationeryItem WHERE LOWER(LTRIM(RTRIM(Name))) = N'mop')
                    INSERT INTO dbo.tblStationeryItem (Name, Category, Unit, UnitPrice, IsActive) VALUES (N'Mop', N'Cleaning', N'pcs', 0, 1);
                IF NOT EXISTS (SELECT 1 FROM dbo.tblStationeryItem WHERE LOWER(LTRIM(RTRIM(Name))) = N'acid')
                    INSERT INTO dbo.tblStationeryItem (Name, Category, Unit, UnitPrice, IsActive) VALUES (N'Acid', N'Cleaning', N'pcs', 0, 1);
                IF NOT EXISTS (SELECT 1 FROM dbo.tblStationeryItem WHERE LOWER(LTRIM(RTRIM(Name))) = N'hand wash')
                    INSERT INTO dbo.tblStationeryItem (Name, Category, Unit, UnitPrice, IsActive) VALUES (N'Hand wash', N'Cleaning', N'pcs', 0, 1);
                IF NOT EXISTS (SELECT 1 FROM dbo.tblStationeryItem WHERE LOWER(LTRIM(RTRIM(Name))) = N'bandages')
                    INSERT INTO dbo.tblStationeryItem (Name, Category, Unit, UnitPrice, IsActive) VALUES (N'Bandages', N'First aid', N'pcs', 0, 1);
                IF NOT EXISTS (SELECT 1 FROM dbo.tblStationeryItem WHERE LOWER(LTRIM(RTRIM(Name))) = N'panadol syrup')
                    INSERT INTO dbo.tblStationeryItem (Name, Category, Unit, UnitPrice, IsActive) VALUES (N'Panadol syrup', N'First aid', N'pcs', 0, 1);
                IF NOT EXISTS (SELECT 1 FROM dbo.tblStationeryItem WHERE LOWER(LTRIM(RTRIM(Name))) = N'attendance register')
                    INSERT INTO dbo.tblStationeryItem (Name, Category, Unit, UnitPrice, IsActive) VALUES (N'Attendance register', N'Misc', N'pcs', 200, 1);
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "tblStationeryBudgetLine",
                schema: "dbo");

            migrationBuilder.DropTable(
                name: "tblStationeryBudget",
                schema: "dbo");

            migrationBuilder.Sql(
                """
                DELETE FROM dbo.tblStationeryItem
                WHERE Name IN (
                    N'Board marker ink Red', N'Board marker ink Blue', N'Board marker ink Black', N'Board marker ink Green',
                    N'Stapler pins (small)', N'Stapler pins (big)',
                    N'Mosquito spray', N'Air freshener', N'Surf', N'Mop', N'Acid', N'Hand wash',
                    N'Bandages', N'Panadol syrup', N'Attendance register'
                );
                """);

            migrationBuilder.DropColumn(
                name: "UnitPrice",
                schema: "dbo",
                table: "tblStationeryItem");
        }
    }
}
