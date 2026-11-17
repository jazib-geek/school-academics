using Microsoft.EntityFrameworkCore;

namespace School.Infrastructure.Data;

/// <summary>
/// One-time repair for DBs that already have __EFMigrationsHistory under a login schema
/// (e.g. seico_admin) from before MigrationsHistoryTable was pinned to dbo.
/// Pair with <see cref="SchoolSqlServerMigrations.UseSchoolMigrationsHistory"/>;
/// run this before MigrateAsync so live publish does not re-apply old migrations.
/// </summary>
public static class EfMigrationsHistorySchemaFix
{
    private const string RepairSql = """
        DECLARE @sourceSchema sysname;
        DECLARE @dboCount int = 0;
        DECLARE @sourceCount int = 0;

        IF OBJECT_ID(N'dbo.__EFMigrationsHistory', N'U') IS NOT NULL
            SELECT @dboCount = COUNT(*) FROM dbo.__EFMigrationsHistory;

        SELECT TOP (1)
            @sourceSchema = s.name,
            @sourceCount = src.cnt
        FROM sys.tables AS t
        INNER JOIN sys.schemas AS s ON t.schema_id = s.schema_id
        CROSS APPLY (
            SELECT COUNT(*) AS cnt
            FROM sys.partitions AS p
            WHERE p.object_id = t.object_id AND p.index_id IN (0, 1)
        ) AS src
        WHERE t.name = N'__EFMigrationsHistory'
          AND s.name <> N'dbo'
          AND src.cnt > 0
        ORDER BY src.cnt DESC, s.name;

        IF @sourceSchema IS NULL OR @sourceCount = 0
            RETURN;

        -- dbo already has history rows: leave it; do not merge blindly.
        IF @dboCount > 0
            RETURN;

        IF OBJECT_ID(N'dbo.__EFMigrationsHistory', N'U') IS NOT NULL
            DROP TABLE dbo.__EFMigrationsHistory;

        DECLARE @sql nvarchar(max) =
            N'ALTER SCHEMA dbo TRANSFER ' + QUOTENAME(@sourceSchema) + N'.__EFMigrationsHistory';
        EXEC sp_executesql @sql;
        """;

    public static Task EnsureInDboAsync(DbContext context, CancellationToken cancellationToken = default)
        => context.Database.ExecuteSqlRawAsync(RepairSql, cancellationToken);
}
