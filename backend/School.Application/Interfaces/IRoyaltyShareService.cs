using School.Application.DTOs;

namespace School.Application.Interfaces;

public interface IRoyaltyShareService
{
    Task<RoyaltyShareMetaDto> GetMetaAsync(CancellationToken cancellationToken = default);

    Task<RoyaltyShareMonthDto> GetMonthAsync(int year, int month, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<RoyaltyShareHistoryItemDto>> GetHistoryAsync(
        int limit = 24,
        CancellationToken cancellationToken = default);

    Task<RoyaltyShareMonthDto> CloseMonthAsync(
        int year,
        int month,
        int closedByUserId,
        string? closedByUserName,
        string? entryUser,
        CancellationToken cancellationToken = default);
}
