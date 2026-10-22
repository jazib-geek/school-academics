using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace School.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddAbsentFollowupReasonCallNotAnswered : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.InsertData(
                schema: "dbo",
                table: "tblAbsentFollowupReason",
                columns: new[] { "Id", "IsActive", "IsSystem", "Name", "SortOrder" },
                values: new object[] { 8, true, true, "Call not answered", 65 });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                schema: "dbo",
                table: "tblAbsentFollowupReason",
                keyColumn: "Id",
                keyValue: 8);
        }
    }
}
