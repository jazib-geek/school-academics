using Microsoft.EntityFrameworkCore;
using School.Application.Common;
using School.Application.DTOs;
using School.Application.Interfaces;
using School.Infrastructure.Data;
using School.Infrastructure.Entities;
using School.Infrastructure.Repositories;
using System.Globalization;
using System.Text.Json;

namespace School.Application.Services;

public class EmployeeAttendanceService : IEmployeeAttendanceService
{
    private static readonly HashSet<string> ManualSources = new(StringComparer.OrdinalIgnoreCase)
    {
        "ManualEdit",
        "ManualMarkPresent",
    };

    private readonly IEmployeeAttendanceRepository _employeeAttendanceRepository;
    private readonly AppDbContext _context;
    private readonly TenantContext _tenantContext;
    private readonly IEmployeeAttendanceLiveUpdateSink _liveUpdateSink;
    private readonly ICampusNotificationService _notificationService;
    private readonly IActivityLogService _activityLogService;

    public EmployeeAttendanceService(
        IEmployeeAttendanceRepository employeeAttendanceRepository,
        AppDbContext context,
        TenantContext tenantContext,
        IEmployeeAttendanceLiveUpdateSink liveUpdateSink,
        ICampusNotificationService notificationService,
        IActivityLogService activityLogService)
    {
        _employeeAttendanceRepository = employeeAttendanceRepository;
        _context = context;
        _tenantContext = tenantContext;
        _liveUpdateSink = liveUpdateSink;
        _notificationService = notificationService;
        _activityLogService = activityLogService;
    }

    public async Task<EmployeeAttendanceLiveDayDto> GetLiveDayAsync(
        DateTime? date = null,
        CancellationToken cancellationToken = default)
    {
        var targetDate = (date ?? PakistanTime.Now).Date;
        var rows = await (
            from attendance in _context.EmployeeAttendances.AsNoTracking()
            join employee in _context.Employees.AsNoTracking()
                on attendance.EmpID equals employee.ID
            join designation in _context.Designations.AsNoTracking()
                on employee.DesignationID equals designation.ID into designationJoin
            from designation in designationJoin.DefaultIfEmpty()
            where attendance.Date.HasValue &&
                  attendance.Date.Value.Date == targetDate &&
                  attendance.EmpID != null &&
                  employee.IsActive == true &&
                  !string.IsNullOrWhiteSpace(attendance.Time)
            orderby attendance.ID descending
            select new
            {
                attendance.ID,
                employeeId = employee.ID,
                employeeName = employee.EmployeeName,
                attendanceDate = attendance.Date!.Value.Date,
                checkInTime = attendance.Time,
                checkOutTime = attendance.CheckOutTime,
                lateComings = attendance.LateComings,
                changeJson = attendance.ChangeJson,
                mustCheckinTime = designation != null ? designation.MustCheckinTime : null,
                leavingTime = designation != null ? designation.LeavingTime : null,
                graceMinutes = designation != null ? designation.MustCheckinMinutesDifference : null,
            })
            .ToListAsync(cancellationToken);

        var entries = rows
            .Select(row =>
            {
                var penalty = ResolvePenaltyBreakdown(
                    row.attendanceDate,
                    row.checkInTime,
                    row.checkOutTime,
                    DesignationTimeHelper.ToTimeOfDay(row.mustCheckinTime),
                    DesignationTimeHelper.ToTimeOfDay(row.leavingTime),
                    row.graceMinutes,
                    row.changeJson);
                var lateComings = row.lateComings ?? 0;

                return new EmployeeAttendanceLiveRowDto
                {
                    AttendanceId = row.ID,
                    EmployeeId = row.employeeId,
                    EmployeeName = row.employeeName ?? string.Empty,
                    Date = row.attendanceDate,
                    CheckInTime = row.checkInTime,
                    CheckOutTime = FormatCheckOutTime(row.checkOutTime),
                    LateMinutes = penalty.Total,
                    LateComings = lateComings,
                    IsLate = lateComings > 0,
                    Status = FormatDutyStatus(
                        null,
                        hasCheckIn: true,
                        penalty.LateMinutes,
                        penalty.EarlyMinutes,
                        lateComings),
                };
            })
            .ToList();

        return new EmployeeAttendanceLiveDayDto
        {
            Date = targetDate,
            TotalEntries = entries.Count,
            OnTimeCount = entries.Count(r => !r.IsLate),
            LateCount = entries.Count(r => r.IsLate),
            Entries = entries,
        };
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

        var attendanceByEmployee = attendanceRows
            .Where(a => a.EmpID.HasValue && a.Date.HasValue)
            .GroupBy(a => a.EmpID!.Value)
            .ToDictionary(
                g => g.Key,
                g => g.GroupBy(a => a.Date!.Value.Date)
                    .Select(dayGroup => dayGroup.OrderByDescending(a => a.ID).First())
                    .OrderBy(a => a.Date!.Value.Date)
                    .ToList());

        var designationIds = employees
            .Where(e => e.DesignationID.HasValue)
            .Select(e => e.DesignationID!.Value)
            .Distinct()
            .ToList();

        var designations = designationIds.Count == 0
            ? new Dictionary<int, DesignationTiming>()
            : await _context.Designations
                .AsNoTracking()
                .Where(d => designationIds.Contains(d.ID))
                .Select(d => new DesignationTiming(
                    d.ID,
                    d.DesignationName,
                    d.MustCheckinTime,
                    d.MustCheckinMinutesDifference,
                    d.LeavingTime))
                .ToDictionaryAsync(d => d.Id, cancellationToken);

        var groups = new List<EmployeeAttendanceEmployeeGroupDto>(employees.Count);
        var employeesWithAttendance = 0;
        var totalDayRecords = 0;

        foreach (var employee in employees)
        {
            DesignationTiming designation = default;
            if (employee.DesignationID is int designationId)
            {
                designations.TryGetValue(designationId, out designation);
            }

            var expectedCheckIn = DesignationTimeHelper.ToTimeOfDay(designation.MustCheckinTime);
            var expectedCheckOut = DesignationTimeHelper.ToTimeOfDay(designation.LeavingTime);

            var days = attendanceByEmployee.TryGetValue(employee.ID, out var dayRecords)
                ? dayRecords.Select(row => MapDayRow(row, expectedCheckIn, expectedCheckOut, designation.GraceMinutes, row.ChangeJson)).ToList()
                : new List<EmployeeAttendanceDayRowDto>();

            if (days.Count > 0)
            {
                employeesWithAttendance++;
                totalDayRecords += days.Count;
            }

            groups.Add(new EmployeeAttendanceEmployeeGroupDto
            {
                EmployeeId = employee.ID,
                EmployeeName = employee.EmployeeName,
                DesignationName = designation.Name,
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

    public async Task<EmployeeMyAttendanceDto> GetMyAttendanceAsync(
        int employeeId,
        int? year = null,
        int? month = null,
        CancellationToken cancellationToken = default)
    {
        var today = PakistanTime.Today;
        var targetYear = year ?? today.Year;
        var targetMonth = month ?? today.Month;

        if (targetMonth is < 1 or > 12)
            throw new ArgumentException("Month must be between 1 and 12.");
        if (targetYear is < 2000 or > 2100)
            throw new ArgumentException("Year is out of range.");

        var employee = await _context.Employees.AsNoTracking()
            .Include(e => e.Designation)
            .FirstOrDefaultAsync(e => e.ID == employeeId && e.IsActive == true, cancellationToken)
            ?? throw new KeyNotFoundException("Employee not found.");

        var monthStart = new DateTime(targetYear, targetMonth, 1);
        var daysInMonth = DateTime.DaysInMonth(targetYear, targetMonth);
        var monthEnd = monthStart.AddDays(daysInMonth);
        var lastVisibleDay = today.Year == targetYear && today.Month == targetMonth
            ? today.Day
            : daysInMonth;

        var attendanceRows = await _context.EmployeeAttendances.AsNoTracking()
            .Where(a => a.EmpID == employeeId && a.Date >= monthStart && a.Date < monthEnd)
            .ToListAsync(cancellationToken);

        var byDate = attendanceRows
            .Where(a => a.Date.HasValue)
            .GroupBy(a => a.Date!.Value.Date)
            .ToDictionary(
                g => g.Key,
                g => g.OrderByDescending(a => a.ID).First());

        var expectedCheckIn = DesignationTimeHelper.ToTimeOfDay(employee.Designation?.MustCheckinTime);
        var expectedCheckOut = DesignationTimeHelper.ToTimeOfDay(employee.Designation?.LeavingTime);
        var graceMinutes = employee.Designation?.MustCheckinMinutesDifference;

        var days = new List<EmployeeMyAttendanceDayDto>(lastVisibleDay);
        var presentDays = 0;
        var lateDays = 0;
        var absentDays = 0;
        var holidayDays = 0;

        for (var day = 1; day <= lastVisibleDay; day++)
        {
            var date = new DateTime(targetYear, targetMonth, day);
            byDate.TryGetValue(date, out var row);
            var mapped = MapMyDay(date, row, expectedCheckIn, expectedCheckOut, graceMinutes, row?.ChangeJson);
            days.Add(mapped);

            if (mapped.IsHoliday) holidayDays++;
            else if (mapped.HasPunch)
            {
                presentDays++;
                if (mapped.IsLate) lateDays++;
            }
            else if (date.DayOfWeek != DayOfWeek.Sunday)
                absentDays++;
        }

        days.Reverse(); // newest first for mobile scroll

        return new EmployeeMyAttendanceDto
        {
            EmployeeId = employee.ID,
            EmployeeName = employee.EmployeeName ?? string.Empty,
            DesignationName = employee.Designation?.DesignationName,
            Year = targetYear,
            Month = targetMonth,
            MonthLabel = monthStart.ToString("MMMM yyyy", CultureInfo.InvariantCulture),
            PresentDays = presentDays,
            LateDays = lateDays,
            AbsentDays = absentDays,
            HolidayDays = holidayDays,
            Days = days,
        };
    }

    private static EmployeeMyAttendanceDayDto MapMyDay(
        DateTime date,
        EmployeeAttendance? attendance,
        TimeSpan? expectedCheckIn,
        TimeSpan? expectedCheckOut,
        int? graceMinutes,
        string? changeJson)
    {
        var dayLabel = date.ToString("ddd d MMM", CultureInfo.InvariantCulture);

        if (attendance is null)
        {
            return new EmployeeMyAttendanceDayDto
            {
                Date = date,
                DayLabel = dayLabel,
                HasPunch = false,
                StatusLabel = date.DayOfWeek == DayOfWeek.Sunday ? "Sunday" : "No punch",
            };
        }

        var isHoliday = string.Equals(attendance.Status, "H", StringComparison.OrdinalIgnoreCase);
        if (isHoliday)
        {
            return new EmployeeMyAttendanceDayDto
            {
                Date = date,
                DayLabel = dayLabel,
                IsHoliday = true,
                StatusLabel = "Holiday",
            };
        }

        var hasCheckIn = !string.IsNullOrWhiteSpace(attendance.Time);
        var lateComings = attendance.LateComings.GetValueOrDefault();
        var penalty = ResolvePenaltyBreakdown(
            date,
            attendance.Time,
            attendance.CheckOutTime,
            expectedCheckIn,
            expectedCheckOut,
            graceMinutes,
            changeJson);
        var statusLabel = FormatDutyStatus(
            attendance.Status,
            hasCheckIn,
            penalty.LateMinutes,
            penalty.EarlyMinutes,
            lateComings);
        var isLate = hasCheckIn && penalty.LateMinutes > 0;

        return new EmployeeMyAttendanceDayDto
        {
            Date = date,
            DayLabel = dayLabel,
            CheckInTime = hasCheckIn ? attendance.Time : null,
            CheckOutTime = FormatCheckOutTime(attendance.CheckOutTime),
            LateMinutes = hasCheckIn ? penalty.Total : 0,
            IsLate = isLate,
            HasPunch = hasCheckIn,
            StatusLabel = statusLabel,
        };
    }

    public async Task<BiometricMarkAttendanceResponseDto> MarkBiometricAttendanceAsync(
        BiometricMarkAttendanceRequestDto request,
        CancellationToken cancellationToken = default)
    {
        var code = request.EmployeeCode.Trim();
        if (code.Length == 0)
            throw new ArgumentException("Employee code is required.");

        var punchAt = PakistanTime.Now;
        var today = punchAt.Date;

        var employee = await _context.Employees
            .Include(e => e.Designation)
            .FirstOrDefaultAsync(e => e.Thumb_ID == code && e.IsActive == true, cancellationToken)
            ?? throw new KeyNotFoundException($"Employee with code '{code}' was not found.");

        var defaultCheckIn = DesignationTimeHelper.ToTimeOfDay(employee.Designation?.MustCheckinTime);
        var defaultCheckOut = DesignationTimeHelper.ToTimeOfDay(employee.Designation?.LeavingTime);
        var graceMinutes = employee.Designation?.MustCheckinMinutesDifference;
        var mustCheckinDisplay = DesignationTimeHelper.FormatTime(employee.Designation?.MustCheckinTime);
        var leavingDisplay = DesignationTimeHelper.FormatTime(employee.Designation?.LeavingTime);

        var row = await _context.EmployeeAttendances
            .FirstOrDefaultAsync(a =>
                a.EmpID == employee.ID &&
                a.Date.HasValue &&
                a.Date.Value.Date == today,
                cancellationToken);

        var hasCheckIn = row != null && !string.IsNullOrWhiteSpace(row.Time);
        var hasCheckOut = row?.CheckOutTime.HasValue == true;

        if (hasCheckIn && hasCheckOut)
            throw new InvalidOperationException("Attendance already completed for today.");

        string punchType;
        int lateMinutes;
        int earlyMinutes;
        int lateComingSlabs;
        decimal? currentSalary;
        decimal? lateDeduction;
        decimal? todaySalary;

        if (!hasCheckIn)
        {
            punchType = "CheckIn";
            lateMinutes = DesignationTimeHelper.CalculateLateMinutes(punchAt.TimeOfDay, defaultCheckIn, graceMinutes);
            earlyMinutes = 0;
            lateComingSlabs = CountLateComings(lateMinutes);
            currentSalary = RoundNullable(employee.Salary);
            lateDeduction = CalculateLateDeductionOnThisDay(today, currentSalary, lateComingSlabs);
            todaySalary = CalculateEmpSalaryOnThisDay(today, currentSalary, lateComingSlabs);

            if (row == null)
            {
                row = new EmployeeAttendance
                {
                    EmpID = employee.ID,
                    Date = today,
                };
                _context.EmployeeAttendances.Add(row);
            }

            row.Time = punchAt.ToString("HH:mm");
            row.Status = "P";
            row.CheckOutTime = null;
            row.LateComings = lateComingSlabs;
            row.CurrentSalary = currentSalary;
            row.LateDeduction = lateDeduction;
            row.TodaySalary = todaySalary;
            row.UpdatedBy = "BiometricKiosk";
            row.ChangeJson = BuildChangeJson(
                "BiometricCheckIn",
                request.DeviceId,
                punchAt,
                lateMinutes,
                earlyMinutes,
                lateComingSlabs,
                currentSalary,
                lateDeduction,
                todaySalary);
        }
        else
        {
            punchType = "CheckOut";
            lateMinutes = CalculateLateMinutesFromStoredCheckIn(today, row!.Time, defaultCheckIn, graceMinutes);
            earlyMinutes = CalculateEarlyMinutes(punchAt.TimeOfDay, defaultCheckOut);
            lateComingSlabs = CountLateComings(lateMinutes + earlyMinutes);
            currentSalary = RoundNullable(employee.Salary);
            lateDeduction = CalculateLateDeductionOnThisDay(today, currentSalary, lateComingSlabs);
            todaySalary = CalculateEmpSalaryOnThisDay(today, currentSalary, lateComingSlabs);

            row.CheckOutTime = punchAt;
            row.LateComings = lateComingSlabs;
            row.CurrentSalary = currentSalary;
            row.LateDeduction = lateDeduction;
            row.TodaySalary = todaySalary;
            row.UpdatedBy = "BiometricKiosk";
            row.ChangeJson = BuildChangeJson(
                "BiometricCheckOut",
                request.DeviceId,
                punchAt,
                lateMinutes,
                earlyMinutes,
                lateComingSlabs,
                currentSalary,
                lateDeduction,
                todaySalary);
        }

        await _context.SaveChangesAsync(cancellationToken);

        var liveRow = new EmployeeAttendanceLiveRowDto
        {
            AttendanceId = row!.ID,
            EmployeeId = employee.ID,
            EmployeeName = employee.EmployeeName ?? string.Empty,
            Date = today,
            CheckInTime = row.Time,
            LateMinutes = lateMinutes + earlyMinutes,
            LateComings = row.LateComings ?? 0,
            IsLate = (row.LateComings ?? 0) > 0,
            Status = FormatDutyStatus(
                row.Status,
                hasCheckIn: true,
                lateMinutes,
                earlyMinutes,
                row.LateComings ?? 0),
        };

        await _liveUpdateSink.PublishAsync(_tenantContext.Campus, liveRow, cancellationToken);

        var employeeName = employee.EmployeeName ?? string.Empty;
        var punchTimeDisplay = punchAt.ToString("hh:mm tt", CultureInfo.InvariantCulture);
        var isCheckIn = string.Equals(punchType, "CheckIn", StringComparison.OrdinalIgnoreCase);
        var isLate = (row!.LateComings ?? 0) > 0;

        await _notificationService.PublishAsync(
            CampusNotificationFactory.Create(
                isCheckIn
                    ? CampusNotificationTypes.AttendanceCheckIn
                    : CampusNotificationTypes.AttendanceCheckOut,
                isCheckIn ? "Staff check-in" : "Staff check-out",
                isCheckIn
                    ? $"{employeeName} checked in at {punchTimeDisplay}."
                    : $"{employeeName} checked out at {punchTimeDisplay}.",
                "/campus/live-attendance",
                isLate
                    ? CampusNotificationSeverities.Warning
                    : CampusNotificationSeverities.Success,
                ["view_live_emp_attendance"]),
            cancellationToken);

        return new BiometricMarkAttendanceResponseDto
        {
            EmployeeId = employee.ID,
            EmployeeCode = employee.Thumb_ID ?? code,
            EmployeeName = employeeName,
            PunchType = punchType,
            PunchTime = punchTimeDisplay,
            MustCheckinTime = mustCheckinDisplay,
            LeavingTime = leavingDisplay,
            LateMinutes = lateMinutes,
            EarlyMinutes = earlyMinutes,
            LateComings = row.LateComings ?? 0,
            TimingMessage = BuildTimingMessage(punchType, lateMinutes, earlyMinutes),
        };
    }

    public async Task<EmployeeAttendanceManageDayDto> GetManageDayAsync(
        DateTime? date = null,
        CancellationToken cancellationToken = default)
    {
        var targetDate = (date ?? PakistanTime.Now).Date;
        var dayEnd = targetDate.AddDays(1);

        var punched = await (
            from attendance in _context.EmployeeAttendances.AsNoTracking()
            join employee in _context.Employees.AsNoTracking()
                on attendance.EmpID equals employee.ID
            join designation in _context.Designations.AsNoTracking()
                on employee.DesignationID equals designation.ID into designationJoin
            from designation in designationJoin.DefaultIfEmpty()
            where attendance.Date.HasValue &&
                  attendance.Date.Value >= targetDate &&
                  attendance.Date.Value < dayEnd &&
                  attendance.EmpID != null &&
                  employee.IsActive == true
            orderby employee.EmployeeName
            select new
            {
                attendance.ID,
                employeeId = employee.ID,
                employeeName = employee.EmployeeName,
                attendanceDate = attendance.Date!.Value.Date,
                checkInTime = attendance.Time,
                checkOutTime = attendance.CheckOutTime,
                status = attendance.Status,
                lateComings = attendance.LateComings,
                lateDeduction = attendance.LateDeduction,
                todaySalary = attendance.TodaySalary,
                updatedBy = attendance.UpdatedBy,
                changeJson = attendance.ChangeJson,
                designationId = designation != null ? (int?)designation.ID : null,
                mustCheckinTime = designation != null ? designation.MustCheckinTime : null,
                leavingTime = designation != null ? designation.LeavingTime : null,
                graceMinutes = designation != null ? designation.MustCheckinMinutesDifference : null,
            })
            .ToListAsync(cancellationToken);

        var punchedIds = punched.Select(x => x.employeeId).ToHashSet();

        var missing = await _context.Employees
            .AsNoTracking()
            .Where(e => e.IsActive == true && !punchedIds.Contains(e.ID))
            .OrderBy(e => e.EmployeeName)
            .Select(e => new EmployeeAttendanceMissingEmployeeDto
            {
                EmployeeId = e.ID,
                EmployeeName = e.EmployeeName ?? string.Empty,
            })
            .ToListAsync(cancellationToken);

        var punchedDesignationIds = punched
            .Where(x => x.designationId.HasValue)
            .Select(x => x.designationId!.Value)
            .ToHashSet();

        var designations = await _context.Designations
            .AsNoTracking()
            .Where(d => d.IsActive != false || punchedDesignationIds.Contains(d.ID))
            .OrderBy(d => d.DesignationName)
            .ToListAsync(cancellationToken);

        var punchCountByDesignation = punched
            .Where(x =>
                x.designationId.HasValue &&
                !string.Equals(x.status, "H", StringComparison.OrdinalIgnoreCase) &&
                !string.IsNullOrWhiteSpace(x.checkInTime))
            .GroupBy(x => x.designationId!.Value)
            .ToDictionary(g => g.Key, g => g.Count());

        var designationTimes = designations
            .Select(d => new EmployeeAttendanceDayDesignationTimingDto
            {
                DesignationId = d.ID,
                DesignationName = d.DesignationName ?? $"Designation {d.ID}",
                CheckInTime = FormatHhMm(d.MustCheckinTime),
                CheckOutTime = FormatHhMm(d.LeavingTime),
                GraceMinutes = d.MustCheckinMinutesDifference,
                PunchCount = punchCountByDesignation.GetValueOrDefault(d.ID),
            })
            .ToList();

        var entries = punched
            .Select(row =>
            {
                var penalty = ResolvePenaltyBreakdown(
                    row.attendanceDate,
                    row.checkInTime,
                    row.checkOutTime,
                    DesignationTimeHelper.ToTimeOfDay(row.mustCheckinTime),
                    DesignationTimeHelper.ToTimeOfDay(row.leavingTime),
                    row.graceMinutes,
                    row.changeJson);
                var lateComings = row.lateComings ?? 0;
                var hasCheckIn = !string.IsNullOrWhiteSpace(row.checkInTime);
                var rawStatus = row.status;

                return new EmployeeAttendanceManageRowDto
                {
                    AttendanceId = row.ID,
                    EmployeeId = row.employeeId,
                    EmployeeName = row.employeeName ?? string.Empty,
                    Date = row.attendanceDate,
                    CheckInTime = row.checkInTime,
                    CheckOutTime = FormatCheckOutTime(row.checkOutTime),
                    LateMinutes = penalty.Total,
                    LateComings = lateComings,
                    IsLate = lateComings > 0,
                    Status = FormatDutyStatus(
                        rawStatus,
                        hasCheckIn,
                        penalty.LateMinutes,
                        penalty.EarlyMinutes,
                        lateComings),
                    UpdatedBy = row.updatedBy,
                    IsManuallyAdjusted = IsManuallyAdjusted(row.changeJson),
                    LateDeduction = row.lateDeduction,
                    TodaySalary = row.todaySalary,
                };
            })
            .ToList();

        return new EmployeeAttendanceManageDayDto
        {
            Date = targetDate,
            TotalEntries = entries.Count,
            HasDutyTimeAdjustment = punched.Any(x => IsDutyTimeOverride(x.changeJson)),
            Entries = entries,
            MissingEmployees = missing,
            DesignationTimes = designationTimes,
        };
    }

    public async Task<EmployeeAttendanceMutationResultDto> EditAttendanceAsync(
        int attendanceId,
        EditEmployeeAttendanceRequestDto request,
        int? editedByUserId,
        CancellationToken cancellationToken = default)
    {
        var editedByUsername = await ResolveUsernameAsync(editedByUserId, cancellationToken);

        var row = await _context.EmployeeAttendances
            .FirstOrDefaultAsync(a => a.ID == attendanceId, cancellationToken)
            ?? throw new KeyNotFoundException("Attendance record was not found.");

        if (!row.EmpID.HasValue || !row.Date.HasValue)
            throw new InvalidOperationException("Attendance record is incomplete.");

        var employee = await _context.Employees
            .Include(e => e.Designation)
            .FirstOrDefaultAsync(e => e.ID == row.EmpID.Value, cancellationToken)
            ?? throw new KeyNotFoundException("Employee was not found.");

        var before = SnapshotAttendance(row);
        ApplyManualTimes(row, row.Date.Value.Date, request.CheckInTime, request.CheckOutTime);
        var calc = RecalculateAndApply(row, employee, row.Date.Value.Date);

        row.UpdatedBy = editedByUsername;
        row.ChangeJson = BuildManualChangeJson(
            "ManualEdit",
            editedByUsername,
            before,
            SnapshotAttendance(row),
            calc);

        await _activityLogService.WriteAsync(
            ActivityLogTypes.EmployeeAttendanceEdit,
            ActivityLogEntityTypes.EmployeeAttendance,
            row.ID,
            employee.EmployeeName,
            editedByUserId,
            new
            {
                source = "ManualEdit",
                employeeId = employee.ID,
                date = row.Date.Value.Date.ToString("yyyy-MM-dd"),
                before,
                after = SnapshotAttendance(row),
                calculation = calc,
            },
            cancellationToken);

        await _context.SaveChangesAsync(cancellationToken);
        await PublishLiveIfTodayAsync(row, employee, calc, cancellationToken);
        return ToMutationResult(row, employee, calc);
    }

    public async Task<DeleteEmployeeAttendanceResultDto> DeleteAttendanceAsync(
        int attendanceId,
        int? editedByUserId,
        CancellationToken cancellationToken = default)
    {
        var editedByUsername = await ResolveUsernameAsync(editedByUserId, cancellationToken);

        var row = await _context.EmployeeAttendances
            .FirstOrDefaultAsync(a => a.ID == attendanceId, cancellationToken)
            ?? throw new KeyNotFoundException("Attendance record was not found.");

        if (!row.EmpID.HasValue || !row.Date.HasValue)
            throw new InvalidOperationException("Attendance record is incomplete.");

        var employee = await _context.Employees
            .AsNoTracking()
            .FirstOrDefaultAsync(e => e.ID == row.EmpID.Value, cancellationToken)
            ?? throw new KeyNotFoundException("Employee was not found.");

        var before = SnapshotAttendance(row);
        var targetDate = row.Date.Value.Date;
        var result = new DeleteEmployeeAttendanceResultDto
        {
            AttendanceId = row.ID,
            EmployeeId = employee.ID,
            EmployeeName = employee.EmployeeName ?? string.Empty,
            Date = targetDate,
        };

        await _activityLogService.WriteAsync(
            ActivityLogTypes.EmployeeAttendanceDelete,
            ActivityLogEntityTypes.EmployeeAttendance,
            row.ID,
            employee.EmployeeName,
            editedByUserId,
            new
            {
                source = "ManualDelete",
                employeeId = employee.ID,
                date = targetDate.ToString("yyyy-MM-dd"),
                deletedBy = editedByUsername,
                before,
            },
            cancellationToken);

        _context.EmployeeAttendances.Remove(row);
        await _context.SaveChangesAsync(cancellationToken);
        return result;
    }

    public async Task<EmployeeAttendanceMutationResultDto> MarkPresentAsync(
        MarkEmployeePresentRequestDto request,
        int? editedByUserId,
        CancellationToken cancellationToken = default)
    {
        var editedByUsername = await ResolveUsernameAsync(editedByUserId, cancellationToken);
        if (request.EmployeeId <= 0)
            throw new ArgumentException("Employee is required.");
        if (string.IsNullOrWhiteSpace(request.CheckInTime))
            throw new ArgumentException("Check-in time is required.");

        var targetDate = request.Date.Date;
        var dayEnd = targetDate.AddDays(1);

        var employee = await _context.Employees
            .Include(e => e.Designation)
            .FirstOrDefaultAsync(e => e.ID == request.EmployeeId && e.IsActive == true, cancellationToken)
            ?? throw new KeyNotFoundException("Employee was not found.");

        var row = await _context.EmployeeAttendances
            .FirstOrDefaultAsync(a =>
                a.EmpID == employee.ID &&
                a.Date.HasValue &&
                a.Date.Value >= targetDate &&
                a.Date.Value < dayEnd,
                cancellationToken);

        if (row != null && !string.IsNullOrWhiteSpace(row.Time))
            throw new InvalidOperationException("Attendance already has a check-in. Use edit instead.");

        if (row == null)
        {
            row = new EmployeeAttendance
            {
                EmpID = employee.ID,
                Date = targetDate,
            };
            _context.EmployeeAttendances.Add(row);
        }

        var before = SnapshotAttendance(row);
        ApplyManualTimes(row, targetDate, request.CheckInTime, request.CheckOutTime);
        var calc = RecalculateAndApply(row, employee, targetDate);

        row.UpdatedBy = editedByUsername;
        row.ChangeJson = BuildManualChangeJson(
            "ManualMarkPresent",
            editedByUsername,
            before,
            SnapshotAttendance(row),
            calc);

        await _context.SaveChangesAsync(cancellationToken);

        await _activityLogService.WriteAsync(
            ActivityLogTypes.EmployeeAttendanceMarkPresent,
            ActivityLogEntityTypes.EmployeeAttendance,
            row.ID,
            employee.EmployeeName,
            editedByUserId,
            new
            {
                source = "ManualMarkPresent",
                employeeId = employee.ID,
                date = targetDate.ToString("yyyy-MM-dd"),
                before,
                after = SnapshotAttendance(row),
                calculation = calc,
            },
            cancellationToken);

        await _context.SaveChangesAsync(cancellationToken);
        await PublishLiveIfTodayAsync(row, employee, calc, cancellationToken);
        return ToMutationResult(row, employee, calc);
    }

    public async Task<BackfillEmployeeAttendanceResultDto> BackfillAttendanceAsync(
        BackfillEmployeeAttendanceRequestDto request,
        int? editedByUserId,
        CancellationToken cancellationToken = default)
    {
        var editedByUsername = await ResolveUsernameAsync(editedByUserId, cancellationToken);
        if (request.EmployeeId <= 0)
            throw new ArgumentException("Employee is required.");
        if (request.Days is null || request.Days.Count == 0)
            throw new ArgumentException("Add at least one date.");
        if (request.Days.Count > 62)
            throw new ArgumentException("You can backfill at most 62 dates at once.");

        var employee = await _context.Employees
            .Include(e => e.Designation)
            .FirstOrDefaultAsync(e => e.ID == request.EmployeeId && e.IsActive == true, cancellationToken)
            ?? throw new KeyNotFoundException("Employee was not found.");

        var normalizedDays = new List<(DateTime Date, string CheckIn, string? CheckOut)>();
        var seenDates = new HashSet<DateTime>();
        foreach (var day in request.Days)
        {
            var date = day.Date.Date;
            if (!seenDates.Add(date))
                continue;
            if (string.IsNullOrWhiteSpace(day.CheckInTime))
                throw new ArgumentException($"Check-in time is required for {date:yyyy-MM-dd}.");
            normalizedDays.Add((date, day.CheckInTime.Trim(), string.IsNullOrWhiteSpace(day.CheckOutTime) ? null : day.CheckOutTime.Trim()));
        }

        if (normalizedDays.Count == 0)
            throw new ArgumentException("Add at least one date.");

        var minDate = normalizedDays.Min(d => d.Date);
        var maxDateExclusive = normalizedDays.Max(d => d.Date).AddDays(1);

        var existingRows = await _context.EmployeeAttendances
            .Where(a =>
                a.EmpID == employee.ID &&
                a.Date.HasValue &&
                a.Date.Value >= minDate &&
                a.Date.Value < maxDateExclusive)
            .ToListAsync(cancellationToken);

        var rowByDate = existingRows
            .Where(r => r.Date.HasValue)
            .GroupBy(r => r.Date!.Value.Date)
            .ToDictionary(g => g.Key, g => g.OrderByDescending(r => r.ID).First());

        var marked = new List<(EmployeeAttendance Row, object Before, AttendanceCalcResult Calc, DateTime Date)>();
        var skippedCount = 0;

        foreach (var (date, checkIn, checkOut) in normalizedDays.OrderBy(d => d.Date))
        {
            rowByDate.TryGetValue(date, out var row);

            if (row != null && !string.IsNullOrWhiteSpace(row.Time))
            {
                var existingIn = NormalizeTimeOfDayText(row.Time) ?? string.Empty;
                var existingOut = FormatCheckOutTime(row.CheckOutTime) ?? string.Empty;
                var nextOut = checkOut ?? string.Empty;
                if (string.Equals(existingIn, checkIn, StringComparison.Ordinal) &&
                    string.Equals(existingOut, nextOut, StringComparison.Ordinal))
                {
                    skippedCount++;
                    continue;
                }
            }

            if (row == null)
            {
                row = new EmployeeAttendance
                {
                    EmpID = employee.ID,
                    Date = date,
                };
                _context.EmployeeAttendances.Add(row);
                rowByDate[date] = row;
            }

            var before = SnapshotAttendance(row);
            ApplyManualTimes(row, date, checkIn, checkOut);
            var calc = RecalculateAndApply(row, employee, date);
            row.UpdatedBy = editedByUsername;
            row.ChangeJson = BuildManualChangeJson(
                "ManualMarkPresent",
                editedByUsername,
                before,
                SnapshotAttendance(row),
                calc);
            marked.Add((row, before, calc, date));
        }

        await _context.SaveChangesAsync(cancellationToken);

        foreach (var (row, before, calc, date) in marked)
        {
            await _activityLogService.WriteAsync(
                ActivityLogTypes.EmployeeAttendanceBackfill,
                ActivityLogEntityTypes.EmployeeAttendance,
                row.ID,
                employee.EmployeeName,
                editedByUserId,
                new
                {
                    source = "ManualBackfill",
                    employeeId = employee.ID,
                    date = date.ToString("yyyy-MM-dd"),
                    before,
                    after = SnapshotAttendance(row),
                    calculation = calc,
                },
                cancellationToken);
        }

        if (marked.Count > 0)
            await _context.SaveChangesAsync(cancellationToken);

        foreach (var (row, _, calc, _) in marked)
            await PublishLiveIfTodayAsync(row, employee, calc, cancellationToken);

        return new BackfillEmployeeAttendanceResultDto
        {
            EmployeeId = employee.ID,
            EmployeeName = employee.EmployeeName ?? string.Empty,
            MarkedCount = marked.Count,
            SkippedCount = skippedCount,
        };
    }

    public async Task<BackfillEmployeeAttendanceExistingDto> GetBackfillExistingAsync(
        int employeeId,
        DateTime from,
        DateTime to,
        CancellationToken cancellationToken = default)
    {
        if (employeeId <= 0)
            throw new ArgumentException("Employee is required.");

        var fromDate = from.Date;
        var toDate = to.Date;
        if (toDate < fromDate)
            throw new ArgumentException("From date must be on or before to date.");
        if ((toDate - fromDate).TotalDays > 62)
            throw new ArgumentException("Choose a shorter range (62 dates max).");

        var employee = await _context.Employees
            .AsNoTracking()
            .FirstOrDefaultAsync(e => e.ID == employeeId && e.IsActive == true, cancellationToken)
            ?? throw new KeyNotFoundException("Employee was not found.");

        var dayEnd = toDate.AddDays(1);
        var rows = await _context.EmployeeAttendances
            .AsNoTracking()
            .Where(a =>
                a.EmpID == employeeId &&
                a.Date.HasValue &&
                a.Date.Value >= fromDate &&
                a.Date.Value < dayEnd)
            .OrderBy(a => a.Date)
            .ThenByDescending(a => a.ID)
            .ToListAsync(cancellationToken);

        var days = rows
            .Where(r => r.Date.HasValue)
            .GroupBy(r => r.Date!.Value.Date)
            .Select(g => g.First())
            .Select(row =>
            {
                var checkIn = NormalizeTimeOfDayText(row.Time);
                return new BackfillEmployeeAttendanceExistingDayDto
                {
                    Date = row.Date!.Value.Date,
                    CheckInTime = checkIn,
                    CheckOutTime = FormatCheckOutTime(row.CheckOutTime),
                    HasCheckIn = !string.IsNullOrWhiteSpace(checkIn),
                };
            })
            .Where(d => d.HasCheckIn || !string.IsNullOrWhiteSpace(d.CheckOutTime))
            .OrderBy(d => d.Date)
            .ToList();

        return new BackfillEmployeeAttendanceExistingDto
        {
            EmployeeId = employee.ID,
            EmployeeName = employee.EmployeeName ?? string.Empty,
            Days = days,
        };
    }

    public async Task<MarkEmployeeHolidayResultDto> MarkDayAsHolidayAsync(
        MarkEmployeeHolidayRequestDto request,
        int? editedByUserId,
        CancellationToken cancellationToken = default)
    {
        var editedByUsername = await ResolveUsernameAsync(editedByUserId, cancellationToken);
        var targetDate = request.Date.Date;
        var dayEnd = targetDate.AddDays(1);

        var employees = await _context.Employees
            .Where(e => e.IsActive == true)
            .OrderBy(e => e.EmployeeName)
            .ToListAsync(cancellationToken);

        var existingRows = await _context.EmployeeAttendances
            .Where(a =>
                a.EmpID != null &&
                a.Date.HasValue &&
                a.Date.Value >= targetDate &&
                a.Date.Value < dayEnd)
            .ToListAsync(cancellationToken);

        var rowByEmployeeId = existingRows
            .Where(r => r.EmpID.HasValue)
            .GroupBy(r => r.EmpID!.Value)
            .ToDictionary(g => g.Key, g => g.OrderByDescending(r => r.ID).First());

        var markedCount = 0;
        var skippedCount = 0;

        foreach (var employee in employees)
        {
            rowByEmployeeId.TryGetValue(employee.ID, out var row);
            if (row != null && !request.OverwriteExisting)
            {
                skippedCount++;
                continue;
            }

            var before = row != null ? SnapshotAttendance(row) : null;
            var salaryPerDay = CalculateSalaryPerDay(targetDate, employee.Salary ?? 0);

            if (row == null)
            {
                row = new EmployeeAttendance
                {
                    EmpID = employee.ID,
                    Date = targetDate,
                };
                _context.EmployeeAttendances.Add(row);
            }

            ApplyHoliday(row, employee, salaryPerDay);
            row.UpdatedBy = editedByUsername;
            row.ChangeJson = BuildHolidayChangeJson(editedByUsername, before, SnapshotAttendance(row));
            markedCount++;
        }

        await _context.SaveChangesAsync(cancellationToken);

        await _activityLogService.WriteAsync(
            ActivityLogTypes.EmployeeAttendanceMarkHoliday,
            ActivityLogEntityTypes.EmployeeAttendance,
            0,
            targetDate.ToString("yyyy-MM-dd"),
            editedByUserId,
            new
            {
                source = "ManualMarkHoliday",
                date = targetDate.ToString("yyyy-MM-dd"),
                overwriteExisting = request.OverwriteExisting,
                markedCount,
                skippedCount,
                existingCount = rowByEmployeeId.Count,
            },
            cancellationToken);

        return new MarkEmployeeHolidayResultDto
        {
            Date = targetDate,
            MarkedCount = markedCount,
            SkippedCount = skippedCount,
            ExistingCount = rowByEmployeeId.Count,
        };
    }

    public async Task<RecalculateDutyTimesResultDto> RecalculateDutyTimesAsync(
        RecalculateDutyTimesRequestDto request,
        int? editedByUserId,
        CancellationToken cancellationToken = default)
    {
        var editedByUsername = await ResolveUsernameAsync(editedByUserId, cancellationToken);
        var targetDate = request.Date.Date;
        var dayEnd = targetDate.AddDays(1);

        if (request.Designations is null || request.Designations.Count == 0)
            throw new ArgumentException("At least one designation with duty times is required.");

        var expectedByDesignation = new Dictionary<int, (TimeSpan? CheckIn, TimeSpan? CheckOut)>();
        foreach (var item in request.Designations)
        {
            if (item.DesignationId <= 0)
                throw new ArgumentException("Designation is required.");
            if (string.IsNullOrWhiteSpace(item.CheckInTime))
                throw new ArgumentException("Check-in time is required for each designation.");
            if (!TryParseTimeOfDay(item.CheckInTime, out var checkIn))
                throw new ArgumentException("Invalid check-in time. Use HH:mm.");

            TimeSpan? checkOut = null;
            if (!string.IsNullOrWhiteSpace(item.CheckOutTime))
            {
                if (!TryParseTimeOfDay(item.CheckOutTime, out var parsedOut))
                    throw new ArgumentException("Invalid check-out time. Use HH:mm.");
                checkOut = parsedOut;
            }

            expectedByDesignation[item.DesignationId] = (checkIn, checkOut);
        }

        var employees = await _context.Employees
            .Include(e => e.Designation)
            .Where(e => e.IsActive == true)
            .ToListAsync(cancellationToken);

        var existingRows = await _context.EmployeeAttendances
            .Where(a =>
                a.EmpID != null &&
                a.Date.HasValue &&
                a.Date.Value >= targetDate &&
                a.Date.Value < dayEnd)
            .ToListAsync(cancellationToken);

        var rowByEmployeeId = existingRows
            .Where(r => r.EmpID.HasValue)
            .GroupBy(r => r.EmpID!.Value)
            .ToDictionary(g => g.Key, g => g.OrderByDescending(r => r.ID).First());

        var recalculatedCount = 0;
        var skippedCount = 0;

        foreach (var employee in employees)
        {
            if (!rowByEmployeeId.TryGetValue(employee.ID, out var row))
                continue;

            if (string.Equals(row.Status, "H", StringComparison.OrdinalIgnoreCase) ||
                string.IsNullOrWhiteSpace(row.Time))
            {
                skippedCount++;
                continue;
            }

            if (employee.DesignationID is not int designationId ||
                !expectedByDesignation.TryGetValue(designationId, out var expected))
            {
                skippedCount++;
                continue;
            }

            var before = SnapshotAttendance(row);
            var calc = RecalculateAndApply(
                row,
                employee,
                targetDate,
                expected.CheckIn,
                expected.CheckOut,
                useOverrideTimes: true);
            var after = SnapshotAttendance(row);

            row.UpdatedBy = editedByUsername;
            row.ChangeJson = BuildDutyTimeOverrideChangeJson(
                editedByUsername,
                before,
                after,
                calc,
                designationId,
                employee.Designation?.DesignationName,
                FormatHhMm(expected.CheckIn),
                FormatHhMm(expected.CheckOut));

            await PublishLiveIfTodayAsync(row, employee, calc, cancellationToken);
            recalculatedCount++;
        }

        var designationNameById = employees
            .Where(e => e.DesignationID.HasValue && e.Designation != null)
            .GroupBy(e => e.DesignationID!.Value)
            .ToDictionary(g => g.Key, g => g.First().Designation!.DesignationName);

        await _activityLogService.WriteAsync(
            ActivityLogTypes.EmployeeAttendanceRecalculateDutyTimes,
            ActivityLogEntityTypes.EmployeeAttendance,
            0,
            targetDate.ToString("yyyy-MM-dd"),
            editedByUserId,
            new
            {
                source = "DayTimingOverride",
                date = targetDate.ToString("yyyy-MM-dd"),
                recalculatedCount,
                skippedCount,
                designations = expectedByDesignation.Select(kv => new
                {
                    designationId = kv.Key,
                    designationName = designationNameById.GetValueOrDefault(kv.Key),
                    checkInTime = FormatHhMm(kv.Value.CheckIn),
                    checkOutTime = FormatHhMm(kv.Value.CheckOut),
                }),
            },
            cancellationToken);

        await _context.SaveChangesAsync(cancellationToken);

        return new RecalculateDutyTimesResultDto
        {
            Date = targetDate,
            RecalculatedCount = recalculatedCount,
            SkippedCount = skippedCount,
        };
    }

    private async Task<string> ResolveUsernameAsync(int? userId, CancellationToken cancellationToken)
    {
        if (userId is int uid and > 0)
        {
            var username = await _context.Users
                .AsNoTracking()
                .Where(u => u.ID == uid)
                .Select(u => u.Username)
                .FirstOrDefaultAsync(cancellationToken);

            if (!string.IsNullOrWhiteSpace(username))
                return username.Trim();
        }

        throw new InvalidOperationException("Signed-in user could not be resolved.");
    }

    public async Task<IReadOnlyList<ActivityLogDto>> GetAttendanceActivityAsync(
        int attendanceId,
        CancellationToken cancellationToken = default)
    {
        var exists = await _context.EmployeeAttendances
            .AsNoTracking()
            .AnyAsync(a => a.ID == attendanceId, cancellationToken);
        if (!exists)
            throw new KeyNotFoundException("Attendance record was not found.");

        var page = await _activityLogService.GetAsync(
            new ActivityLogFilterDto
            {
                EntityType = ActivityLogEntityTypes.EmployeeAttendance,
                EntityId = attendanceId,
                PageNumber = 1,
                PageSize = 50,
            },
            cancellationToken);

        return page.Items;
    }

    private static int CalculateEarlyMinutes(TimeSpan actual, TimeSpan? expected) =>
        EmployeeAttendanceCalculator.CalculateEarlyMinutes(actual, expected);

    private static int CountLateComings(int minutesDifference) =>
        EmployeeAttendanceCalculator.CountLateComings(minutesDifference);

    private static decimal? CalculateLateDeductionOnThisDay(
        DateTime date,
        decimal? monthlySalary,
        int lateComings) =>
        EmployeeAttendanceCalculator.CalculateLateDeductionOnThisDay(date, monthlySalary, lateComings);

    private static decimal? CalculateEmpSalaryOnThisDay(
        DateTime date,
        decimal? monthlySalary,
        int lateComings) =>
        EmployeeAttendanceCalculator.CalculateEmpSalaryOnThisDay(date, monthlySalary, lateComings);

    private static decimal? RoundNullable(decimal? value) =>
        EmployeeAttendanceCalculator.RoundNullable(value);

    private static decimal CalculateSalaryPerDay(DateTime date, decimal monthlySalary) =>
        EmployeeAttendanceCalculator.CalculateSalaryPerDay(date, monthlySalary);

    private static int CalculateLateMinutesFromStoredCheckIn(
        DateTime date,
        string? checkInText,
        TimeSpan? expectedCheckIn,
        int? graceMinutes) =>
        EmployeeAttendanceCalculator.CalculateLateMinutesFromStoredCheckIn(
            date,
            checkInText,
            expectedCheckIn,
            graceMinutes);

    private static string BuildTimingMessage(string punchType, int lateMinutes, int earlyMinutes)
    {
        if (punchType == "CheckIn")
        {
            return lateMinutes > 0
                ? $"You are {DesignationTimeHelper.FormatDuration(lateMinutes)} late."
                : "You are on time.";
        }

        if (earlyMinutes > 0 && lateMinutes > 0)
            return $"Checked out {DesignationTimeHelper.FormatDuration(earlyMinutes)} early. You were {DesignationTimeHelper.FormatDuration(lateMinutes)} late at check-in.";

        if (earlyMinutes > 0)
            return $"You left {DesignationTimeHelper.FormatDuration(earlyMinutes)} early.";

        if (lateMinutes > 0)
            return $"Checked out on time. You were {DesignationTimeHelper.FormatDuration(lateMinutes)} late at check-in.";

        return "You are on time.";
    }

    private static string BuildChangeJson(
        string source,
        string? deviceId,
        DateTime punchAt,
        int lateMinutes,
        int earlyMinutes,
        int lateComings,
        decimal? currentSalary,
        decimal? lateDeduction,
        decimal? todaySalary) =>
        JsonSerializer.Serialize(new
        {
            Source = source,
            DeviceId = deviceId,
            PunchAt = punchAt.ToString("o"),
            Calculation = new
            {
                lateMinutes,
                earlyMinutes,
                totalMinutes = lateMinutes + earlyMinutes,
                lateComings,
            },
            Salary = new
            {
                currentSalary,
                lateDeduction,
                todaySalary,
            },
        });

    private static EmployeeAttendanceDayRowDto MapDayRow(
        EmployeeAttendance attendance,
        TimeSpan? expectedCheckIn,
        TimeSpan? expectedCheckOut,
        int? graceMinutes,
        string? changeJson)
    {
        var date = attendance.Date!.Value.Date;
        var lateComings = attendance.LateComings ?? 0;
        var hasCheckIn = !string.IsNullOrWhiteSpace(attendance.Time);
        var lateMinutes = ResolveDisplayedLateMinutes(date, attendance.Time, expectedCheckIn, graceMinutes, changeJson);
        var earlyMinutes = 0;
        if (attendance.CheckOutTime.HasValue)
        {
            earlyMinutes = CalculateEarlyMinutes(attendance.CheckOutTime.Value.TimeOfDay, expectedCheckOut);
        }

        var isHoliday = string.Equals(attendance.Status, "H", StringComparison.OrdinalIgnoreCase);
        var isLate = !isHoliday && hasCheckIn && (lateComings > 0 || lateMinutes > 0);

        return new()
        {
            Date = date,
            CheckInTime = isHoliday ? null : attendance.Time,
            CheckOutTime = isHoliday ? null : FormatCheckOutTime(attendance.CheckOutTime),
            LateComings = isHoliday ? 0 : attendance.LateComings,
            LateMinutes = isHoliday ? 0 : lateMinutes,
            EarlyMinutes = isHoliday ? 0 : earlyMinutes,
            IsLate = isLate,
            Status = isHoliday
                ? "Holiday"
                : !hasCheckIn
                    ? "Absent"
                    : isLate
                        ? "Late"
                        : "On time",
        };
    }

    private readonly record struct DesignationTiming(
        int Id,
        string? Name,
        DateTime? MustCheckinTime,
        int? GraceMinutes,
        DateTime? LeavingTime);

    private static string? FormatCheckOutTime(DateTime? checkOutTime) =>
        checkOutTime.HasValue ? checkOutTime.Value.ToString("HH:mm") : null;

    private static string? NormalizeTimeOfDayText(string? timeText)
    {
        if (string.IsNullOrWhiteSpace(timeText))
            return null;
        if (TryParseTimeOfDay(timeText, out var time))
            return time.ToString(@"hh\:mm");
        var shortText = timeText.Trim();
        if (shortText.Length >= 5 && shortText[2] == ':')
            return shortText[..5];
        return shortText;
    }

    private static bool IsManuallyAdjusted(string? changeJson)
    {
        var source = ReadChangeJsonSource(changeJson);
        return source != null && ManualSources.Contains(source);
    }

    private static bool IsDutyTimeOverride(string? changeJson) =>
        string.Equals(ReadChangeJsonSource(changeJson), "DayTimingOverride", StringComparison.OrdinalIgnoreCase);

    private static int CombinedPenaltyMinutes(AttendanceCalcResult calc) =>
        calc.LateMinutes + calc.EarlyMinutes;

    private readonly record struct PenaltyBreakdown(int LateMinutes, int EarlyMinutes)
    {
        public int Total => LateMinutes + EarlyMinutes;
    }

    private static PenaltyBreakdown ResolvePenaltyBreakdown(
        DateTime date,
        string? checkInText,
        DateTime? checkOutTime,
        TimeSpan? expectedCheckIn,
        TimeSpan? expectedCheckOut,
        int? graceMinutes,
        string? changeJson)
    {
        if (TryReadChangeJsonPenaltyBreakdown(changeJson, out var stored))
            return stored;

        var lateMinutes = CalculateLateMinutesFromStoredCheckIn(date, checkInText, expectedCheckIn, graceMinutes);
        var earlyMinutes = 0;
        if (checkOutTime.HasValue)
            earlyMinutes = CalculateEarlyMinutes(checkOutTime.Value.TimeOfDay, expectedCheckOut);

        return new PenaltyBreakdown(lateMinutes, earlyMinutes);
    }

    private static bool TryReadChangeJsonPenaltyBreakdown(string? changeJson, out PenaltyBreakdown breakdown)
    {
        breakdown = default;
        if (string.IsNullOrWhiteSpace(changeJson))
            return false;

        try
        {
            using var doc = JsonDocument.Parse(changeJson);
            if (!doc.RootElement.TryGetProperty("Calculation", out var calc) ||
                calc.ValueKind != JsonValueKind.Object)
            {
                return false;
            }

            var hasLate = TryGetInt32Property(calc, "LateMinutes", out var lateMinutes) ||
                          TryGetInt32Property(calc, "lateMinutes", out lateMinutes);
            var hasEarly = TryGetInt32Property(calc, "EarlyMinutes", out var earlyMinutes) ||
                           TryGetInt32Property(calc, "earlyMinutes", out earlyMinutes);

            if (hasLate && hasEarly)
            {
                breakdown = new PenaltyBreakdown(lateMinutes, earlyMinutes);
                return true;
            }

            return false;
        }
        catch (JsonException)
        {
            return false;
        }
    }

    private static string FormatDutyStatus(
        string? rawStatus,
        bool hasCheckIn,
        int lateArrivalMinutes,
        int earlyMinutes,
        int lateComings)
    {
        if (string.Equals(rawStatus, "H", StringComparison.OrdinalIgnoreCase))
            return "Holiday";
        if (!hasCheckIn)
            return "No check-in";

        var lateArrival = lateArrivalMinutes > 0;
        var leftEarly = earlyMinutes > 0;
        if (lateArrival && leftEarly)
            return "Late, left early";
        if (leftEarly)
            return "Left early";
        if (lateArrival || lateComings > 0)
            return "Late";
        return "On time";
    }

    private static bool TryGetInt32Property(JsonElement obj, string name, out int value)
    {
        value = 0;
        return obj.TryGetProperty(name, out var prop) && prop.TryGetInt32(out value);
    }

    private static int ResolveDisplayedLateMinutes(
        DateTime date,
        string? checkInText,
        TimeSpan? expectedCheckIn,
        int? graceMinutes,
        string? changeJson)
    {
        if (TryReadChangeJsonLateMinutes(changeJson, out var stored))
            return stored;

        return CalculateLateMinutesFromStoredCheckIn(date, checkInText, expectedCheckIn, graceMinutes);
    }

    private static string? ReadChangeJsonSource(string? changeJson)
    {
        if (string.IsNullOrWhiteSpace(changeJson))
            return null;

        try
        {
            using var doc = JsonDocument.Parse(changeJson);
            if (doc.RootElement.TryGetProperty("Source", out var sourceProp) &&
                sourceProp.ValueKind == JsonValueKind.String)
            {
                return sourceProp.GetString();
            }
        }
        catch (JsonException)
        {
            // Ignore malformed legacy JSON.
        }

        return null;
    }

    private static bool TryReadChangeJsonLateMinutes(string? changeJson, out int lateMinutes)
    {
        lateMinutes = 0;
        if (string.IsNullOrWhiteSpace(changeJson))
            return false;

        try
        {
            using var doc = JsonDocument.Parse(changeJson);
            if (!doc.RootElement.TryGetProperty("Calculation", out var calc) ||
                calc.ValueKind != JsonValueKind.Object)
            {
                return false;
            }

            if (calc.TryGetProperty("LateMinutes", out var lateProp) &&
                lateProp.TryGetInt32(out lateMinutes))
            {
                return true;
            }

            if (calc.TryGetProperty("lateMinutes", out lateProp) &&
                lateProp.TryGetInt32(out lateMinutes))
            {
                return true;
            }
        }
        catch (JsonException)
        {
            // Ignore malformed legacy JSON.
        }

        return false;
    }

    private static string? FormatHhMm(DateTime? value) =>
        value.HasValue ? value.Value.ToString("HH:mm") : null;

    private static string? FormatHhMm(TimeSpan? value) =>
        value.HasValue ? $"{value.Value.Hours:D2}:{value.Value.Minutes:D2}" : null;

    private static void ApplyManualTimes(
        EmployeeAttendance row,
        DateTime date,
        string? checkInTime,
        string? checkOutTime)
    {
        if (string.IsNullOrWhiteSpace(checkInTime))
        {
            row.Time = null;
        }
        else if (TryParseTimeOfDay(checkInTime, out var ci))
        {
            row.Time = $"{ci.Hours:D2}:{ci.Minutes:D2}";
        }
        else
        {
            throw new ArgumentException("Invalid check-in time. Use HH:mm.");
        }

        if (string.IsNullOrWhiteSpace(checkOutTime))
        {
            row.CheckOutTime = null;
        }
        else if (TryParseTimeOfDay(checkOutTime, out var co))
        {
            row.CheckOutTime = date.Date.Add(co);
        }
        else
        {
            throw new ArgumentException("Invalid check-out time. Use HH:mm.");
        }

        if (!string.IsNullOrWhiteSpace(row.Time))
            row.Status = "P";
    }

    private static bool TryParseTimeOfDay(string text, out TimeSpan time)
    {
        if (TimeSpan.TryParse(text.Trim(), CultureInfo.InvariantCulture, out time) ||
            TimeSpan.TryParse(text.Trim(), out time))
            return true;

        if (DateTime.TryParse(
                text.Trim(),
                CultureInfo.InvariantCulture,
                DateTimeStyles.NoCurrentDateDefault,
                out var dt) ||
            DateTime.TryParse(text.Trim(), out dt))
        {
            time = dt.TimeOfDay;
            return true;
        }

        time = default;
        return false;
    }

    private AttendanceCalcResult RecalculateAndApply(
        EmployeeAttendance row,
        Employee employee,
        DateTime date,
        TimeSpan? overrideCheckIn = null,
        TimeSpan? overrideCheckOut = null,
        bool useOverrideTimes = false)
    {
        var defaultCheckIn = useOverrideTimes
            ? overrideCheckIn
            : DesignationTimeHelper.ToTimeOfDay(employee.Designation?.MustCheckinTime);
        var defaultCheckOut = useOverrideTimes
            ? overrideCheckOut
            : DesignationTimeHelper.ToTimeOfDay(employee.Designation?.LeavingTime);

        var calc = EmployeeAttendanceCalculator.Apply(
            row,
            employee,
            date,
            defaultCheckIn,
            defaultCheckOut);
        return new AttendanceCalcResult(
            calc.LateMinutes,
            calc.EarlyMinutes,
            calc.LateComings,
            calc.CurrentSalary,
            calc.LateDeduction,
            calc.TodaySalary);
    }

    private static object SnapshotAttendance(EmployeeAttendance row) =>
        new
        {
            row.Time,
            CheckOutTime = FormatCheckOutTime(row.CheckOutTime),
            row.LateComings,
            row.LateDeduction,
            row.TodaySalary,
            row.CurrentSalary,
            row.Status,
            row.UpdatedBy,
        };

    private static void ApplyHoliday(EmployeeAttendance row, Employee employee, decimal salaryPerDay)
    {
        row.Time = string.Empty;
        row.CheckOutTime = null;
        row.Status = "H";
        row.LateComings = 0;
        row.LateDeduction = 0;
        row.CurrentSalary = RoundNullable(employee.Salary);
        row.TodaySalary = Math.Round(salaryPerDay, 2);
    }

    private static string BuildHolidayChangeJson(string editedBy, object? before, object after) =>
        JsonSerializer.Serialize(new
        {
            Source = "ManualMarkHoliday",
            EditedBy = editedBy,
            EditedAt = PakistanTime.Now.ToString("o"),
            Before = before,
            After = after,
        });

    private static string BuildDutyTimeOverrideChangeJson(
        string editedBy,
        object before,
        object after,
        AttendanceCalcResult calc,
        int designationId,
        string? designationName,
        string? expectedCheckIn,
        string? expectedCheckOut) =>
        JsonSerializer.Serialize(new
        {
            Source = "DayTimingOverride",
            EditedBy = editedBy,
            EditedAt = PakistanTime.Now.ToString("o"),
            DesignationId = designationId,
            DesignationName = designationName,
            ExpectedCheckIn = expectedCheckIn,
            ExpectedCheckOut = expectedCheckOut,
            Before = before,
            After = after,
            Calculation = new
            {
                calc.LateMinutes,
                calc.EarlyMinutes,
                totalMinutes = calc.LateMinutes + calc.EarlyMinutes,
                lateComings = calc.LateComings,
            },
            Salary = new
            {
                currentSalary = calc.CurrentSalary,
                lateDeduction = calc.LateDeduction,
                todaySalary = calc.TodaySalary,
            },
        });

    private static string BuildManualChangeJson(
        string source,
        string editedBy,
        object before,
        object after,
        AttendanceCalcResult calc) =>
        JsonSerializer.Serialize(new
        {
            Source = source,
            EditedBy = editedBy,
            EditedAt = PakistanTime.Now.ToString("o"),
            Before = before,
            After = after,
            Calculation = new
            {
                calc.LateMinutes,
                calc.EarlyMinutes,
                totalMinutes = calc.LateMinutes + calc.EarlyMinutes,
                lateComings = calc.LateComings,
            },
            Salary = new
            {
                currentSalary = calc.CurrentSalary,
                lateDeduction = calc.LateDeduction,
                todaySalary = calc.TodaySalary,
            },
        });

    private async Task PublishLiveIfTodayAsync(
        EmployeeAttendance row,
        Employee employee,
        AttendanceCalcResult calc,
        CancellationToken cancellationToken)
    {
        if (!row.Date.HasValue || row.Date.Value.Date != PakistanTime.Now.Date)
            return;
        if (string.IsNullOrWhiteSpace(row.Time))
            return;

        var lateComings = row.LateComings ?? 0;
        var liveRow = new EmployeeAttendanceLiveRowDto
        {
            AttendanceId = row.ID,
            EmployeeId = employee.ID,
            EmployeeName = employee.EmployeeName ?? string.Empty,
            Date = row.Date.Value.Date,
            CheckInTime = row.Time,
            CheckOutTime = FormatCheckOutTime(row.CheckOutTime),
            LateMinutes = CombinedPenaltyMinutes(calc),
            LateComings = lateComings,
            IsLate = lateComings > 0,
            Status = FormatDutyStatus(
                row.Status,
                hasCheckIn: true,
                calc.LateMinutes,
                calc.EarlyMinutes,
                lateComings),
        };

        await _liveUpdateSink.PublishAsync(_tenantContext.Campus, liveRow, cancellationToken);
    }

    private static EmployeeAttendanceMutationResultDto ToMutationResult(
        EmployeeAttendance row,
        Employee employee,
        AttendanceCalcResult calc)
    {
        var lateComings = row.LateComings ?? 0;
        return new EmployeeAttendanceMutationResultDto
        {
            AttendanceId = row.ID,
            EmployeeId = employee.ID,
            EmployeeName = employee.EmployeeName ?? string.Empty,
            Date = row.Date!.Value.Date,
            CheckInTime = row.Time,
            CheckOutTime = FormatCheckOutTime(row.CheckOutTime),
            LateMinutes = CombinedPenaltyMinutes(calc),
            LateComings = lateComings,
            Status = FormatDutyStatus(
                row.Status,
                !string.IsNullOrWhiteSpace(row.Time),
                calc.LateMinutes,
                calc.EarlyMinutes,
                lateComings),
            IsManuallyAdjusted = true,
        };
    }

    private sealed record AttendanceCalcResult(
        int LateMinutes,
        int EarlyMinutes,
        int LateComings,
        decimal? CurrentSalary,
        decimal? LateDeduction,
        decimal? TodaySalary);
}
