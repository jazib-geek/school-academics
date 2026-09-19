using Microsoft.EntityFrameworkCore;
using School.Application.DTOs;
using School.Application.Interfaces;
using School.Infrastructure.Data;

namespace School.Application.Services;

public class SubjectService : ISubjectService
{
    private readonly AppDbContext _context;

    public SubjectService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<List<SubjectLookupDto>> GetSubjectsAsync()
    {
        return await _context.SubjectMasters
            .AsNoTracking()
            .Where(x => x.SubjectName != null && x.SubjectName != "")
            .OrderBy(x => x.SubjectName)
            .Select(x => new SubjectLookupDto
            {
                ID = x.ID,
                SubjectName = x.SubjectName!,
                SubjectShortName = x.ShortName!

            })
            .ToListAsync();
    }
}
