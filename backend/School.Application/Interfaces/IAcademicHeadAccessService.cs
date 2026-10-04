using System.Security.Claims;

namespace School.Application.Interfaces;

public sealed record AcademicHeadAccessResult(
    bool Success,
    int EmployeeId,
    string? ErrorMessage,
    int StatusCode);

public interface IAcademicHeadAccessService
{
    Task<AcademicHeadAccessResult> EnsureAcademicHeadAsync(
        ClaimsPrincipal user,
        CancellationToken cancellationToken = default);
}
