using School.Application.DTOs;

namespace School.Application.Interfaces;

public interface IEmployeeService
{
    Task<PagedResultDto<EmployeeListItemDto>> GetEmployeesAsync(EmployeeListFilterDto filter, CancellationToken cancellationToken = default);
    Task<EmployeeDetailDto> GetEmployeeAsync(int id, CancellationToken cancellationToken = default);
    Task<EmployeeLookupDataDto> GetLookupDataAsync(CancellationToken cancellationToken = default);
    Task<EmployeeDetailDto> CreateEmployeeAsync(EmployeeUpsertDto request, CancellationToken cancellationToken = default);
    Task<EmployeeDetailDto> UpdateEmployeeAsync(int id, EmployeeUpsertDto request, CancellationToken cancellationToken = default);
    Task SetEmployeeStatusAsync(int id, bool isActive, CancellationToken cancellationToken = default);
    Task<EmployeeByThumbDto> GetEmployeeByThumbIdAsync(string thumbId, CancellationToken cancellationToken = default);
    Task<BiometricEnrollResponseDto> EnrollFingerprintAsync(BiometricEnrollRequestDto request, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<BiometricTemplateDto>> GetEnrolledFingerprintTemplatesAsync(CancellationToken cancellationToken = default);
}
