using School.Application.DTOs;

namespace School.Application.Interfaces;

public interface IEmployeeAttendanceChangeRequestService
{
    Task<EmployeeAttendanceChangeRequestSubmitResultDto> SubmitAsync(
        SubmitEmployeeAttendanceChangeRequestDto request,
        string submitterUserKey,
        int? submitterUserId,
        CancellationToken cancellationToken = default);

    Task<EmployeeAttendanceChangeRequestListDto> ListAsync(
        DateOnly? date,
        string? status,
        string? submitterUserKey,
        bool restrictToSubmitter,
        CancellationToken cancellationToken = default);

    Task<EmployeeAttendanceChangeRequestDecisionResultDto> ApproveAsync(
        int id,
        string reviewerUserKey,
        int? reviewerUserId,
        CancellationToken cancellationToken = default);

    Task<EmployeeAttendanceChangeRequestDecisionResultDto> RejectAsync(
        int id,
        string reviewerUserKey,
        int? reviewerUserId,
        EmployeeAttendanceChangeRequestDecisionRequestDto? request,
        CancellationToken cancellationToken = default);
}
