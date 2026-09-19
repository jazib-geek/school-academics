using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace School.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class RenameStationeryRhymesToPaperRim : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                UPDATE dbo.tblStationeryItem
                SET Name = N'Paper rim (printpaper bundle)'
                WHERE Name = N'Rhymes';
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                UPDATE dbo.tblStationeryItem
                SET Name = N'Rhymes'
                WHERE Name = N'Paper rim (printpaper bundle)';
                """);
        }
    }
}
