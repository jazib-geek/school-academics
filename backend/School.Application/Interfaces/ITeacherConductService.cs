using School.Application.DTOs;

namespace School.Application.Interfaces;

public interface ITeacherConductService
{
    Task<IReadOnlyList<TeacherConductTypeDto>> GetCatalogAsync(CancellationToken cancellationToken = default);
    Task<IReadOnlyList<TeacherConductTypeDto>> GetTypesAsync(CancellationToken cancellationToken = default);
    Task<TeacherConductTypeDto> GetTypeAsync(int id, CancellationToken cancellationToken = default);
    Task<TeacherConductTypeDto> CreateTypeAsync(TeacherConductTypeUpsertDto request, CancellationToken cancellationToken = default);
    Task<TeacherConductTypeDto> UpdateTypeAsync(int id, TeacherConductTypeUpsertDto request, CancellationToken cancellationToken = default);
    Task DeleteTypeAsync(int id, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<TeacherConductEmployeeLookupDto>> SearchEmployeesAsync(
        string search,
        CancellationToken cancellationToken = default);

    Task<TeacherConductNoteDto> UpsertNoteAsync(
        TeacherConductNoteUpsertDto request,
        int? recordedByEmployeeId,
        string? recordedByName,
        CancellationToken cancellationToken = default);

    Task DeleteNoteAsync(int id, CancellationToken cancellationToken = default);

    Task<TeacherConductHistoryDto> GetEmployeeHistoryAsync(
        int subjectEmployeeId,
        int month,
        int year,
        CancellationToken cancellationToken = default);

    Task<TeacherConductDayReportDto> GetDayReportAsync(
        DateOnly date,
        DateOnly? dateTo = null,
        int? subjectEmployeeId = null,
        int? recordedByEmployeeId = null,
        CancellationToken cancellationToken = default);
}
