using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace School.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddStudentShortLeave : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "tblStudentShortLeave",
                schema: "dbo",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    LeaveDate = table.Column<DateOnly>(type: "date", nullable: false),
                    PickupPersonName = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: false),
                    PickupRelation = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    Reason = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    PickupTime = table.Column<TimeOnly>(type: "time", nullable: false),
                    PhoneConfirmationRequired = table.Column<bool>(type: "bit", nullable: false),
                    PhoneConfirmedWith = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: true),
                    PhoneCallApproved = table.Column<bool>(type: "bit", nullable: false),
                    ApprovedByUserName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    CreatedAtPkt = table.Column<DateTime>(type: "datetime2(3)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tblStudentShortLeave", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "tblStudentShortLeaveStudent",
                schema: "dbo",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ShortLeaveId = table.Column<int>(type: "int", nullable: false),
                    StudentId = table.Column<int>(type: "int", nullable: false),
                    LeaveDate = table.Column<DateOnly>(type: "date", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tblStudentShortLeaveStudent", x => x.Id);
                    table.ForeignKey(
                        name: "FK_tblStudentShortLeaveStudent_tblStudentShortLeave_ShortLeaveId",
                        column: x => x.ShortLeaveId,
                        principalSchema: "dbo",
                        principalTable: "tblStudentShortLeave",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_tblStudentShortLeaveStudent_tblStudent_StudentId",
                        column: x => x.StudentId,
                        principalSchema: "dbo",
                        principalTable: "tblStudent",
                        principalColumn: "Reg_Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.InsertData(
                schema: "dbo",
                table: "tblPermission",
                columns: new[] { "Id", "Code", "IsActive", "ModuleHead", "Name", "SortOrder" },
                values: new object[] { 146, "allow_short_leave", true, "Attendance", "Allow Short Leave", 1460 });

            migrationBuilder.Sql(
                """
                UPDATE r
                SET r.HasAccess = 1,
                    r.ModuleName = p.Name,
                    r.ModuleHead = p.ModuleHead
                FROM dbo.tblUserRights r
                INNER JOIN dbo.tblPermission p ON p.Code = N'allow_short_leave'
                INNER JOIN dbo.tblUser u ON u.Username = r.UserName
                WHERE r.ModuleCode = N'allow_short_leave'
                  AND u.IsActive = 1
                  AND EXISTS (
                      SELECT 1
                      FROM dbo.tblUserRights m
                      WHERE m.UserName = u.Username
                        AND m.ModuleCode = N'mark_attnd'
                        AND m.HasAccess = 1
                  );

                INSERT INTO dbo.tblUserRights (UserName, ModuleCode, ModuleName, HasAccess, BranchCode, ModuleHead)
                SELECT u.Username, p.Code, p.Name, 1, NULL, p.ModuleHead
                FROM dbo.tblUser u
                CROSS JOIN dbo.tblPermission p
                WHERE p.Code = N'allow_short_leave'
                  AND u.IsActive = 1
                  AND NULLIF(LTRIM(RTRIM(u.Username)), N'') IS NOT NULL
                  AND EXISTS (
                      SELECT 1
                      FROM dbo.tblUserRights m
                      WHERE m.UserName = u.Username
                        AND m.ModuleCode = N'mark_attnd'
                        AND m.HasAccess = 1
                  )
                  AND NOT EXISTS (
                      SELECT 1
                      FROM dbo.tblUserRights r
                      WHERE r.UserName = u.Username
                        AND r.ModuleCode = p.Code
                  );
                """);

            migrationBuilder.CreateIndex(
                name: "IX_StudentShortLeave_LeaveDate",
                schema: "dbo",
                table: "tblStudentShortLeave",
                column: "LeaveDate");

            migrationBuilder.CreateIndex(
                name: "IX_StudentShortLeaveStudent_Student_LeaveDate",
                schema: "dbo",
                table: "tblStudentShortLeaveStudent",
                columns: new[] { "StudentId", "LeaveDate" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_tblStudentShortLeaveStudent_ShortLeaveId",
                schema: "dbo",
                table: "tblStudentShortLeaveStudent",
                column: "ShortLeaveId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "tblStudentShortLeaveStudent",
                schema: "dbo");

            migrationBuilder.DropTable(
                name: "tblStudentShortLeave",
                schema: "dbo");

            migrationBuilder.Sql(
                """
                DELETE FROM dbo.tblUserRights WHERE ModuleCode = N'allow_short_leave';
                """);

            migrationBuilder.DeleteData(
                schema: "dbo",
                table: "tblPermission",
                keyColumn: "Id",
                keyValue: 146);
        }
    }
}
