using School.Application.DTOs;

namespace School.Application.Interfaces;

public interface ISmartExamReportService
{
    Task<List<SmartFeeReportCatalogItemDto>> GetCatalogAsync();
    Task<ExamExecutiveSnapshotDto> GetExecutiveSnapshotAsync();
    Task<IReadOnlyList<ExamAwardListSubjectColumnDto>> GetClassSubjectsAsync(int sectionId);
    Task<SmartFeeReportResultDto> RunAsync(string reportId, Dictionary<string, object?> parameters);
}
