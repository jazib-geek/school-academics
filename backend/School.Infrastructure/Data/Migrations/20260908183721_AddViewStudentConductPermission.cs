using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace School.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddViewStudentConductPermission : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.InsertData(
                schema: "dbo",
                table: "tblPermission",
                columns: new[] { "Id", "Code", "IsActive", "ModuleHead", "Name", "SortOrder" },
                values: new object[] { 138, "view_student_conduct", true, "Student", "View Student Conduct", 1380 });

            migrationBuilder.Sql(
                """
                IF OBJECT_ID('tempdb..#NewPerms') IS NOT NULL DROP TABLE #NewPerms;

                SELECT p.Code, p.Name, p.ModuleHead
                INTO #NewPerms
                FROM dbo.tblPermission p
                WHERE p.Code IN (N'view_student_conduct');

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
                DELETE FROM dbo.tblUserRights WHERE ModuleCode = N'view_student_conduct';
                """);

            migrationBuilder.DeleteData(
                schema: "dbo",
                table: "tblPermission",
                keyColumn: "Id",
                keyValue: 138);
        }
    }
}
