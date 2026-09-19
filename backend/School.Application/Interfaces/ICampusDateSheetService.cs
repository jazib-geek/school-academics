using School.Application.DTOs;

namespace School.Application.Interfaces;

public interface ICampusDateSheetService
{
    Task<IReadOnlyList<CampusDateSheetListItemDto>> GetListAsync(CancellationToken cancellationToken = default);

    Task<CampusDateSheetDetailDto> GetByIdAsync(int id, CancellationToken cancellationToken = default);

    Task<CampusDateSheetPrintDto> GetPrintAsync(int id, CancellationToken cancellationToken = default);

    Task<CampusDateSheetDetailDto> CreateAsync(
        CampusDateSheetCreateDto request,
        CancellationToken cancellationToken = default);

    Task<CampusDateSheetDetailDto> UpdateAsync(
        int id,
        CampusDateSheetUpdateDto request,
        CancellationToken cancellationToken = default);

    Task<CampusDateSheetDetailDto> ReplaceClassesAsync(
        int id,
        CampusDateSheetReplaceClassesDto request,
        CancellationToken cancellationToken = default);

    Task<CampusDateSheetDetailDto> ReplaceDaysAsync(
        int id,
        CampusDateSheetReplaceDaysDto request,
        CancellationToken cancellationToken = default);

    Task<CampusDateSheetDetailDto> ReplaceEntriesAsync(
        int id,
        CampusDateSheetReplaceEntriesDto request,
        CancellationToken cancellationToken = default);

    Task DeleteAsync(int id, CancellationToken cancellationToken = default);
}
