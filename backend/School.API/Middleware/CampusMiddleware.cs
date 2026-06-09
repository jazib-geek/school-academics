using Microsoft.Extensions.Options;
using School.Application.Common;

namespace School.API.Middleware;

public class CampusMiddleware
{
    private readonly RequestDelegate _next;
    private readonly IConfiguration _configuration;

    public CampusMiddleware(
        RequestDelegate next,
        IConfiguration configuration)
    {
        _next = next;
        _configuration = configuration;
    }

    public async Task InvokeAsync(HttpContext context, TenantContext tenantContext)
    {
        string? campus = null;

        if (context.User.Identity?.IsAuthenticated == true)
        {
            campus = context.User.FindFirst("Campus")?.Value;
        }

        if (string.IsNullOrEmpty(campus))
        {
            campus = context.Request.Headers["X-Campus"].ToString();
        }

        if (string.IsNullOrEmpty(campus))
        {
            campus = _configuration["CampusSettings:DefaultCampus"];
        }

        var connectionString = _configuration
            .GetSection("CampusSettings:Campuses")[campus];

        if (string.IsNullOrEmpty(connectionString))
        {
            context.Response.StatusCode = 400;
            await context.Response.WriteAsync("Invalid Campus.");
            return;
        }

        tenantContext.Campus = campus;
        tenantContext.ConnectionString = connectionString;

        await _next(context);
    }

}
