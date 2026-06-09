using School.Application.DTOs;

namespace School.Application.Interfaces;

public interface ICoordinatorDailyReportService
{
    Task<CoordinatorDailyReportDto?> GetReportAsync(int coordinatorEmployeeId, DateOnly reportDate, CancellationToken cancellationToken = default);

    Task<CoordinatorHeadOfficeDayBundleDto> GetHeadOfficeDayBundleAsync(int coordinatorEmployeeId, DateOnly reportDate, CancellationToken cancellationToken = default);

    Task<CoordinatorDailyReportCampusMonitorDto> GetCampusDailyReportingMonitorAsync(DateOnly reportDate, CancellationToken cancellationToken = default);

    Task<CoordinatorDailyReportDto> UpsertArrivalAsync(int coordinatorEmployeeId, DateOnly reportDate, TimeOnly? arrivalTimeLocal, CancellationToken cancellationToken = default);

    Task<CoordinatorDailyReportDto> UpsertAssemblyAsync(int coordinatorEmployeeId, DateOnly reportDate, CoordinatorAssemblyUpsertDto dto, CancellationToken cancellationToken = default);

    Task<CoordinatorDailyReportDto> ReplaceModDutiesAsync(int coordinatorEmployeeId, DateOnly reportDate, IReadOnlyList<CoordinatorModDutyInputDto> duties, CancellationToken cancellationToken = default);

    Task<CoordinatorDailyReportDto> ReplaceAbsentTeachersAsync(int coordinatorEmployeeId, DateOnly reportDate, IReadOnlyList<CoordinatorAbsentTeacherInputDto> rows, CancellationToken cancellationToken = default);

    Task<CoordinatorDailyReportDto> ReplaceWorkingReportLinesAsync(int coordinatorEmployeeId, DateOnly reportDate, IReadOnlyList<CoordinatorWorkingReportLineInputDto> lines, CancellationToken cancellationToken = default);
}
