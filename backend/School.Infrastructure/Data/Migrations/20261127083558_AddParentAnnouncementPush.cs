using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace School.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddParentAnnouncementPush : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ParentAnnouncementPush",
                schema: "dbo",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    AnnouncementId = table.Column<int>(type: "int", nullable: false),
                    Title = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ParentAnnouncementPush", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ParentAnnouncementPush_tblNewsAndEvents_AnnouncementId",
                        column: x => x.AnnouncementId,
                        principalSchema: "dbo",
                        principalTable: "tblNewsAndEvents",
                        principalColumn: "ID",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "ParentPushDevice",
                schema: "dbo",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    InstallationId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    FamilyDbId = table.Column<int>(type: "int", nullable: false),
                    Token = table.Column<string>(type: "nvarchar(max)", maxLength: 4096, nullable: false),
                    TokenHash = table.Column<string>(type: "varchar(64)", unicode: false, maxLength: 64, nullable: false),
                    RegistrationVersion = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ParentPushDevice", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ParentPushDelivery",
                schema: "dbo",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    PushId = table.Column<long>(type: "bigint", nullable: false),
                    DeviceId = table.Column<long>(type: "bigint", nullable: false),
                    RegistrationVersion = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Attempts = table.Column<int>(type: "int", nullable: false),
                    NextAttemptUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CompletedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    LeaseUntilUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    LeaseId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    Outcome = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ParentPushDelivery", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ParentPushDelivery_ParentAnnouncementPush_PushId",
                        column: x => x.PushId,
                        principalSchema: "dbo",
                        principalTable: "ParentAnnouncementPush",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ParentPushDelivery_ParentPushDevice_DeviceId",
                        column: x => x.DeviceId,
                        principalSchema: "dbo",
                        principalTable: "ParentPushDevice",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ParentAnnouncementPush_AnnouncementId",
                schema: "dbo",
                table: "ParentAnnouncementPush",
                column: "AnnouncementId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ParentPushDelivery_CompletedAtUtc_NextAttemptUtc",
                schema: "dbo",
                table: "ParentPushDelivery",
                columns: new[] { "CompletedAtUtc", "NextAttemptUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_ParentPushDelivery_DeviceId",
                schema: "dbo",
                table: "ParentPushDelivery",
                column: "DeviceId");

            migrationBuilder.CreateIndex(
                name: "IX_ParentPushDelivery_PushId_DeviceId",
                schema: "dbo",
                table: "ParentPushDelivery",
                columns: new[] { "PushId", "DeviceId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ParentPushDevice_InstallationId",
                schema: "dbo",
                table: "ParentPushDevice",
                column: "InstallationId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ParentPushDevice_IsActive_FamilyDbId",
                schema: "dbo",
                table: "ParentPushDevice",
                columns: new[] { "IsActive", "FamilyDbId" });

            migrationBuilder.CreateIndex(
                name: "IX_ParentPushDevice_TokenHash",
                schema: "dbo",
                table: "ParentPushDevice",
                column: "TokenHash",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ParentPushDelivery",
                schema: "dbo");

            migrationBuilder.DropTable(
                name: "ParentAnnouncementPush",
                schema: "dbo");

            migrationBuilder.DropTable(
                name: "ParentPushDevice",
                schema: "dbo");
        }
    }
}
