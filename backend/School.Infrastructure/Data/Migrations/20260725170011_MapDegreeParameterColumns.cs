using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace School.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class MapDegreeParameterColumns : Migration
    {
        /// <inheritdoc />
        /// <remarks>
        /// Map-only: tblDegreeParameters.DegreeTitle / Type / IsActive already exist in campus DBs.
        /// </remarks>
        protected override void Up(MigrationBuilder migrationBuilder)
        {
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
        }
    }
}
