using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using School.Application.Common;

namespace School.API.Filters;

/// <summary>
/// Campus JWTs (no AuthSource claim) pass through. Employee JWTs (AuthSource=Employee)
/// also pass when authenticated — module flags are enforced in the employee portal UI.
/// Use <see cref="AuthorizeCampusOrCoordinatorAttribute"/> when the action must stay coordinator-only.
/// </summary>
public sealed class AuthorizeCampusOrEmployeeFilter : IAsyncAuthorizationFilter
{
    public Task OnAuthorizationAsync(AuthorizationFilterContext context)
    {
        if (context.HttpContext.User?.Identity?.IsAuthenticated != true)
        {
            context.Result = new UnauthorizedObjectResult(
                ApiResponse<object>.FailureResponse("Unauthorized."));
        }

        return Task.CompletedTask;
    }
}

[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method)]
public sealed class AuthorizeCampusOrEmployeeAttribute : TypeFilterAttribute
{
    public AuthorizeCampusOrEmployeeAttribute()
        : base(typeof(AuthorizeCampusOrEmployeeFilter))
    {
    }
}
