using School.Application.DTOs;

namespace School.Application.Interfaces;

public interface ISmartAttendanceReportService
{
    Task<List<SmartFeeReportCatalogItemDto>> GetCatalogAsync();
    Task<AttendanceExecutiveSnapshotDto> GetExecutiveSnapshotAsync();
    Task<SmartFeeReportResultDto> RunAsync(string reportId, Dictionary<string, object?> parameters);
}
