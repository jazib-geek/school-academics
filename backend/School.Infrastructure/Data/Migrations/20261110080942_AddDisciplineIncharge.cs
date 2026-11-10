using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace School.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddDisciplineIncharge : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsDisciplineIncharge",
                schema: "dbo",
                table: "tblEmployee",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateTable(
                name: "tblDisciplineDayReport",
                schema: "dbo",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    EmployeeId = table.Column<int>(type: "int", nullable: false),
                    ReportDate = table.Column<DateOnly>(type: "date", nullable: false),
                    WhatWasDone = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false),
                    AnythingElse = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    SubmittedAtPkt = table.Column<DateTime>(type: "datetime2(3)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tblDisciplineDayReport", x => x.Id);
                    table.ForeignKey(
                        name: "FK_tblDisciplineDayReport_tblEmployee_EmployeeId",
                        column: x => x.EmployeeId,
                        principalSchema: "dbo",
                        principalTable: "tblEmployee",
                        principalColumn: "ID",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "tblDisciplineRound",
                schema: "dbo",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Code = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    Name = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: false),
                    SortOrder = table.Column<int>(type: "int", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false, defaultValue: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tblDisciplineRound", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "tblDisciplineDayRound",
                schema: "dbo",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    EmployeeId = table.Column<int>(type: "int", nullable: false),
                    RoundDate = table.Column<DateOnly>(type: "date", nullable: false),
                    RoundId = table.Column<int>(type: "int", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    Note = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: true),
                    UpdatedAtPkt = table.Column<DateTime>(type: "datetime2(3)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tblDisciplineDayRound", x => x.Id);
                    table.CheckConstraint("CK_DisciplineDayRound_Status", "[Status] IN ('Clear', 'Issue', 'Skipped')");
                    table.ForeignKey(
                        name: "FK_tblDisciplineDayRound_tblDisciplineRound_RoundId",
                        column: x => x.RoundId,
                        principalSchema: "dbo",
                        principalTable: "tblDisciplineRound",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_tblDisciplineDayRound_tblEmployee_EmployeeId",
                        column: x => x.EmployeeId,
                        principalSchema: "dbo",
                        principalTable: "tblEmployee",
                        principalColumn: "ID",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "tblDisciplineFinding",
                schema: "dbo",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    EmployeeId = table.Column<int>(type: "int", nullable: false),
                    FindingDate = table.Column<DateOnly>(type: "date", nullable: false),
                    RoundId = table.Column<int>(type: "int", nullable: true),
                    Kind = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    Place = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: false),
                    WhatHappened = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    WhatWasDone = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    CreatedAtPkt = table.Column<DateTime>(type: "datetime2(3)", nullable: false),
                    UpdatedAtPkt = table.Column<DateTime>(type: "datetime2(3)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tblDisciplineFinding", x => x.Id);
                    table.CheckConstraint("CK_DisciplineFinding_Kind", "[Kind] IN ('Concern', 'Praise', 'Note')");
                    table.ForeignKey(
                        name: "FK_tblDisciplineFinding_tblDisciplineRound_RoundId",
                        column: x => x.RoundId,
                        principalSchema: "dbo",
                        principalTable: "tblDisciplineRound",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_tblDisciplineFinding_tblEmployee_EmployeeId",
                        column: x => x.EmployeeId,
                        principalSchema: "dbo",
                        principalTable: "tblEmployee",
                        principalColumn: "ID",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "tblDisciplineFindingStudent",
                schema: "dbo",
                columns: table => new
                {
                    FindingId = table.Column<int>(type: "int", nullable: false),
                    StudentId = table.Column<int>(type: "int", nullable: false),
                    ConductNoteId = table.Column<int>(type: "int", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tblDisciplineFindingStudent", x => new { x.FindingId, x.StudentId });
                    table.ForeignKey(
                        name: "FK_tblDisciplineFindingStudent_tblDisciplineFinding_FindingId",
                        column: x => x.FindingId,
                        principalSchema: "dbo",
                        principalTable: "tblDisciplineFinding",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_tblDisciplineFindingStudent_tblStudentConductNote_ConductNoteId",
                        column: x => x.ConductNoteId,
                        principalSchema: "dbo",
                        principalTable: "tblStudentConductNote",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_tblDisciplineFindingStudent_tblStudent_StudentId",
                        column: x => x.StudentId,
                        principalSchema: "dbo",
                        principalTable: "tblStudent",
                        principalColumn: "Reg_Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.InsertData(
                schema: "dbo",
                table: "tblDisciplineRound",
                columns: new[] { "Id", "Code", "IsActive", "Name", "SortOrder" },
                values: new object[,]
                {
                    { 1, "GateLatecomers", true, "Gate and latecomers", 10 },
                    { 2, "BagCheck", true, "Bag check", 20 },
                    { 3, "Uniform", true, "Uniform and appearance", 30 },
                    { 4, "AssemblyHall", true, "Assembly and hall", 40 },
                    { 5, "Classes", true, "Classes (spot check)", 50 },
                    { 6, "CorridorsBuilding", true, "Corridors and building", 60 },
                    { 7, "OutdoorGround", true, "Outdoor ground", 70 },
                    { 8, "BreakSeparation", true, "Break — boys and girls kept apart", 80 },
                    { 9, "ProhibitedItems", true, "Prohibited items", 90 },
                    { 10, "HomeDispersal", true, "Home-time dispersal", 100 }
                });

            migrationBuilder.InsertData(
                schema: "dbo",
                table: "tblPermission",
                columns: new[] { "Id", "Code", "IsActive", "ModuleHead", "Name", "SortOrder" },
                values: new object[] { 152, "view_discipline", true, "Student", "View Discipline", 1520 });

            migrationBuilder.Sql(
                """
                IF OBJECT_ID('tempdb..#NewPerms') IS NOT NULL DROP TABLE #NewPerms;

                SELECT p.Code, p.Name, p.ModuleHead
                INTO #NewPerms
                FROM dbo.tblPermission p
                WHERE p.Code IN (N'view_discipline');

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

            migrationBuilder.InsertData(
                schema: "dbo",
                table: "tblStudentConductType",
                columns: new[] { "Id", "IsActive", "IsSystem", "Name", "SortOrder" },
                values: new object[] { 5, true, true, "Discipline", 50 });

            migrationBuilder.CreateIndex(
                name: "UQ_DisciplineDayReport_Employee_Date",
                schema: "dbo",
                table: "tblDisciplineDayReport",
                columns: new[] { "EmployeeId", "ReportDate" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_tblDisciplineDayRound_RoundId",
                schema: "dbo",
                table: "tblDisciplineDayRound",
                column: "RoundId");

            migrationBuilder.CreateIndex(
                name: "UQ_DisciplineDayRound_Employee_Date_Round",
                schema: "dbo",
                table: "tblDisciplineDayRound",
                columns: new[] { "EmployeeId", "RoundDate", "RoundId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_DisciplineFinding_Employee_Date",
                schema: "dbo",
                table: "tblDisciplineFinding",
                columns: new[] { "EmployeeId", "FindingDate" });

            migrationBuilder.CreateIndex(
                name: "IX_tblDisciplineFinding_RoundId",
                schema: "dbo",
                table: "tblDisciplineFinding",
                column: "RoundId");

            migrationBuilder.CreateIndex(
                name: "IX_DisciplineFindingStudent_Note",
                schema: "dbo",
                table: "tblDisciplineFindingStudent",
                column: "ConductNoteId");

            migrationBuilder.CreateIndex(
                name: "IX_DisciplineFindingStudent_Student",
                schema: "dbo",
                table: "tblDisciplineFindingStudent",
                column: "StudentId");

            migrationBuilder.CreateIndex(
                name: "UQ_DisciplineRound_Code",
                schema: "dbo",
                table: "tblDisciplineRound",
                column: "Code",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "tblDisciplineDayReport",
                schema: "dbo");

            migrationBuilder.DropTable(
                name: "tblDisciplineDayRound",
                schema: "dbo");

            migrationBuilder.DropTable(
                name: "tblDisciplineFindingStudent",
                schema: "dbo");

            migrationBuilder.DropTable(
                name: "tblDisciplineFinding",
                schema: "dbo");

            migrationBuilder.DropTable(
                name: "tblDisciplineRound",
                schema: "dbo");

            migrationBuilder.Sql(
                """
                DELETE FROM dbo.tblUserRights WHERE ModuleCode = N'view_discipline';
                """);

            migrationBuilder.DeleteData(
                schema: "dbo",
                table: "tblPermission",
                keyColumn: "Id",
                keyValue: 152);

            migrationBuilder.DeleteData(
                schema: "dbo",
                table: "tblStudentConductType",
                keyColumn: "Id",
                keyValue: 5);

            migrationBuilder.DropColumn(
                name: "IsDisciplineIncharge",
                schema: "dbo",
                table: "tblEmployee");
        }
    }
}
