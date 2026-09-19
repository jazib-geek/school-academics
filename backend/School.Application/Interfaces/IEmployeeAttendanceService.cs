using School.Application.DTOs;

namespace School.Application.Interfaces;

public interface IEmployeeAttendanceService
{
    Task<EmployeeAttendanceLiveDayDto> GetLiveDayAsync(
        DateTime? date = null,
        CancellationToken cancellationToken = default);

    Task<EmployeeAttendanceMonthlySheetDto> GetMonthlySheetAsync(
        int? year = null,
        int? month = null,
        CancellationToken cancellationToken = default);

    Task<EmployeeMyAttendanceDto> GetMyAttendanceAsync(
        int employeeId,
        int? year = null,
        int? month = null,
        CancellationToken cancellationToken = default);

    Task<BiometricMarkAttendanceResponseDto> MarkBiometricAttendanceAsync(
        BiometricMarkAttendanceRequestDto request,
        CancellationToken cancellationToken = default);

    Task<EmployeeAttendanceManageDayDto> GetManageDayAsync(
        DateTime? date = null,
        CancellationToken cancellationToken = default);

    Task<EmployeeAttendanceMutationResultDto> EditAttendanceAsync(
        int attendanceId,
        EditEmployeeAttendanceRequestDto request,
        int? editedByUserId,
        CancellationToken cancellationToken = default);

    Task<DeleteEmployeeAttendanceResultDto> DeleteAttendanceAsync(
        int attendanceId,
        int? editedByUserId,
        CancellationToken cancellationToken = default);

    Task<EmployeeAttendanceMutationResultDto> MarkPresentAsync(
        MarkEmployeePresentRequestDto request,
        int? editedByUserId,
        CancellationToken cancellationToken = default);

    Task<BackfillEmployeeAttendanceResultDto> BackfillAttendanceAsync(
        BackfillEmployeeAttendanceRequestDto request,
        int? editedByUserId,
        CancellationToken cancellationToken = default);

    Task<BackfillEmployeeAttendanceExistingDto> GetBackfillExistingAsync(
        int employeeId,
        DateTime from,
        DateTime to,
        CancellationToken cancellationToken = default);

    Task<MarkEmployeeHolidayResultDto> MarkDayAsHolidayAsync(
        MarkEmployeeHolidayRequestDto request,
        int? editedByUserId,
        CancellationToken cancellationToken = default);

    Task<RecalculateDutyTimesResultDto> RecalculateDutyTimesAsync(
        RecalculateDutyTimesRequestDto request,
        int? editedByUserId,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<ActivityLogDto>> GetAttendanceActivityAsync(
        int attendanceId,
        CancellationToken cancellationToken = default);
}