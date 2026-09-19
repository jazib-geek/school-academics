using School.Application.DTOs;

namespace School.Application.Interfaces;

public interface ISmartFeeReportService
{
    Task<List<SmartFeeReportCatalogItemDto>> GetCatalogAsync();
    Task<FeeExecutiveSnapshotDto> GetExecutiveSnapshotAsync();
    Task<SmartFeeReportResultDto> RunAsync(string reportId, Dictionary<string, object?> parameters);
}
