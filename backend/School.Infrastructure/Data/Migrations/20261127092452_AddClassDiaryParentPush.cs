using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace School.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddClassDiaryParentPush : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_ParentAnnouncementPush_AnnouncementId",
                schema: "dbo",
                table: "ParentAnnouncementPush");

            migrationBuilder.AddColumn<int>(
                name: "StudentId",
                schema: "dbo",
                table: "ParentPushDelivery",
                type: "int",
                nullable: true);

            migrationBuilder.AlterColumn<int>(
                name: "AnnouncementId",
                schema: "dbo",
                table: "ParentAnnouncementPush",
                type: "int",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "int");

            migrationBuilder.AddColumn<int>(
                name: "DiaryClassId",
                schema: "dbo",
                table: "ParentAnnouncementPush",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<DateOnly>(
                name: "DiaryDate",
                schema: "dbo",
                table: "ParentAnnouncementPush",
                type: "date",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_ParentAnnouncementPush_AnnouncementId",
                schema: "dbo",
                table: "ParentAnnouncementPush",
                column: "AnnouncementId",
                unique: true,
                filter: "[AnnouncementId] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_ParentAnnouncementPush_DiaryClassId_DiaryDate",
                schema: "dbo",
                table: "ParentAnnouncementPush",
                columns: new[] { "DiaryClassId", "DiaryDate" },
                unique: true,
                filter: "[DiaryClassId] IS NOT NULL AND [DiaryDate] IS NOT NULL");

            migrationBuilder.AddCheckConstraint(
                name: "CK_ParentPush_Audience",
                schema: "dbo",
                table: "ParentAnnouncementPush",
                sql: "([AnnouncementId] IS NOT NULL AND [DiaryClassId] IS NULL AND [DiaryDate] IS NULL) OR ([AnnouncementId] IS NULL AND [DiaryClassId] IS NOT NULL AND [DiaryDate] IS NOT NULL)");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Rollback removes diary-only queue entries before restoring the
            // non-null announcement FK. Announcement entries remain intact.
            migrationBuilder.Sql("DELETE d FROM [dbo].[ParentPushDelivery] d INNER JOIN [dbo].[ParentAnnouncementPush] p ON d.[PushId] = p.[Id] WHERE p.[DiaryClassId] IS NOT NULL;");
            migrationBuilder.Sql("DELETE FROM [dbo].[ParentAnnouncementPush] WHERE [DiaryClassId] IS NOT NULL;");
            migrationBuilder.DropIndex(
                name: "IX_ParentAnnouncementPush_AnnouncementId",
                schema: "dbo",
                table: "ParentAnnouncementPush");

            migrationBuilder.DropIndex(
                name: "IX_ParentAnnouncementPush_DiaryClassId_DiaryDate",
                schema: "dbo",
                table: "ParentAnnouncementPush");

            migrationBuilder.DropCheckConstraint(
                name: "CK_ParentPush_Audience",
                schema: "dbo",
                table: "ParentAnnouncementPush");

            migrationBuilder.DropColumn(
                name: "StudentId",
                schema: "dbo",
                table: "ParentPushDelivery");

            migrationBuilder.DropColumn(
                name: "DiaryClassId",
                schema: "dbo",
                table: "ParentAnnouncementPush");

            migrationBuilder.DropColumn(
                name: "DiaryDate",
                schema: "dbo",
                table: "ParentAnnouncementPush");

            migrationBuilder.AlterColumn<int>(
                name: "AnnouncementId",
                schema: "dbo",
                table: "ParentAnnouncementPush",
                type: "int",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "int",
                oldNullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_ParentAnnouncementPush_AnnouncementId",
                schema: "dbo",
                table: "ParentAnnouncementPush",
                column: "AnnouncementId",
                unique: true);
        }
    }
}
