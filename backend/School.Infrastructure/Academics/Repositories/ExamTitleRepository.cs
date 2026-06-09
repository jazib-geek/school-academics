using Microsoft.EntityFrameworkCore;
using School.Infrastructure.Academics.Data;
using School.Infrastructure.Academics.Entities;

namespace School.Infrastructure.Academics.Repositories;

public class ExamTitleRepository : IExamTitleRepository
{
    private readonly AcademicContext _context;

    public ExamTitleRepository(AcademicContext context)
    {
        _context = context;
    }

    public async Task<List<ExamTitle>> GetAllOrderedAsync(CancellationToken cancellationToken = default)
    {
        return await _context.ExamTitles
            .AsNoTracking()
            .OrderBy(x => x.Title)
            .ToListAsync(cancellationToken);
    }

    public async Task<ExamTitle?> GetByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        return await _context.ExamTitles
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
    }

    public async Task<ExamTitle?> GetTrackedByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        return await _context.ExamTitles
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
    }

    public async Task<bool> ExistsTitleAsync(string title, int? excludeId, CancellationToken cancellationToken = default)
    {
        var query = _context.ExamTitles.AsNoTracking().Where(x => x.Title == title);
        if (excludeId.HasValue && excludeId.Value > 0)
        {
            query = query.Where(x => x.Id != excludeId.Value);
        }

        return await query.AnyAsync(cancellationToken);
    }

    public async Task<bool> IsReferencedByPaperAsync(int examTitleId, CancellationToken cancellationToken = default)
    {
        return await _context.QuestionPapers
            .AsNoTracking()
            .AnyAsync(x => x.ExamTitleId == examTitleId, cancellationToken);
    }

    public async Task<ExamTitle> AddAsync(ExamTitle entity, CancellationToken cancellationToken = default)
    {
        _context.ExamTitles.Add(entity);
        await _context.SaveChangesAsync(cancellationToken);
        return entity;
    }

    public async Task UpdateAsync(ExamTitle entity, CancellationToken cancellationToken = default)
    {
        _context.ExamTitles.Update(entity);
        await _context.SaveChangesAsync(cancellationToken);
    }

    public async Task DeleteAsync(ExamTitle entity, CancellationToken cancellationToken = default)
    {
        _context.ExamTitles.Remove(entity);
        await _context.SaveChangesAsync(cancellationToken);
    }
}
