using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace School.Infrastructure.Academics.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddQuestionCatalogStemImage : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "StemImage",
                schema: "dbo",
                table: "QuestionsCatalog",
                type: "varchar(max)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "StemImage",
                schema: "dbo",
                table: "QuestionsCatalog");
        }
    }
}
