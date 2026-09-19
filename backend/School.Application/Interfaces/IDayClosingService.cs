using School.Application.DTOs;

namespace School.Application.Interfaces;

public interface IDayClosingService
{
    Task<DayClosingPreviewDto> GetPreviewAsync(DateOnly closingDate, CancellationToken cancellationToken = default);

    Task<DayClosingDto> CloseDayAsync(
        CloseDayRequestDto request,
        string? entryUser,
        CancellationToken cancellationToken = default);
}
