using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace School.Infrastructure.Data.Migrations
{
    /// <summary>
    /// Aligns EF model with existing admission-related columns.
    /// Intentionally empty: all columns already exist in campus DBs.
    /// </summary>
    public partial class ExpandStudentAdmissionMappings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
        }
    }
}
