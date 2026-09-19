using Microsoft.EntityFrameworkCore;
using School.Application.Common;
using School.Application.DTOs;
using School.Application.Interfaces;
using School.Infrastructure.Data;
using School.Infrastructure.Entities;

namespace School.Application.Services;

public class EmployeeSalaryComponentService : IEmployeeSalaryComponentService
{
    private readonly AppDbContext _context;
    private readonly IEmployeeSalaryService _salaryService;
    private readonly IActivityLogService _activityLogService;

    public EmployeeSalaryComponentService(
        AppDbContext context,
        IEmployeeSalaryService salaryService,
        IActivityLogService activityLogService)
    {
        _context = context;
        _salaryService = salaryService;
        _activityLogService = activityLogService;
    }

    public async Task<IReadOnlyList<EmployeeSalaryComponentDto>> GetByEmployeeAsync(
        int employeeId,
        CancellationToken cancellationToken = default)
    {
        var editable = SalaryComponentTypes.EditableTypes.ToArray();
        var rows = await _context.EmployeeSalaryComponents
            .AsNoTracking()
            .Where(x => x.EmpID == employeeId && x.ComponentType != null && editable.Contains(x.ComponentType))
            .OrderBy(x => x.Year)
            .ThenBy(x => x.Month)
            .ThenBy(x => x.ComponentType)
            .ToListAsync(cancellationToken);

        return rows.Select(Map).ToList();
    }

    public async Task<EmployeeSalaryPeriodStatusDto> GetPeriodStatusAsync(
        int employeeId,
        int month,
        int year,
        CancellationToken cancellationToken = default)
    {
        if (employeeId <= 0)
            throw new ArgumentException("Employee is required.");
        if (month is < 1 or > 12)
            throw new ArgumentException("Month must be between 1 and 12.");
        if (year is < 2000 or > 2100)
            throw new ArgumentException("Year is out of range.");

        var employee = await _context.Employees
            .AsNoTracking()
            .Where(e => e.ID == employeeId)
            .Select(e => new { e.ID, e.Salary })
            .FirstOrDefaultAsync(cancellationToken)
            ?? throw new KeyNotFoundException("Employee was not found.");

        var isGenerated = await _context.EmployeeSalaries
            .AsNoTracking()
            .AnyAsync(x => x.EmpID == employeeId && x.Month == month && x.Year == year, cancellationToken);

        var snapshotAmount = await _context.EmployeeSalaryComponents
            .AsNoTracking()
            .Where(c =>
                c.EmpID == employeeId &&
                c.Month == month &&
                c.Year == year &&
                c.ComponentType == SalaryComponentTypes.BasicSalary)
            .OrderByDescending(c => c.ID)
            .Select(c => c.Amount)
            .FirstOrDefaultAsync(cancellationToken);

        var hasSnapshot = snapshotAmount != null;
        var isCurrent = SalaryPeriodHelper.IsCurrentMonth(month, year);
        var isFuture = SalaryPeriodHelper.IsFutureMonth(month, year);
        var isPast = SalaryPeriodHelper.IsPastMonth(month, year);

        decimal basic;
        if (isCurrent)
            basic = Math.Round(employee.Salary ?? 0m, 0, MidpointRounding.AwayFromZero);
        else if (hasSnapshot)
            basic = Math.Round(snapshotAmount!.Value, 0, MidpointRounding.AwayFromZero);
        else
            basic = Math.Round(employee.Salary ?? 0m, 0, MidpointRounding.AwayFromZero);

        return new EmployeeSalaryPeriodStatusDto
        {
            IsGenerated = isGenerated,
            IsCurrentMonth = isCurrent,
            IsPastMonth = isPast,
            IsFutureMonth = isFuture,
            BasicSalary = basic,
            HasBasicSalarySnapshot = hasSnapshot,
            CanEditBasic = isPast,
        };
    }

    public async Task<EmployeeSalaryComponentDto> UpsertAsync(
        UpsertEmployeeSalaryComponentDto request,
        int? userId = null,
        CancellationToken cancellationToken = default)
    {
        if (request.EmployeeId <= 0)
            throw new ArgumentException("Employee is required.");
        if (request.Month is < 1 or > 12)
            throw new ArgumentException("Month must be between 1 and 12.");
        if (request.Year is < 2000 or > 2100)
            throw new ArgumentException("Year is out of range.");
        if (!SalaryComponentTypes.IsAdjustmentManaged(request.ComponentType))
            throw new ArgumentException("Component type is not allowed.");
        if (request.Amount < 0)
            throw new ArgumentException("Amount cannot be negative.");

        var type = request.ComponentType.Trim();
        if (string.Equals(type, SalaryComponentTypes.BasicSalary, StringComparison.OrdinalIgnoreCase) &&
            !SalaryPeriodHelper.IsPastMonth(request.Month, request.Year))
        {
            throw new ArgumentException("Month basic salary can only be edited for past months.");
        }

        var employee = await _context.Employees
            .AsNoTracking()
            .Where(e => e.ID == request.EmployeeId)
            .Select(e => new { e.ID, e.EmployeeName })
            .FirstOrDefaultAsync(cancellationToken)
            ?? throw new KeyNotFoundException("Employee was not found.");

        var existing = await _context.EmployeeSalaryComponents
            .FirstOrDefaultAsync(
                c => c.EmpID == request.EmployeeId &&
                     c.Month == request.Month &&
                     c.Year == request.Year &&
                     c.ComponentType == type,
                cancellationToken);

        object? before = existing == null
            ? null
            : new
            {
                id = existing.ID,
                employeeId = existing.EmpID,
                month = existing.Month,
                year = existing.Year,
                componentType = existing.ComponentType,
                amount = existing.Amount,
                description = existing.Description,
            };

        var wasCreated = existing == null;
        if (existing != null)
        {
            existing.Amount = Math.Round(request.Amount, 2);
            existing.Description = string.IsNullOrWhiteSpace(request.Description)
                ? null
                : request.Description.Trim();
        }
        else
        {
            existing = new EmployeeSalaryComponent
            {
                EmpID = request.EmployeeId,
                Month = request.Month,
                Year = request.Year,
                ComponentType = type,
                Amount = Math.Round(request.Amount, 2),
                Description = string.IsNullOrWhiteSpace(request.Description)
                    ? null
                    : request.Description.Trim(),
            };
            _context.EmployeeSalaryComponents.Add(existing);
        }

        await _context.SaveChangesAsync(cancellationToken);

        var after = new
        {
            id = existing.ID,
            employeeId = existing.EmpID,
            month = existing.Month,
            year = existing.Year,
            componentType = existing.ComponentType,
            amount = existing.Amount,
            description = existing.Description,
        };

        await _activityLogService.WriteAsync(
            ActivityLogTypes.EmployeeSalaryComponentEdit,
            ActivityLogEntityTypes.EmployeeSalaryComponent,
            existing.ID,
            $"{employee.EmployeeName} · {type} · {request.Month}/{request.Year}",
            userId,
            new
            {
                source = wasCreated ? "SalaryAdjustmentCreate" : "SalaryAdjustmentEdit",
                wasCreated,
                employeeId = employee.ID,
                employeeName = employee.EmployeeName,
                before,
                after,
            },
            cancellationToken);
        await _context.SaveChangesAsync(cancellationToken);

        await RecalculateIfGeneratedAsync(request.EmployeeId, request.Month, request.Year, cancellationToken);

        return Map(existing);
    }

    public async Task DeleteAsync(int id, int? userId = null, CancellationToken cancellationToken = default)
    {
        var row = await _context.EmployeeSalaryComponents
            .FirstOrDefaultAsync(x => x.ID == id, cancellationToken)
            ?? throw new KeyNotFoundException("Salary component was not found.");

        if (!SalaryComponentTypes.IsEditable(row.ComponentType))
            throw new InvalidOperationException("This component cannot be deleted from salary adjustments.");

        var employeeId = row.EmpID;
        var month = row.Month;
        var year = row.Year;
        var employeeName = await _context.Employees
            .AsNoTracking()
            .Where(e => e.ID == employeeId)
            .Select(e => e.EmployeeName)
            .FirstOrDefaultAsync(cancellationToken);

        var before = new
        {
            id = row.ID,
            employeeId = row.EmpID,
            month = row.Month,
            year = row.Year,
            componentType = row.ComponentType,
            amount = row.Amount,
            description = row.Description,
        };

        _context.EmployeeSalaryComponents.Remove(row);
        await _context.SaveChangesAsync(cancellationToken);

        await _activityLogService.WriteAsync(
            ActivityLogTypes.EmployeeSalaryComponentDelete,
            ActivityLogEntityTypes.EmployeeSalaryComponent,
            id,
            $"{employeeName ?? $"Employee #{employeeId}"} · {before.componentType} · {month}/{year}",
            userId,
            new
            {
                source = "SalaryAdjustmentDelete",
                employeeId,
                employeeName,
                before,
            },
            cancellationToken);
        await _context.SaveChangesAsync(cancellationToken);

        await RecalculateIfGeneratedAsync(employeeId, month, year, cancellationToken);
    }

    private async Task RecalculateIfGeneratedAsync(
        int employeeId,
        int month,
        int year,
        CancellationToken cancellationToken)
    {
        if (SalaryPeriodHelper.IsFutureMonth(month, year))
            return;

        var generated = await _context.EmployeeSalaries
            .AsNoTracking()
            .AnyAsync(x => x.EmpID == employeeId && x.Month == month && x.Year == year, cancellationToken);
        if (!generated)
            return;

        await _salaryService.RecalculateEmployeeAsync(employeeId, month, year, null, cancellationToken);
    }

    private static EmployeeSalaryComponentDto Map(EmployeeSalaryComponent row) =>
        new()
        {
            Id = row.ID,
            EmployeeId = row.EmpID,
            Month = row.Month,
            Year = row.Year,
            ComponentType = row.ComponentType ?? string.Empty,
            Amount = row.Amount ?? 0,
            Description = row.Description,
        };
}
