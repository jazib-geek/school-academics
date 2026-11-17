# Backend specification

Target: **.NET 8**, ASP.NET Core Web API, EF Core **9.x** SQL Server, JWT bearer auth.
Original reference: `reference/backend/` (School.* namespaces). Rename to `{Product}.*`.

---

## 1. Solution and projects

`backend/{Product}.API.slnx`:

```xml
<Solution>
  <Project Path="{Product}.API/{Product}.API.csproj" />
  <Project Path="{Product}.Application/{Product}.Application.csproj" />
  <Project Path="{Product}.Infrastructure/{Product}.Infrastructure.csproj" />
  <Project Path="{Product}.Migrator/{Product}.Migrator.csproj" />
</Solution>
```

| Project | SDK | References | NuGet |
|---|---|---|---|
| `{Product}.API` | `Microsoft.NET.Sdk.Web` | Application, Infrastructure | `Microsoft.AspNetCore.Authentication.JwtBearer` 8.x, `Microsoft.EntityFrameworkCore.SqlServer` 9.x, `Microsoft.EntityFrameworkCore.Design` 9.x, `Swashbuckle.AspNetCore` |
| `{Product}.Application` | `Microsoft.NET.Sdk` | Infrastructure | `Microsoft.EntityFrameworkCore` 9.x, `Microsoft.Extensions.Identity.Core` (for `PasswordHasher<T>`) |
| `{Product}.Infrastructure` | `Microsoft.NET.Sdk` | — | `Microsoft.EntityFrameworkCore.SqlServer` 9.x, `.Tools`, `.Design`, `Microsoft.Extensions.Configuration.Json`, `System.IdentityModel.Tokens.Jwt` |
| `{Product}.Migrator` | `Microsoft.NET.Sdk` (Exe) | Infrastructure | `Microsoft.EntityFrameworkCore.Design` 9.x, `Microsoft.Extensions.Configuration.Json`, `.EnvironmentVariables` |

All projects: `<TargetFramework>net8.0</TargetFramework>`, `<Nullable>enable</Nullable>`, `<ImplicitUsings>enable</ImplicitUsings>`.

> The original references Application → Infrastructure (services use `AppDbContext` directly; no
> repository layer for most features). **Keep this.** Do not introduce a generic repository / unit of work.

Layer responsibilities:

| Layer | Contains | Must not contain |
|---|---|---|
| API | Controllers, middleware, filters, SSE streams (singletons), hosted services, Swagger filters, `Program.cs` | EF queries beyond trivial lookups (put them in services) |
| Application | DTOs, interfaces, services (business logic, EF queries via `AppDbContext`), `TenantContext`, `ApiResponse` | HTTP types (`HttpContext`, `IActionResult`) |
| Infrastructure | `AppDbContext`, entities, EF configurations, migrations, `TokenService`, tenancy options/registry, seeder, migration runner | Business rules |
| Migrator | CLI entry calling `DatabaseMigrationRunner` + `DbSeeder` | Anything else |

---

## 2. Configuration (`appsettings.json`)

Commit **`appsettings.example.json`** only. Real `appsettings.json` / `appsettings.Production.json` are
gitignored and live on the server (FTP deploy never overwrites them).

```json
{
  "TenantSettings": {
    "DefaultTenant": "local",
    "Tenants": {
      "local": {
        "Name": "Local (Dev)",
        "ConnectionString": "Server=YOUR_SERVER;Initial Catalog={Product}_Local;Integrated Security=True;TrustServerCertificate=True",
        "Enabled": true,
        "SortOrder": 0,
        "HideInProduction": true
      },
      "main": {
        "Name": "Main Branch",
        "ConnectionString": "Server=...;Initial Catalog={Product}_Main;User ID=...;Password=...;TrustServerCertificate=True",
        "Enabled": true,
        "SortOrder": 1
      }
    }
  },
  "Database": {
    "MigrateOnStartup": false,
    "SeedOnStartup": true,
    "CommandTimeoutSeconds": 60
  },
  "Seed": {
    "AdminUsername": "admin",
    "AdminPassword": "CHANGE_ME_ON_FIRST_DEPLOY",
    "AdminFullName": "System Administrator"
  },
  "JwtSettings": {
    "Key": "CHANGE_TO_A_LONG_RANDOM_SECRET_AT_LEAST_32_CHARS",
    "Issuer": "{Product}.API",
    "Audience": "{Product}.Web",
    "DurationInMinutes": 720
  },
  "App": {
    "TimeZoneId": "Pakistan Standard Time"
  },
  "ActivityLog": {
    "RetentionDays": 365,
    "QueueCapacity": 10000,
    "BatchSize": 200
  },
  "Chat": {
    "RetentionHours": 48
  },
  "Cors": {
    "AllowedOrigins": [ "http://localhost:5010" ]
  },
  "Logging": { "LogLevel": { "Default": "Information", "Microsoft.AspNetCore": "Warning" } },
  "AllowedHosts": "*"
}
```

Rules:

- Tenant **keys** are lowercase slugs (`main`, `north`, `demo`). Lookup is case-insensitive; always normalise with `.Trim().ToLowerInvariant()`.
- `Name` is the **label** shown in the login dropdown and top bar. Optional extra mapping is allowed:
  `TenantSettings:Labels: { "main": "Main Branch" }` overrides `Name` if present (support both; `Labels` wins).
- `Enabled: false` hides the tenant from `GET api/auth/tenants` and makes `TenantMiddleware` reject it.
- `HideInProduction: true` hides it when `ASPNETCORE_ENVIRONMENT=Production` (replaces the original FE-side
  "drop `local` in prod" logic).
- Configuration is read through **`IOptionsMonitor<TenantSettings>`** and `reloadOnChange: true` (default for
  `appsettings.json`), so adding a tenant on the server takes effect **without restarting** the app.

---

## 3. Tenancy

### 3.1 Options + registry (`{Product}.Infrastructure/Tenancy/`)

```csharp
public sealed class TenantSettings
{
    public const string SectionName = "TenantSettings";
    public string DefaultTenant { get; set; } = "local";
    public Dictionary<string, TenantOptions> Tenants { get; set; } = new(StringComparer.OrdinalIgnoreCase);
    public Dictionary<string, string> Labels { get; set; } = new(StringComparer.OrdinalIgnoreCase);
}

public sealed class TenantOptions
{
    public string Name { get; set; } = string.Empty;
    public string ConnectionString { get; set; } = string.Empty;
    public bool Enabled { get; set; } = true;
    public int SortOrder { get; set; }
    public bool HideInProduction { get; set; }
}

public sealed record TenantInfo(string Key, string Name, string ConnectionString, int SortOrder);
```

`ITenantRegistry` (interface in Application, implementation `TenantRegistry` in Infrastructure, **singleton**):

```csharp
public interface ITenantRegistry
{
    IReadOnlyList<TenantInfo> GetActiveTenants();          // enabled, env-filtered, ordered by SortOrder then Name
    TenantInfo? Find(string? key);                          // null when missing/disabled/hidden
    string DefaultTenantKey { get; }
}
```

Implementation reads `IOptionsMonitor<TenantSettings>.CurrentValue` on every call (no caching beyond what
the monitor does) and `IHostEnvironment` for `HideInProduction`.

Startup validation (from original `ValidateCampusConfiguration`): outside Development, throw at boot if
`GetActiveTenants()` is empty with message *"TenantSettings:Tenants has no entries. Restore production
appsettings.json on the server (FTP deploy excludes appsettings)."*

### 3.2 `TenantContext` (`{Product}.Application/Common/TenantContext.cs`, scoped)

```csharp
public class TenantContext
{
    public string Tenant { get; set; } = string.Empty;          // key, lowercase
    public string TenantName { get; set; } = string.Empty;      // label
    public string ConnectionString { get; set; } = string.Empty;
}
```

### 3.3 `TenantMiddleware` (`{Product}.API/Middleware/TenantMiddleware.cs`)

Port of `reference/backend/School.API/Middleware/CampusMiddleware.cs`:

```csharp
public async Task InvokeAsync(HttpContext context, TenantContext tenantContext, ITenantRegistry registry)
{
    string? key = null;
    if (context.User.Identity?.IsAuthenticated == true)
        key = context.User.FindFirst(ClaimNames.Tenant)?.Value;
    if (string.IsNullOrWhiteSpace(key))
        key = ReadHeader(context, "X-Tenant");
    if (string.IsNullOrWhiteSpace(key))
        key = registry.DefaultTenantKey;

    var tenant = registry.Find(key);
    if (tenant is null)
    {
        context.Response.StatusCode = 400;
        context.Response.ContentType = "application/json";
        await context.Response.WriteAsync(JsonSerializer.Serialize(
            new { success = false, message = "Invalid tenant.", data = (object?)null }));
        return;
    }

    tenantContext.Tenant = tenant.Key;
    tenantContext.TenantName = tenant.Name;
    tenantContext.ConnectionString = tenant.ConnectionString;
    await _next(context);
}
```

Bypass list (no tenant needed, must run **before** the tenant check): `GET /api/auth/tenants`,
`/swagger*`, `/health`. Implement as `if (IsTenantFree(context.Request.Path)) { await _next(context); return; }`.

### 3.4 `AppDbContext` registration

```csharp
services.AddScoped<TenantContext>();
services.AddDbContext<AppDbContext>((sp, options) =>
{
    var tenant = sp.GetRequiredService<TenantContext>();
    options.UseSqlServer(tenant.ConnectionString, sql =>
    {
        sql.UseProductMigrationsHistory(typeof(AppDbContext).Assembly.FullName);
        if (commandTimeout is > 0) sql.CommandTimeout(commandTimeout.Value);
    });
});
```

`ProductSqlServerMigrations.UseProductMigrationsHistory` = copy of
`reference/backend/School.Infrastructure/Data/SchoolSqlServerMigrations.cs` (pins `dbo.__EFMigrationsHistory`).

### 3.5 Cross-tenant operations

The scoped `AppDbContext` sees **one** tenant per request. To aggregate across tenants (org-wide dashboard,
background jobs, seeding), open a short-lived context per tenant:

```csharp
public static class TenantDbContextFactory
{
    public static AppDbContext Create(string connectionString, int? timeout = null)
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlServer(connectionString, sql =>
            {
                sql.UseProductMigrationsHistory(typeof(AppDbContext).Assembly.FullName);
                if (timeout is > 0) sql.CommandTimeout(timeout.Value);
            })
            .Options;
        return new AppDbContext(options);
    }
}

foreach (var tenant in registry.GetActiveTenants())
{
    await using var db = TenantDbContextFactory.Create(tenant.ConnectionString);
    // query...
}
```

Background services (chat purge, activity log writer/purge) **must** use this pattern — they have no HTTP
request and therefore no `TenantContext`.

---

## 4. `Program.cs` (exact order)

```csharp
using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using {Product}.API.Extensions;
using {Product}.API.Middleware;
using {Product}.API.Swagger;
using {Product}.Application.Extensions;
using {Product}.Infrastructure.Data;
using {Product}.Infrastructure.Extensions;

var builder = WebApplication.CreateBuilder(args);

// 1. Infrastructure (options, tenancy registry, AppDbContext, TokenService) — validates tenants
builder.Services.AddInfrastructure(builder.Configuration, builder.Environment);

// 2. Application services
builder.Services.AddApplicationServices(builder.Configuration);

// 3. API-layer services (SSE sinks, hosted services, filters)
builder.Services.AddApiServices();

// 4. MVC + Swagger
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(o =>
{
    o.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "JWT Authorization header using the Bearer scheme. Enter the token only.",
        Name = "Authorization", In = ParameterLocation.Header,
        Type = SecuritySchemeType.Http, Scheme = "bearer", BearerFormat = "JWT"
    });
    o.OperationFilter<AuthorizeOperationFilter>();
    o.OperationFilter<TenantHeaderOperationFilter>();
});

// 5. CORS
var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [];
builder.Services.AddCors(o => o.AddPolicy("FrontendCors",
    p => p.WithOrigins(allowedOrigins).AllowAnyHeader().AllowAnyMethod()));

// 6. JWT
var jwt = builder.Configuration.GetSection("JwtSettings");
var key = Encoding.UTF8.GetBytes(jwt["Key"]!);
builder.Services.AddAuthentication(o =>
{
    o.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    o.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(o =>
{
    o.Events = new JwtBearerEvents
    {
        // EventSource cannot send headers: accept ?access_token= on SSE paths only.
        OnMessageReceived = ctx =>
        {
            var token = ctx.Request.Query["access_token"];
            var path = ctx.HttpContext.Request.Path;
            if (!string.IsNullOrEmpty(token) &&
                (path.StartsWithSegments("/api/chat/stream") ||
                 path.StartsWithSegments("/api/notifications/stream")))
                ctx.Token = token;
            return Task.CompletedTask;
        }
    };
    o.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true, ValidateAudience = true,
        ValidateIssuerSigningKey = true, ValidateLifetime = true,
        ValidIssuer = jwt["Issuer"], ValidAudience = jwt["Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(key)
    };
});
builder.Services.AddAuthorization();
builder.Services.AddMemoryCache();

var app = builder.Build();

// 7. Optional startup migration + seed (all tenants)
await app.MigrateTenantsOnStartupAsync();   // reads Database:MigrateOnStartup / SeedOnStartup

// 8. Pipeline (order matters)
app.UseMiddleware<ExceptionHandlingMiddleware>();
app.UseSwagger();
app.UseSwaggerUI();
app.UseHttpsRedirection();
app.UseCors("FrontendCors");
app.UseAuthentication();
app.UseMiddleware<TenantMiddleware>();       // after AuthN (reads Tenant claim), before AuthZ
app.UseAuthorization();
app.MapControllers();
app.MapGet("/health", () => Results.Ok(new { status = "ok" }));

app.Run();
```

`MigrateTenantsOnStartupAsync` (extension in API/Extensions):

```csharp
public static async Task MigrateTenantsOnStartupAsync(this WebApplication app)
{
    var cfg = app.Configuration;
    var migrate = cfg.GetValue<bool>("Database:MigrateOnStartup");
    var seed = cfg.GetValue("Database:SeedOnStartup", true);
    if (!migrate) return;

    var logger = app.Services.GetRequiredService<ILoggerFactory>().CreateLogger("Startup.Migrations");
    var results = await DatabaseMigrationRunner.MigrateAllAsync(cfg, tenantKeys: null, seed: seed);
    foreach (var r in results)
        if (r.Succeeded) logger.LogInformation("Migrated {Tenant} -> {Db}", r.Name, r.Database);
        else logger.LogError("Migration FAILED {Tenant} -> {Db}: {Error}", r.Name, r.Database, r.Error);
    // Never throw: one broken tenant must not take the API down for the others.
}
```

---

## 5. Dependency injection conventions

Unlike the original (~80 inline `AddScoped` lines in `Program.cs`), the blueprint uses **one extension
method per layer**. Keep each registration one line, grouped by feature, alphabetical inside a group.

`{Product}.Infrastructure/Extensions/ServiceCollectionExtensions.cs`

```csharp
public static IServiceCollection AddInfrastructure(this IServiceCollection services,
    IConfiguration configuration, IHostEnvironment environment)
{
    services.Configure<TenantSettings>(configuration.GetSection(TenantSettings.SectionName));
    services.AddSingleton<ITenantRegistry, TenantRegistry>();
    services.AddScoped<TenantContext>();

    var timeout = configuration.GetValue<int?>("Database:CommandTimeoutSeconds");
    services.AddDbContext<AppDbContext>((sp, o) => { /* §3.4 */ });

    services.AddScoped<ITokenService, TokenService>();
    services.AddSingleton<IPasswordHasher<User>, PasswordHasher<User>>();

    TenantStartupValidator.Validate(configuration, environment);   // §3.1
    return services;
}
```

`{Product}.Application/Extensions/ServiceCollectionExtensions.cs`

```csharp
public static IServiceCollection AddApplicationServices(this IServiceCollection services, IConfiguration configuration)
{
    // Auth & users
    services.AddScoped<IAuthService, AuthService>();
    services.AddScoped<IUserService, UserService>();
    // Platform
    services.AddScoped<IActivityLogService, ActivityLogService>();
    services.AddScoped<IChatService, ChatService>();
    services.AddScoped<IDashboardService, DashboardService>();
    services.AddScoped<ISystemSettingsService, SystemSettingsService>();
    // Feature services for the new product go below, one line each.
    return services;
}
```

`{Product}.API/Extensions/ServiceCollectionExtensions.cs`

```csharp
public static IServiceCollection AddApiServices(this IServiceCollection services)
{
    services.AddSingleton<IChatSink, TenantChatStream>();
    services.AddSingleton<IActivityLogQueue, ActivityLogQueue>();
    services.AddHostedService<ActivityLogWriter>();
    services.AddHostedService<ActivityLogPurgeService>();
    services.AddHostedService<ChatPurgeService>();
    services.AddScoped<RequirePermissionFilter>();
    return services;
}
```

Lifetimes: services touching `AppDbContext` / `TenantContext` → **Scoped**. In-memory realtime hubs and
queues → **Singleton**. Never inject a scoped service into a singleton; hosted services create scopes or
use `TenantDbContextFactory`.

---

## 6. EF Core conventions

### 6.1 `AppDbContext`

```csharp
public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<Permission> Permissions => Set<Permission>();
    public DbSet<UserPermission> UserPermissions => Set<UserPermission>();
    public DbSet<ActivityLog> ActivityLogs => Set<ActivityLog>();
    public DbSet<ChatMessage> ChatMessages => Set<ChatMessage>();
    public DbSet<ChatReaction> ChatReactions => Set<ChatReaction>();
    public DbSet<SystemSetting> SystemSettings => Set<SystemSetting>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasDefaultSchema("dbo");
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
        base.OnModelCreating(modelBuilder);
    }

    public override Task<int> SaveChangesAsync(CancellationToken ct = default)
    {
        StampAudit();   // sets CreatedAt/UpdatedAt (UTC) on BaseEntity
        return base.SaveChangesAsync(ct);
    }
}
```

### 6.2 `BaseEntity`

```csharp
public abstract class BaseEntity
{
    public int Id { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public int? CreatedByUserId { get; set; }
    public DateTime? UpdatedAtUtc { get; set; }
    public int? UpdatedByUserId { get; set; }
}
```

`CreatedByUserId` / `UpdatedByUserId` are set by services (they know the caller), not by the context.
High-volume append-only tables (`ActivityLog`, `ChatMessage`) do **not** inherit `BaseEntity`; they use
`long Id` and their own timestamp.

### 6.3 Entities (fresh DB — no legacy columns)

| Entity / table | Columns | Keys / indexes |
|---|---|---|
| `User` / `dbo.tblUser` : BaseEntity | `Username` nvarchar(100), `PasswordHash` nvarchar(500), `FullName` nvarchar(150), `Email` nvarchar(200)?, `Phone` nvarchar(30)?, `IsSuperAdmin` bit, `IsActive` bit (default 1), `LastLoginAtUtc` datetime2? | PK `Id`; **unique** `Username` |
| `Permission` / `dbo.tblPermission` | `Id` int, `Code` nvarchar(100), `Name` nvarchar(150), `ModuleHead` nvarchar(100), `SortOrder` int, `IsActive` bit | PK `Id`; **unique** `Code`; seeded via `HasData(PermissionCatalog.All)` |
| `UserPermission` / `dbo.tblUserPermission` | `UserId` int, `PermissionCode` nvarchar(100), `GrantedAtUtc`, `GrantedByUserId` int? | PK (`UserId`, `PermissionCode`); FK `UserId` → `tblUser` cascade |
| `ActivityLog` / `dbo.tblActivityLog` | see [ACTIVITY-LOGS.md](ACTIVITY-LOGS.md) | |
| `ChatMessage`, `ChatReaction` | see [CHAT.md](CHAT.md) | |
| `SystemSetting` / `dbo.tblSystemSetting` | `Key` nvarchar(100), `Value` nvarchar(max)?, `UpdatedAtUtc`, `UpdatedByUserId` int? | PK `Key` |

> Original `tblUserRights` keyed rights by **username** and stored `HasAccess` flags. The blueprint keys by
> **UserId** and stores only granted rows (row present = granted).

### 6.4 Configurations

One file per entity in `Data/Configurations/`, e.g.:

```csharp
public sealed class UserConfiguration : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> e)
    {
        e.ToTable("tblUser", "dbo");
        e.HasKey(x => x.Id);
        e.Property(x => x.Username).HasMaxLength(100).IsRequired();
        e.HasIndex(x => x.Username).IsUnique();
        e.Property(x => x.PasswordHash).HasMaxLength(500).IsRequired();
        e.Property(x => x.FullName).HasMaxLength(150).IsRequired();
        e.Property(x => x.Email).HasMaxLength(200);
        e.Property(x => x.IsActive).HasDefaultValue(true);
    }
}
```

`PermissionConfiguration` = port of `reference/backend/School.Infrastructure/Data/Configurations/PermissionConfiguration.cs`
with `e.HasData(PermissionCatalog.All)`.

### 6.5 Permission catalog (`Data/PermissionCatalog.cs`)

Single source of truth. **IDs are stable forever** (EF `HasData` uses them); append new rows at the end.

```csharp
public static class PermissionCatalog
{
    public static readonly Permission[] All =
    [
        new() { Id = 1, Code = PermissionCodes.DashboardView,        Name = "View dashboard",        ModuleHead = "Dashboard",       SortOrder = 10, IsActive = true },
        new() { Id = 2, Code = PermissionCodes.UserList,             Name = "View users",            ModuleHead = "User Management", SortOrder = 20, IsActive = true },
        new() { Id = 3, Code = PermissionCodes.UserAdd,              Name = "Add users",             ModuleHead = "User Management", SortOrder = 21, IsActive = true },
        new() { Id = 4, Code = PermissionCodes.UserEdit,             Name = "Edit users",            ModuleHead = "User Management", SortOrder = 22, IsActive = true },
        new() { Id = 5, Code = PermissionCodes.UserDelete,           Name = "Delete users",          ModuleHead = "User Management", SortOrder = 23, IsActive = true },
        new() { Id = 6, Code = PermissionCodes.ActivityLogView,      Name = "View activity logs",    ModuleHead = "Activity Logs",   SortOrder = 30, IsActive = true },
        new() { Id = 7, Code = PermissionCodes.SystemSettingsManage, Name = "Manage system settings",ModuleHead = "Settings",        SortOrder = 40, IsActive = true },
        new() { Id = 8, Code = PermissionCodes.ChatUse,              Name = "Use chat",              ModuleHead = "Communication",   SortOrder = 50, IsActive = true },
    ];
}
```

`{Product}.Application/Common/PermissionCodes.cs` holds the string constants
(`dashboard_view`, `user_list`, `user_add`, `user_edit`, `user_delete`, `activity_log_view`,
`system_settings_manage`, `chat_use`). **The same strings are mirrored in the frontend `constants/permissions.js`.**

### 6.6 Design-time factory

Copy `reference/backend/School.Infrastructure/Data/AppDbContextFactory.cs` and `DesignTimeConfiguration.cs`.
Change them to read `TenantSettings:Tenants:local:ConnectionString` (fallback: first tenant's
`ConnectionString`) from `{Product}.API/appsettings*.json`. Design-time is for `migrations add` only.

---

## 7. Authentication (single flow)

### 7.1 Endpoints (`AuthController`, `[Route("api/auth")]`)

| Method | Route | Auth | Body | Returns |
|---|---|---|---|---|
| GET | `tenants` | anonymous (tenant-free) | — | `ApiResponse<List<TenantOptionDto>>` `[{ key, name }]` |
| POST | `login` | anonymous; header `X-Tenant` | `{ username, password }` | `ApiResponse<LoginResponseDto>` |
| GET | `me` | JWT | — | `ApiResponse<LoginResponseDto>` without new token (refresh permissions on reload) |
| POST | `switch-tenant` | JWT, super admin | `{ tenant }` | `ApiResponse<LoginResponseDto>` for the same username on target tenant |
| POST | `login-as` | JWT, super admin | `{ userId }` | `ApiResponse<LoginResponseDto>` as target user |
| POST | `change-password` | JWT | `{ currentPassword, newPassword, confirmPassword }` | `ApiResponse<object>` |

**Only these.** No `campus-login`, `employee-login`, family `login`, `employee-session`.

```csharp
public sealed class LoginResponseDto
{
    public int Id { get; set; }
    public string Username { get; set; } = "";
    public string FullName { get; set; } = "";
    public string Token { get; set; } = "";
    public DateTime ExpiresAtUtc { get; set; }
    public bool IsSuperAdmin { get; set; }
    public string Tenant { get; set; } = "";
    public string TenantName { get; set; } = "";
    public IReadOnlyList<string> GrantedPermissionCodes { get; set; } = [];
}
```

Failed login → `401 ApiResponse.FailureResponse("Invalid username or password.")` (never reveal which part).

### 7.2 `AuthService.LoginAsync`

```csharp
var username = request.Username?.Trim();
if (string.IsNullOrWhiteSpace(username) || string.IsNullOrWhiteSpace(request.Password)) return null;

var user = await _db.Users.FirstOrDefaultAsync(x => x.Username == username && x.IsActive, ct);
if (user is null) return null;

var result = _hasher.VerifyHashedPassword(user, user.PasswordHash, request.Password);
if (result == PasswordVerificationResult.Failed) return null;
if (result == PasswordVerificationResult.SuccessRehashNeeded)
    user.PasswordHash = _hasher.HashPassword(user, request.Password);

user.LastLoginAtUtc = DateTime.UtcNow;
await _db.SaveChangesAsync(ct);
_activityLog.Enqueue(ActivityLogTypes.UserLogin, "User", user.Id, user.Username, null);
return await BuildLoginResponseAsync(_db, user, _tenant.Tenant, _tenant.TenantName, ct);
```

`BuildLoginResponseAsync` (port of original `BuildCampusLoginResponseAsync`, minus fund types/profile):
super admin → all active `Permission.Code`; otherwise → `UserPermissions.Where(UserId).Select(PermissionCode)`
joined to active permissions.

`SwitchTenantAsync` / `LoginAsAsync`: port the original logic
(`reference/backend/School.Application/Services/AuthService.cs` lines ~107–184) using
`TenantDbContextFactory` for the target tenant.

### 7.3 `TokenService`

```csharp
public string GenerateToken(User user, string tenant, out DateTime expiresAtUtc)
{
    var jwt = _configuration.GetSection("JwtSettings");
    var creds = new SigningCredentials(new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt["Key"]!)),
                                       SecurityAlgorithms.HmacSha256);
    expiresAtUtc = DateTime.UtcNow.AddMinutes(Convert.ToDouble(jwt["DurationInMinutes"]));
    var claims = new List<Claim>
    {
        new(ClaimNames.UserId, user.Id.ToString()),
        new(ClaimNames.Username, user.Username),
        new(ClaimNames.Tenant, tenant),
        new(ClaimNames.IsSuperAdmin, user.IsSuperAdmin ? "1" : "0"),
    };
    var token = new JwtSecurityToken(jwt["Issuer"], jwt["Audience"], claims,
                                     expires: expiresAtUtc, signingCredentials: creds);
    return new JwtSecurityTokenHandler().WriteToken(token);
}
```

`ClaimNames`: `UserId = "UserId"`, `Username = "Username"`, `Tenant = "Tenant"`, `IsSuperAdmin = "IsSuperAdmin"`.
Permission codes are **not** put in the JWT (they change; the API re-checks the DB).

No refresh tokens (same as original). On 401 the FE clears the session and goes to `/login`.

### 7.4 Authorization helpers

`{Product}.API/Services/UserAccess.cs` (port of `CampusUserAccess.cs`):

```csharp
public static class UserAccess
{
    public static bool TryGetUserId(ClaimsPrincipal user, out int userId) =>
        int.TryParse(user.FindFirst(ClaimNames.UserId)?.Value, out userId) && userId > 0;

    public static async Task<bool> HasPermissionAsync(AppDbContext db, int userId, string code, CancellationToken ct)
    {
        var user = await db.Users.AsNoTracking().FirstOrDefaultAsync(x => x.Id == userId, ct);
        if (user is null || !user.IsActive) return false;
        if (user.IsSuperAdmin) return true;
        return await db.UserPermissions.AsNoTracking()
            .AnyAsync(x => x.UserId == userId && x.PermissionCode == code, ct);
    }
}
```

`{Product}.API/Filters/RequirePermissionAttribute.cs` — declarative check (new; the original calls
`HasPermissionAsync` inline):

```csharp
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method, AllowMultiple = true)]
public sealed class RequirePermissionAttribute(params string[] anyOf) : TypeFilterAttribute(typeof(RequirePermissionFilter))
{
    // TypeFilterAttribute passes Arguments to the filter ctor
}

public sealed class RequirePermissionFilter(AppDbContext db, string[] anyOf) : IAsyncAuthorizationFilter
{
    public async Task OnAuthorizationAsync(AuthorizationFilterContext ctx)
    {
        if (!UserAccess.TryGetUserId(ctx.HttpContext.User, out var uid)) { ctx.Result = new UnauthorizedResult(); return; }
        foreach (var code in anyOf)
            if (await UserAccess.HasPermissionAsync(db, uid, code, ctx.HttpContext.RequestAborted)) return;
        ctx.Result = new ObjectResult(ApiResponse<object>.FailureResponse("You don't have access to this.")) { StatusCode = 403 };
    }
}
```

Usage: `[Authorize]` on every controller except `AuthController` anonymous actions, plus
`[RequirePermission(PermissionCodes.UserEdit)]` on actions.

---

## 8. Controllers (initial set)

All return `ApiResponse<T>`. Mutations are **POST**.

| Controller | Routes |
|---|---|
| `AuthController` | §7.1 |
| `UsersController` `[Route("api/users")]` | `GET ?search=&page=&pageSize=&isActive=` (`user_list`) → `PagedResultDto<UserListItemDto>`; `GET {id}` (`user_list`); `POST create` (`user_add`); `POST {id}/update` (`user_edit`); `POST {id}/delete` (`user_delete`, soft: `IsActive=false`; hard delete optional); `POST {id}/reset-password` (`user_edit`); `GET permission-catalog` (`user_list`) → grouped by `ModuleHead`; `GET {id}/permissions`; `POST {id}/permissions` `{ codes: [] }` (`user_edit`) |
| `ActivityLogsController` `[Route("api/activity-logs")]` | `GET` (`activity_log_view`) — see ACTIVITY-LOGS.md |
| `ChatController` `[Route("api/chat")]` | see CHAT.md (`chat_use`) |
| `DashboardController` `[Route("api/dashboard")]` | `GET summary` (`dashboard_view`) → placeholder KPIs + recent activity |
| `SystemSettingsController` `[Route("api/system-settings")]` | `GET` → `Dictionary<string,string?>`; `POST` `{ values: {key:value} }` (`system_settings_manage`) |

Rules enforced by `UserService`:

- Username unique (case-insensitive), trimmed, 3–100 chars.
- Password min 6 chars on create/reset; stored via `PasswordHasher<User>`.
- Only a super admin can create/edit a super admin or toggle `IsSuperAdmin`.
- A user cannot delete/deactivate themselves; the last active super admin cannot be removed.
- Every mutation writes an activity log (`UserCreate`, `UserUpdate`, `UserDelete`, `UserPermissionsUpdate`,
  `UserPasswordReset`).

---

## 9. Migrations and seeding

### 9.1 Add a migration (design-time → local tenant only)

```bash
dotnet ef migrations add <Name> \
  --project backend/{Product}.Infrastructure \
  --startup-project backend/{Product}.API \
  --context AppDbContext \
  --output-dir Data/Migrations
```

After scaffolding, grep the migration: every `CreateTable`/`CreateIndex`/`InsertData` has `schema: "dbo"`.

First migration name: `InitialCreate` (users, permissions + seed, user permissions, activity log, chat,
system settings).

### 9.2 `DatabaseMigrationRunner` (`Infrastructure/Data`)

Port of `reference/backend/School.Infrastructure/Data/DatabaseMigrationRunner.cs` **without** the academic
branch:

```csharp
public sealed record DatabaseMigrationResult(string Name, string Database, bool Succeeded, string? Error = null);

public static async Task<IReadOnlyList<DatabaseMigrationResult>> MigrateAllAsync(
    IConfiguration configuration, IReadOnlyList<string>? tenantKeys = null, bool seed = true,
    CancellationToken ct = default)
{
    // Iterate TenantSettings:Tenants (Enabled only), filter by tenantKeys,
    // for each: create context via TenantDbContextFactory,
    //   await EfMigrationsHistorySchemaFix.EnsureInDboAsync(ctx, ct);
    //   await ctx.Database.MigrateAsync(ct);
    //   if (seed) await DbSeeder.SeedAsync(ctx, configuration, ct);
    // catch per tenant -> Succeeded=false, Error=ex.Message (continue with next tenant)
}
```

`EfMigrationsHistorySchemaFix.cs` — copy as-is (moves a mis-schema'd `__EFMigrationsHistory` into `dbo`).

### 9.3 `DbSeeder` (idempotent)

```csharp
public static async Task SeedAsync(AppDbContext db, IConfiguration cfg, CancellationToken ct)
{
    var username = cfg["Seed:AdminUsername"];
    var password = cfg["Seed:AdminPassword"];
    if (string.IsNullOrWhiteSpace(username) || string.IsNullOrWhiteSpace(password)) return;
    if (await db.Users.AnyAsync(x => x.IsSuperAdmin, ct)) return;   // never overwrite existing admins

    var user = new User { Username = username.Trim(), FullName = cfg["Seed:AdminFullName"] ?? "Administrator",
                          IsSuperAdmin = true, IsActive = true, CreatedAtUtc = DateTime.UtcNow };
    user.PasswordHash = new PasswordHasher<User>().HashPassword(user, password);
    db.Users.Add(user);
    await db.SaveChangesAsync(ct);
}
```

Permissions are seeded by EF `HasData` inside migrations — the seeder does **not** insert permissions.

### 9.4 `{Product}.Migrator/Program.cs`

Port of `reference/backend/School.Migrator/Program.cs`. Arguments:

| Arg | Effect |
|---|---|
| *(none)* | migrate + seed every enabled tenant |
| `--tenant <key>` (repeatable) | only those tenants |
| `--no-seed` | migrate only |
| `-h`, `--help` | usage |

Loads `{Product}.API/appsettings.json` + `appsettings.Development.json` + env vars (walk up from CWD to
find `{Product}.API` or `backend/{Product}.API`). Prints `OK   tenant:main -> DbName` / `FAIL ...`,
exit code 1 on any failure.

```bash
dotnet run --project backend/{Product}.Migrator
dotnet run --project backend/{Product}.Migrator -- --tenant local
dotnet run --project backend/{Product}.Migrator -- --tenant main --tenant north --no-seed
```

`backend/scripts/Update-AllTenantDatabases.ps1`:

```powershell
$ErrorActionPreference = 'Stop'
Push-Location (Join-Path $PSScriptRoot '..')
try { dotnet run --project {Product}.Migrator -- @args } finally { Pop-Location }
```

### 9.5 Startup migration

`Database:MigrateOnStartup = true` → API runs the same runner at boot (§4). Recommended:
`true` on single-server Plesk installs where you cannot run CLI; `false` + Migrator in environments with
multiple API instances.

---

## 10. Cross-cutting

### 10.1 `ApiResponse<T>` (copy as-is)

```csharp
public class ApiResponse<T>
{
    public bool Success { get; set; }
    public string Message { get; set; } = string.Empty;
    public T? Data { get; set; }
    public static ApiResponse<T> SuccessResponse(T data, string message = "") => new() { Success = true, Message = message, Data = data };
    public static ApiResponse<T> FailureResponse(string message) => new() { Success = false, Message = message };
}
```

### 10.2 `PagedResultDto<T>` (copy as-is)

`Items`, `TotalCount`, `PageNumber`, `PageSize`, `TotalPages`. Default `pageSize` 25, max 200.

### 10.3 `ExceptionHandlingMiddleware` (new)

Maps exceptions thrown by services to JSON `ApiResponse` so controllers stay thin:

| Exception | Status |
|---|---|
| `ArgumentException` / `ValidationException` | 400 |
| `UnauthorizedAccessException` | 403 |
| `KeyNotFoundException` | 404 |
| `InvalidOperationException` | 409 |
| anything else | 500, message `"Something went wrong. Please try again."`; log full exception |

Messages from 4xx exceptions are shown to end users — write them in plain language.

### 10.4 Time

`AppTime.Now` = `TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, tz)` using `App:TimeZoneId`. Store UTC in
the DB (`*Utc` columns); convert for display/business dates only.

### 10.5 Swagger filters

Copy `reference/backend/School.API/Swagger/AuthorizeOperationFilter.cs` and
`CampusHeaderOperationFilter.cs` (rename → `TenantHeaderOperationFilter`, header `X-Tenant`, applied to
`POST api/auth/login`).

### 10.6 HTTP verbs

Plesk blocks PUT (and frequently DELETE). **Never** use `[HttpPut]`/`[HttpDelete]` for client-facing
routes. Use `POST {resource}/{id}/update` and `POST {resource}/{id}/delete`.

### 10.7 `.gitignore` (backend)

`bin/`, `obj/`, `*.user`, `.vs/`, `appsettings.json`, `appsettings.*.json` **except**
`appsettings.example.json` (`!appsettings.example.json`), `publish/`.
