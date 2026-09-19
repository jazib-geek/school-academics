using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace School.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddClassDiaryLastUpdatedAudit : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "LastUpdatedAt",
                schema: "dbo",
                table: "tblClassDiary",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "LastUpdatedBy",
                schema: "dbo",
                table: "tblClassDiary",
                type: "nvarchar(150)",
                maxLength: 150,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "LastUpdatedAt",
                schema: "dbo",
                table: "tblClassDiary");

            migrationBuilder.DropColumn(
                name: "LastUpdatedBy",
                schema: "dbo",
                table: "tblClassDiary");
        }
    }
}
