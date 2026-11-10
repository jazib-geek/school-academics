using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace School.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddDesignationFridayDutyTimes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "FridayLeavingTime",
                schema: "dbo",
                table: "tblDesignation",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "FridayMustCheckinTime",
                schema: "dbo",
                table: "tblDesignation",
                type: "datetime2",
                nullable: true);

            migrationBuilder.Sql("""
                UPDATE dbo.tblDesignation
                SET FridayMustCheckinTime = CAST('2020-01-01T07:45:00' AS datetime2)
                WHERE FridayMustCheckinTime IS NULL;

                UPDATE dbo.tblDesignation
                SET FridayLeavingTime = CAST('2020-01-01T12:30:00' AS datetime2)
                WHERE FridayLeavingTime IS NULL;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "FridayLeavingTime",
                schema: "dbo",
                table: "tblDesignation");

            migrationBuilder.DropColumn(
                name: "FridayMustCheckinTime",
                schema: "dbo",
                table: "tblDesignation");
        }
    }
}
