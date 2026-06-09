using School.Infrastructure.Academics.Entities;

namespace School.Infrastructure.Academics.Repositories;

public interface IExamTitleRepository
{
    Task<List<ExamTitle>> GetAllOrderedAsync(CancellationToken cancellationToken = default);
    Task<ExamTitle?> GetByIdAsync(int id, CancellationToken cancellationToken = default);
    Task<ExamTitle?> GetTrackedByIdAsync(int id, CancellationToken cancellationToken = default);
    Task<bool> ExistsTitleAsync(string title, int? excludeId, CancellationToken cancellationToken = default);
    Task<bool> IsReferencedByPaperAsync(int examTitleId, CancellationToken cancellationToken = default);
    Task<ExamTitle> AddAsync(ExamTitle entity, CancellationToken cancellationToken = default);
    Task UpdateAsync(ExamTitle entity, CancellationToken cancellationToken = default);
    Task DeleteAsync(ExamTitle entity, CancellationToken cancellationToken = default);
}
