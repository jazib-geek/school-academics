using School.Application.DTOs;
using School.Infrastructure.Data;

namespace School.Application.Interfaces;

public interface ICampusProfileService
{
    Task<CampusProfileDto> GetAsync(CancellationToken cancellationToken = default);

    Task<CampusProfileDto> GetFromContextAsync(
        AppDbContext context,
        CancellationToken cancellationToken = default);

    Task<CampusProfileDto> UpdateAsync(
        UpdateCampusProfileDto request,
        CancellationToken cancellationToken = default);
}
