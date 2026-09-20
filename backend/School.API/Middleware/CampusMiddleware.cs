using System.Text.Json;
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

        if (string.IsNullOrWhiteSpace(campus))
        {
            campus = ReadCampusHeader(context, "X-Campus")
                ?? ReadCampusHeader(context, "Campus");
        }

        if (string.IsNullOrWhiteSpace(campus))
        {
            campus = _configuration["CampusSettings:DefaultCampus"];
        }

        campus = campus?.Trim();
        var campusKey = campus?.ToLowerInvariant();
        var connectionString = string.IsNullOrEmpty(campusKey)
            ? null
            : _configuration.GetSection("CampusSettings:Campuses")[campusKey];

        if (string.IsNullOrEmpty(connectionString))
        {
            context.Response.StatusCode = 400;
            context.Response.ContentType = "application/json";
            var payload = JsonSerializer.Serialize(new
            {
                success = false,
                message = "Invalid campus.",
                data = (object?)null,
            });
            await context.Response.WriteAsync(payload);
            return;
        }

        tenantContext.Campus = campusKey!;
        tenantContext.ConnectionString = connectionString;

        await _next(context);
    }

    private static string? ReadCampusHeader(HttpContext context, string name)
    {
        if (!context.Request.Headers.TryGetValue(name, out var value))
            return null;
        var text = value.ToString();
        return string.IsNullOrWhiteSpace(text) ? null : text.Trim();
    }
}
