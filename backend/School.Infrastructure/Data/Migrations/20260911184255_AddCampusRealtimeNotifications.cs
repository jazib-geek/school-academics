using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace School.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddCampusRealtimeNotifications : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "tblCampusRealtimeNotification",
                schema: "dbo",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Type = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    Title = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Message = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false),
                    Severity = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    Link = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    OccurredAtPkt = table.Column<DateTime>(type: "datetime2(3)", nullable: false),
                    ActorUserKey = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    ExcludeUserKeysJson = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tblCampusRealtimeNotification", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "tblCampusRealtimeNotificationRead",
                schema: "dbo",
                columns: table => new
                {
                    NotificationId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<int>(type: "int", nullable: false),
                    ReadAtPkt = table.Column<DateTime>(type: "datetime2(3)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tblCampusRealtimeNotificationRead", x => new { x.NotificationId, x.UserId });
                    table.ForeignKey(
                        name: "FK_tblCampusRealtimeNotificationRead_tblCampusRealtimeNotification_NotificationId",
                        column: x => x.NotificationId,
                        principalSchema: "dbo",
                        principalTable: "tblCampusRealtimeNotification",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_tblCampusRealtimeNotification_OccurredAtPkt",
                schema: "dbo",
                table: "tblCampusRealtimeNotification",
                column: "OccurredAtPkt");

            migrationBuilder.CreateIndex(
                name: "IX_tblCampusRealtimeNotification_OccurredAtPkt_Type",
                schema: "dbo",
                table: "tblCampusRealtimeNotification",
                columns: new[] { "OccurredAtPkt", "Type" });

            migrationBuilder.CreateIndex(
                name: "IX_tblCampusRealtimeNotificationRead_UserId",
                schema: "dbo",
                table: "tblCampusRealtimeNotificationRead",
                column: "UserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "tblCampusRealtimeNotificationRead",
                schema: "dbo");

            migrationBuilder.DropTable(
                name: "tblCampusRealtimeNotification",
                schema: "dbo");
        }
    }
}
