using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace School.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddActivityLog : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.EnsureSchema(
                name: "dbo");

            migrationBuilder.CreateTable(
                name: "tblActivityLog",
                schema: "dbo",
                columns: table => new
                {
                    ID = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ActivityType = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    EntityType = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    EntityId = table.Column<int>(type: "int", nullable: true),
                    EntityLabel = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    UserId = table.Column<int>(type: "int", nullable: true),
                    UserName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    OccurredAtPkt = table.Column<DateTime>(type: "datetime2(3)", nullable: false),
                    DetailsJson = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tblActivityLog", x => x.ID);
                });

            migrationBuilder.CreateIndex(
                name: "IX_tblActivityLog_ActivityType_OccurredAtPkt",
                schema: "dbo",
                table: "tblActivityLog",
                columns: new[] { "ActivityType", "OccurredAtPkt" });

            migrationBuilder.CreateIndex(
                name: "IX_tblActivityLog_EntityType_EntityId",
                schema: "dbo",
                table: "tblActivityLog",
                columns: new[] { "EntityType", "EntityId" });

            migrationBuilder.CreateIndex(
                name: "IX_tblActivityLog_OccurredAtPkt",
                schema: "dbo",
                table: "tblActivityLog",
                column: "OccurredAtPkt");

            migrationBuilder.CreateIndex(
                name: "IX_tblActivityLog_UserId",
                schema: "dbo",
                table: "tblActivityLog",
                column: "UserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "tblActivityLog",
                schema: "dbo");
        }
    }
}
