using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace School.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddStationeryTracking : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "tblStationeryHandover",
                schema: "dbo",
                columns: table => new
                {
                    ID = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    HandoverDate = table.Column<DateTime>(type: "date", nullable: false),
                    EmployeeID = table.Column<int>(type: "int", nullable: false),
                    Notes = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    EntryUser = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    CreatedAtPkt = table.Column<DateTime>(type: "datetime2(3)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tblStationeryHandover", x => x.ID);
                    table.ForeignKey(
                        name: "FK_tblStationeryHandover_tblEmployee_EmployeeID",
                        column: x => x.EmployeeID,
                        principalSchema: "dbo",
                        principalTable: "tblEmployee",
                        principalColumn: "ID",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "tblStationeryItem",
                schema: "dbo",
                columns: table => new
                {
                    ID = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Name = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: false),
                    Category = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Unit = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false, defaultValue: "pcs"),
                    IsActive = table.Column<bool>(type: "bit", nullable: false, defaultValue: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tblStationeryItem", x => x.ID);
                });

            migrationBuilder.CreateTable(
                name: "tblStationeryPurchase",
                schema: "dbo",
                columns: table => new
                {
                    ID = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    PurchaseDate = table.Column<DateTime>(type: "date", nullable: false),
                    Notes = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    TotalAmount = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    PostedToAccounts = table.Column<bool>(type: "bit", nullable: false, defaultValue: false),
                    VoucherNo = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    ExpenseAccountId = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    EntryUser = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    CreatedAtPkt = table.Column<DateTime>(type: "datetime2(3)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tblStationeryPurchase", x => x.ID);
                });

            migrationBuilder.CreateTable(
                name: "tblStationeryHandoverLine",
                schema: "dbo",
                columns: table => new
                {
                    ID = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    HandoverID = table.Column<int>(type: "int", nullable: false),
                    ItemID = table.Column<int>(type: "int", nullable: false),
                    Quantity = table.Column<decimal>(type: "decimal(18,2)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tblStationeryHandoverLine", x => x.ID);
                    table.ForeignKey(
                        name: "FK_tblStationeryHandoverLine_tblStationeryHandover_HandoverID",
                        column: x => x.HandoverID,
                        principalSchema: "dbo",
                        principalTable: "tblStationeryHandover",
                        principalColumn: "ID",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_tblStationeryHandoverLine_tblStationeryItem_ItemID",
                        column: x => x.ItemID,
                        principalSchema: "dbo",
                        principalTable: "tblStationeryItem",
                        principalColumn: "ID",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "tblStationeryPurchaseLine",
                schema: "dbo",
                columns: table => new
                {
                    ID = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    PurchaseID = table.Column<int>(type: "int", nullable: false),
                    ItemID = table.Column<int>(type: "int", nullable: false),
                    Quantity = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    UnitPrice = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    LineTotal = table.Column<decimal>(type: "decimal(18,2)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tblStationeryPurchaseLine", x => x.ID);
                    table.ForeignKey(
                        name: "FK_tblStationeryPurchaseLine_tblStationeryItem_ItemID",
                        column: x => x.ItemID,
                        principalSchema: "dbo",
                        principalTable: "tblStationeryItem",
                        principalColumn: "ID",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_tblStationeryPurchaseLine_tblStationeryPurchase_PurchaseID",
                        column: x => x.PurchaseID,
                        principalSchema: "dbo",
                        principalTable: "tblStationeryPurchase",
                        principalColumn: "ID",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.InsertData(
                schema: "dbo",
                table: "tblPermission",
                columns: new[] { "Id", "Code", "IsActive", "ModuleHead", "Name", "SortOrder" },
                values: new object[] { 137, "manage_stationery", true, "Stationery", "Manage Stationery / Store", 1370 });

            migrationBuilder.InsertData(
                schema: "dbo",
                table: "tblStationeryItem",
                columns: new[] { "ID", "Name", "Category", "Unit", "IsActive" },
                values: new object[,]
                {
                    { 1, "Hard chart", "Paper", "pcs", true },
                    { 2, "Glaze paper", "Paper", "pcs", true },
                    { 3, "Gum sticks", "Adhesive", "pcs", true },
                    { 4, "Sticko", "Adhesive", "pcs", true },
                    { 5, "Tapes (different sizes)", "Adhesive", "pcs", true },
                    { 6, "Double tape", "Adhesive", "pcs", true },
                    { 7, "Glitter sheets", "Craft", "pcs", true },
                    { 8, "Crepe paper", "Paper", "pcs", true },
                    { 9, "Colour sheets", "Paper", "pcs", true },
                    { 10, "Ribbons", "Craft", "pcs", true },
                    { 11, "Highlighter (golden pen)", "Writing", "pcs", true },
                    { 12, "Scissors (small)", "Tools", "pcs", true },
                    { 13, "Stapler", "Tools", "pcs", true },
                    { 14, "Stapler pins", "Tools", "pcs", true },
                    { 15, "Blue ball point", "Writing", "pcs", true },
                    { 16, "Thumb pins", "Tools", "pcs", true },
                    { 17, "Black pointers", "Writing", "pcs", true },
                    { 18, "Green pointers", "Writing", "pcs", true },
                    { 19, "Tissue rolls", "Misc", "pcs", true },
                    { 20, "Sharpener", "Tools", "pcs", true },
                    { 21, "Pencil", "Writing", "pcs", true },
                    { 22, "Eraser", "Writing", "pcs", true },
                    { 23, "Rubber band", "Misc", "pcs", true },
                    { 24, "Highlighter", "Writing", "pcs", true },
                    { 25, "Ice cream sticks", "Craft", "pcs", true },
                    { 26, "Red ball point", "Writing", "pcs", true },
                    { 27, "Board marker Blue", "Writing", "pcs", true },
                    { 28, "Board marker Red", "Writing", "pcs", true },
                    { 29, "Board marker Green", "Writing", "pcs", true },
                    { 30, "Board marker Black", "Writing", "pcs", true },
                    { 31, "Marker inks", "Writing", "pcs", true },
                    { 32, "Pencil colors", "Writing", "pcs", true },
                    { 33, "Poster colors", "Craft", "pcs", true },
                    { 34, "Loose sheets English", "Paper", "pcs", true },
                    { 35, "Loose sheets Urdu", "Paper", "pcs", true },
                    { 36, "Paper rim (printpaper bundle)", "Paper", "pcs", true },
                    { 37, "Clear bags", "Misc", "pcs", true },
                    { 38, "Duster", "Tools", "pcs", true },
                });

            migrationBuilder.Sql(
                """
                IF OBJECT_ID('tempdb..#NewPerms') IS NOT NULL DROP TABLE #NewPerms;

                SELECT p.Code, p.Name, p.ModuleHead
                INTO #NewPerms
                FROM dbo.tblPermission p
                WHERE p.Code IN (N'manage_stationery');

                UPDATE r
                SET r.HasAccess = 1,
                    r.ModuleName = g.Name,
                    r.ModuleHead = g.ModuleHead
                FROM dbo.tblUserRights r
                INNER JOIN dbo.tblUser u ON u.Username = r.UserName
                INNER JOIN #NewPerms g ON g.Code = r.ModuleCode
                WHERE u.IsActive = 1
                  AND (
                        LOWER(LTRIM(RTRIM(u.Username))) IN (N'admin', N'jazib')
                     OR u.IsSuperAdmin = 1
                  );

                INSERT INTO dbo.tblUserRights (UserName, ModuleCode, ModuleName, HasAccess, BranchCode, ModuleHead)
                SELECT u.Username, g.Code, g.Name, 1, NULL, g.ModuleHead
                FROM dbo.tblUser u
                CROSS JOIN #NewPerms g
                WHERE u.IsActive = 1
                  AND NULLIF(LTRIM(RTRIM(u.Username)), N'') IS NOT NULL
                  AND (
                        LOWER(LTRIM(RTRIM(u.Username))) IN (N'admin', N'jazib')
                     OR u.IsSuperAdmin = 1
                  )
                  AND NOT EXISTS (
                      SELECT 1 FROM dbo.tblUserRights r
                      WHERE r.UserName = u.Username AND r.ModuleCode = g.Code
                  );

                DROP TABLE #NewPerms;
                """);

            migrationBuilder.CreateIndex(
                name: "IX_StationeryHandover_Date",
                schema: "dbo",
                table: "tblStationeryHandover",
                column: "HandoverDate");

            migrationBuilder.CreateIndex(
                name: "IX_StationeryHandover_Employee",
                schema: "dbo",
                table: "tblStationeryHandover",
                column: "EmployeeID");

            migrationBuilder.CreateIndex(
                name: "IX_StationeryHandoverLine_Handover",
                schema: "dbo",
                table: "tblStationeryHandoverLine",
                column: "HandoverID");

            migrationBuilder.CreateIndex(
                name: "IX_StationeryHandoverLine_Item",
                schema: "dbo",
                table: "tblStationeryHandoverLine",
                column: "ItemID");

            migrationBuilder.CreateIndex(
                name: "IX_StationeryItem_Category",
                schema: "dbo",
                table: "tblStationeryItem",
                column: "Category");

            migrationBuilder.CreateIndex(
                name: "IX_StationeryItem_Name",
                schema: "dbo",
                table: "tblStationeryItem",
                column: "Name");

            migrationBuilder.CreateIndex(
                name: "IX_StationeryPurchase_Date",
                schema: "dbo",
                table: "tblStationeryPurchase",
                column: "PurchaseDate");

            migrationBuilder.CreateIndex(
                name: "IX_StationeryPurchaseLine_Item",
                schema: "dbo",
                table: "tblStationeryPurchaseLine",
                column: "ItemID");

            migrationBuilder.CreateIndex(
                name: "IX_StationeryPurchaseLine_Purchase",
                schema: "dbo",
                table: "tblStationeryPurchaseLine",
                column: "PurchaseID");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                DELETE FROM dbo.tblUserRights WHERE ModuleCode = N'manage_stationery';
                """);

            migrationBuilder.DropTable(
                name: "tblStationeryHandoverLine",
                schema: "dbo");

            migrationBuilder.DropTable(
                name: "tblStationeryPurchaseLine",
                schema: "dbo");

            migrationBuilder.DropTable(
                name: "tblStationeryHandover",
                schema: "dbo");

            migrationBuilder.DropTable(
                name: "tblStationeryItem",
                schema: "dbo");

            migrationBuilder.DropTable(
                name: "tblStationeryPurchase",
                schema: "dbo");

            migrationBuilder.DeleteData(
                schema: "dbo",
                table: "tblPermission",
                keyColumn: "Id",
                keyValue: 137);
        }
    }
}
