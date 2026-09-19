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
            .Where(x => x.ClassName != null && x.ClassName != "" && x.IsActive != false)
            .OrderBy(x => x.ClassName)
            .Select(x => new ClassLookupDto
            {
                Id = x.ID,
                ClassName = x.ClassName!,
                Fee = x.Fee,
                Branch = x.Branch,
                BranchId = x.BranchID
            })
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
                Id = x.Class_ID,
                ClassName = x.Class_Name!,
            })
            .ToListAsync();
    }
}
