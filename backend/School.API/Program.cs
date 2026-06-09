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

var builder = WebApplication.CreateBuilder(args);

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
    options.UseSqlServer(tenantContext.ConnectionString);
});

builder.Services.AddDbContext<AcademicContext>(options =>
{
    var connectionString = builder.Configuration.GetConnectionString("AcademicContext")
        ?? throw new InvalidOperationException("Connection string 'AcademicContext' was not found.");
    options.UseSqlServer(connectionString);
});

builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IEmployeeAuthRepository, EmployeeAuthRepository>();
builder.Services.AddScoped<IEmployeeAuthService, EmployeeAuthService>();
builder.Services.AddScoped<ICoordinatorDailyReportRepository, CoordinatorDailyReportRepository>();
builder.Services.AddScoped<ICoordinatorDailyReportService, CoordinatorDailyReportService>();
builder.Services.AddScoped<ICoordinatorStaffReadRepository, CoordinatorStaffReadRepository>();
builder.Services.AddScoped<IAcademicAuthService, AcademicAuthService>();
builder.Services.AddScoped<IAcademicCatalogService, AcademicCatalogService>();
builder.Services.AddScoped<IExamTitleRepository, ExamTitleRepository>();
builder.Services.AddScoped<IInstituteSettingsRepository, InstituteSettingsRepository>();
builder.Services.AddScoped<IAcademicInstituteSettingsService, AcademicInstituteSettingsService>();
builder.Services.AddScoped<IAcademicExamTitleService, AcademicExamTitleService>();
builder.Services.AddScoped<IAcademicExamMakerService, AcademicExamMakerService>();
builder.Services.AddAutoMapper(typeof(School.Application.Mapping.AcademicsMappingProfile).Assembly);
builder.Services.AddScoped<IClassService, ClassService>();
builder.Services.AddScoped<ISubjectService, SubjectService>();
builder.Services.AddScoped<IClassDiaryRepository, ClassDiaryRepository>();
builder.Services.AddScoped<IClassDiaryService, ClassDiaryService>();
builder.Services.AddScoped<IStudentService, StudentService>();
builder.Services.AddScoped<IStudentLedgerService, StudentLedgerService>();
builder.Services.AddScoped<ITokenService, TokenService>();
builder.Services.AddScoped<INewsAndEventService, NewsAndEventService>();
builder.Services.AddScoped<IAttendanceService, AttendanceService>();
builder.Services.AddScoped<IEmployeeAttendanceRepository, EmployeeAttendanceRepository>();
builder.Services.AddScoped<IEmployeeAttendanceService, EmployeeAttendanceService>();
builder.Services.AddScoped<IDashboardService, DashboardService>();
builder.Services.AddScoped<IFeeReportService, FeeReportService>();
builder.Services.AddScoped<IExamService, ExamService>();

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
