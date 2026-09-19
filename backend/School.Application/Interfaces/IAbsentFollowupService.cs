using School.Application.DTOs;

namespace School.Application.Interfaces;

public interface IAbsentFollowupService
{
    Task<IReadOnlyList<AbsentFollowupReasonDto>> GetReasonsAsync(
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<AbsentFollowupRowDto>> GetByDateAsync(
        DateOnly date,
        CancellationToken cancellationToken = default);

    Task<AbsentFollowupSaveResultDto> UpsertAsync(
        AbsentFollowupUpsertDto request,
        string? updatedByName,
        CancellationToken cancellationToken = default);
}
