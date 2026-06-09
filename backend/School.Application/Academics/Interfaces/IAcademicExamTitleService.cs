using School.Application.Academics.DTOs;

namespace School.Application.Academics.Interfaces;

public interface IAcademicExamTitleService
{
    Task<List<ExamTitleDto>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<ExamTitleDto?> GetByIdAsync(int id, CancellationToken cancellationToken = default);
    Task<ExamTitleDto> UpsertAsync(UpsertExamTitleRequestDto request, CancellationToken cancellationToken = default);
    Task<bool> DeleteAsync(int id, CancellationToken cancellationToken = default);
}
