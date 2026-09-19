using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Microsoft.Extensions.Configuration;
using School.Infrastructure.Data;

namespace School.Infrastructure.Academics.Data;

public class AcademicContextFactory : IDesignTimeDbContextFactory<AcademicContext>
{
    public AcademicContext CreateDbContext(string[] args)
    {
        var configuration = DesignTimeConfiguration.Build();
        var connectionString = configuration.GetConnectionString("AcademicContext")
            ?? throw new InvalidOperationException(
                "Connection string 'AcademicContext' was not found for design-time.");

        var optionsBuilder = new DbContextOptionsBuilder<AcademicContext>();
        optionsBuilder.UseSqlServer(connectionString, sql =>
            sql.UseSchoolMigrationsHistory(typeof(AcademicContext).Assembly.FullName));

        return new AcademicContext(optionsBuilder.Options);
    }
}
