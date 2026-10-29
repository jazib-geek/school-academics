using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace School.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddTeacherConduct : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "CanRecordTeacherConduct",
                schema: "dbo",
                table: "tblEmployee",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "CanViewTeacherConduct",
                schema: "dbo",
                table: "tblEmployee",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateTable(
                name: "tblTeacherConductType",
                schema: "dbo",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Name = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: false),
                    SortOrder = table.Column<int>(type: "int", nullable: false),
                    IsSystem = table.Column<bool>(type: "bit", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false, defaultValue: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tblTeacherConductType", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "tblTeacherConductNote",
                schema: "dbo",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    SubjectEmployeeId = table.Column<int>(type: "int", nullable: false),
                    NoteDate = table.Column<DateOnly>(type: "date", nullable: false),
                    ConductTypeId = table.Column<int>(type: "int", nullable: false),
                    Remarks = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    RecordedByEmployeeId = table.Column<int>(type: "int", nullable: true),
                    RecordedByName = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: true),
                    CreatedAtPkt = table.Column<DateTime>(type: "datetime2(3)", nullable: false),
                    UpdatedAtPkt = table.Column<DateTime>(type: "datetime2(3)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tblTeacherConductNote", x => x.Id);
                    table.ForeignKey(
                        name: "FK_tblTeacherConductNote_tblEmployee_RecordedByEmployeeId",
                        column: x => x.RecordedByEmployeeId,
                        principalSchema: "dbo",
                        principalTable: "tblEmployee",
                        principalColumn: "ID",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_tblTeacherConductNote_tblEmployee_SubjectEmployeeId",
                        column: x => x.SubjectEmployeeId,
                        principalSchema: "dbo",
                        principalTable: "tblEmployee",
                        principalColumn: "ID",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_tblTeacherConductNote_tblTeacherConductType_ConductTypeId",
                        column: x => x.ConductTypeId,
                        principalSchema: "dbo",
                        principalTable: "tblTeacherConductType",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "tblTeacherConductTag",
                schema: "dbo",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ConductTypeId = table.Column<int>(type: "int", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: false),
                    SortOrder = table.Column<int>(type: "int", nullable: false),
                    IsSystem = table.Column<bool>(type: "bit", nullable: false),
                    IsGood = table.Column<bool>(type: "bit", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false, defaultValue: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tblTeacherConductTag", x => x.Id);
                    table.ForeignKey(
                        name: "FK_tblTeacherConductTag_tblTeacherConductType_ConductTypeId",
                        column: x => x.ConductTypeId,
                        principalSchema: "dbo",
                        principalTable: "tblTeacherConductType",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "tblTeacherConductNoteTag",
                schema: "dbo",
                columns: table => new
                {
                    NoteId = table.Column<int>(type: "int", nullable: false),
                    TagId = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tblTeacherConductNoteTag", x => new { x.NoteId, x.TagId });
                    table.ForeignKey(
                        name: "FK_tblTeacherConductNoteTag_tblTeacherConductNote_NoteId",
                        column: x => x.NoteId,
                        principalSchema: "dbo",
                        principalTable: "tblTeacherConductNote",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_tblTeacherConductNoteTag_tblTeacherConductTag_TagId",
                        column: x => x.TagId,
                        principalSchema: "dbo",
                        principalTable: "tblTeacherConductTag",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.InsertData(
                schema: "dbo",
                table: "tblPermission",
                columns: new[] { "Id", "Code", "IsActive", "ModuleHead", "Name", "SortOrder" },
                values: new object[] { 150, "view_teacher_conduct", true, "Employee", "View Teacher Conduct", 1500 });

            migrationBuilder.Sql(
                """
                IF OBJECT_ID('tempdb..#NewPerms') IS NOT NULL DROP TABLE #NewPerms;

                SELECT p.Code, p.Name, p.ModuleHead
                INTO #NewPerms
                FROM dbo.tblPermission p
                WHERE p.Code IN (N'view_teacher_conduct');

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

                INSERT INTO dbo.tblUserRights (UserName, ModuleCode, ModuleName, ModuleHead, HasAccess)
                SELECT u.Username, g.Code, g.Name, g.ModuleHead, 1
                FROM dbo.tblUser u
                CROSS JOIN #NewPerms g
                WHERE u.IsActive = 1
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
                table: "tblTeacherConductType",
                columns: new[] { "Id", "IsActive", "IsSystem", "Name", "SortOrder" },
                values: new object[,]
                {
                    { 1, true, true, "Attendance & punctuality", 10 },
                    { 2, true, true, "Class delivery", 20 },
                    { 3, true, true, "Professional conduct", 30 },
                    { 4, true, true, "Parents & communication", 40 }
                });

            migrationBuilder.InsertData(
                schema: "dbo",
                table: "tblTeacherConductTag",
                columns: new[] { "Id", "ConductTypeId", "IsActive", "IsGood", "IsSystem", "Name", "SortOrder" },
                values: new object[,]
                {
                    { 101, 1, true, true, true, "Started class on time", 10 },
                    { 102, 1, true, false, true, "Late start", 20 },
                    { 103, 1, true, false, true, "Continuous absence", 30 },
                    { 104, 1, true, false, true, "Too many short leaves", 40 },
                    { 105, 1, true, false, true, "Left early without permission", 50 },
                    { 106, 1, true, true, true, "Full attendance this month", 60 },
                    { 201, 2, true, true, true, "Lesson prepared", 10 },
                    { 202, 2, true, false, true, "Lesson not prepared", 20 },
                    { 203, 2, true, false, true, "Syllabus behind schedule", 30 },
                    { 204, 2, true, true, true, "Good class control", 40 },
                    { 205, 2, true, false, true, "Weak class control", 50 },
                    { 206, 2, true, false, true, "Did not follow timetable", 60 },
                    { 301, 3, true, false, true, "Dress code issue", 10 },
                    { 302, 3, true, false, true, "Behaviour issue", 20 },
                    { 303, 3, true, false, true, "Policy breach", 30 },
                    { 304, 3, true, true, true, "Positive feedback", 40 },
                    { 305, 3, true, false, true, "Unprofessional with staff", 50 },
                    { 306, 3, true, false, true, "Mobile phone misuse in class", 60 },
                    { 401, 4, true, false, true, "Parent complaint", 10 },
                    { 402, 4, true, false, true, "Did not respond to parent", 20 },
                    { 403, 4, true, true, true, "Handled concern well", 30 },
                    { 404, 4, true, false, true, "Diary not updated", 40 },
                    { 405, 4, true, false, true, "Miscommunication with parents", 50 },
                    { 406, 4, true, true, true, "Good parent meeting", 60 }
                });

            migrationBuilder.CreateIndex(
                name: "IX_tblTeacherConductNote_ConductTypeId",
                schema: "dbo",
                table: "tblTeacherConductNote",
                column: "ConductTypeId");

            migrationBuilder.CreateIndex(
                name: "IX_tblTeacherConductNote_RecordedByEmployeeId",
                schema: "dbo",
                table: "tblTeacherConductNote",
                column: "RecordedByEmployeeId");

            migrationBuilder.CreateIndex(
                name: "IX_TeacherConductNote_Employee_Date",
                schema: "dbo",
                table: "tblTeacherConductNote",
                columns: new[] { "SubjectEmployeeId", "NoteDate" });

            migrationBuilder.CreateIndex(
                name: "UQ_TeacherConductNote_Employee_Date_Type",
                schema: "dbo",
                table: "tblTeacherConductNote",
                columns: new[] { "SubjectEmployeeId", "NoteDate", "ConductTypeId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_TeacherConductNoteTag_Tag",
                schema: "dbo",
                table: "tblTeacherConductNoteTag",
                column: "TagId");

            migrationBuilder.CreateIndex(
                name: "UQ_TeacherConductTag_Type_Name",
                schema: "dbo",
                table: "tblTeacherConductTag",
                columns: new[] { "ConductTypeId", "Name" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "UQ_TeacherConductType_Name",
                schema: "dbo",
                table: "tblTeacherConductType",
                column: "Name",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "tblTeacherConductNoteTag",
                schema: "dbo");

            migrationBuilder.DropTable(
                name: "tblTeacherConductNote",
                schema: "dbo");

            migrationBuilder.DropTable(
                name: "tblTeacherConductTag",
                schema: "dbo");

            migrationBuilder.DropTable(
                name: "tblTeacherConductType",
                schema: "dbo");

            migrationBuilder.DeleteData(
                schema: "dbo",
                table: "tblPermission",
                keyColumn: "Id",
                keyValue: 150);

            migrationBuilder.DropColumn(
                name: "CanRecordTeacherConduct",
                schema: "dbo",
                table: "tblEmployee");

            migrationBuilder.DropColumn(
                name: "CanViewTeacherConduct",
                schema: "dbo",
                table: "tblEmployee");
        }
    }
}
