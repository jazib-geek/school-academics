using School.Application.DTOs;

namespace School.Application.Interfaces;

public interface ICampusTimeTableService
{
    Task<IReadOnlyList<CampusTimeTableListItemDto>> GetListAsync(CancellationToken cancellationToken = default);

    Task<CampusTimeTableDetailDto> GetByIdAsync(int id, CancellationToken cancellationToken = default);

    Task<EmployeeMyTimetableDto> GetMyTimetableAsync(int employeeId, CancellationToken cancellationToken = default);

    Task<CampusTimeTablePrintDto> GetPrintAsync(int id, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<CampusTimeTableAllocationCandidateDto>> GetAllocationCandidatesAsync(
        int id,
        CancellationToken cancellationToken = default);

    Task<CampusTimeTableDetailDto> CreateAsync(
        CampusTimeTableCreateDto request,
        CancellationToken cancellationToken = default);

    Task<CampusTimeTableDetailDto> UpdateAsync(
        int id,
        CampusTimeTableUpdateDto request,
        CancellationToken cancellationToken = default);

    Task SetDefaultAsync(int id, CancellationToken cancellationToken = default);

    Task ClearDefaultAsync(int id, CancellationToken cancellationToken = default);

    Task<CampusTimeTableDetailDto> ReplacePeriodsAsync(
        int id,
        CampusTimeTableReplacePeriodsDto request,
        CancellationToken cancellationToken = default);

    Task<CampusTimeTableDetailDto> ReplaceMembersAsync(
        int id,
        CampusTimeTableReplaceMembersDto request,
        CancellationToken cancellationToken = default);

    Task<CampusTimeTableDetailDto> ReplaceSlotsAsync(
        int id,
        CampusTimeTableReplaceSlotsDto request,
        CancellationToken cancellationToken = default);

    Task<CampusTimeTableDetailDto> SeedFromAllocationAsync(int id, CancellationToken cancellationToken = default);

    Task DeleteAsync(int id, CancellationToken cancellationToken = default);
}
