using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace School.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddUserRemindersAndChat : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "tblChatMessage",
                schema: "dbo",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    SenderUserId = table.Column<int>(type: "int", nullable: false),
                    RecipientUserId = table.Column<int>(type: "int", nullable: false),
                    Body = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false),
                    SentAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: false),
                    ReadAtUtc = table.Column<DateTime>(type: "datetime2(3)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tblChatMessage", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "tblUserReminder",
                schema: "dbo",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    OwnerUserId = table.Column<int>(type: "int", nullable: false),
                    CreatedByUserId = table.Column<int>(type: "int", nullable: false),
                    Kind = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    Title = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Body = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: true),
                    Color = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    IsPinned = table.Column<bool>(type: "bit", nullable: false),
                    Priority = table.Column<byte>(type: "tinyint", nullable: false),
                    RemindAtUtc = table.Column<DateTime>(type: "datetime2(0)", nullable: true),
                    SnoozedUntilUtc = table.Column<DateTime>(type: "datetime2(0)", nullable: true),
                    Status = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    CompletedAtUtc = table.Column<DateTime>(type: "datetime2(0)", nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2(0)", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2(0)", nullable: false),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tblUserReminder", x => x.Id);
                });

            migrationBuilder.InsertData(
                schema: "dbo",
                table: "tblPermission",
                columns: new[] { "Id", "Code", "IsActive", "ModuleHead", "Name", "SortOrder" },
                values: new object[] { 147, "assign_user_reminders", true, "General", "Assign Reminders / Tasks to Other Users", 1470 });

            migrationBuilder.Sql(
                """
                INSERT INTO dbo.tblUserRights (UserName, ModuleCode, ModuleName, HasAccess, BranchCode, ModuleHead)
                SELECT u.Username, p.Code, p.Name, 1, NULL, p.ModuleHead
                FROM dbo.tblUser u
                CROSS JOIN dbo.tblPermission p
                WHERE p.Code = N'assign_user_reminders'
                  AND u.IsActive = 1
                  AND NULLIF(LTRIM(RTRIM(u.Username)), N'') IS NOT NULL
                  AND (
                        LOWER(LTRIM(RTRIM(u.Username))) IN (N'admin', N'jazib')
                     OR u.IsSuperAdmin = 1
                  )
                  AND NOT EXISTS (
                      SELECT 1 FROM dbo.tblUserRights r
                      WHERE r.UserName = u.Username AND r.ModuleCode = p.Code
                  );
                """);

            migrationBuilder.CreateIndex(
                name: "IX_ChatMessage_Recipient_Read",
                schema: "dbo",
                table: "tblChatMessage",
                columns: new[] { "RecipientUserId", "ReadAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_ChatMessage_Sender_Recipient_Sent",
                schema: "dbo",
                table: "tblChatMessage",
                columns: new[] { "SenderUserId", "RecipientUserId", "SentAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_ChatMessage_SentAt",
                schema: "dbo",
                table: "tblChatMessage",
                column: "SentAtUtc");

            migrationBuilder.CreateIndex(
                name: "IX_UserReminder_CreatedBy",
                schema: "dbo",
                table: "tblUserReminder",
                column: "CreatedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_UserReminder_Owner_Status_RemindAt",
                schema: "dbo",
                table: "tblUserReminder",
                columns: new[] { "OwnerUserId", "Status", "RemindAtUtc" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "tblChatMessage",
                schema: "dbo");

            migrationBuilder.DropTable(
                name: "tblUserReminder",
                schema: "dbo");

            migrationBuilder.Sql("DELETE FROM dbo.tblUserRights WHERE ModuleCode = N'assign_user_reminders';");

            migrationBuilder.DeleteData(
                schema: "dbo",
                table: "tblPermission",
                keyColumn: "Id",
                keyValue: 147);
        }
    }
}
