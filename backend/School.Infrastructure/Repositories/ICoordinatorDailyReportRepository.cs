using School.Infrastructure.Entities;

namespace School.Infrastructure.Repositories;

public interface ICoordinatorDailyReportRepository
{
    Task<CoordinatorDailyReport?> GetByCoordinatorAndDateAsync(
        int coordinatorEmployeeId,
        DateOnly reportDate,
        bool asNoTracking,
        bool includeChildren,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<CoordinatorDailyReport>> GetAllForReportDateAsync(
        DateOnly reportDate,
        CancellationToken cancellationToken = default);

    Task<CoordinatorDailyReport> GetOrCreateTrackedAsync(
        int coordinatorEmployeeId,
        DateOnly reportDate,
        CancellationToken cancellationToken = default);

    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}
