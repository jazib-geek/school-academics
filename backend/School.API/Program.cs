using Microsoft.AspNetCore.Authentication.JwtBearer;
using AutoMapper;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using School.API.Middleware;
using School.API.Services;
using School.API.Swagger;
using School.Application.Academics.Interfaces;
using School.Application.Academics.Services;
using School.Application.Common;
using School.Application.Interfaces;
using School.Application.Services;
using School.Infrastructure.Academics.Data;
using School.Infrastructure.Academics.Repositories;
using School.Infrastructure.Data;
using School.Infrastructure.Repositories;
using School.Infrastructure.Services;
using System.Text;

Encoding.RegisterProvider(CodePagesEncodingProvider.Instance);

var builder = WebApplication.CreateBuilder(args);

ValidateCampusConfiguration(builder.Configuration, builder.Environment);

// Add services to the container.

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "JWT Authorization header using the Bearer scheme. Enter the token only (Swagger adds the Bearer prefix).",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT"
    });

    options.OperationFilter<AuthorizeOperationFilter>();
    options.OperationFilter<CampusHeaderOperationFilter>();
});
var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [];
builder.Services.AddCors(options =>
{
    options.AddPolicy("FrontendCors", policy =>
    {
        policy.WithOrigins(allowedOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

builder.Services.AddScoped<TenantContext>();

builder.Services.AddDbContext<AppDbContext>((serviceProvider, options) =>
{
    var tenantContext = serviceProvider.GetRequiredService<TenantContext>();
    options.UseSqlServer(tenantContext.ConnectionString, sql =>
        sql.UseSchoolMigrationsHistory(typeof(AppDbContext).Assembly.FullName));
});

builder.Services.AddDbContext<AcademicContext>(options =>
{
    var connectionString = builder.Configuration.GetConnectionString("AcademicContext")
        ?? throw new InvalidOperationException("Connection string 'AcademicContext' was not found.");
    options.UseSqlServer(connectionString, sql =>
        sql.UseSchoolMigrationsHistory(typeof(AcademicContext).Assembly.FullName));
});

builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IEmployeeAuthRepository, EmployeeAuthRepository>();
builder.Services.AddScoped<IEmployeeAuthService, EmployeeAuthService>();
builder.Services.AddScoped<ICoordinatorAccessService, CoordinatorAccessService>();
builder.Services.AddScoped<ICoordinatorDailyReportRepository, CoordinatorDailyReportRepository>();
builder.Services.AddScoped<ICoordinatorDailyReportService, CoordinatorDailyReportService>();
builder.Services.AddScoped<ICoordinatorStaffReadRepository, CoordinatorStaffReadRepository>();
builder.Services.AddScoped<IAcademicAuthService, AcademicAuthService>();
builder.Services.AddScoped<IAcademicUserService, AcademicUserService>();
builder.Services.AddScoped<IAcademicCatalogService, AcademicCatalogService>();
builder.Services.AddScoped<IExamTitleRepository, ExamTitleRepository>();
builder.Services.AddScoped<IInstituteSettingsRepository, InstituteSettingsRepository>();
builder.Services.AddScoped<IAcademicInstituteSettingsService, AcademicInstituteSettingsService>();
builder.Services.AddScoped<IAcademicExamTitleService, AcademicExamTitleService>();
builder.Services.AddScoped<IAcademicExamMakerService, AcademicExamMakerService>();
builder.Services.AddAutoMapper(typeof(School.Application.Mapping.AcademicsMappingProfile).Assembly);
builder.Services.AddScoped<IClassService, ClassService>();
builder.Services.AddScoped<ISubjectService, SubjectService>();
builder.Services.AddScoped<ITeacherClassSubjectAssignmentService, TeacherClassSubjectAssignmentService>();
builder.Services.AddScoped<ICampusTimeTableService, CampusTimeTableService>();
builder.Services.AddScoped<ICampusDateSheetService, CampusDateSheetService>();
builder.Services.AddScoped<IClassDiaryRepository, ClassDiaryRepository>();
builder.Services.AddScoped<IClassDiaryService, ClassDiaryService>();
builder.Services.AddScoped<IStudentService, StudentService>();
builder.Services.AddScoped<IActivityLogService, ActivityLogService>();
builder.Services.AddScoped<IEmployeeService, EmployeeService>();
builder.Services.AddScoped<IDesignationService, DesignationService>();
builder.Services.AddScoped<IEmployeeSalaryComponentService, EmployeeSalaryComponentService>();
builder.Services.AddScoped<ICampusPayrollSettingsService, CampusPayrollSettingsService>();
builder.Services.AddScoped<ICampusProfileService, CampusProfileService>();
builder.Services.AddScoped<IFeeReceiptHistoryService, FeeReceiptHistoryService>();
builder.Services.AddSingleton<IEmployeeSalaryProgressStore, EmployeeSalaryProgressStore>();
builder.Services.AddScoped<IEmployeeSalaryService, EmployeeSalaryService>();
builder.Services.AddScoped<ICampusUserService, CampusUserService>();
builder.Services.AddScoped<ILocalityService, LocalityService>();
builder.Services.AddScoped<IStationeryService, StationeryService>();
builder.Services.AddScoped<ICampusSettingsService, CampusSettingsService>();
builder.Services.AddScoped<IStudentLedgerService, StudentLedgerService>();
builder.Services.AddScoped<ITokenService, TokenService>();
builder.Services.AddScoped<INewsAndEventService, NewsAndEventService>();
builder.Services.AddScoped<IFamilyAccountService, FamilyAccountService>();
builder.Services.AddScoped<IAttendanceService, AttendanceService>();
builder.Services.AddScoped<IAbsentFollowupService, AbsentFollowupService>();
builder.Services.AddScoped<IStudentConductService, StudentConductService>();
builder.Services.AddScoped<IParentConductService, ParentConductService>();
builder.Services.AddScoped<IEmployeeAttendanceRepository, EmployeeAttendanceRepository>();
builder.Services.AddScoped<IEmployeeAttendanceService, EmployeeAttendanceService>();
builder.Services.AddScoped<IEmployeeAttendanceImportService, EmployeeAttendanceImportService>();
builder.Services.AddSingleton<IEmployeeAttendanceLiveUpdateSink, EmployeeAttendanceLiveUpdateStream>();
builder.Services.AddSingleton<ICampusNotificationSink, CampusNotificationStream>();
builder.Services.AddScoped<ICampusNotificationService, CampusNotificationService>();
builder.Services.AddScoped<IDashboardService, DashboardService>();
builder.Services.AddScoped<IFeeReportService, FeeReportService>();
builder.Services.AddScoped<IFeeGenerateService, FeeGenerateService>();
builder.Services.AddScoped<IFundGenerateService, FundGenerateService>();
builder.Services.AddScoped<ISmartFeeReportService, SmartFeeReportService>();
builder.Services.AddScoped<ISmartStudentReportService, SmartStudentReportService>();
builder.Services.AddScoped<ISmartAttendanceReportService, SmartAttendanceReportService>();
builder.Services.AddScoped<ISystemAccountResolver, SystemAccountResolver>();
builder.Services.AddScoped<IAccountChartService, AccountChartService>();
builder.Services.AddScoped<IAccountVoucherService, AccountVoucherService>();
builder.Services.AddScoped<IAccountLedgerService, AccountLedgerService>();
builder.Services.AddScoped<IAccountCashBookService, AccountCashBookService>();
builder.Services.AddScoped<IAccountSummaryService, AccountSummaryService>();
builder.Services.AddScoped<IDayClosingService, DayClosingService>();
builder.Services.AddScoped<IExamService, ExamService>();
builder.Services.AddScoped<ISmartExamReportService, SmartExamReportService>();

builder.Services.AddSingleton<IObjectStorageService, B2ObjectStorageService>();

var jwtSettings = builder.Configuration.GetSection("JwtSettings");
var key = Encoding.UTF8.GetBytes(jwtSettings["Key"]!);

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.Events = new JwtBearerEvents
    {
        OnMessageReceived = context =>
        {
            var accessToken = context.Request.Query["access_token"];
            var path = context.HttpContext.Request.Path;
            if (!string.IsNullOrEmpty(accessToken) &&
                (path.StartsWithSegments("/api/employee-attendance/live/stream") ||
                 path.StartsWithSegments("/api/notifications/stream")))
            {
                context.Token = accessToken;
            }

            return Task.CompletedTask;
        }
    };

    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateIssuerSigningKey = true,
        ValidateLifetime = true,
        ValidIssuer = jwtSettings["Issuer"],
        ValidAudience = jwtSettings["Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(key)
    };
});

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("AcademicsOnly", policy =>
        policy.RequireClaim("App", "Academics"));
});

var app = builder.Build();

// Academics DB only — never migrate campus AppDbContext databases at API startup.
using (var scope = app.Services.CreateScope())
{
    var academicDb = scope.ServiceProvider.GetRequiredService<AcademicContext>();
    // Login default schema may have parked history under seico_admin/etc.; move to dbo first.
    await EfMigrationsHistorySchemaFix.EnsureInDboAsync(academicDb);
    await academicDb.Database.MigrateAsync();
}

// Configure the HTTP request pipeline.
app.UseSwagger();
app.UseSwaggerUI();

app.UseHttpsRedirection();

app.UseCors("FrontendCors");
app.UseAuthentication();          
app.UseMiddleware<CampusMiddleware>();   
app.UseAuthorization();           

app.MapControllers();

app.Run();

static void ValidateCampusConfiguration(IConfiguration configuration, IHostEnvironment environment)
{
    if (environment.IsDevelopment())
        return;

    var campuses = configuration.GetSection("CampusSettings:Campuses").GetChildren()
        .Where(x => !string.IsNullOrWhiteSpace(x.Value))
        .Select(x => x.Key)
        .ToList();

    if (campuses.Count == 0)
    {
        throw new InvalidOperationException(
            "CampusSettings:Campuses has no entries. Restore production appsettings.json on the server (FTP deploy excludes appsettings).");
    }
}
