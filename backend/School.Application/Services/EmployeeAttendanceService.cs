using Microsoft.EntityFrameworkCore;
using School.Application.DTOs;
using School.Application.Interfaces;
using School.Infrastructure.Data;
using School.Infrastructure.Entities;
using School.Infrastructure.Repositories;

namespace School.Application.Services;

public class EmployeeAttendanceService : IEmployeeAttendanceService
{
    private readonly IEmployeeAttendanceRepository _employeeAttendanceRepository;
    private readonly AppDbContext _context;

    public EmployeeAttendanceService(
        IEmployeeAttendanceRepository employeeAttendanceRepository,
        AppDbContext context)
    {
        _employeeAttendanceRepository = employeeAttendanceRepository;
        _context = context;
    }

    public async Task<EmployeeAttendanceMonthlySheetDto> GetMonthlySheetAsync(
        int? year = null,
        int? month = null,
        CancellationToken cancellationToken = default)
    {
        var today = DateTime.Today;
        var targetYear = year ?? today.Year;
        var targetMonth = month ?? today.Month;

        if (targetMonth is < 1 or > 12)
        {
            throw new ArgumentException("Month must be between 1 and 12.");
        }

        if (targetYear is < 2000 or > 2100)
        {
            throw new ArgumentException("Year is out of range.");
        }

        var employees = await _employeeAttendanceRepository.GetActiveEmployeesOrderedAsync(cancellationToken);
        var attendanceRows = await _employeeAttendanceRepository.GetAttendanceRowsForMonthAsync(
            targetYear,
            targetMonth,
            cancellationToken);

        var attendanceByEmployee = BuildAttendanceByEmployee(attendanceRows);

        var designationIds = employees
            .Where(e => e.DesignationID.HasValue)
            .Select(e => e.DesignationID!.Value)
            .Distinct()
            .ToList();

        var designationNames = designationIds.Count == 0
            ? new Dictionary<int, string?>()
            : await _context.Designations
                .AsNoTracking()
                .Where(d => designationIds.Contains(d.ID))
                .ToDictionaryAsync(d => d.ID, d => d.DesignationName, cancellationToken);

        var groups = new List<EmployeeAttendanceEmployeeGroupDto>(employees.Count);
        var employeesWithAttendance = 0;
        var totalDayRecords = 0;

        foreach (var employee in employees)
        {
            var days = attendanceByEmployee.TryGetValue(employee.ID, out var dayRecords)
                ? dayRecords
                : new List<EmployeeAttendanceDayRowDto>();
            if (days.Count > 0)
            {
                employeesWithAttendance++;
                totalDayRecords += days.Count;
            }

            string? designationName = null;
            if (employee.DesignationID.HasValue)
            {
                designationNames.TryGetValue(employee.DesignationID.Value, out designationName);
            }

            groups.Add(new EmployeeAttendanceEmployeeGroupDto
            {
                EmployeeId = employee.ID,
                EmployeeName = employee.EmployeeName,
                DesignationName = designationName,
                DayCount = days.Count,
                Days = days,
            });
        }

        return new EmployeeAttendanceMonthlySheetDto
        {
            Year = targetYear,
            Month = targetMonth,
            TotalEmployees = employees.Count,
            EmployeesWithAttendance = employeesWithAttendance,
            TotalDayRecords = totalDayRecords,
            Employees = groups,
        };
    }

    private static Dictionary<int, List<EmployeeAttendanceDayRowDto>> BuildAttendanceByEmployee(
        IReadOnlyList<EmployeeAttendance> attendanceRows)
    {
        var result = new Dictionary<int, List<EmployeeAttendanceDayRowDto>>();

        foreach (var group in attendanceRows.Where(a => a.EmpID.HasValue && a.Date.HasValue).GroupBy(a => a.EmpID!.Value))
        {
            var dayRows = group
                .GroupBy(a => a.Date!.Value.Date)
                .Select(dayGroup => MapDayRow(dayGroup.OrderByDescending(a => a.ID).First()))
                .OrderBy(d => d.Date)
                .ToList();

            result[group.Key] = dayRows;
        }

        return result;
    }

    private static EmployeeAttendanceDayRowDto MapDayRow(EmployeeAttendance attendance) =>
        new()
        {
            Date = attendance.Date!.Value.Date,
            CheckInTime = attendance.Time,
            CheckOutTime = FormatCheckOutTime(attendance.CheckOutTime),
            LateComings = attendance.LateComings,
        };

    private static string? FormatCheckOutTime(DateTime? checkOutTime) =>
        checkOutTime.HasValue ? checkOutTime.Value.ToString("HH:mm") : null;
}
