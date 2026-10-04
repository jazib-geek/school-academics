using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace School.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddProformaWingAndEmployeePortalFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_CoordProforma_AttendanceSnapshot_Counts",
                schema: "dbo",
                table: "tblCoordinatorProformaAttendanceSnapshot");

            migrationBuilder.AddColumn<bool>(
                name: "IsAcademicHead",
                schema: "dbo",
                table: "tblEmployee",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "WingCode",
                schema: "dbo",
                table: "tblEmployee",
                type: "varchar(64)",
                unicode: false,
                maxLength: 64,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "WingCode",
                schema: "dbo",
                table: "tblCoordinatorProformaReport",
                type: "varchar(64)",
                unicode: false,
                maxLength: 64,
                nullable: false,
                defaultValue: "Primary");

            migrationBuilder.AddColumn<string>(
                name: "MorningModsText",
                schema: "dbo",
                table: "tblCoordinatorProformaClosing",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "PresentFaculty",
                schema: "dbo",
                table: "tblCoordinatorProformaAttendanceSnapshot",
                type: "int",
                nullable: true);

            migrationBuilder.AddCheckConstraint(
                name: "CK_Employee_WingCode",
                schema: "dbo",
                table: "tblEmployee",
                sql: "[WingCode] IS NULL OR [WingCode] IN ('Junior', 'Primary', 'High', 'HighBoys', 'HighGirls', 'PrimaryHigh', 'JuniorPrimary')");

            migrationBuilder.AddCheckConstraint(
                name: "CK_CoordProforma_Report_WingCode",
                schema: "dbo",
                table: "tblCoordinatorProformaReport",
                sql: "[WingCode] IN ('Junior', 'Primary', 'High', 'HighBoys', 'HighGirls', 'PrimaryHigh', 'JuniorPrimary')");

            migrationBuilder.AddCheckConstraint(
                name: "CK_CoordProforma_AttendanceSnapshot_Counts",
                schema: "dbo",
                table: "tblCoordinatorProformaAttendanceSnapshot",
                sql: "[ActiveStudents] >= 0 AND [PresentStudents] >= 0 AND [AbsentStudents] >= 0 AND [UnmarkedStudents] >= 0 AND [TotalFaculty] >= 0 AND ([PresentFaculty] IS NULL OR [PresentFaculty] >= 0)");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_Employee_WingCode",
                schema: "dbo",
                table: "tblEmployee");

            migrationBuilder.DropCheckConstraint(
                name: "CK_CoordProforma_Report_WingCode",
                schema: "dbo",
                table: "tblCoordinatorProformaReport");

            migrationBuilder.DropCheckConstraint(
                name: "CK_CoordProforma_AttendanceSnapshot_Counts",
                schema: "dbo",
                table: "tblCoordinatorProformaAttendanceSnapshot");

            migrationBuilder.DropColumn(
                name: "IsAcademicHead",
                schema: "dbo",
                table: "tblEmployee");

            migrationBuilder.DropColumn(
                name: "WingCode",
                schema: "dbo",
                table: "tblEmployee");

            migrationBuilder.DropColumn(
                name: "WingCode",
                schema: "dbo",
                table: "tblCoordinatorProformaReport");

            migrationBuilder.DropColumn(
                name: "MorningModsText",
                schema: "dbo",
                table: "tblCoordinatorProformaClosing");

            migrationBuilder.DropColumn(
                name: "PresentFaculty",
                schema: "dbo",
                table: "tblCoordinatorProformaAttendanceSnapshot");

            migrationBuilder.AddCheckConstraint(
                name: "CK_CoordProforma_AttendanceSnapshot_Counts",
                schema: "dbo",
                table: "tblCoordinatorProformaAttendanceSnapshot",
                sql: "[ActiveStudents] >= 0 AND [PresentStudents] >= 0 AND [AbsentStudents] >= 0 AND [UnmarkedStudents] >= 0 AND [TotalFaculty] >= 0");
        }
    }
}
