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
        var cleanSheet = await LoadCleanSheetBonusSettingsAsync(context, cancellationToken);

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
            empAttendance,
            cleanSheet);

        return BuildDisplayRow(
            employee.ID,
            employee.EmployeeName,
            resolvedBasic,
            month,
            year,
            resolvedSundays,
            empAttendance,
            await LoadComponentsAsync(context, employee.ID, month, year),
            cleanSheet);
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

        var designationNames = await context.Designations
            .AsNoTracking()
            .ToDictionaryAsync(d => d.ID, d => d.DesignationName);

        var teaAllowance = await context.CampusPayrollSettings
            .AsNoTracking()
            .OrderBy(x => x.ID)
            .Select(x => (decimal?)x.TeaAllowance)
            .FirstOrDefaultAsync() ?? 0m;
        var cleanSheet = await LoadCleanSheetBonusSettingsAsync(context);

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
                empAttendance,
                cleanSheet);

            var display = BuildDisplayRow(
                employee.ID,
                employee.EmployeeName,
                resolvedBasic,
                month,
                year,
                sundaysToInclude,
                empAttendance,
                await LoadComponentsAsync(context, employee.ID, month, year),
                cleanSheet);

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
                return RoundMoney(liveSalary ?? 0m);

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
        IReadOnlyList<AttendanceSlice> attendance,
        CleanSheetBonusSettings cleanSheet)
    {
        var daysInMonth = DateTime.DaysInMonth(year, month);
        var workingAndHolidaySalary = ComputeWorkingAndHolidaySalary(
            basicSalary,
            month,
            year,
            sundaysToInclude,
            attendance);

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

        await ApplyCleanSheetBonusAsync(context, employeeId, month, year, attendance, cleanSheet);

        var components = await LoadComponentsAsync(context, employeeId, month, year);
        decimal AmountOf(string type) => ComponentAmount(components, type);

        var loan = AmountOf(SalaryComponentTypes.Loan);
        var securityCharges = AmountOf(SalaryComponentTypes.SecurityCharges);
        var fine = AmountOf(SalaryComponentTypes.Fine);
        var advance = AmountOf(SalaryComponentTypes.Advance);
        var bonus = AmountOf(SalaryComponentTypes.Bonus);
        var cleanSheetBonus = AmountOf(SalaryComponentTypes.CleanSheetBonus);
        var tea = AmountOf(SalaryComponentTypes.TeaAllowance);

        var netSalary = RoundMoney(
            workingAndHolidaySalary + tea + bonus + cleanSheetBonus - loan - fine - advance - securityCharges);

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
        IReadOnlyList<EmployeeSalaryComponent> components,
        CleanSheetBonusSettings cleanSheet)
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
        var lateComings = attendance.Sum(x => x.LateComings ?? 0);
        var paidNonWorkingDays = holidayCount + sundaysToInclude;

        decimal AmountOf(string type) => ComponentAmount(components, type);

        var basicSalary = RoundMoney(AmountOf(SalaryComponentTypes.BasicSalary));
        if (basicSalary == 0 && basicSalaryFallback.HasValue)
            basicSalary = RoundMoney(basicSalaryFallback.Value);

        var lateDeduction = SumLateDeductionForDisplay(basicSalary, attendance);

        var workingDaysSalary = presentDays > 0
            ? RoundMoney(AmountOf(SalaryComponentTypes.WorkingDaySalary))
            : 0m;

        var loan = RoundMoney(AmountOf(SalaryComponentTypes.Loan));
        var securityCharges = RoundMoney(AmountOf(SalaryComponentTypes.SecurityCharges));
        var fine = RoundMoney(AmountOf(SalaryComponentTypes.Fine));
        var advance = RoundMoney(AmountOf(SalaryComponentTypes.Advance));
        var bonus = RoundMoney(AmountOf(SalaryComponentTypes.Bonus));
        var cleanSheetBonus = RoundMoney(AmountOf(SalaryComponentTypes.CleanSheetBonus));
        var teaAllowance = RoundMoney(AmountOf(SalaryComponentTypes.TeaAllowance));
        var absentDeduction = RoundMoney(
            GetAbsentDeduction(basicSalary, presentDays, workingDaysInMonth, daysInMonth));

        var netSalary = RoundMoney(
            workingDaysSalary + bonus + cleanSheetBonus + teaAllowance - loan - fine - advance - securityCharges);

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
            CleanSheetBonus = cleanSheetBonus,
            CleanSheetBonusName = cleanSheetBonus > 0 ? cleanSheet.Name : null,
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
        decimal amount,
        string? description = null,
        bool setDescription = false)
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
                Description = setDescription ? description : null,
            });
        }
        else
        {
            matches[0].Amount = amount;
            if (setDescription)
                matches[0].Description = description;
            if (matches.Count > 1)
                context.EmployeeSalaryComponents.RemoveRange(matches.Skip(1));
        }

        await context.SaveChangesAsync();
    }

    private static async Task ApplyCleanSheetBonusAsync(
        AppDbContext context,
        int employeeId,
        int month,
        int year,
        IReadOnlyList<AttendanceSlice> attendance,
        CleanSheetBonusSettings settings)
    {
        var amount = RoundMoney(settings.Amount);
        var eligible = settings.Enabled && amount > 0 && HasCleanSheet(month, year, attendance);
        if (!eligible)
        {
            var existing = await context.EmployeeSalaryComponents
                .Where(x =>
                    x.EmpID == employeeId &&
                    x.Month == month &&
                    x.Year == year &&
                    x.ComponentType == SalaryComponentTypes.CleanSheetBonus)
                .ToListAsync();
            if (existing.Count == 0)
                return;

            context.EmployeeSalaryComponents.RemoveRange(existing);
            await context.SaveChangesAsync();
            return;
        }

        await UpsertComponentAsync(
            context,
            employeeId,
            month,
            year,
            SalaryComponentTypes.CleanSheetBonus,
            amount,
            BuildCleanSheetDescription(settings),
            setDescription: true);
    }

    private static bool HasCleanSheet(int month, int year, IReadOnlyList<AttendanceSlice> attendance)
    {
        if (attendance.Sum(x => x.LateComings ?? 0) != 0)
            return false;

        var presentDays = attendance.Count(x => x.Status == "P");
        if (presentDays == 0)
            return false;

        var daysInMonth = DateTime.DaysInMonth(year, month);
        var holidayDates = attendance
            .Where(x => x.Status == "H" && x.Date.HasValue)
            .Select(x => x.Date!.Value.Date)
            .ToHashSet();
        var workingDaysInMonth = Enumerable.Range(1, daysInMonth)
            .Select(day => new DateTime(year, month, day))
            .Count(date => date.DayOfWeek != DayOfWeek.Sunday && !holidayDates.Contains(date));

        return workingDaysInMonth - presentDays <= 0;
    }

    private static string BuildCleanSheetDescription(CleanSheetBonusSettings settings)
    {
        var name = string.IsNullOrWhiteSpace(settings.Name)
            ? CleanSheetBonusDefaults.Name
            : settings.Name.Trim();
        var description = settings.Description?.Trim();
        var text = string.IsNullOrEmpty(description) ? name : $"{name} — {description}";
        return text.Length <= 500 ? text : text[..500];
    }

    private static async Task<CleanSheetBonusSettings> LoadCleanSheetBonusSettingsAsync(
        AppDbContext context,
        CancellationToken cancellationToken = default)
    {
        var row = await context.CampusProfiles
            .AsNoTracking()
            .OrderBy(x => x.ID)
            .Select(x => new
            {
                x.CleanSheetBonusEnabled,
                x.CleanSheetBonusName,
                x.CleanSheetBonusDescription,
                x.CleanSheetBonusAmount,
            })
            .FirstOrDefaultAsync(cancellationToken);

        if (row == null)
        {
            return new CleanSheetBonusSettings(
                false,
                CleanSheetBonusDefaults.Name,
                CleanSheetBonusDefaults.Description,
                0m);
        }

        var name = string.IsNullOrWhiteSpace(row.CleanSheetBonusName)
            ? CleanSheetBonusDefaults.Name
            : row.CleanSheetBonusName.Trim();
        return new CleanSheetBonusSettings(
            row.CleanSheetBonusEnabled,
            name,
            row.CleanSheetBonusDescription,
            row.CleanSheetBonusAmount);
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

    private static decimal ComputeWorkingAndHolidaySalary(
        decimal basicSalary,
        int month,
        int year,
        int sundaysToInclude,
        IReadOnlyList<AttendanceSlice> attendance)
    {
        if (basicSalary <= 0)
            return 0;

        var presentDays = attendance.Count(x => x.Status == "P");
        if (presentDays == 0)
            return 0;

        decimal total = 0;
        foreach (var row in attendance)
        {
            if (row.Status == "P")
            {
                var date = row.Date ?? new DateTime(year, month, 1);
                total += EmployeeAttendanceCalculator.CalculateEmpSalaryOnThisDay(
                    date,
                    basicSalary,
                    row.LateComings ?? 0) ?? 0m;
            }
            else if (row.Status == "H")
            {
                var date = row.Date ?? new DateTime(year, month, 1);
                total += EmployeeAttendanceCalculator.CalculateSalaryPerDay(date, basicSalary);
            }
        }

        total += GetSundaySalary(month, year, basicSalary, sundaysToInclude);
        return RoundMoney(total);
    }

    private static decimal SumLateDeductionForDisplay(
        decimal basicSalary,
        IReadOnlyList<AttendanceSlice> attendance)
    {
        if (basicSalary <= 0)
            return 0;

        decimal total = 0;
        foreach (var row in attendance.Where(x => x.Status == "P" && x.Date.HasValue))
        {
            total += EmployeeAttendanceCalculator.CalculateLateDeductionOnThisDay(
                row.Date!.Value,
                basicSalary,
                row.LateComings ?? 0) ?? 0m;
        }

        return RoundMoney(total);
    }

    private static decimal GetAbsentDeduction(
        decimal basicSalary,
        int presentDays,
        int workingDaysInMonth,
        int daysInMonth)
    {
        if (basicSalary <= 0 || workingDaysInMonth <= 0 || daysInMonth <= 0)
            return 0;

        var perDaySalary = basicSalary / daysInMonth;
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

    private sealed record CleanSheetBonusSettings(
        bool Enabled,
        string Name,
        string? Description,
        decimal Amount);
}
