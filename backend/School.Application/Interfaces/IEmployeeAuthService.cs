using School.Application.DTOs;

namespace School.Application.Interfaces;

public interface IEmployeeAuthService
{
    Task<EmployeeLoginResponseDto?> LoginAsync(EmployeeLoginRequestDto request);
}
