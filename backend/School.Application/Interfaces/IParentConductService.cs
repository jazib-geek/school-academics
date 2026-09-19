using School.Application.DTOs;

namespace School.Application.Interfaces;

public interface IParentConductService
{
    Task<ParentConductInboxDto> GetInboxAsync(int familyDbId, int familyId, CancellationToken cancellationToken = default);

    Task<ParentConductMonthReportDto> GetMonthReportAsync(
        int familyDbId,
        int familyId,
        int studentId,
        int month,
        int year,
        CancellationToken cancellationToken = default);

    Task AcknowledgeAsync(
        int familyDbId,
        int familyId,
        ParentConductAcknowledgeRequestDto request,
        CancellationToken cancellationToken = default);
}
