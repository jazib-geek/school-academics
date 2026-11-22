using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace School.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddStudentProfileImage : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ProfileImageKey",
                schema: "dbo",
                table: "tblStudent",
                type: "nvarchar(300)",
                maxLength: 300,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ProfileImageUpdatedAt",
                schema: "dbo",
                table: "tblStudent",
                type: "datetime2(3)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ProfileImageKey",
                schema: "dbo",
                table: "tblStudent");

            migrationBuilder.DropColumn(
                name: "ProfileImageUpdatedAt",
                schema: "dbo",
                table: "tblStudent");
        }
    }
}
