using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace School.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class SetFamilyPasswordFromFatherMobile : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Password only. Skip blank, non-numeric, shorter than 5 digits, or all zeros.
            migrationBuilder.Sql("""
                UPDATE f
                SET f.Password = RIGHT(d.Digits, 5)
                FROM dbo.tblStudentFamilyDetail AS f
                CROSS APPLY (
                    SELECT Cleaned = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
                        LTRIM(RTRIM(f.FatherMobileNo)),
                        ' ', ''), '-', ''), '+', ''), '(', ''), ')', ''), '.', '')
                ) c
                CROSS APPLY (
                    SELECT Digits = CASE
                        WHEN c.Cleaned IS NOT NULL
                             AND LEN(c.Cleaned) >= 5
                             AND c.Cleaned NOT LIKE '%[^0-9]%'
                             AND c.Cleaned LIKE '%[^0]%'
                        THEN c.Cleaned
                        ELSE NULL
                    END
                ) d
                WHERE d.Digits IS NOT NULL;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Previous passwords are not stored.
        }
    }
}
