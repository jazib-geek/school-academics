using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using School.Application.Common;
using School.Application.Interfaces;

namespace School.API.Filters;

/// <summary>
/// Campus JWTs (no AuthSource claim) pass through. Employee JWTs (AuthSource=Employee)
/// must belong to an active Coordinator.
/// </summary>
public sealed class AuthorizeCampusOrCoordinatorFilter : IAsyncAuthorizationFilter
{
    private readonly ICoordinatorAccessService _coordinatorAccessService;

    public AuthorizeCampusOrCoordinatorFilter(ICoordinatorAccessService coordinatorAccessService)
    {
        _coordinatorAccessService = coordinatorAccessService;
    }

    public async Task OnAuthorizationAsync(AuthorizationFilterContext context)
    {
        var authSource = context.HttpContext.User.FindFirst(AuthSourceClaims.ClaimType)?.Value;
        if (!string.Equals(authSource, AuthSourceClaims.Employee, StringComparison.OrdinalIgnoreCase))
        {
            return;
        }

        var auth = await _coordinatorAccessService.EnsureCoordinatorAsync(
            context.HttpContext.User,
            context.HttpContext.RequestAborted);

        if (auth.Success)
        {
            return;
        }

        context.Result = auth.StatusCode switch
        {
            401 => new UnauthorizedObjectResult(ApiResponse<object>.FailureResponse(auth.ErrorMessage ?? "Unauthorized.")),
            _ => new ObjectResult(ApiResponse<object>.FailureResponse(auth.ErrorMessage ?? "Forbidden."))
            {
                StatusCode = auth.StatusCode,
            },
        };
    }
}

[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method)]
public sealed class AuthorizeCampusOrCoordinatorAttribute : TypeFilterAttribute
{
    public AuthorizeCampusOrCoordinatorAttribute()
        : base(typeof(AuthorizeCampusOrCoordinatorFilter))
    {
    }
}
