using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace School.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class MapSectionAndColorColumns : Migration
    {
        /// <inheritdoc />
        /// <remarks>
        /// Map-only: Section_Gender / IsHifz and SectionColor Color / BranchID / IsActive
        /// already exist in campus DBs. Snapshot updated to match fluent mappings.
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
