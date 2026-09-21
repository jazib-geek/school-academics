using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace School.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddStudentIsCreditStudentAndCampusShowFlag : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
IF COL_LENGTH(N'dbo.tblStudent', N'IsCreditStudent') IS NULL
BEGIN
    ALTER TABLE dbo.tblStudent
        ADD IsCreditStudent bit NOT NULL
            CONSTRAINT DF_tblStudent_IsCreditStudent DEFAULT (0);
END");

            migrationBuilder.AddColumn<bool>(
                name: "ShowCreditStudent",
                schema: "dbo",
                table: "tblCampusProfile",
                type: "bit",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
IF COL_LENGTH(N'dbo.tblStudent', N'IsCreditStudent') IS NOT NULL
BEGIN
    DECLARE @df sysname;
    SELECT @df = dc.name
    FROM sys.default_constraints dc
    INNER JOIN sys.columns c ON c.default_object_id = dc.object_id
    WHERE dc.parent_object_id = OBJECT_ID(N'dbo.tblStudent')
      AND c.name = N'IsCreditStudent';
    IF @df IS NOT NULL
        EXEC(N'ALTER TABLE dbo.tblStudent DROP CONSTRAINT ' + QUOTENAME(@df));
    ALTER TABLE dbo.tblStudent DROP COLUMN IsCreditStudent;
END");

            migrationBuilder.DropColumn(
                name: "ShowCreditStudent",
                schema: "dbo",
                table: "tblCampusProfile");
        }
    }
}
