using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace School.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddAbsentStudentFollowup : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "tblAbsentStudentFollowup",
                schema: "dbo",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    StudentId = table.Column<int>(type: "int", nullable: false),
                    AttendanceDate = table.Column<DateOnly>(type: "date", nullable: false),
                    Description = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    UpdatedAtPkt = table.Column<DateTime>(type: "datetime2(3)", nullable: false),
                    UpdatedByName = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tblAbsentStudentFollowup", x => x.Id);
                    table.ForeignKey(
                        name: "FK_tblAbsentStudentFollowup_tblStudent_StudentId",
                        column: x => x.StudentId,
                        principalSchema: "dbo",
                        principalTable: "tblStudent",
                        principalColumn: "Reg_Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AbsentStudentFollowup_AttendanceDate",
                schema: "dbo",
                table: "tblAbsentStudentFollowup",
                column: "AttendanceDate");

            migrationBuilder.CreateIndex(
                name: "UQ_AbsentStudentFollowup_Student_Date",
                schema: "dbo",
                table: "tblAbsentStudentFollowup",
                columns: new[] { "StudentId", "AttendanceDate" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "tblAbsentStudentFollowup",
                schema: "dbo");
        }
    }
}
