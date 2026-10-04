using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace School.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddCoordinatorProformaDraftWorkspace : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "DraftWorkspaceJson",
                schema: "dbo",
                table: "tblCoordinatorProformaReport",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddCheckConstraint(
                name: "CK_CoordProforma_Report_DraftJson",
                schema: "dbo",
                table: "tblCoordinatorProformaReport",
                sql: "[DraftWorkspaceJson] IS NULL OR ISJSON([DraftWorkspaceJson]) = 1");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_CoordProforma_Report_DraftJson",
                schema: "dbo",
                table: "tblCoordinatorProformaReport");

            migrationBuilder.DropColumn(
                name: "DraftWorkspaceJson",
                schema: "dbo",
                table: "tblCoordinatorProformaReport");
        }
    }
}
