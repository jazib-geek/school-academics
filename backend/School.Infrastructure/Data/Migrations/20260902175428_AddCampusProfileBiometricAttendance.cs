using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace School.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddCampusProfileBiometricAttendance : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "AdminEarlyMinutes",
                schema: "dbo",
                table: "tblCampusProfile",
                type: "int",
                nullable: false,
                defaultValue: 30);

            migrationBuilder.AddColumn<string>(
                name: "BiometricAttendanceType",
                schema: "dbo",
                table: "tblCampusProfile",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "ZkTeco");

            migrationBuilder.AddColumn<int>(
                name: "CoordinatorEarlyMinutes",
                schema: "dbo",
                table: "tblCampusProfile",
                type: "int",
                nullable: false,
                defaultValue: 15);

            migrationBuilder.AddColumn<TimeSpan>(
                name: "FridayCheckOutTime",
                schema: "dbo",
                table: "tblCampusProfile",
                type: "time",
                nullable: false,
                defaultValue: new TimeSpan(0, 12, 30, 0));

            migrationBuilder.AddColumn<TimeSpan>(
                name: "TeacherCheckInTime",
                schema: "dbo",
                table: "tblCampusProfile",
                type: "time",
                nullable: false,
                defaultValue: new TimeSpan(0, 7, 15, 0));

            migrationBuilder.Sql("""
                UPDATE dbo.tblCampusProfile
                SET
                    BiometricAttendanceType = N'ZkTeco',
                    TeacherCheckInTime = CAST('07:15:00' AS time),
                    AdminEarlyMinutes = 30,
                    CoordinatorEarlyMinutes = 15,
                    FridayCheckOutTime = CAST('12:30:00' AS time)
                WHERE BiometricAttendanceType IS NULL
                   OR LTRIM(RTRIM(BiometricAttendanceType)) = N'';
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AdminEarlyMinutes",
                schema: "dbo",
                table: "tblCampusProfile");

            migrationBuilder.DropColumn(
                name: "BiometricAttendanceType",
                schema: "dbo",
                table: "tblCampusProfile");

            migrationBuilder.DropColumn(
                name: "CoordinatorEarlyMinutes",
                schema: "dbo",
                table: "tblCampusProfile");

            migrationBuilder.DropColumn(
                name: "FridayCheckOutTime",
                schema: "dbo",
                table: "tblCampusProfile");

            migrationBuilder.DropColumn(
                name: "TeacherCheckInTime",
                schema: "dbo",
                table: "tblCampusProfile");
        }
    }
}
