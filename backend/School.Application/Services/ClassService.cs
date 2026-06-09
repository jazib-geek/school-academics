using Microsoft.EntityFrameworkCore;
using School.Application.DTOs;
using School.Application.Interfaces;
using School.Infrastructure.Data;

namespace School.Application.Services;

public class ClassService : IClassService
{
    private readonly AppDbContext _context;

    public ClassService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<List<ClassLookupDto>> GetClassesAsync()
    {
        return await _context.Sections
            .AsNoTracking()
            .Where(x => x.ClassName != null && x.ClassName != "")
            .GroupBy(x => new { x.ID, x.ClassName })
            .Select(g => new ClassLookupDto
            {
                ID = g.Key.ID,
                ClassName = g.Key.ClassName!
            })
            .OrderBy(x => x.ClassName)
            .ToListAsync();
    }

    public async Task<List<ClassLookupDto>> GetClassLevelsAsync()
    {
        return await _context.Classes
            .AsNoTracking()
            .Where(x => x.IsActive != false && x.Class_Name != null && x.Class_Name != "")
            .OrderBy(x => x.sort_by ?? int.MaxValue)
            .ThenBy(x => x.Class_Name)
            .Select(x => new ClassLookupDto
            {
                ID = x.Class_ID,
                ClassName = x.Class_Name!,
            })
            .ToListAsync();
    }
}
