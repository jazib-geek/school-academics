using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace School.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddCampusPayrollSettingsAndSalaryPermissions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.EnsureSchema(name: "dbo");

            // Existing campus tables already have these columns; model mapping only.
            // Create payroll settings + seed new permissions / rights.

            migrationBuilder.CreateTable(
                name: "tblCampusPayrollSettings",
                schema: "dbo",
                columns: table => new
                {
                    ID = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    TeaAllowance = table.Column<decimal>(type: "decimal(18,2)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tblCampusPayrollSettings", x => x.ID);
                });

            migrationBuilder.Sql(
                """
                IF NOT EXISTS (SELECT 1 FROM dbo.tblCampusPayrollSettings)
                BEGIN
                    INSERT INTO dbo.tblCampusPayrollSettings (TeaAllowance) VALUES (0);
                END
                """);

            migrationBuilder.InsertData(
                schema: "dbo",
                table: "tblPermission",
                columns: new[] { "Id", "Code", "IsActive", "ModuleHead", "Name", "SortOrder" },
                values: new object[,]
                {
                    { 132, "manage_employee_loans", true, "Employee", "Manage Employee Loans / Advances", 1320 },
                    { 133, "calculate_employee_salary", true, "Employee", "Calculate Employee Salary", 1330 },
                    { 134, "manage_payroll_allowances", true, "Employee", "Manage Payroll Allowances", 1340 }
                });

            migrationBuilder.Sql(
                """
                IF OBJECT_ID('tempdb..#NewPerms') IS NOT NULL DROP TABLE #NewPerms;

                SELECT p.Code, p.Name, p.ModuleHead
                INTO #NewPerms
                FROM dbo.tblPermission p
                WHERE p.Code IN (
                    N'manage_employee_loans',
                    N'calculate_employee_salary',
                    N'manage_payroll_allowances'
                );

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
                WHERE ModuleCode IN (
                    N'manage_employee_loans',
                    N'calculate_employee_salary',
                    N'manage_payroll_allowances'
                );
                """);

            migrationBuilder.DropTable(
                name: "tblCampusPayrollSettings",
                schema: "dbo");

            migrationBuilder.DeleteData(
                schema: "dbo",
                table: "tblPermission",
                keyColumn: "Id",
                keyValue: 132);

            migrationBuilder.DeleteData(
                schema: "dbo",
                table: "tblPermission",
                keyColumn: "Id",
                keyValue: 133);

            migrationBuilder.DeleteData(
                schema: "dbo",
                table: "tblPermission",
                keyColumn: "Id",
                keyValue: 134);
        }
    }
}
