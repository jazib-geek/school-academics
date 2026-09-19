using Microsoft.Extensions.Configuration;
using School.Infrastructure.Data;

var argsList = args.ToList();
var campusKeys = new List<string>();
var includeAcademic = true;
var includeCampus = true;
var showHelp = false;
var unknownArg = false;

for (var i = 0; i < argsList.Count; i++)
{
    switch (argsList[i])
    {
        case "--help":
        case "-h":
            showHelp = true;
            break;
        case "--campus":
            if (i + 1 >= argsList.Count)
            {
                Console.Error.WriteLine("Missing value for --campus.");
                return 1;
            }

            campusKeys.Add(argsList[++i]);
            break;
        case "--campus-only":
            includeAcademic = false;
            break;
        case "--academic-only":
            campusKeys.Clear();
            includeAcademic = true;
            includeCampus = false;
            break;
        default:
            Console.Error.WriteLine($"Unknown argument: {argsList[i]}");
            unknownArg = true;
            break;
    }
}

if (showHelp || unknownArg)
{
    PrintHelp();
    return unknownArg ? 1 : 0;
}

var configuration = BuildConfiguration();
var results = await DatabaseMigrationRunner.MigrateAllAsync(
    configuration,
    campusKeys.Count > 0 ? campusKeys : null,
    includeAcademic,
    includeCampus);

var failed = false;
foreach (var result in results)
{
    if (result.Succeeded)
    {
        Console.ForegroundColor = ConsoleColor.Green;
        Console.WriteLine($"OK   {result.Name} -> {result.Database}");
    }
    else
    {
        failed = true;
        Console.ForegroundColor = ConsoleColor.Red;
        Console.WriteLine($"FAIL {result.Name} -> {result.Database}");
        Console.WriteLine($"     {result.Error}");
    }

    Console.ResetColor();
}

if (results.Count == 0)
{
    Console.WriteLine("No databases were selected for migration.");
    return 1;
}

Console.WriteLine();
Console.WriteLine(
    failed
        ? "One or more databases failed to migrate."
        : $"Migrated {results.Count} database(s) successfully.");

return failed ? 1 : 0;

static IConfiguration BuildConfiguration()
{
    var apiProjectPath = FindApiProjectDirectory();
    return new ConfigurationBuilder()
        .SetBasePath(apiProjectPath)
        .AddJsonFile("appsettings.json", optional: false)
        .AddJsonFile("appsettings.Development.json", optional: true)
        .AddEnvironmentVariables()
        .Build();
}

static string FindApiProjectDirectory()
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
        "Could not locate School.API/appsettings.json for database migration.");
}

static void PrintHelp()
{
    Console.WriteLine("""
        School database migrator

        Applies pending EF Core migrations using connection strings from School.API/appsettings.json.

        Usage:
          dotnet run --project backend/School.Migrator
          dotnet run --project backend/School.Migrator -- --campus local
          dotnet run --project backend/School.Migrator -- --campus main --campus mt
          dotnet run --project backend/School.Migrator -- --academic-only
          dotnet run --project backend/School.Migrator -- --campus-only --campus local

        Default (no args):
          - AcademicContext
          - Every entry under CampusSettings:Campuses

        --academic-only:
          - AcademicContext only (no campus databases)

        Notes:
          - `dotnet ef migrations add` still uses the local campus DB for design-time only.
          - Use this migrator (or backend/scripts/Update-AllCampusDatabases.ps1) after adding migrations.
        """);
}
