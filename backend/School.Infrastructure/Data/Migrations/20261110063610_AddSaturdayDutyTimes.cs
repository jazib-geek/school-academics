using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace School.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddSaturdayDutyTimes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "SaturdayLeavingTime",
                schema: "dbo",
                table: "tblDesignation",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "SaturdayMustCheckinTime",
                schema: "dbo",
                table: "tblDesignation",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<TimeSpan>(
                name: "SaturdayCheckInTime",
                schema: "dbo",
                table: "tblCampusProfile",
                type: "time",
                nullable: false,
                defaultValue: new TimeSpan(0, 7, 15, 0, 0));

            migrationBuilder.AddColumn<TimeSpan>(
                name: "SaturdayCheckOutTime",
                schema: "dbo",
                table: "tblCampusProfile",
                type: "time",
                nullable: false,
                defaultValue: new TimeSpan(0, 13, 30, 0, 0));

            migrationBuilder.Sql("""
                UPDATE dbo.tblCampusProfile
                SET
                    SaturdayCheckInTime = TeacherCheckInTime,
                    SaturdayCheckOutTime = TeacherCheckOutTime;

                UPDATE dbo.tblDesignation
                SET SaturdayMustCheckinTime = MustCheckinTime
                WHERE SaturdayMustCheckinTime IS NULL
                  AND MustCheckinTime IS NOT NULL;

                UPDATE dbo.tblDesignation
                SET SaturdayLeavingTime = LeavingTime
                WHERE SaturdayLeavingTime IS NULL
                  AND LeavingTime IS NOT NULL;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "SaturdayLeavingTime",
                schema: "dbo",
                table: "tblDesignation");

            migrationBuilder.DropColumn(
                name: "SaturdayMustCheckinTime",
                schema: "dbo",
                table: "tblDesignation");

            migrationBuilder.DropColumn(
                name: "SaturdayCheckInTime",
                schema: "dbo",
                table: "tblCampusProfile");

            migrationBuilder.DropColumn(
                name: "SaturdayCheckOutTime",
                schema: "dbo",
                table: "tblCampusProfile");
        }
    }
}
