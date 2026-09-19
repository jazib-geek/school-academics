using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace School.Infrastructure.Academics.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddNumericalQuestionTypeConstraints : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Legacy DB check constraint only allowed mcq / saq / laq — extend for numerical.
            migrationBuilder.Sql("""
                IF EXISTS (
                    SELECT 1
                    FROM sys.check_constraints
                    WHERE name = N'CHK_Question_Type'
                      AND parent_object_id = OBJECT_ID(N'dbo.QuestionsCatalog')
                )
                BEGIN
                    ALTER TABLE dbo.QuestionsCatalog DROP CONSTRAINT CHK_Question_Type;
                END

                ALTER TABLE dbo.QuestionsCatalog
                ADD CONSTRAINT CHK_Question_Type
                CHECK ([Type] IN (N'mcq', N'saq', N'laq', N'numerical'));
                """);

            // CHK_MCQ_Options only allowed laq/saq without options — include numerical (same as LAQ).
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
                    OR [Type] IN (N'laq', N'saq')
                );
                """);

            migrationBuilder.Sql("""
                IF EXISTS (
                    SELECT 1
                    FROM sys.check_constraints
                    WHERE name = N'CHK_Question_Type'
                      AND parent_object_id = OBJECT_ID(N'dbo.QuestionsCatalog')
                )
                BEGIN
                    ALTER TABLE dbo.QuestionsCatalog DROP CONSTRAINT CHK_Question_Type;
                END

                ALTER TABLE dbo.QuestionsCatalog
                ADD CONSTRAINT CHK_Question_Type
                CHECK ([Type] IN (N'mcq', N'saq', N'laq'));
                """);
        }
    }
}
