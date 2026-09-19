using School.Application.DTOs;

namespace School.Application.Interfaces;

public interface IActivityLogService
{
    /// <summary>
    /// Stages an activity log row on the current DbContext. Caller must SaveChanges.
    /// </summary>
    Task WriteAsync(
        string activityType,
        string? entityType,
        int? entityId,
        string? entityLabel,
        int? userId,
        object? details,
        CancellationToken cancellationToken = default,
        string? performerDisplayName = null);

    Task<PagedResultDto<ActivityLogDto>> GetAsync(
        ActivityLogFilterDto filter,
        CancellationToken cancellationToken = default);

    Task<ActivityLogLookupDto> GetLookupsAsync(CancellationToken cancellationToken = default);
}
