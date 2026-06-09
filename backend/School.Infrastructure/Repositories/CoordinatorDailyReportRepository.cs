using Microsoft.EntityFrameworkCore;
using School.Infrastructure.Data;
using School.Infrastructure.Entities;

namespace School.Infrastructure.Repositories;

public class CoordinatorDailyReportRepository : ICoordinatorDailyReportRepository
{
    private readonly AppDbContext _context;

    public CoordinatorDailyReportRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<CoordinatorDailyReport?> GetByCoordinatorAndDateAsync(
        int coordinatorEmployeeId,
        DateOnly reportDate,
        bool asNoTracking,
        bool includeChildren,
        CancellationToken cancellationToken = default)
    {
        IQueryable<CoordinatorDailyReport> query = _context.CoordinatorDailyReports;

        if (includeChildren)
        {
            query = query
                .Include(x => x.Coordinator)
                .Include(x => x.ModDuties).ThenInclude(m => m.OnDutyEmployee)
                .Include(x => x.AbsentTeachers).ThenInclude(a => a.Employee)
                .Include(x => x.WorkingReportLines);
        }

        if (asNoTracking)
        {
            query = query.AsNoTracking();
        }

        return await query.FirstOrDefaultAsync(
            x => x.CoordinatorEmployeeId == coordinatorEmployeeId && x.ReportDate == reportDate,
            cancellationToken);
    }

    public async Task<IReadOnlyList<CoordinatorDailyReport>> GetAllForReportDateAsync(
        DateOnly reportDate,
        CancellationToken cancellationToken = default)
    {
        return await _context.CoordinatorDailyReports
            .AsNoTracking()
            .Include(x => x.Coordinator)
            .Include(x => x.ModDuties).ThenInclude(m => m.OnDutyEmployee)
            .Include(x => x.AbsentTeachers).ThenInclude(a => a.Employee)
            .Include(x => x.WorkingReportLines)
            .Where(x => x.ReportDate == reportDate)
            .OrderBy(x => x.Coordinator != null ? x.Coordinator.EmployeeName ?? "" : "")
            .ThenBy(x => x.CoordinatorEmployeeId)
            .ToListAsync(cancellationToken);
    }

    public async Task<CoordinatorDailyReport> GetOrCreateTrackedAsync(
        int coordinatorEmployeeId,
        DateOnly reportDate,
        CancellationToken cancellationToken = default)
    {
        var existing = await _context.CoordinatorDailyReports
            .Include(x => x.ModDuties)
            .Include(x => x.AbsentTeachers)
            .Include(x => x.WorkingReportLines)
            .FirstOrDefaultAsync(
                x => x.CoordinatorEmployeeId == coordinatorEmployeeId && x.ReportDate == reportDate,
                cancellationToken);

        if (existing != null)
        {
            return existing;
        }

        var utc = DateTime.UtcNow;
        var created = new CoordinatorDailyReport
        {
            CoordinatorEmployeeId = coordinatorEmployeeId,
            ReportDate = reportDate,
            CreatedAtUtc = utc,
            UpdatedAtUtc = utc
        };

        _context.CoordinatorDailyReports.Add(created);
        await _context.SaveChangesAsync(cancellationToken);
        return created;
    }

    public Task SaveChangesAsync(CancellationToken cancellationToken = default) =>
        _context.SaveChangesAsync(cancellationToken);
}
