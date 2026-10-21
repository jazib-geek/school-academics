using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace School.Infrastructure.Academics.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddSubjectCatalogProfileAndQuestionStructure : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "CatalogProfile",
                schema: "dbo",
                table: "Subject",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "standard");

            migrationBuilder.AddColumn<bool>(
                name: "IsSystem",
                schema: "dbo",
                table: "Subject",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "BodyJson",
                schema: "dbo",
                table: "QuestionsCatalog",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "StructureKind",
                schema: "dbo",
                table: "QuestionsCatalog",
                type: "nvarchar(40)",
                maxLength: 40,
                nullable: false,
                defaultValue: "standard");

            migrationBuilder.Sql("""
                UPDATE dbo.Subject
                SET IsSystem = 1, CatalogProfile = N'english'
                WHERE LOWER(LTRIM(RTRIM(SubjectName))) IN (N'english', N'eng');

                UPDATE dbo.Subject
                SET IsSystem = 1, CatalogProfile = N'urdu'
                WHERE LOWER(LTRIM(RTRIM(SubjectName))) = N'urdu';

                UPDATE dbo.Subject
                SET IsSystem = 1
                WHERE LOWER(LTRIM(RTRIM(SubjectName))) IN (N'physics', N'chemistry', N'chem', N'mathematics', N'maths', N'math');
                """);

            migrationBuilder.Sql("""
                IF EXISTS (
                    SELECT 1
                    FROM sys.check_constraints
                    WHERE name = N'CHK_MCQ_Options'
                      AND parent_object_id = OBJECT_ID(N'dbo.QuestionsCatalog')
                )
                BEGIN
                    ALTER TABLE dbo.QuestionsCatalog DROP CONSTRAINT CHK_MCQ_Options;
                END

                ALTER TABLE dbo.QuestionsCatalog
                ADD CONSTRAINT CHK_MCQ_Options
                CHECK (
                    ([Type] = N'mcq' AND [StructureKind] = N'standard' AND [mcq_opt_1] IS NOT NULL AND [mcq_opt_2] IS NOT NULL)
                    OR ([Type] = N'mcq' AND [StructureKind] <> N'standard')
                    OR [Type] IN (N'laq', N'saq', N'numerical')
                );
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                IF EXISTS (
                    SELECT 1
                    FROM sys.check_constraints
                    WHERE name = N'CHK_MCQ_Options'
                      AND parent_object_id = OBJECT_ID(N'dbo.QuestionsCatalog')
                )
                BEGIN
                    ALTER TABLE dbo.QuestionsCatalog DROP CONSTRAINT CHK_MCQ_Options;
                END

                ALTER TABLE dbo.QuestionsCatalog
                ADD CONSTRAINT CHK_MCQ_Options
                CHECK (
                    ([Type] = N'mcq' AND [mcq_opt_1] IS NOT NULL AND [mcq_opt_2] IS NOT NULL)
                    OR [Type] IN (N'laq', N'saq', N'numerical')
                );
                """);

            migrationBuilder.DropColumn(
                name: "CatalogProfile",
                schema: "dbo",
                table: "Subject");

            migrationBuilder.DropColumn(
                name: "IsSystem",
                schema: "dbo",
                table: "Subject");

            migrationBuilder.DropColumn(
                name: "BodyJson",
                schema: "dbo",
                table: "QuestionsCatalog");

            migrationBuilder.DropColumn(
                name: "StructureKind",
                schema: "dbo",
                table: "QuestionsCatalog");
        }
    }
}
