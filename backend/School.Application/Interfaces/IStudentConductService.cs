using School.Application.DTOs;

namespace School.Application.Interfaces;

public interface IStudentConductService
{
    Task<IReadOnlyList<StudentConductTypeDto>> GetCatalogAsync(CancellationToken cancellationToken = default);
    Task<IReadOnlyList<StudentConductTypeDto>> GetTypesAsync(CancellationToken cancellationToken = default);
    Task<StudentConductTypeDto> GetTypeAsync(int id, CancellationToken cancellationToken = default);
    Task<StudentConductTypeDto> CreateTypeAsync(StudentConductTypeUpsertDto request, CancellationToken cancellationToken = default);
    Task<StudentConductTypeDto> UpdateTypeAsync(int id, StudentConductTypeUpsertDto request, CancellationToken cancellationToken = default);
    Task DeleteTypeAsync(int id, CancellationToken cancellationToken = default);

    Task<StudentConductClassSheetDto> GetClassSheetAsync(
        DateOnly date,
        int classSectionCompositeId,
        CancellationToken cancellationToken = default);

    Task<StudentConductNoteDto> UpsertNoteAsync(
        StudentConductNoteUpsertDto request,
        int? recordedByEmployeeId,
        string? recordedByName,
        CancellationToken cancellationToken = default);

    Task DeleteNoteAsync(int id, CancellationToken cancellationToken = default);

    Task<StudentConductHistoryDto> GetStudentHistoryAsync(
        int studentId,
        int month,
        int year,
        CancellationToken cancellationToken = default);

    Task<StudentConductDayReportDto> GetDayReportAsync(
        DateOnly date,
        CancellationToken cancellationToken = default);
}
