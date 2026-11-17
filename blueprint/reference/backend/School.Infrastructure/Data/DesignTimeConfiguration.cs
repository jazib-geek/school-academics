using Microsoft.Extensions.Configuration;

namespace School.Infrastructure.Data;

internal static class DesignTimeConfiguration
{
    public static IConfiguration Build()
    {
        var apiProjectPath = FindApiProjectDirectory();
        return new ConfigurationBuilder()
            .SetBasePath(apiProjectPath)
            .AddJsonFile("appsettings.json", optional: false)
            .AddJsonFile("appsettings.Development.json", optional: true)
            .AddEnvironmentVariables()
            .Build();
    }

    private static string FindApiProjectDirectory()
    {
        var dir = new DirectoryInfo(Directory.GetCurrentDirectory());
        while (dir is not null)
        {
            foreach (var relativePath in new[] { "School.API", Path.Combine("backend", "School.API") })
            {
                var candidate = Path.Combine(dir.FullName, relativePath);
                if (File.Exists(Path.Combine(candidate, "appsettings.json")))
                {
                    return candidate;
                }
            }

            if (string.Equals(dir.Name, "School.API", StringComparison.OrdinalIgnoreCase)
                && File.Exists(Path.Combine(dir.FullName, "appsettings.json")))
            {
                return dir.FullName;
            }

            dir = dir.Parent;
        }

        throw new InvalidOperationException(
            "Could not locate School.API/appsettings.json for EF design-time configuration.");
    }
}
