using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace School.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddStudentConductTagIsGood : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsGood",
                schema: "dbo",
                table: "tblStudentConductTag",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.UpdateData(
                schema: "dbo",
                table: "tblStudentConductTag",
                keyColumn: "Id",
                keyValue: 101,
                column: "IsGood",
                value: false);

            migrationBuilder.UpdateData(
                schema: "dbo",
                table: "tblStudentConductTag",
                keyColumn: "Id",
                keyValue: 102,
                column: "IsGood",
                value: false);

            migrationBuilder.UpdateData(
                schema: "dbo",
                table: "tblStudentConductTag",
                keyColumn: "Id",
                keyValue: 103,
                column: "IsGood",
                value: false);

            migrationBuilder.UpdateData(
                schema: "dbo",
                table: "tblStudentConductTag",
                keyColumn: "Id",
                keyValue: 104,
                column: "IsGood",
                value: false);

            migrationBuilder.UpdateData(
                schema: "dbo",
                table: "tblStudentConductTag",
                keyColumn: "Id",
                keyValue: 105,
                column: "IsGood",
                value: false);

            migrationBuilder.UpdateData(
                schema: "dbo",
                table: "tblStudentConductTag",
                keyColumn: "Id",
                keyValue: 106,
                column: "IsGood",
                value: true);

            migrationBuilder.UpdateData(
                schema: "dbo",
                table: "tblStudentConductTag",
                keyColumn: "Id",
                keyValue: 201,
                column: "IsGood",
                value: false);

            migrationBuilder.UpdateData(
                schema: "dbo",
                table: "tblStudentConductTag",
                keyColumn: "Id",
                keyValue: 202,
                column: "IsGood",
                value: false);

            migrationBuilder.UpdateData(
                schema: "dbo",
                table: "tblStudentConductTag",
                keyColumn: "Id",
                keyValue: 203,
                column: "IsGood",
                value: false);

            migrationBuilder.UpdateData(
                schema: "dbo",
                table: "tblStudentConductTag",
                keyColumn: "Id",
                keyValue: 204,
                column: "IsGood",
                value: false);

            migrationBuilder.UpdateData(
                schema: "dbo",
                table: "tblStudentConductTag",
                keyColumn: "Id",
                keyValue: 205,
                column: "IsGood",
                value: false);

            migrationBuilder.UpdateData(
                schema: "dbo",
                table: "tblStudentConductTag",
                keyColumn: "Id",
                keyValue: 301,
                column: "IsGood",
                value: false);

            migrationBuilder.UpdateData(
                schema: "dbo",
                table: "tblStudentConductTag",
                keyColumn: "Id",
                keyValue: 302,
                column: "IsGood",
                value: false);

            migrationBuilder.UpdateData(
                schema: "dbo",
                table: "tblStudentConductTag",
                keyColumn: "Id",
                keyValue: 303,
                column: "IsGood",
                value: false);

            migrationBuilder.UpdateData(
                schema: "dbo",
                table: "tblStudentConductTag",
                keyColumn: "Id",
                keyValue: 304,
                column: "IsGood",
                value: false);

            migrationBuilder.UpdateData(
                schema: "dbo",
                table: "tblStudentConductTag",
                keyColumn: "Id",
                keyValue: 305,
                column: "IsGood",
                value: false);

            migrationBuilder.UpdateData(
                schema: "dbo",
                table: "tblStudentConductTag",
                keyColumn: "Id",
                keyValue: 306,
                column: "IsGood",
                value: true);

            migrationBuilder.UpdateData(
                schema: "dbo",
                table: "tblStudentConductTag",
                keyColumn: "Id",
                keyValue: 307,
                column: "IsGood",
                value: true);

            migrationBuilder.UpdateData(
                schema: "dbo",
                table: "tblStudentConductTag",
                keyColumn: "Id",
                keyValue: 401,
                column: "IsGood",
                value: false);

            migrationBuilder.UpdateData(
                schema: "dbo",
                table: "tblStudentConductTag",
                keyColumn: "Id",
                keyValue: 402,
                column: "IsGood",
                value: false);

            migrationBuilder.UpdateData(
                schema: "dbo",
                table: "tblStudentConductTag",
                keyColumn: "Id",
                keyValue: 403,
                column: "IsGood",
                value: false);

            migrationBuilder.UpdateData(
                schema: "dbo",
                table: "tblStudentConductTag",
                keyColumn: "Id",
                keyValue: 404,
                column: "IsGood",
                value: false);

            migrationBuilder.UpdateData(
                schema: "dbo",
                table: "tblStudentConductTag",
                keyColumn: "Id",
                keyValue: 405,
                column: "IsGood",
                value: false);

            migrationBuilder.UpdateData(
                schema: "dbo",
                table: "tblStudentConductTag",
                keyColumn: "Id",
                keyValue: 406,
                column: "IsGood",
                value: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IsGood",
                schema: "dbo",
                table: "tblStudentConductTag");
        }
    }
}
