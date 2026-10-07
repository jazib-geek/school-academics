using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace School.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddEmployeeAttendanceChangeRequest : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "tblEmployeeAttendanceChangeRequest",
                schema: "dbo",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    EmployeeAttendanceId = table.Column<int>(type: "int", nullable: false),
                    EmployeeId = table.Column<int>(type: "int", nullable: false),
                    AttendanceDate = table.Column<DateOnly>(type: "date", nullable: false),
                    ProposedCheckInTime = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: true),
                    ProposedCheckOutTime = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: true),
                    Reason = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    Status = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    SubmittedAtPkt = table.Column<DateTime>(type: "datetime2(3)", nullable: false),
                    SubmittedByUserKey = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    ReviewedAtPkt = table.Column<DateTime>(type: "datetime2(3)", nullable: true),
                    ReviewedByUserKey = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    ReviewNote = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tblEmployeeAttendanceChangeRequest", x => x.Id);
                    table.ForeignKey(
                        name: "FK_tblEmployeeAttendanceChangeRequest_tblEmployeeAttendance_EmployeeAttendanceId",
                        column: x => x.EmployeeAttendanceId,
                        principalSchema: "dbo",
                        principalTable: "tblEmployeeAttendance",
                        principalColumn: "ID",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.InsertData(
                schema: "dbo",
                table: "tblPermission",
                columns: new[] { "Id", "Code", "IsActive", "ModuleHead", "Name", "SortOrder" },
                values: new object[] { 144, "request_emp_attendance_change", true, "Employee", "Request Employee Attendance Change", 1440 });

            migrationBuilder.Sql(
                """
                IF OBJECT_ID('tempdb..#NewPerms') IS NOT NULL DROP TABLE #NewPerms;

                SELECT p.Code, p.Name, p.ModuleHead
                INTO #NewPerms
                FROM dbo.tblPermission p
                WHERE p.Code IN (N'request_emp_attendance_change');

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
                name: "IX_EmployeeAttendanceChangeRequest_Attendance_Status",
                schema: "dbo",
                table: "tblEmployeeAttendanceChangeRequest",
                columns: new[] { "EmployeeAttendanceId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_EmployeeAttendanceChangeRequest_Status_AttendanceDate",
                schema: "dbo",
                table: "tblEmployeeAttendanceChangeRequest",
                columns: new[] { "Status", "AttendanceDate" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "tblEmployeeAttendanceChangeRequest",
                schema: "dbo");

            migrationBuilder.Sql(
                """
                DELETE FROM dbo.tblUserRights WHERE ModuleCode = N'request_emp_attendance_change';
                """);

            migrationBuilder.DeleteData(
                schema: "dbo",
                table: "tblPermission",
                keyColumn: "Id",
                keyValue: 144);
        }
    }
}
