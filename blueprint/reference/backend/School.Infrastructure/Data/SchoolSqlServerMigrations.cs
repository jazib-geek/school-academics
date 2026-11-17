using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;

namespace School.Infrastructure.Data;

/// <summary>
/// Pins EF migrations history to dbo so hosting logins whose default schema is
/// seico_admin / sbs_admin1 / etc. never create a second __EFMigrationsHistory.
/// </summary>
public static class SchoolSqlServerMigrations
{
    public const string HistoryTableName = "__EFMigrationsHistory";
    public const string HistorySchema = "dbo";

    public static SqlServerDbContextOptionsBuilder UseSchoolMigrationsHistory(
        this SqlServerDbContextOptionsBuilder sql,
        string? migrationsAssembly)
    {
        sql.MigrationsAssembly(migrationsAssembly);
        sql.MigrationsHistoryTable(HistoryTableName, HistorySchema);
        return sql;
    }
}
