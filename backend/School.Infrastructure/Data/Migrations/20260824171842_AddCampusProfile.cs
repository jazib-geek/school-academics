using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace School.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddCampusProfile : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.EnsureSchema(name: "dbo");

            migrationBuilder.CreateTable(
                name: "tblCampusProfile",
                schema: "dbo",
                columns: table => new
                {
                    ID = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    SchoolName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    CampusLabel = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    StreetAddress = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: true),
                    Address = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    Phone1 = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    Phone2 = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    Landline = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    Email = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    ShowPhone1OnInvoice = table.Column<bool>(type: "bit", nullable: false),
                    ShowPhone2OnInvoice = table.Column<bool>(type: "bit", nullable: false),
                    ShowLandlineOnInvoice = table.Column<bool>(type: "bit", nullable: false),
                    SessionLabel = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    FeeYear1 = table.Column<int>(type: "int", nullable: true),
                    FeeYear2 = table.Column<int>(type: "int", nullable: true),
                    FeeYear3 = table.Column<int>(type: "int", nullable: true),
                    ReceiptFooterNote = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    ShowAddressOnReceipts = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tblCampusProfile", x => x.ID);
                });

            var year = DateTime.Now.Year;
            migrationBuilder.Sql(
                $"""
                IF NOT EXISTS (SELECT 1 FROM dbo.tblCampusProfile)
                BEGIN
                    INSERT INTO dbo.tblCampusProfile (
                        SchoolName, CampusLabel, StreetAddress, Address,
                        Phone1, Phone2, Landline, Email,
                        ShowPhone1OnInvoice, ShowPhone2OnInvoice, ShowLandlineOnInvoice,
                        SessionLabel, FeeYear1, FeeYear2, FeeYear3,
                        ReceiptFooterNote, ShowAddressOnReceipts
                    )
                    VALUES (
                        N'Science Base School', NULL, NULL, NULL,
                        NULL, NULL, N'055-3840658', NULL,
                        1, 0, 1,
                        NULL, {year}, {year + 1}, NULL,
                        NULL, 1
                    );
                END
                """);

            migrationBuilder.InsertData(
                schema: "dbo",
                table: "tblPermission",
                columns: new[] { "Id", "Code", "IsActive", "ModuleHead", "Name", "SortOrder" },
                values: new object[] { 135, "manage_campus_profile", true, "Parameters", "Manage Campus Institute Settings", 1350 });

            migrationBuilder.Sql(
                """
                IF OBJECT_ID('tempdb..#NewPerms') IS NOT NULL DROP TABLE #NewPerms;

                SELECT p.Code, p.Name, p.ModuleHead
                INTO #NewPerms
                FROM dbo.tblPermission p
                WHERE p.Code IN (N'manage_campus_profile');

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
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                DELETE FROM dbo.tblUserRights
                WHERE ModuleCode IN (N'manage_campus_profile');
                """);

            migrationBuilder.DeleteData(
                schema: "dbo",
                table: "tblPermission",
                keyColumn: "Id",
                keyValue: 135);

            migrationBuilder.DropTable(
                name: "tblCampusProfile",
                schema: "dbo");
        }
    }
}
