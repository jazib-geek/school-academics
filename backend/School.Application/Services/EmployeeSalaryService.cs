using Microsoft.EntityFrameworkCore;
using School.Application.Common;
using School.Application.DTOs;
using School.Application.Interfaces;
using School.Infrastructure.Data;
using School.Infrastructure.Entities;

namespace School.Application.Services;

public class EmployeeSalaryService : IEmployeeSalaryService
{
    private readonly TenantContext _tenantContext;
    private readonly IEmployeeSalaryProgressStore _progressStore;

    public EmployeeSalaryService(
        TenantContext tenantContext,
        IEmployeeSalaryProgressStore progressStore)
    {
        _tenantContext = tenantContext;
        _progressStore = progressStore;
    }

    public Task<string> StartCalculationAsync(
        int month,
        int year,
        int? sundaysToInclude = null,
        CancellationToken cancellationToken = default)
    {
        SalaryPeriodHelper.EnsureNotFuture(month, year);
        if (string.IsNullOrWhiteSpace(_tenantContext.ConnectionString))
            throw new InvalidOperationException("Campus connection is not available.");

        var maxSundays = CountSundaysInMonth(year, month);
        var resolvedSundays = sundaysToInclude ?? maxSundays;
        if (resolvedSundays < 0 || resolvedSundays > maxSundays)
            throw new ArgumentException(
                $"Sundays to include must be between 0 and {maxSundays} for the selected month.");

        var generationId = Guid.NewGuid().ToString("N");
        var connectionString = _tenantContext.ConnectionString;
        _progressStore.Start(generationId, month, year);

        _ = Task.Run(async () =>
        {
            try
            {
                await GenerateAllAsync(connectionString, generationId, month, year, resolvedSundays);
            }
            catch (Exception ex)
            {
                _progressStore.Fail(generationId, ex.Message);
            }
        });

        return Task.FromResult(generationId);
    }

    public async Task<EmployeeSalaryRowDto> RecalculateEmployeeAsync(
        int employeeId,
        int month,
        int year,
        int? sundaysToInclude = null,
        CancellationToken cancellationToken = default)
    {
        SalaryPeriodHelper.EnsureNotFuture(month, year);
        if (employeeId <= 0)
            throw new ArgumentException("Employee is required.");
        if (string.IsNullOrWhiteSpace(_tenantContext.ConnectionString))
            throw new InvalidOperationException("Campus connection is not available.");

        var maxSundays = CountSundaysInMonth(year, month);
        var resolvedSundays = sundaysToInclude ?? maxSundays;
        if (resolvedSundays < 0 || resolvedSundays > maxSundays)
            throw new ArgumentException(
                $"Sundays to include must be between 0 and {maxSundays} for the selected month.");

        await using var context = CreateCampusContext(_tenantContext.ConnectionString);

        var employee = await context.Employees
            .AsNoTracking()
            .Where(e => e.ID == employeeId)
            .Select(e => new { e.ID, e.EmployeeName, e.Salary, e.DesignationID, e.IsActive })
            .FirstOrDefaultAsync(cancellationToken)
            ?? throw new KeyNotFoundException("Employee was not found.");

        string? designationName = null;
        if (employee.DesignationID.HasValue)
        {
            designationName = await context.Designations
                .AsNoTracking()
                .Where(d => d.ID == employee.DesignationID.Value)
                .Select(d => d.DesignationName)
                .FirstOrDefaultAsync(cancellationToken);
        }

        var teaAllowance = await context.CampusPayrollSettings
            .AsNoTracking()
            .OrderBy(x => x.ID)
            .Select(x => (decimal?)x.TeaAllowance)
            .FirstOrDefaultAsync(cancellationToken) ?? 0m;

        var monthStart = new DateTime(year, month, 1);
        var monthEnd = monthStart.AddMonths(1);
        var empAttendance = await context.EmployeeAttendances
            .AsNoTracking()
            .Where(a => a.EmpID == employeeId &&
                        a.Date.HasValue &&
                        a.Date.Value >= monthStart &&
                        a.Date.Value < monthEnd)
            .Select(a => new AttendanceSlice(
                a.EmpID,
                a.Date,
                a.Status,
                a.LateComings,
                a.LateDeduction,
                a.TodaySalary))
            .ToListAsync(cancellationToken);

        var resolvedBasic = await ResolveBasicSalaryAsync(
            context,
            employee.ID,
            employee.Salary,
            employee.EmployeeName,
            month,
            year,
            cancellationToken);

        await GenerateAndSaveForEmployeeAsync(
            context,
            employee.ID,
            resolvedBasic,
            designationName,
            month,
            year,
            teaAllowance,
            resolvedSundays,
            empAttendance);

        return BuildDisplayRow(
            employee.ID,
            employee.EmployeeName,
            resolvedBasic,
            month,
            year,
            resolvedSundays,
            empAttendance,
            await LoadComponentsAsync(context, employee.ID, month, year));
    }

    public Task<EmployeeSalaryCalculationResultDto?> GetCalculationResultAsync(
        string generationId,
        CancellationToken cancellationToken = default)
    {
        var snapshot = _progressStore.Get(generationId);
        return Task.FromResult(snapshot?.Result);
    }

    private async Task GenerateAllAsync(
        string connectionString,
        string generationId,
        int month,
        int year,
        int sundaysToInclude)
    {
        await using var context = CreateCampusContext(connectionString);

        var employees = await context.Employees
            .AsNoTracking()
            .Where(e => e.IsActive == true)
            .OrderBy(e => e.EmployeeName)
            .Select(e => new
            {
                e.ID,
                e.EmployeeName,
                e.Salary,
                e.DesignationID,
            })
            .ToListAsync();

        if (SalaryPeriodHelper.IsPastMonth(month, year))
        {
            var missing = new List<string>();
            foreach (var emp in employees)
            {
                var hasBasic = await context.EmployeeSalaryComponents
                    .AsNoTracking()
                    .AnyAsync(c =>
                        c.EmpID == emp.ID &&
                        c.Month == month &&
                        c.Year == year &&
                        c.ComponentType == SalaryComponentTypes.BasicSalary);
                if (!hasBasic)
                    missing.Add(emp.EmployeeName ?? $"Employee #{emp.ID}");
            }

            if (missing.Count > 0)
            {
                var names = string.Join(", ", missing.Take(8));
                var more = missing.Count > 8 ? $" and {missing.Count - 8} more" : string.Empty;
                throw new InvalidOperationException(
                    $"Month basic salary is missing for: {names}{more}. Set it on Salary Adjustments before calculating this past month.");
            }
        }

        var designationNames = await context.Designations
            .AsNoTracking()
            .ToDictionaryAsync(d => d.ID, d => d.DesignationName);

        var teaAllowance = await context.CampusPayrollSettings
            .AsNoTracking()
            .OrderBy(x => x.ID)
            .Select(x => (decimal?)x.TeaAllowance)
            .FirstOrDefaultAsync() ?? 0m;

        var monthStart = new DateTime(year, month, 1);
        var monthEnd = monthStart.AddMonths(1);
        var attendanceRows = await context.EmployeeAttendances
            .AsNoTracking()
            .Where(a => a.Date.HasValue &&
                        a.Date.Value >= monthStart &&
                        a.Date.Value < monthEnd)
            .Select(a => new AttendanceSlice(
                a.EmpID,
                a.Date,
                a.Status,
                a.LateComings,
                a.LateDeduction,
                a.TodaySalary))
            .ToListAsync();

        var attendanceByEmployee = attendanceRows
            .Where(a => a.EmpID.HasValue)
            .GroupBy(a => a.EmpID!.Value)
            .ToDictionary(g => g.Key, g => g.ToList());

        var total = Math.Max(employees.Count, 1);
        var rows = new List<EmployeeSalaryRowDto>(employees.Count);

        for (var i = 0; i < employees.Count; i++)
        {
            var employee = employees[i];
            attendanceByEmployee.TryGetValue(employee.ID, out var empAttendance);
            empAttendance ??= [];

            string? designationName = null;
            if (employee.DesignationID.HasValue)
                designationNames.TryGetValue(employee.DesignationID.Value, out designationName);

            var resolvedBasic = await ResolveBasicSalaryAsync(
                context,
                employee.ID,
                employee.Salary,
                employee.EmployeeName,
                month,
                year);

            await GenerateAndSaveForEmployeeAsync(
                context,
                employee.ID,
                resolvedBasic,
                designationName,
                month,
                year,
                teaAllowance,
                sundaysToInclude,
                empAttendance);

            var display = BuildDisplayRow(
                employee.ID,
                employee.EmployeeName,
                resolvedBasic,
                month,
                year,
                sundaysToInclude,
                empAttendance,
                await LoadComponentsAsync(context, employee.ID, month, year));

            rows.Add(display);

            var percent = (int)Math.Round(((i + 1) / (double)total) * 100);
            _progressStore.SetPercent(generationId, percent);
        }

        _progressStore.Complete(generationId, new EmployeeSalaryCalculationResultDto
        {
            Month = month,
            Year = year,
            Rows = rows,
            TotalNetSalary = RoundMoney(rows.Sum(r => r.NetSalary)),
        });
    }

    private static async Task<decimal> ResolveBasicSalaryAsync(
        AppDbContext context,
        int employeeId,
        decimal? liveSalary,
        string? employeeName,
        int month,
        int year,
        CancellationToken cancellationToken = default)
    {
        if (SalaryPeriodHelper.IsCurrentMonth(month, year))
            return RoundMoney(liveSalary ?? 0m);

        if (SalaryPeriodHelper.IsPastMonth(month, year))
        {
            var snapshot = await context.EmployeeSalaryComponents
                .AsNoTracking()
                .Where(c =>
                    c.EmpID == employeeId &&
                    c.Month == month &&
                    c.Year == year &&
                    c.ComponentType == SalaryComponentTypes.BasicSalary)
                .OrderByDescending(c => c.ID)
                .Select(c => c.Amount)
                .FirstOrDefaultAsync(cancellationToken);

            if (snapshot == null)
            {
                var label = string.IsNullOrWhiteSpace(employeeName) ? $"Employee #{employeeId}" : employeeName;
                throw new InvalidOperationException(
                    $"Month basic salary is missing for {label}. Set it on Salary Adjustments before calculating this past month.");
            }

            return RoundMoney(snapshot.Value);
        }

        throw new ArgumentException("Salary cannot be calculated for a future month.");
    }

    private static async Task GenerateAndSaveForEmployeeAsync(
        AppDbContext context,
        int employeeId,
        decimal basicSalary,
        string? designationName,
        int month,
        int year,
        decimal teaAllowance,
        int sundaysToInclude,
        IReadOnlyList<AttendanceSlice> attendance)
    {
        var daysInMonth = DateTime.DaysInMonth(year, month);
        var workingAndHolidaySalary = RoundMoney(
            attendance
                .Where(x => x.Status == "P" || x.Status == "H")
                .Sum(x => x.TodaySalary ?? 0m)
            + GetSundaySalary(month, year, basicSalary, sundaysToInclude));

        await UpsertComponentAsync(
            context,
            employeeId,
            month,
            year,
            SalaryComponentTypes.WorkingDaySalary,
            workingAndHolidaySalary);

        // Current month: always refresh snapshot from live salary.
        // Past month: keep / re-write the resolved snapshot amount (already from components).
        await UpsertComponentAsync(
            context,
            employeeId,
            month,
            year,
            SalaryComponentTypes.BasicSalary,
            basicSalary);

        await UpsertComponentAsync(
            context,
            employeeId,
            month,
            year,
            SalaryComponentTypes.TeaAllowance,
            RoundMoney(teaAllowance));

        var bonusExists = await context.EmployeeSalaryComponents
            .AnyAsync(x =>
                x.EmpID == employeeId &&
                x.Month == month &&
                x.Year == year &&
                x.ComponentType == SalaryComponentTypes.Bonus);
        if (!bonusExists)
        {
            var isCoordinator = string.Equals(
                designationName,
                SpecialDesignations.Coordinator,
                StringComparison.OrdinalIgnoreCase);
            if (isCoordinator && daysInMonth > 0)
            {
                await UpsertComponentAsync(
                    context,
                    employeeId,
                    month,
                    year,
                    SalaryComponentTypes.Bonus,
                    RoundMoney(basicSalary / daysInMonth));
            }
        }

        var components = await LoadComponentsAsync(context, employeeId, month, year);
        decimal AmountOf(string type) => ComponentAmount(components, type);

        var loan = AmountOf(SalaryComponentTypes.Loan);
        var securityCharges = AmountOf(SalaryComponentTypes.SecurityCharges);
        var fine = AmountOf(SalaryComponentTypes.Fine);
        var advance = AmountOf(SalaryComponentTypes.Advance);
        var bonus = AmountOf(SalaryComponentTypes.Bonus);
        var tea = AmountOf(SalaryComponentTypes.TeaAllowance);

        var netSalary = RoundMoney(
            workingAndHolidaySalary + tea + bonus - loan - fine - advance - securityCharges);

        var existingSalary = await context.EmployeeSalaries
            .FirstOrDefaultAsync(x => x.EmpID == employeeId && x.Month == month && x.Year == year);

        if (existingSalary != null)
        {
            existingSalary.BasicSalary = basicSalary;
            existingSalary.NetSalary = netSalary;
        }
        else
        {
            context.EmployeeSalaries.Add(new EmployeeSalary
            {
                EmpID = employeeId,
                Month = month,
                Year = year,
                BasicSalary = basicSalary,
                NetSalary = netSalary,
            });
        }

        await context.SaveChangesAsync();
    }

    private static EmployeeSalaryRowDto BuildDisplayRow(
        int employeeId,
        string? employeeName,
        decimal? basicSalaryFallback,
        int month,
        int year,
        int sundaysToInclude,
        IReadOnlyList<AttendanceSlice> attendance,
        IReadOnlyList<EmployeeSalaryComponent> components)
    {
        var daysInMonth = DateTime.DaysInMonth(year, month);
        var holidayDates = attendance
            .Where(x => x.Status == "H" && x.Date.HasValue)
            .Select(x => x.Date!.Value.Date)
            .ToHashSet();

        var workingDaysInMonth = Enumerable.Range(1, daysInMonth)
            .Select(day => new DateTime(year, month, day))
            .Count(date => date.DayOfWeek != DayOfWeek.Sunday && !holidayDates.Contains(date));

        var holidayCount = holidayDates.Count;
        var presentDays = attendance.Count(x => x.Status == "P");
        var lateDeduction = attendance.Sum(x => x.LateDeduction ?? 0m);
        var lateComings = attendance.Sum(x => x.LateComings ?? 0);
        var paidNonWorkingDays = holidayCount + sundaysToInclude;

        decimal AmountOf(string type) => ComponentAmount(components, type);

        var basicSalary = RoundMoney(AmountOf(SalaryComponentTypes.BasicSalary));
        if (basicSalary == 0 && basicSalaryFallback.HasValue)
            basicSalary = RoundMoney(basicSalaryFallback.Value);

        var workingDaysSalary = presentDays > 0
            ? RoundMoney(AmountOf(SalaryComponentTypes.WorkingDaySalary))
            : 0m;

        var loan = RoundMoney(AmountOf(SalaryComponentTypes.Loan));
        var securityCharges = RoundMoney(AmountOf(SalaryComponentTypes.SecurityCharges));
        var fine = RoundMoney(AmountOf(SalaryComponentTypes.Fine));
        var advance = RoundMoney(AmountOf(SalaryComponentTypes.Advance));
        var bonus = RoundMoney(AmountOf(SalaryComponentTypes.Bonus));
        var teaAllowance = RoundMoney(AmountOf(SalaryComponentTypes.TeaAllowance));
        var absentDeduction = RoundMoney(GetAbsentDeduction(basicSalary, presentDays, workingDaysInMonth));

        var netSalary = RoundMoney(
            workingDaysSalary + bonus + teaAllowance - loan - fine - advance - securityCharges);

        return new EmployeeSalaryRowDto
        {
            EmployeeId = employeeId,
            EmployeeName = employeeName ?? "Unknown",
            BasicSalary = basicSalary,
            PresentDaysCount = presentDays > 0 ? presentDays + paidNonWorkingDays : 0,
            LateComingsCount = lateComings,
            LateDeduction = RoundMoney(lateDeduction),
            AbsentDeduction = absentDeduction,
            WorkingDaysSalary = workingDaysSalary,
            Loan = loan,
            SecurityCharges = securityCharges,
            Fine = fine,
            Advance = advance,
            Bonus = bonus,
            TeaAllowance = teaAllowance,
            NetSalary = netSalary,
        };
    }

    private static async Task UpsertComponentAsync(
        AppDbContext context,
        int employeeId,
        int month,
        int year,
        string componentType,
        decimal amount)
    {
        var matches = await context.EmployeeSalaryComponents
            .Where(x =>
                x.EmpID == employeeId &&
                x.Month == month &&
                x.Year == year &&
                x.ComponentType == componentType)
            .OrderBy(x => x.ID)
            .ToListAsync();

        if (matches.Count == 0)
        {
            context.EmployeeSalaryComponents.Add(new EmployeeSalaryComponent
            {
                EmpID = employeeId,
                Month = month,
                Year = year,
                ComponentType = componentType,
                Amount = amount,
            });
        }
        else
        {
            matches[0].Amount = amount;
            if (matches.Count > 1)
                context.EmployeeSalaryComponents.RemoveRange(matches.Skip(1));
        }

        await context.SaveChangesAsync();
    }

    private static decimal ComponentAmount(
        IReadOnlyList<EmployeeSalaryComponent> components,
        string componentType) =>
        RoundMoney(
            components
                .Where(c => string.Equals(c.ComponentType, componentType, StringComparison.OrdinalIgnoreCase))
                .OrderByDescending(c => c.ID)
                .Select(c => c.Amount ?? 0m)
                .FirstOrDefault());

    private static decimal RoundMoney(decimal value) =>
        Math.Round(value, 0, MidpointRounding.AwayFromZero);

    private static async Task<List<EmployeeSalaryComponent>> LoadComponentsAsync(
        AppDbContext context,
        int employeeId,
        int month,
        int year) =>
        await context.EmployeeSalaryComponents
            .AsNoTracking()
            .Where(x => x.EmpID == employeeId && x.Month == month && x.Year == year)
            .ToListAsync();

    private static decimal GetAbsentDeduction(decimal? salary, int presentDays, int workingDaysInMonth)
    {
        if (!salary.HasValue || workingDaysInMonth <= 0)
            return 0;

        var perDaySalary = salary.Value / workingDaysInMonth;
        var absentDays = workingDaysInMonth - presentDays;
        if (presentDays == 0)
            absentDays = workingDaysInMonth;

        if (absentDays <= 0)
            return 0;

        return RoundMoney(absentDays * perDaySalary);
    }

    private static int CountSundaysInMonth(int year, int month)
    {
        var daysInMonth = DateTime.DaysInMonth(year, month);
        var count = 0;
        for (var day = 1; day <= daysInMonth; day++)
        {
            if (new DateTime(year, month, day).DayOfWeek == DayOfWeek.Sunday)
                count++;
        }

        return count;
    }

    private static decimal GetSundaySalary(int month, int year, decimal? basicSalary, int sundaysToInclude)
    {
        if (!basicSalary.HasValue || basicSalary.Value <= 0 || sundaysToInclude <= 0)
            return 0;

        var daysInMonth = DateTime.DaysInMonth(year, month);
        if (daysInMonth <= 0)
            return 0;

        var count = Math.Clamp(sundaysToInclude, 0, CountSundaysInMonth(year, month));
        if (count <= 0)
            return 0;

        var perDaySalary = basicSalary.Value / daysInMonth;
        return RoundMoney(count * perDaySalary);
    }

    private static AppDbContext CreateCampusContext(string connectionString)
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlServer(connectionString)
            .Options;
        return new AppDbContext(options);
    }

    private sealed record AttendanceSlice(
        int? EmpID,
        DateTime? Date,
        string? Status,
        int? LateComings,
        decimal? LateDeduction,
        decimal? TodaySalary);
}
