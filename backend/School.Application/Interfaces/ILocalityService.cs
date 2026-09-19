using School.Application.DTOs;

namespace School.Application.Interfaces;

public interface ILocalityService
{
    Task<IReadOnlyList<LocalityDto>> GetLocalitiesAsync(CancellationToken cancellationToken = default);
    Task<LocalityDto> GetLocalityAsync(int id, CancellationToken cancellationToken = default);
    Task<LocalityDto> CreateLocalityAsync(LocalityUpsertDto request, CancellationToken cancellationToken = default);
    Task<LocalityDto> UpdateLocalityAsync(int id, LocalityUpsertDto request, CancellationToken cancellationToken = default);
    Task SetLocalityStatusAsync(int id, bool isActive, CancellationToken cancellationToken = default);
}
