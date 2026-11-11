using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace School.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddCleanSheetBonus : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "CleanSheetBonusAmount",
                schema: "dbo",
                table: "tblCampusProfile",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 500m);

            migrationBuilder.AddColumn<string>(
                name: "CleanSheetBonusDescription",
                schema: "dbo",
                table: "tblCampusProfile",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true,
                defaultValue: "Paid for a month with no late comings and no absences.");

            migrationBuilder.AddColumn<bool>(
                name: "CleanSheetBonusEnabled",
                schema: "dbo",
                table: "tblCampusProfile",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "CleanSheetBonusName",
                schema: "dbo",
                table: "tblCampusProfile",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: false,
                defaultValue: "Clean sheet bonus");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CleanSheetBonusAmount",
                schema: "dbo",
                table: "tblCampusProfile");

            migrationBuilder.DropColumn(
                name: "CleanSheetBonusDescription",
                schema: "dbo",
                table: "tblCampusProfile");

            migrationBuilder.DropColumn(
                name: "CleanSheetBonusEnabled",
                schema: "dbo",
                table: "tblCampusProfile");

            migrationBuilder.DropColumn(
                name: "CleanSheetBonusName",
                schema: "dbo",
                table: "tblCampusProfile");
        }
    }
}
