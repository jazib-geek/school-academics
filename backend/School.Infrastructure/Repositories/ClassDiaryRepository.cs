using Microsoft.EntityFrameworkCore;
using School.Infrastructure.Data;
using School.Infrastructure.Entities;

namespace School.Infrastructure.Repositories;

public class ClassDiaryRepository : IClassDiaryRepository
{
    private readonly AppDbContext _context;

    public ClassDiaryRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<IReadOnlyList<ClassDiary>> GetByClassAndDateAsync(
        int classId,
        DateOnly date,
        CancellationToken cancellationToken = default) =>
        await _context.ClassDiaries
            .Include(x => x.Class)
            .Where(x => x.ClassID == classId && x.Date == date)
            .OrderBy(x => x.ID)
            .ToListAsync(cancellationToken);

    public async Task<IReadOnlyList<ClassDiary>> GetByClassAsync(
        int classId,
        CancellationToken cancellationToken = default) =>
        await _context.ClassDiaries
            .Where(x => x.ClassID == classId)
            .ToListAsync(cancellationToken);

    public async Task<int?> GetClassIdForStudentAsync(
        int studentId,
        CancellationToken cancellationToken = default) =>
        await (
            from student in _context.Students.AsNoTracking()
            where student.Reg_Id == studentId && student.ClassCompositeID != null
            join section in _context.Sections.AsNoTracking()
                on student.ClassCompositeID equals section.ID
            where section.Class_ID != null
            select section.Class_ID
        ).FirstOrDefaultAsync(cancellationToken);

    public async Task<IReadOnlyList<ClassDiary>> GetByClassWithClassAsync(
        int classId,
        CancellationToken cancellationToken = default) =>
        await _context.ClassDiaries
            .AsNoTracking()
            .Include(x => x.Class)
            .Where(x => x.ClassID == classId && x.Date != null && x.ImgURL != null && x.ImgURL != "")
            .OrderByDescending(x => x.Date)
            .ThenBy(x => x.ID)
            .ToListAsync(cancellationToken);

    public async Task<IReadOnlyList<ClassDiary>> GetAllWithClassAsync(
        CancellationToken cancellationToken = default) =>
        await _context.ClassDiaries
            .AsNoTracking()
            .Include(x => x.Class)
            .Where(x => x.ClassID != null && x.Date != null && x.ImgURL != null && x.ImgURL != "")
            .OrderByDescending(x => x.Date)
            .ThenBy(x => x.Class!.sort_by ?? int.MaxValue)
            .ThenBy(x => x.Class!.Class_Name)
            .ThenBy(x => x.ID)
            .ToListAsync(cancellationToken);

    public async Task AddRangeAsync(IEnumerable<ClassDiary> entities, CancellationToken cancellationToken = default) =>
        await _context.ClassDiaries.AddRangeAsync(entities, cancellationToken);

    public void RemoveRange(IEnumerable<ClassDiary> entities) =>
        _context.ClassDiaries.RemoveRange(entities);

    public Task<bool> ClassExistsAsync(int classId, CancellationToken cancellationToken = default) =>
        _context.Classes.AsNoTracking().AnyAsync(x => x.Class_ID == classId, cancellationToken);

    public async Task<string?> GetClassNameAsync(int classId, CancellationToken cancellationToken = default)
    {
        var row = await _context.Classes
            .AsNoTracking()
            .Where(x => x.Class_ID == classId)
            .Select(x => x.Class_Name)
            .FirstOrDefaultAsync(cancellationToken);

        return string.IsNullOrWhiteSpace(row) ? null : row.Trim();
    }

    public async Task<string?> GetEmployeeNameAsync(int employeeId, CancellationToken cancellationToken = default)
    {
        var row = await _context.Employees
            .AsNoTracking()
            .Where(x => x.ID == employeeId)
            .Select(x => x.EmployeeName)
            .FirstOrDefaultAsync(cancellationToken);

        return string.IsNullOrWhiteSpace(row) ? null : row.Trim();
    }

    public Task SaveChangesAsync(CancellationToken cancellationToken = default) =>
        _context.SaveChangesAsync(cancellationToken);
}
