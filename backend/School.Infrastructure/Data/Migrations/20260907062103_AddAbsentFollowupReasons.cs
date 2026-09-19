using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace School.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddAbsentFollowupReasons : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "ReasonId",
                schema: "dbo",
                table: "tblAbsentStudentFollowup",
                type: "int",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "tblAbsentFollowupReason",
                schema: "dbo",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Name = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: false),
                    SortOrder = table.Column<int>(type: "int", nullable: false),
                    IsSystem = table.Column<bool>(type: "bit", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false, defaultValue: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tblAbsentFollowupReason", x => x.Id);
                });

            migrationBuilder.InsertData(
                schema: "dbo",
                table: "tblAbsentFollowupReason",
                columns: new[] { "Id", "IsActive", "IsSystem", "Name", "SortOrder" },
                values: new object[,]
                {
                    { 1, true, true, "Sick", 10 },
                    { 2, true, true, "Transport issue", 20 },
                    { 3, true, true, "Domestic issue", 30 },
                    { 4, true, true, "Out of city", 40 },
                    { 5, true, true, "Family function", 50 },
                    { 6, true, true, "Weather / road condition", 60 },
                    { 7, true, true, "Other", 70 }
                });

            migrationBuilder.CreateIndex(
                name: "IX_AbsentStudentFollowup_ReasonId",
                schema: "dbo",
                table: "tblAbsentStudentFollowup",
                column: "ReasonId");

            migrationBuilder.CreateIndex(
                name: "UQ_AbsentFollowupReason_Name",
                schema: "dbo",
                table: "tblAbsentFollowupReason",
                column: "Name",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_tblAbsentStudentFollowup_tblAbsentFollowupReason_ReasonId",
                schema: "dbo",
                table: "tblAbsentStudentFollowup",
                column: "ReasonId",
                principalSchema: "dbo",
                principalTable: "tblAbsentFollowupReason",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_tblAbsentStudentFollowup_tblAbsentFollowupReason_ReasonId",
                schema: "dbo",
                table: "tblAbsentStudentFollowup");

            migrationBuilder.DropTable(
                name: "tblAbsentFollowupReason",
                schema: "dbo");

            migrationBuilder.DropIndex(
                name: "IX_AbsentStudentFollowup_ReasonId",
                schema: "dbo",
                table: "tblAbsentStudentFollowup");

            migrationBuilder.DropColumn(
                name: "ReasonId",
                schema: "dbo",
                table: "tblAbsentStudentFollowup");
        }
    }
}
