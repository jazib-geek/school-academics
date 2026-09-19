using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace School.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddCampusDateSheet : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.EnsureSchema(name: "dbo");

            migrationBuilder.CreateTable(
                name: "tblCampusDateSheet",
                schema: "dbo",
                columns: table => new
                {
                    ID = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Name = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    DisplayTitle = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    Subtitle = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    StartDate = table.Column<DateOnly>(type: "date", nullable: false),
                    EndDate = table.Column<DateOnly>(type: "date", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tblCampusDateSheet", x => x.ID);
                });

            migrationBuilder.CreateTable(
                name: "tblCampusDateSheetClass",
                schema: "dbo",
                columns: table => new
                {
                    ID = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    DateSheetID = table.Column<int>(type: "int", nullable: false),
                    ClassID = table.Column<int>(type: "int", nullable: false),
                    SortOrder = table.Column<int>(type: "int", nullable: false),
                    MergeGroupKey = table.Column<int>(type: "int", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tblCampusDateSheetClass", x => x.ID);
                    table.ForeignKey(
                        name: "FK_tblCampusDateSheetClass_tblCampusDateSheet_DateSheetID",
                        column: x => x.DateSheetID,
                        principalSchema: "dbo",
                        principalTable: "tblCampusDateSheet",
                        principalColumn: "ID",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_tblCampusDateSheetClass_tblClass_ClassID",
                        column: x => x.ClassID,
                        principalSchema: "dbo",
                        principalTable: "tblClass",
                        principalColumn: "Class_ID",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "tblCampusDateSheetDay",
                schema: "dbo",
                columns: table => new
                {
                    ID = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    DateSheetID = table.Column<int>(type: "int", nullable: false),
                    ExamDate = table.Column<DateOnly>(type: "date", nullable: false),
                    DayOfWeek = table.Column<byte>(type: "tinyint", nullable: false),
                    SortOrder = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tblCampusDateSheetDay", x => x.ID);
                    table.ForeignKey(
                        name: "FK_tblCampusDateSheetDay_tblCampusDateSheet_DateSheetID",
                        column: x => x.DateSheetID,
                        principalSchema: "dbo",
                        principalTable: "tblCampusDateSheet",
                        principalColumn: "ID",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "tblCampusDateSheetEntry",
                schema: "dbo",
                columns: table => new
                {
                    ID = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    DateSheetID = table.Column<int>(type: "int", nullable: false),
                    ClassID = table.Column<int>(type: "int", nullable: false),
                    ExamDate = table.Column<DateOnly>(type: "date", nullable: false),
                    EntryType = table.Column<byte>(type: "tinyint", nullable: false),
                    SubjectID = table.Column<int>(type: "int", nullable: true),
                    DisplayText = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tblCampusDateSheetEntry", x => x.ID);
                    table.ForeignKey(
                        name: "FK_tblCampusDateSheetEntry_tblCampusDateSheet_DateSheetID",
                        column: x => x.DateSheetID,
                        principalSchema: "dbo",
                        principalTable: "tblCampusDateSheet",
                        principalColumn: "ID",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_tblCampusDateSheetEntry_tblClass_ClassID",
                        column: x => x.ClassID,
                        principalSchema: "dbo",
                        principalTable: "tblClass",
                        principalColumn: "Class_ID",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_tblCampusDateSheetEntry_tblSubjectMaster_SubjectID",
                        column: x => x.SubjectID,
                        principalSchema: "dbo",
                        principalTable: "tblSubjectMaster",
                        principalColumn: "ID",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_tblCampusDateSheetClass_ClassID",
                schema: "dbo",
                table: "tblCampusDateSheetClass",
                column: "ClassID");

            migrationBuilder.CreateIndex(
                name: "IX_tblCampusDateSheetClass_DateSheetID_ClassID",
                schema: "dbo",
                table: "tblCampusDateSheetClass",
                columns: new[] { "DateSheetID", "ClassID" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_tblCampusDateSheetDay_DateSheetID_ExamDate",
                schema: "dbo",
                table: "tblCampusDateSheetDay",
                columns: new[] { "DateSheetID", "ExamDate" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_tblCampusDateSheetEntry_ClassID",
                schema: "dbo",
                table: "tblCampusDateSheetEntry",
                column: "ClassID");

            migrationBuilder.CreateIndex(
                name: "IX_tblCampusDateSheetEntry_DateSheetID_ClassID_ExamDate",
                schema: "dbo",
                table: "tblCampusDateSheetEntry",
                columns: new[] { "DateSheetID", "ClassID", "ExamDate" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_tblCampusDateSheetEntry_SubjectID",
                schema: "dbo",
                table: "tblCampusDateSheetEntry",
                column: "SubjectID");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "tblCampusDateSheetClass",
                schema: "dbo");

            migrationBuilder.DropTable(
                name: "tblCampusDateSheetDay",
                schema: "dbo");

            migrationBuilder.DropTable(
                name: "tblCampusDateSheetEntry",
                schema: "dbo");

            migrationBuilder.DropTable(
                name: "tblCampusDateSheet",
                schema: "dbo");
        }
    }
}
