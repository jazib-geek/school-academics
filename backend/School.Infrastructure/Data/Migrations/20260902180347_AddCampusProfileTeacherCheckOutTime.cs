using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace School.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddCampusProfileTeacherCheckOutTime : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<TimeSpan>(
                name: "TeacherCheckOutTime",
                schema: "dbo",
                table: "tblCampusProfile",
                type: "time",
                nullable: false,
                defaultValue: new TimeSpan(0, 13, 30, 0));

            migrationBuilder.Sql("""
                UPDATE dbo.tblCampusProfile
                SET TeacherCheckOutTime = CAST('13:30:00' AS time)
                WHERE TeacherCheckOutTime = CAST('00:00:00' AS time);
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "TeacherCheckOutTime",
                schema: "dbo",
                table: "tblCampusProfile");
        }
    }
}
