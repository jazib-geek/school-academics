using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace School.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddStudentConduct : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "CanRecordStudentConduct",
                schema: "dbo",
                table: "tblEmployee",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "CanViewStudentConduct",
                schema: "dbo",
                table: "tblEmployee",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateTable(
                name: "tblStudentConductType",
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
                    table.PrimaryKey("PK_tblStudentConductType", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "tblStudentConductNote",
                schema: "dbo",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    StudentId = table.Column<int>(type: "int", nullable: false),
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
                    table.PrimaryKey("PK_tblStudentConductNote", x => x.Id);
                    table.ForeignKey(
                        name: "FK_tblStudentConductNote_tblEmployee_RecordedByEmployeeId",
                        column: x => x.RecordedByEmployeeId,
                        principalSchema: "dbo",
                        principalTable: "tblEmployee",
                        principalColumn: "ID",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_tblStudentConductNote_tblStudentConductType_ConductTypeId",
                        column: x => x.ConductTypeId,
                        principalSchema: "dbo",
                        principalTable: "tblStudentConductType",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_tblStudentConductNote_tblStudent_StudentId",
                        column: x => x.StudentId,
                        principalSchema: "dbo",
                        principalTable: "tblStudent",
                        principalColumn: "Reg_Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "tblStudentConductTag",
                schema: "dbo",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ConductTypeId = table.Column<int>(type: "int", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: false),
                    SortOrder = table.Column<int>(type: "int", nullable: false),
                    IsSystem = table.Column<bool>(type: "bit", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false, defaultValue: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tblStudentConductTag", x => x.Id);
                    table.ForeignKey(
                        name: "FK_tblStudentConductTag_tblStudentConductType_ConductTypeId",
                        column: x => x.ConductTypeId,
                        principalSchema: "dbo",
                        principalTable: "tblStudentConductType",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "tblStudentConductNoteTag",
                schema: "dbo",
                columns: table => new
                {
                    NoteId = table.Column<int>(type: "int", nullable: false),
                    TagId = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tblStudentConductNoteTag", x => new { x.NoteId, x.TagId });
                    table.ForeignKey(
                        name: "FK_tblStudentConductNoteTag_tblStudentConductNote_NoteId",
                        column: x => x.NoteId,
                        principalSchema: "dbo",
                        principalTable: "tblStudentConductNote",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_tblStudentConductNoteTag_tblStudentConductTag_TagId",
                        column: x => x.TagId,
                        principalSchema: "dbo",
                        principalTable: "tblStudentConductTag",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.InsertData(
                schema: "dbo",
                table: "tblStudentConductType",
                columns: new[] { "Id", "IsActive", "IsSystem", "Name", "SortOrder" },
                values: new object[,]
                {
                    { 1, true, true, "Uniform", 10 },
                    { 2, true, true, "Punctuality", 20 },
                    { 3, true, true, "Homework", 30 },
                    { 4, true, true, "Class Behaviour", 40 }
                });

            migrationBuilder.InsertData(
                schema: "dbo",
                table: "tblStudentConductTag",
                columns: new[] { "Id", "ConductTypeId", "IsActive", "IsSystem", "Name", "SortOrder" },
                values: new object[,]
                {
                    { 101, 1, true, true, "Dirty", 10 },
                    { 102, 1, true, true, "Untidy", 20 },
                    { 103, 1, true, true, "Torn", 30 },
                    { 104, 1, true, true, "Incomplete", 40 },
                    { 105, 1, true, true, "Wrong uniform", 50 },
                    { 106, 1, true, true, "Neat", 60 },
                    { 201, 2, true, true, "Late to school", 10 },
                    { 202, 2, true, true, "Late to class", 20 },
                    { 203, 2, true, true, "Habitual latecomer", 30 },
                    { 204, 2, true, true, "Left early", 40 },
                    { 205, 2, true, true, "Missed assembly", 50 },
                    { 301, 3, true, true, "Not done", 10 },
                    { 302, 3, true, true, "Incomplete", 20 },
                    { 303, 3, true, true, "Copied", 30 },
                    { 304, 3, true, true, "Poor quality", 40 },
                    { 305, 3, true, true, "Bad handwriting", 50 },
                    { 306, 3, true, true, "Good handwriting", 60 },
                    { 307, 3, true, true, "Excellent", 70 },
                    { 401, 4, true, true, "Talking", 10 },
                    { 402, 4, true, true, "Disruptive", 20 },
                    { 403, 4, true, true, "Disrespectful", 30 },
                    { 404, 4, true, true, "Inattentive", 40 },
                    { 405, 4, true, true, "Fighting", 50 },
                    { 406, 4, true, true, "Helpful", 60 }
                });

            migrationBuilder.CreateIndex(
                name: "IX_StudentConductNote_Student_Date",
                schema: "dbo",
                table: "tblStudentConductNote",
                columns: new[] { "StudentId", "NoteDate" });

            migrationBuilder.CreateIndex(
                name: "IX_tblStudentConductNote_ConductTypeId",
                schema: "dbo",
                table: "tblStudentConductNote",
                column: "ConductTypeId");

            migrationBuilder.CreateIndex(
                name: "IX_tblStudentConductNote_RecordedByEmployeeId",
                schema: "dbo",
                table: "tblStudentConductNote",
                column: "RecordedByEmployeeId");

            migrationBuilder.CreateIndex(
                name: "UQ_StudentConductNote_Student_Date_Type",
                schema: "dbo",
                table: "tblStudentConductNote",
                columns: new[] { "StudentId", "NoteDate", "ConductTypeId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_StudentConductNoteTag_Tag",
                schema: "dbo",
                table: "tblStudentConductNoteTag",
                column: "TagId");

            migrationBuilder.CreateIndex(
                name: "UQ_StudentConductTag_Type_Name",
                schema: "dbo",
                table: "tblStudentConductTag",
                columns: new[] { "ConductTypeId", "Name" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "UQ_StudentConductType_Name",
                schema: "dbo",
                table: "tblStudentConductType",
                column: "Name",
                unique: true);

            migrationBuilder.Sql("DBCC CHECKIDENT ('dbo.tblStudentConductType', RESEED, 4);");
            migrationBuilder.Sql("DBCC CHECKIDENT ('dbo.tblStudentConductTag', RESEED, 406);");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "tblStudentConductNoteTag",
                schema: "dbo");

            migrationBuilder.DropTable(
                name: "tblStudentConductNote",
                schema: "dbo");

            migrationBuilder.DropTable(
                name: "tblStudentConductTag",
                schema: "dbo");

            migrationBuilder.DropTable(
                name: "tblStudentConductType",
                schema: "dbo");

            migrationBuilder.DropColumn(
                name: "CanRecordStudentConduct",
                schema: "dbo",
                table: "tblEmployee");

            migrationBuilder.DropColumn(
                name: "CanViewStudentConduct",
                schema: "dbo",
                table: "tblEmployee");
        }
    }
}
