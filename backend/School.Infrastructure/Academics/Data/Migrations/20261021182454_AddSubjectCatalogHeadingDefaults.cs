using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace School.Infrastructure.Academics.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddSubjectCatalogHeadingDefaults : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "CatalogHeadingDefaultsJson",
                schema: "dbo",
                table: "Subject",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.Sql("""
                UPDATE dbo.Subject
                SET CatalogHeadingDefaultsJson = N'{"choice-set":"Choose the correct option.","spelling-table":"Choose the correct spelling.","word-list":"Write meanings of these words.","fill-blanks":"Fill in the blanks with suitable words.","classify-line":"Tell whether the underlined noun is countable or uncountable.","sentence-pair":"Change the voice of the following.","passage-set":"Read the paragraph and answer the questions.","prompt":"Write on the following topic."}'
                WHERE LOWER(LTRIM(RTRIM(SubjectName))) IN (N'english', N'eng')
                  AND CatalogHeadingDefaultsJson IS NULL;

                UPDATE dbo.Subject
                SET CatalogHeadingDefaultsJson = N'{"choice-set":"درست جواب کا انتخاب کریں۔","verse-set":"درج ذیل اشعار کی تشریح کیجیے۔","passage-set":"درج ذیل عبارت پڑھ کر سوالات کے جواب دیں۔","word-list":"درج ذیل الفاظ کے معانی لکھیں۔","fill-blanks":"خالی جگہ پُر کریں۔","prompt":"درج ذیل عنوان پر تحریر لکھیں۔"}'
                WHERE LOWER(LTRIM(RTRIM(SubjectName))) = N'urdu'
                  AND CatalogHeadingDefaultsJson IS NULL;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CatalogHeadingDefaultsJson",
                schema: "dbo",
                table: "Subject");
        }
    }
}
