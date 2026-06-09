using Microsoft.EntityFrameworkCore;
using School.Infrastructure.Data;

namespace School.Infrastructure.Repositories;

public class CoordinatorStaffReadRepository : ICoordinatorStaffReadRepository
{
    private readonly AppDbContext _context;

    public CoordinatorStaffReadRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<IReadOnlyList<(int Id, string? EmployeeName)>> GetActiveEmployeesAsync(CancellationToken cancellationToken = default)
    {
        var rows = await _context.Employees
            .AsNoTracking()
            .Where(e => e.IsActive == true)
            .OrderBy(e => e.EmployeeName)
            .Select(e => new { e.ID, e.EmployeeName })
            .ToListAsync(cancellationToken);

        return rows.ConvertAll(x => (x.ID, x.EmployeeName));
    }
}
