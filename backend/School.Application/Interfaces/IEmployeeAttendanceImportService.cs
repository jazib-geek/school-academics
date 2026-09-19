using School.Application.DTOs;

namespace School.Application.Interfaces;

public interface IEmployeeAttendanceImportService
{
    Task<EmployeeAttendanceImportPreviewDto> PreviewAsync(
        Stream file,
        string fileName,
        CancellationToken cancellationToken = default);

    Task<EmployeeAttendanceImportResultDto> ImportAsync(
        Stream file,
        string fileName,
        EmployeeAttendanceImportRulesDto rules,
        int? importedByUserId,
        CancellationToken cancellationToken = default);
}
