using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace School.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddCampusProfileSessionBounds : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "SessionEndMonth",
                schema: "dbo",
                table: "tblCampusProfile",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "SessionEndYear",
                schema: "dbo",
                table: "tblCampusProfile",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "SessionStartMonth",
                schema: "dbo",
                table: "tblCampusProfile",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "SessionStartYear",
                schema: "dbo",
                table: "tblCampusProfile",
                type: "int",
                nullable: true);

            // Backfill from existing SessionLabel (YYYY-YYYY); default Feb→Jan when missing.
            migrationBuilder.Sql("""
                UPDATE dbo.tblCampusProfile
                SET
                    SessionStartMonth = 2,
                    SessionEndMonth = 1,
                    SessionStartYear = CASE
                        WHEN SessionLabel LIKE '[0-9][0-9][0-9][0-9]-[0-9][0-9][0-9][0-9]'
                            THEN TRY_CAST(LEFT(SessionLabel, 4) AS int)
                        ELSE YEAR(GETDATE())
                    END,
                    SessionEndYear = CASE
                        WHEN SessionLabel LIKE '[0-9][0-9][0-9][0-9]-[0-9][0-9][0-9][0-9]'
                            THEN TRY_CAST(RIGHT(SessionLabel, 4) AS int)
                        ELSE YEAR(GETDATE()) + 1
                    END
                WHERE SessionStartYear IS NULL OR SessionEndYear IS NULL;

                UPDATE dbo.tblCampusProfile
                SET SessionLabel = CONCAT(SessionStartYear, '-', SessionEndYear)
                WHERE SessionStartYear IS NOT NULL
                  AND SessionEndYear IS NOT NULL
                  AND (SessionLabel IS NULL OR LTRIM(RTRIM(SessionLabel)) = '');
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "SessionEndMonth",
                schema: "dbo",
                table: "tblCampusProfile");

            migrationBuilder.DropColumn(
                name: "SessionEndYear",
                schema: "dbo",
                table: "tblCampusProfile");

            migrationBuilder.DropColumn(
                name: "SessionStartMonth",
                schema: "dbo",
                table: "tblCampusProfile");

            migrationBuilder.DropColumn(
                name: "SessionStartYear",
                schema: "dbo",
                table: "tblCampusProfile");
        }
    }
}
