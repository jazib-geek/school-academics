using System.Security.Claims;

namespace School.Application.Interfaces;

public sealed record CoordinatorAccessResult(
    bool Success,
    int EmployeeId,
    string? ErrorMessage,
    int StatusCode);

public interface ICoordinatorAccessService
{
    /// <summary>
    /// Resolves employee id from JWT and verifies active Coordinator designation.
    /// </summary>
    Task<CoordinatorAccessResult> EnsureCoordinatorAsync(
        ClaimsPrincipal user,
        CancellationToken cancellationToken = default);
}
