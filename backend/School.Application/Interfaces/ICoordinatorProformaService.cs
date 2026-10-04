using School.Application.DTOs;

namespace School.Application.Interfaces;

public interface ICoordinatorProformaService
{
    Task<CoordinatorProformaDayDto> GetMyDayAsync(int coordinatorEmployeeId, DateOnly reportDate, CancellationToken cancellationToken = default);
    Task<CoordinatorProformaDayDto> SaveMyDayAsync(int coordinatorEmployeeId, CoordinatorProformaSaveRequestDto request, CancellationToken cancellationToken = default);
    Task<CoordinatorProformaDayDto> SubmitMyDayAsync(int coordinatorEmployeeId, CoordinatorProformaSubmitRequestDto request, CancellationToken cancellationToken = default);

    Task<CoordinatorProformaLookupsDto> GetLookupsAsync(CancellationToken cancellationToken = default);

    Task<IReadOnlyList<CoordinatorProformaMonitorCampusDto>> GetMonitorCampusesAsync(CancellationToken cancellationToken = default);
    Task<CoordinatorProformaMonitorDayDto> GetMonitorDayAsync(DateOnly reportDate, string campusKey, CancellationToken cancellationToken = default);
    Task<CoordinatorProformaMonitorRowDto?> GetMonitorReportAsync(int reportId, string campusKey, CancellationToken cancellationToken = default);

    Task AcknowledgeAsync(int academicHeadEmployeeId, string campusKey, int reportId, CancellationToken cancellationToken = default);
    Task ApproveAsync(int academicHeadEmployeeId, string campusKey, int reportId, CancellationToken cancellationToken = default);
    Task ReturnAsync(int academicHeadEmployeeId, string campusKey, int reportId, string note, CancellationToken cancellationToken = default);
    Task AddHeadCommentAsync(int academicHeadEmployeeId, string campusKey, int reportId, string text, CancellationToken cancellationToken = default);
}
