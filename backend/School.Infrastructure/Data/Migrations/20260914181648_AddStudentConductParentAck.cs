using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace School.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddStudentConductParentAck : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "tblStudentConductParentAck",
                schema: "dbo",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    FamilyDbId = table.Column<int>(type: "int", nullable: false),
                    NoteId = table.Column<int>(type: "int", nullable: false),
                    AcknowledgedAtPkt = table.Column<DateTime>(type: "datetime2(3)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tblStudentConductParentAck", x => x.Id);
                    table.ForeignKey(
                        name: "FK_tblStudentConductParentAck_tblStudentConductNote_NoteId",
                        column: x => x.NoteId,
                        principalSchema: "dbo",
                        principalTable: "tblStudentConductNote",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_tblStudentConductParentAck_tblStudentFamilyDetail_FamilyDbId",
                        column: x => x.FamilyDbId,
                        principalSchema: "dbo",
                        principalTable: "tblStudentFamilyDetail",
                        principalColumn: "ID",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_StudentConductParentAck_Note",
                schema: "dbo",
                table: "tblStudentConductParentAck",
                column: "NoteId");

            migrationBuilder.CreateIndex(
                name: "UQ_StudentConductParentAck_Family_Note",
                schema: "dbo",
                table: "tblStudentConductParentAck",
                columns: new[] { "FamilyDbId", "NoteId" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "tblStudentConductParentAck",
                schema: "dbo");
        }
    }
}
