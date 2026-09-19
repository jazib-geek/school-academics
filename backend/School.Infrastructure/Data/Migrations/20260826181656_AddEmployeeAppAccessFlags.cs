using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace School.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddEmployeeAppAccessFlags : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "CanAccessLessonPlan",
                schema: "dbo",
                table: "tblEmployee",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "CanEditDatesheet",
                schema: "dbo",
                table: "tblEmployee",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "CanEditDiary",
                schema: "dbo",
                table: "tblEmployee",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "CanEditSubjectAllocation",
                schema: "dbo",
                table: "tblEmployee",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "CanEditTimetable",
                schema: "dbo",
                table: "tblEmployee",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "CanMarkStudentAttendance",
                schema: "dbo",
                table: "tblEmployee",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "CanViewDatesheet",
                schema: "dbo",
                table: "tblEmployee",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "CanViewDiary",
                schema: "dbo",
                table: "tblEmployee",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "CanViewStudentAttendance",
                schema: "dbo",
                table: "tblEmployee",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "CanViewStudentExamDetail",
                schema: "dbo",
                table: "tblEmployee",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "CanViewSubjectAllocation",
                schema: "dbo",
                table: "tblEmployee",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "CanViewTimetable",
                schema: "dbo",
                table: "tblEmployee",
                type: "bit",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CanAccessLessonPlan",
                schema: "dbo",
                table: "tblEmployee");

            migrationBuilder.DropColumn(
                name: "CanEditDatesheet",
                schema: "dbo",
                table: "tblEmployee");

            migrationBuilder.DropColumn(
                name: "CanEditDiary",
                schema: "dbo",
                table: "tblEmployee");

            migrationBuilder.DropColumn(
                name: "CanEditSubjectAllocation",
                schema: "dbo",
                table: "tblEmployee");

            migrationBuilder.DropColumn(
                name: "CanEditTimetable",
                schema: "dbo",
                table: "tblEmployee");

            migrationBuilder.DropColumn(
                name: "CanMarkStudentAttendance",
                schema: "dbo",
                table: "tblEmployee");

            migrationBuilder.DropColumn(
                name: "CanViewDatesheet",
                schema: "dbo",
                table: "tblEmployee");

            migrationBuilder.DropColumn(
                name: "CanViewDiary",
                schema: "dbo",
                table: "tblEmployee");

            migrationBuilder.DropColumn(
                name: "CanViewStudentAttendance",
                schema: "dbo",
                table: "tblEmployee");

            migrationBuilder.DropColumn(
                name: "CanViewStudentExamDetail",
                schema: "dbo",
                table: "tblEmployee");

            migrationBuilder.DropColumn(
                name: "CanViewSubjectAllocation",
                schema: "dbo",
                table: "tblEmployee");

            migrationBuilder.DropColumn(
                name: "CanViewTimetable",
                schema: "dbo",
                table: "tblEmployee");
        }
    }
}
