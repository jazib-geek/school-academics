using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace School.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class MoveActivityLogTableToDboSchema : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // AddActivityLog may have created tblActivityLog under the SQL login default schema
            // (e.g. sbs_admin1) before explicit schema: "dbo" was added. EF maps dbo.tblActivityLog.
            migrationBuilder.Sql("""
                IF NOT EXISTS (
                    SELECT 1
                    FROM sys.tables AS t
                    INNER JOIN sys.schemas AS s ON t.schema_id = s.schema_id
                    WHERE t.name = N'tblActivityLog' AND s.name = N'dbo'
                )
                AND EXISTS (
                    SELECT 1
                    FROM sys.tables AS t
                    INNER JOIN sys.schemas AS s ON t.schema_id = s.schema_id
                    WHERE t.name = N'tblActivityLog' AND s.name <> N'dbo'
                )
                BEGIN
                    DECLARE @schema sysname;
                    DECLARE @sql nvarchar(max);

                    SELECT TOP (1) @schema = s.name
                    FROM sys.tables AS t
                    INNER JOIN sys.schemas AS s ON t.schema_id = s.schema_id
                    WHERE t.name = N'tblActivityLog' AND s.name <> N'dbo'
                    ORDER BY s.name;

                    SET @sql = N'ALTER SCHEMA dbo TRANSFER ' + QUOTENAME(@schema) + N'.tblActivityLog';
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
