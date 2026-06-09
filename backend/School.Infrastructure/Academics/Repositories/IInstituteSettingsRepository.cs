using School.Infrastructure.Academics.Entities;

namespace School.Infrastructure.Academics.Repositories;

public interface IInstituteSettingsRepository
{
    Task<List<InstituteSetting>> GetAllOrderedAsync(CancellationToken cancellationToken = default);
    Task<InstituteSetting?> GetFirstAsync(CancellationToken cancellationToken = default);
    Task<InstituteSetting?> GetByIdAsync(int id, CancellationToken cancellationToken = default);
    Task<InstituteSetting?> GetTrackedByIdAsync(int id, CancellationToken cancellationToken = default);
    Task<InstituteSetting> AddAsync(InstituteSetting entity, CancellationToken cancellationToken = default);
    Task UpdateAsync(InstituteSetting entity, CancellationToken cancellationToken = default);
    Task DeleteAsync(InstituteSetting entity, CancellationToken cancellationToken = default);
}
