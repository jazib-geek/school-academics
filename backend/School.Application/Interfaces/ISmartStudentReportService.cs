using School.Application.DTOs;

namespace School.Application.Interfaces;

public interface ISmartStudentReportService
{
    Task<List<SmartFeeReportCatalogItemDto>> GetCatalogAsync();
    Task<StudentExecutiveSnapshotDto> GetExecutiveSnapshotAsync();
    Task<SmartFeeReportResultDto> RunAsync(string reportId, Dictionary<string, object?> parameters);
}
