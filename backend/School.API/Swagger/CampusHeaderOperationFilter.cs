using Microsoft.OpenApi.Models;
using Swashbuckle.AspNetCore.SwaggerGen;

namespace School.API.Swagger;

public class CampusHeaderOperationFilter : IOperationFilter
{
    private static readonly string[] CampusAuthPaths =
    [
        "api/Auth/login",
        "api/Auth/campus-login",
        "api/Auth/employee-login"
    ];

    public void Apply(OpenApiOperation operation, OperationFilterContext context)
    {
        if (!string.Equals(context.ApiDescription.HttpMethod, "POST", StringComparison.OrdinalIgnoreCase))
        {
            return;
        }

        var relativePath = context.ApiDescription.RelativePath;
        if (string.IsNullOrWhiteSpace(relativePath) ||
            !CampusAuthPaths.Any(path =>
                relativePath.Contains(path, StringComparison.OrdinalIgnoreCase)))
        {
            return;
        }

        operation.Parameters ??= new List<OpenApiParameter>();

        if (operation.Parameters.Any(p =>
                p.In == ParameterLocation.Header &&
                string.Equals(p.Name, "X-Campus", StringComparison.OrdinalIgnoreCase)))
        {
            return;
        }

        operation.Parameters.Add(new OpenApiParameter
        {
            Name = "X-Campus",
            In = ParameterLocation.Header,
            Required = false,
            Description = "Campus code (e.g. main, mt, nc). Selects which campus database to use for login.",
            Schema = new OpenApiSchema
            {
                Type = "string"
            }
        });
    }
}
