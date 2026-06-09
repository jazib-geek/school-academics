using School.Application.DTOs;
using School.Application.Interfaces;
using School.Application.Common;
using School.Infrastructure.Repositories;

namespace School.Application.Services;

public class EmployeeAuthService : IEmployeeAuthService
{
    private readonly IEmployeeAuthRepository _employeeAuthRepository;
    private readonly ITokenService _tokenService;
    private readonly TenantContext _tenantContext;

    public EmployeeAuthService(
        IEmployeeAuthRepository employeeAuthRepository,
        ITokenService tokenService,
        TenantContext tenantContext)
    {
        _employeeAuthRepository = employeeAuthRepository;
        _tokenService = tokenService;
        _tenantContext = tenantContext;
    }

    public async Task<EmployeeLoginResponseDto?> LoginAsync(EmployeeLoginRequestDto request)
    {
        if (request.ID <= 0 || string.IsNullOrWhiteSpace(request.Password))
        {
            return null;
        }

        var employee = await _employeeAuthRepository.GetActiveEmployeeByCredentialsAsync(
            request.ID,
            request.Password.Trim());

        if (employee == null)
        {
            return null;
        }

        var token = _tokenService.GenerateToken(employee.ID, null, _tenantContext.Campus);

        return new EmployeeLoginResponseDto
        {
            ID = employee.ID,
            EmployeeName = employee.EmployeeName ?? string.Empty,
            Designation = employee.DesignationName,
            BranchID = employee.BranchID,
            IsCoordinator = employee.DesignationId == EmployeeDesignations.Coordinator,
            Token = token
        };
    }
}
