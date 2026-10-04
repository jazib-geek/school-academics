using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace School.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddEmployeeRealtimeNotifications : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "tblEmployeeRealtimeNotification",
                schema: "dbo",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    EmployeeId = table.Column<int>(type: "int", nullable: false),
                    Type = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    Title = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Message = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false),
                    Severity = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    Link = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    OccurredAtPkt = table.Column<DateTime>(type: "datetime2(3)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tblEmployeeRealtimeNotification", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "tblEmployeeRealtimeNotificationRead",
                schema: "dbo",
                columns: table => new
                {
                    NotificationId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    EmployeeId = table.Column<int>(type: "int", nullable: false),
                    ReadAtPkt = table.Column<DateTime>(type: "datetime2(3)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tblEmployeeRealtimeNotificationRead", x => new { x.NotificationId, x.EmployeeId });
                    table.ForeignKey(
                        name: "FK_tblEmployeeRealtimeNotificationRead_tblEmployeeRealtimeNotification_NotificationId",
                        column: x => x.NotificationId,
                        principalSchema: "dbo",
                        principalTable: "tblEmployeeRealtimeNotification",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_tblEmployeeRealtimeNotification_EmployeeId_OccurredAtPkt",
                schema: "dbo",
                table: "tblEmployeeRealtimeNotification",
                columns: new[] { "EmployeeId", "OccurredAtPkt" });

            migrationBuilder.CreateIndex(
                name: "IX_tblEmployeeRealtimeNotification_EmployeeId_Type",
                schema: "dbo",
                table: "tblEmployeeRealtimeNotification",
                columns: new[] { "EmployeeId", "Type" });

            migrationBuilder.CreateIndex(
                name: "IX_tblEmployeeRealtimeNotificationRead_EmployeeId",
                schema: "dbo",
                table: "tblEmployeeRealtimeNotificationRead",
                column: "EmployeeId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "tblEmployeeRealtimeNotificationRead",
                schema: "dbo");

            migrationBuilder.DropTable(
                name: "tblEmployeeRealtimeNotification",
                schema: "dbo");
        }
    }
}
