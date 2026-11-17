using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using School.Infrastructure.Academics.Data;

namespace School.Infrastructure.Data;

public sealed record DatabaseMigrationResult(
    string Name,
    string Database,
    bool Succeeded,
    string? Error = null);

public static class DatabaseMigrationRunner
{
    public static async Task<IReadOnlyList<DatabaseMigrationResult>> MigrateAllAsync(
        IConfiguration configuration,
        IReadOnlyList<string>? campusKeys = null,
        bool includeAcademic = true,
        bool includeCampus = true,
        CancellationToken cancellationToken = default)
    {
        var results = new List<DatabaseMigrationResult>();
        var campusFilter = campusKeys is { Count: > 0 }
            ? new HashSet<string>(campusKeys, StringComparer.OrdinalIgnoreCase)
            : null;

        if (includeAcademic)
        {
            var academicConnectionString = configuration.GetConnectionString("AcademicContext");
            if (string.IsNullOrWhiteSpace(academicConnectionString))
            {
                results.Add(new DatabaseMigrationResult(
                    "AcademicContext",
                    "(missing connection string)",
                    false,
                    "ConnectionStrings:AcademicContext is not configured."));
            }
            else
            {
                results.Add(await MigrateAcademicAsync(academicConnectionString, cancellationToken));
            }
        }

        if (!includeCampus)
        {
            return results;
        }

        foreach (var campus in configuration.GetSection("CampusSettings:Campuses").GetChildren())
        {
            if (string.IsNullOrWhiteSpace(campus.Value))
                continue;

            if (campusFilter is not null && !campusFilter.Contains(campus.Key))
                continue;

            results.Add(await MigrateCampusAsync(campus.Key, campus.Value!, cancellationToken));
        }

        return results;
    }

    private static async Task<DatabaseMigrationResult> MigrateAcademicAsync(
        string connectionString,
        CancellationToken cancellationToken)
    {
        var database = GetDatabaseName(connectionString);

        try
        {
            var options = new DbContextOptionsBuilder<AcademicContext>()
                .UseSqlServer(connectionString, sql =>
                    sql.UseSchoolMigrationsHistory(typeof(AcademicContext).Assembly.FullName))
                .Options;

            await using var context = new AcademicContext(options);
            await EfMigrationsHistorySchemaFix.EnsureInDboAsync(context, cancellationToken);
            await context.Database.MigrateAsync(cancellationToken);
            return new DatabaseMigrationResult("AcademicContext", database, true);
        }
        catch (Exception ex)
        {
            return new DatabaseMigrationResult("AcademicContext", database, false, ex.Message);
        }
    }

    private static async Task<DatabaseMigrationResult> MigrateCampusAsync(
        string campusKey,
        string connectionString,
        CancellationToken cancellationToken)
    {
        var database = GetDatabaseName(connectionString);

        try
        {
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseSqlServer(connectionString, sql =>
                    sql.UseSchoolMigrationsHistory(typeof(AppDbContext).Assembly.FullName))
                .Options;

            await using var context = new AppDbContext(options);
            await EfMigrationsHistorySchemaFix.EnsureInDboAsync(context, cancellationToken);
            await context.Database.MigrateAsync(cancellationToken);
            return new DatabaseMigrationResult($"Campus:{campusKey}", database, true);
        }
        catch (Exception ex)
        {
            return new DatabaseMigrationResult($"Campus:{campusKey}", database, false, ex.Message);
        }
    }

    private static string GetDatabaseName(string connectionString)
    {
        try
        {
            var builder = new Microsoft.Data.SqlClient.SqlConnectionStringBuilder(connectionString);
            return string.IsNullOrWhiteSpace(builder.InitialCatalog)
                ? "(unknown database)"
                : builder.InitialCatalog;
        }
        catch
        {
            return "(unknown database)";
        }
    }
}
