using School.Application.DTOs;

namespace School.Application.Interfaces;

public interface IEmployeeAuthService
{
    Task<EmployeeLoginResponseDto?> LoginAsync(EmployeeLoginRequestDto request);

    Task<EmployeeSessionDto?> GetSessionAsync(int employeeId, CancellationToken cancellationToken = default);

    Task ChangePasswordAsync(int employeeId, ChangeEmployeePasswordDto request, CancellationToken cancellationToken = default);
}
