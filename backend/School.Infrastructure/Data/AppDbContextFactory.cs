using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace School.Infrastructure.Data;

public class AppDbContextFactory : IDesignTimeDbContextFactory<AppDbContext>
{
    public AppDbContext CreateDbContext(string[] args)
    {
        var configuration = DesignTimeConfiguration.Build();
        var connectionString = ResolveCampusConnectionString(configuration);

        var optionsBuilder = new DbContextOptionsBuilder<AppDbContext>();
        optionsBuilder.UseSqlServer(connectionString, sql =>
            sql.UseSchoolMigrationsHistory(typeof(AppDbContext).Assembly.FullName));

        return new AppDbContext(optionsBuilder.Options);
    }

    private static string ResolveCampusConnectionString(Microsoft.Extensions.Configuration.IConfiguration configuration)
    {
        // Design-time only (ef migrations add / dotnet ef ... without --connection).
        // To apply migrations to every campus DB, run:
        //   dotnet run --project backend/School.Migrator
        // or:
        //   powershell -File backend/scripts/Update-AllCampusDatabases.ps1
        var local = configuration["CampusSettings:Campuses:local"];
        if (!string.IsNullOrWhiteSpace(local))
        {
            return local;
        }

        var first = configuration
            .GetSection("CampusSettings:Campuses")
            .GetChildren()
            .FirstOrDefault(c => !string.IsNullOrWhiteSpace(c.Value));

        if (first?.Value is { Length: > 0 } cs)
        {
            return cs;
        }

        throw new InvalidOperationException(
            "No campus connection string found under CampusSettings:Campuses for design-time.");
    }
}
