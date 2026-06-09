using Microsoft.EntityFrameworkCore;
using School.Infrastructure.Data;
using School.Infrastructure.Entities;

namespace School.Infrastructure.Repositories;

public class EmployeeAttendanceRepository : IEmployeeAttendanceRepository
{
    private readonly AppDbContext _context;

    public EmployeeAttendanceRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<IReadOnlyList<Employee>> GetActiveEmployeesOrderedAsync(CancellationToken cancellationToken = default)
    {
        var rows = await _context.Employees
            .AsNoTracking()
            .Where(e => e.IsActive == true)
            .OrderBy(e => e.EmployeeName ?? string.Empty)
            .ThenBy(e => e.ID)
            .ToListAsync(cancellationToken);

        return rows;
    }

    public async Task<IReadOnlyList<EmployeeAttendance>> GetAttendanceRowsForMonthAsync(
        int year,
        int month,
        CancellationToken cancellationToken = default)
    {
        var monthStart = new DateTime(year, month, 1);
        var monthEnd = monthStart.AddMonths(1);

        var rows = await _context.EmployeeAttendances
            .AsNoTracking()
            .Where(a =>
                a.EmpID != null &&
                a.Date.HasValue &&
                a.Date.Value >= monthStart &&
                a.Date.Value < monthEnd)
            .OrderBy(a => a.EmpID)
            .ThenBy(a => a.Date)
            .ThenByDescending(a => a.ID)
            .ToListAsync(cancellationToken);

        return rows;
    }
}
