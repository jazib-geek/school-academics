using School.Application.DTOs;

namespace School.Application.Interfaces;

/// <summary>
/// Persists campus notifications and fans them out to live SSE subscribers.
/// </summary>
public interface ICampusNotificationService
{
    Task PublishAsync(CampusNotificationDto notification, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<CampusNotificationDto>> GetRecentForUserAsync(
        int userId,
        int take = 200,
        CancellationToken cancellationToken = default);

    Task MarkAllReadAsync(int userId, CancellationToken cancellationToken = default);
}
