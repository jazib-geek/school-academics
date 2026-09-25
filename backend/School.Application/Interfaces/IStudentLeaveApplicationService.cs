using School.Application.DTOs;

namespace School.Application.Interfaces;

public interface IStudentLeaveApplicationService
{
    IReadOnlyList<StudentLeaveReasonOptionDto> GetReasonCatalog();

    Task<ParentLeaveSubmitResultDto> SubmitForFamilyAsync(
        int familyId,
        int studentId,
        ParentLeaveSubmitRequestDto request,
        CancellationToken cancellationToken = default);

    Task<ParentLeaveApplicationListDto> ListForFamilyStudentAsync(
        int familyId,
        int studentId,
        CancellationToken cancellationToken = default);

    Task<CampusLeaveApplicationListDto> ListForCampusAsync(
        string? status,
        DateOnly? dateFrom,
        DateOnly? dateTo,
        string? search,
        CancellationToken cancellationToken = default);

    Task<CampusLeaveDecisionResultDto> ApproveAsync(
        int id,
        string reviewerUserKey,
        CampusLeaveDecisionRequestDto? request,
        CancellationToken cancellationToken = default);

    Task<CampusLeaveDecisionResultDto> RejectAsync(
        int id,
        string reviewerUserKey,
        CampusLeaveDecisionRequestDto? request,
        CancellationToken cancellationToken = default);
}
