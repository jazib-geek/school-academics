using School.Application.DTOs;

namespace School.Application.Interfaces;

public interface IDisciplineService
{
    Task<DisciplineDayDto> GetMyDayAsync(int employeeId, DateOnly date, CancellationToken cancellationToken = default);
    Task<DisciplineDayDto> SaveRoundAsync(int employeeId, DisciplineRoundSaveDto request, CancellationToken cancellationToken = default);
    Task<DisciplineDayDto> SaveFindingAsync(int employeeId, string employeeName, DisciplineFindingSaveDto request, CancellationToken cancellationToken = default);
    Task<DisciplineDayDto> DeleteFindingAsync(int employeeId, string employeeName, int findingId, CancellationToken cancellationToken = default);
    Task<DisciplineDayDto> SubmitDayReportAsync(int employeeId, string employeeName, DisciplineDayReportSaveDto request, CancellationToken cancellationToken = default);
    Task<DisciplineCampusDayDto> GetCampusDayAsync(DateOnly date, CancellationToken cancellationToken = default);
}
