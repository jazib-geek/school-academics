using School.Application.DTOs;

namespace School.Application.Interfaces;

public interface ICampusSettingsService
{
    Task<IReadOnlyList<CampusClassDto>> GetClassesAsync(CancellationToken cancellationToken = default);
    Task<CampusClassDto> CreateClassAsync(CampusClassUpsertDto request, CancellationToken cancellationToken = default);
    Task<CampusClassDto> UpdateClassAsync(int id, CampusClassUpsertDto request, CancellationToken cancellationToken = default);
    Task SetClassStatusAsync(int id, bool isActive, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<SectionColorDto>> GetSectionColorsAsync(CancellationToken cancellationToken = default);
    Task<SectionColorDto> CreateSectionColorAsync(SectionColorUpsertDto request, CancellationToken cancellationToken = default);
    Task<SectionColorDto> UpdateSectionColorAsync(int id, SectionColorUpsertDto request, CancellationToken cancellationToken = default);
    Task SetSectionColorStatusAsync(int id, bool isActive, CancellationToken cancellationToken = default);
    Task DeleteSectionColorAsync(int id, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<CampusSectionDto>> GetSectionsAsync(CancellationToken cancellationToken = default);
    Task<CampusSectionDto> CreateSectionAsync(CampusSectionUpsertDto request, CancellationToken cancellationToken = default);
    Task<CampusSectionDto> UpdateSectionAsync(int id, CampusSectionUpsertDto request, CancellationToken cancellationToken = default);
    Task SetSectionStatusAsync(int id, bool isActive, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<OccupationDto>> GetOccupationsAsync(CancellationToken cancellationToken = default);
    Task<OccupationDto> CreateOccupationAsync(OccupationUpsertDto request, CancellationToken cancellationToken = default);
    Task<OccupationDto> UpdateOccupationAsync(int id, OccupationUpsertDto request, CancellationToken cancellationToken = default);
    Task SetOccupationStatusAsync(int id, bool isActive, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<DegreeLookupDto>> GetDegreesAsync(CancellationToken cancellationToken = default);
    Task<DegreeLookupDto> CreateDegreeAsync(DegreeLookupUpsertDto request, CancellationToken cancellationToken = default);
    Task<DegreeLookupDto> UpdateDegreeAsync(int id, DegreeLookupUpsertDto request, CancellationToken cancellationToken = default);
    Task SetDegreeStatusAsync(int id, bool isActive, CancellationToken cancellationToken = default);
}
