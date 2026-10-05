using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace School.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddFeeReminderNoticeTemplate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "tblFeeReminderNoticeTemplate",
                schema: "dbo",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Code = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false),
                    Title = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: false),
                    Greeting = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    BodyText = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: false),
                    ClosingText = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    DayOfMonth = table.Column<int>(type: "int", nullable: true),
                    SortOrder = table.Column<int>(type: "int", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false, defaultValue: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tblFeeReminderNoticeTemplate", x => x.Id);
                });

            migrationBuilder.InsertData(
                schema: "dbo",
                table: "tblFeeReminderNoticeTemplate",
                columns: new[] { "Id", "BodyText", "ClosingText", "Code", "DayOfMonth", "Greeting", "IsActive", "SortOrder", "Title" },
                values: new object[,]
                {
                    { 1, "This is gentle reminder to clear your child's outstanding school dues on or before {dueDate}.", "Your prompt attention and cooperation will be highly appreciated.", "pre_due", 10, "Dear Parents,", true, 10, "Fee Reminder Voucher" },
                    { 2, "The due date for your child's school dues has already passed. Kindly clear all outstanding dues immediately to avoid any interruption in your child's studies and school activities.", "Your prompt cooperation will be highly appreciated.", "last_due", null, "Dear Parents,", true, 20, "Last Fee Reminder" }
                });

            migrationBuilder.CreateIndex(
                name: "UQ_FeeReminderNoticeTemplate_Code",
                schema: "dbo",
                table: "tblFeeReminderNoticeTemplate",
                column: "Code",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "tblFeeReminderNoticeTemplate",
                schema: "dbo");
        }
    }
}
