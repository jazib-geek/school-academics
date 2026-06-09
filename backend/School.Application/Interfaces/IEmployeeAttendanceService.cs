using School.Application.DTOs;

namespace School.Application.Interfaces;

public interface IEmployeeAttendanceService
{
    Task<EmployeeAttendanceMonthlySheetDto> GetMonthlySheetAsync(
        int? year = null,
        int? month = null,
        CancellationToken cancellationToken = default);
}
