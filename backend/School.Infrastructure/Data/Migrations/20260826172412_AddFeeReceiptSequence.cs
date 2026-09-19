using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace School.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddFeeReceiptSequence : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "tblFeeReceiptSequence",
                schema: "dbo",
                columns: table => new
                {
                    ID = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    LastIssuedRcptId = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tblFeeReceiptSequence", x => x.ID);
                });

            migrationBuilder.Sql("""
                INSERT INTO dbo.tblFeeReceiptSequence (LastIssuedRcptId)
                SELECT ISNULL((SELECT MAX(RcptID) FROM dbo.tblFeeAndFundCollection), 0)
                WHERE NOT EXISTS (SELECT 1 FROM dbo.tblFeeReceiptSequence);
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "tblFeeReceiptSequence",
                schema: "dbo");
        }
    }
}
