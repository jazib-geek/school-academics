using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace School.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class MovePermissionTableToDboSchema : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // CreatePermissionCatalog created tblPermission without schema: "dbo", so on
            // campuses whose SQL login default schema is not dbo (e.g. sbs_admin1, seico_admin)
            // the table landed under that schema. EF now maps dbo.tblPermission.
            // ALTER SCHEMA ... TRANSFER moves the object in place — rows and indexes are preserved.
            migrationBuilder.Sql("""
                IF NOT EXISTS (
                    SELECT 1
                    FROM sys.tables AS t
                    INNER JOIN sys.schemas AS s ON t.schema_id = s.schema_id
                    WHERE t.name = N'tblPermission' AND s.name = N'dbo'
                )
                AND EXISTS (
                    SELECT 1
                    FROM sys.tables AS t
                    INNER JOIN sys.schemas AS s ON t.schema_id = s.schema_id
                    WHERE t.name = N'tblPermission' AND s.name <> N'dbo'
                )
                BEGIN
                    DECLARE @schema sysname;
                    DECLARE @sql nvarchar(max);

                    SELECT TOP (1) @schema = s.name
                    FROM sys.tables AS t
                    INNER JOIN sys.schemas AS s ON t.schema_id = s.schema_id
                    WHERE t.name = N'tblPermission' AND s.name <> N'dbo'
                    ORDER BY s.name;

                    SET @sql = N'ALTER SCHEMA dbo TRANSFER ' + QUOTENAME(@schema) + N'.tblPermission';
                    EXEC sp_executesql @sql;
                END
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Irreversible: original login schema is not recorded.
        }
    }
}
