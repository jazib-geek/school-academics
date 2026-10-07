using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace School.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddEmployeeAttendanceChangeRequestMarkPresentKind : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<int>(
                name: "EmployeeAttendanceId",
                schema: "dbo",
                table: "tblEmployeeAttendanceChangeRequest",
                type: "int",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "int");

            migrationBuilder.AddColumn<string>(
                name: "RequestKind",
                schema: "dbo",
                table: "tblEmployeeAttendanceChangeRequest",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "change");

            migrationBuilder.Sql(
                """
                UPDATE dbo.tblEmployeeAttendanceChangeRequest
                SET RequestKind = N'change'
                WHERE RequestKind IS NULL OR LTRIM(RTRIM(RequestKind)) = N'';
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "RequestKind",
                schema: "dbo",
                table: "tblEmployeeAttendanceChangeRequest");

            migrationBuilder.AlterColumn<int>(
                name: "EmployeeAttendanceId",
                schema: "dbo",
                table: "tblEmployeeAttendanceChangeRequest",
                type: "int",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "int",
                oldNullable: true);
        }
    }
}
