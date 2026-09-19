using School.Application.DTOs;

namespace School.Application.Interfaces;

public interface IDesignationService
{
    Task<IReadOnlyList<DesignationDto>> GetDesignationsAsync(CancellationToken cancellationToken = default);
    Task<DesignationDto> GetDesignationAsync(int id, CancellationToken cancellationToken = default);
    Task<DesignationDto> CreateDesignationAsync(DesignationUpsertDto request, CancellationToken cancellationToken = default);
    Task<DesignationDto> UpdateDesignationAsync(int id, DesignationUpsertDto request, CancellationToken cancellationToken = default);
    Task SetDesignationStatusAsync(int id, bool isActive, CancellationToken cancellationToken = default);
    Task DeleteDesignationAsync(int id, CancellationToken cancellationToken = default);
}
