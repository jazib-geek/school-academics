using School.Application.Academics.DTOs;

namespace School.Application.Academics.Interfaces;

public interface IAcademicInstituteSettingsService
{
    Task<List<InstituteSettingsDto>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<InstituteSettingsDto?> GetByIdAsync(int id, CancellationToken cancellationToken = default);
    Task<InstituteSettingsDto> UpsertAsync(UpsertInstituteSettingsRequestDto request, CancellationToken cancellationToken = default);
    Task<bool> DeleteAsync(int id, CancellationToken cancellationToken = default);
}
