using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace School.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class SetDefaultSchemaDbo : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Model now uses HasDefaultSchema("dbo") so future CreateTable ops are schema-qualified.
            // Do NOT RenameTable every legacy entity: they are already physically in dbo on campus DBs.
            // EF scaffolded RenameTable*(..., newSchema: "dbo") here; those ops were removed intentionally.
            migrationBuilder.EnsureSchema(name: "dbo");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Default schema is a model convention; no physical rollback.
        }
    }
}
