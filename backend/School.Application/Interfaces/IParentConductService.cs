using School.Application.DTOs;

namespace School.Application.Interfaces;

public interface IParentConductService
{
    Task<ParentConductInboxDto> GetInboxAsync(int familyId, CancellationToken cancellationToken = default);

    Task<ParentConductUnreadCountDto> GetUnreadCountAsync(
        int familyId,
        int studentId,
        CancellationToken cancellationToken = default);

    Task<ParentConductMonthReportDto> GetMonthReportAsync(
        int familyId,
        int studentId,
        int month,
        int year,
        CancellationToken cancellationToken = default);

    Task AcknowledgeAsync(
        int familyId,
        ParentConductAcknowledgeRequestDto request,
        CancellationToken cancellationToken = default);

    Task<ParentConductAcknowledgeAllResultDto> AcknowledgeAllForStudentAsync(
        int familyId,
        int studentId,
        CancellationToken cancellationToken = default);
}
