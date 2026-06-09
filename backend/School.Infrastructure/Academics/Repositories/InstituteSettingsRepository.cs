using Microsoft.EntityFrameworkCore;
using School.Infrastructure.Academics.Data;
using School.Infrastructure.Academics.Entities;

namespace School.Infrastructure.Academics.Repositories;

public class InstituteSettingsRepository : IInstituteSettingsRepository
{
    private readonly AcademicContext _context;

    public InstituteSettingsRepository(AcademicContext context)
    {
        _context = context;
    }

    public async Task<List<InstituteSetting>> GetAllOrderedAsync(CancellationToken cancellationToken = default)
    {
        return await _context.InstituteSettings
            .AsNoTracking()
            .OrderBy(x => x.Id)
            .ToListAsync(cancellationToken);
    }

    public async Task<InstituteSetting?> GetFirstAsync(CancellationToken cancellationToken = default)
    {
        return await _context.InstituteSettings
            .AsNoTracking()
            .OrderBy(x => x.Id)
            .FirstOrDefaultAsync(cancellationToken);
    }

    public async Task<InstituteSetting?> GetByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        return await _context.InstituteSettings
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
    }

    public async Task<InstituteSetting?> GetTrackedByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        return await _context.InstituteSettings
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
    }

    public async Task<InstituteSetting> AddAsync(InstituteSetting entity, CancellationToken cancellationToken = default)
    {
        _context.InstituteSettings.Add(entity);
        await _context.SaveChangesAsync(cancellationToken);
        return entity;
    }

    public async Task UpdateAsync(InstituteSetting entity, CancellationToken cancellationToken = default)
    {
        _context.InstituteSettings.Update(entity);
        await _context.SaveChangesAsync(cancellationToken);
    }

    public async Task DeleteAsync(InstituteSetting entity, CancellationToken cancellationToken = default)
    {
        _context.InstituteSettings.Remove(entity);
        await _context.SaveChangesAsync(cancellationToken);
    }
}
