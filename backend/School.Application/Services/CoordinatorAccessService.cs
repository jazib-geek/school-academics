using System.Security.Claims;
using School.Application.Common;
using School.Application.Interfaces;
using School.Infrastructure.Repositories;

namespace School.Application.Services;

public class CoordinatorAccessService : ICoordinatorAccessService
{
    private readonly IEmployeeAuthRepository _employeeAuthRepository;

    public CoordinatorAccessService(IEmployeeAuthRepository employeeAuthRepository)
    {
        _employeeAuthRepository = employeeAuthRepository;
    }

    public async Task<CoordinatorAccessResult> EnsureCoordinatorAsync(
        ClaimsPrincipal user,
        CancellationToken cancellationToken = default)
    {
        var claim = user.FindFirst("FamilyDbId")?.Value;
        if (string.IsNullOrWhiteSpace(claim) || !int.TryParse(claim, out var employeeId))
        {
            return new CoordinatorAccessResult(false, 0, "Invalid employee token.", StatusCodes.Unauthorized);
        }

        var isCoordinator = await _employeeAuthRepository.IsActiveEmployeeWithDesignationAsync(
            employeeId,
            EmployeeDesignations.Coordinator,
            cancellationToken);

        if (!isCoordinator)
        {
            return new CoordinatorAccessResult(false, 0, "Coordinator access only.", StatusCodes.Forbidden);
        }

        return new CoordinatorAccessResult(true, employeeId, null, StatusCodes.Ok);
    }

    private static class StatusCodes
    {
        public const int Ok = 200;
        public const int Unauthorized = 401;
        public const int Forbidden = 403;
    }
}
