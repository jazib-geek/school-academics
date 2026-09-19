using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using School.Application.Common;
using School.Application.DTOs;
using School.Application.Interfaces;
using School.Infrastructure.Data;
using School.Infrastructure.Entities;

namespace School.Application.Services;

public class EmployeeAttendanceImportService : IEmployeeAttendanceImportService
{
    private readonly AppDbContext _context;
    private readonly IActivityLogService _activityLogService;

    public EmployeeAttendanceImportService(
        AppDbContext context,
        IActivityLogService activityLogService)
    {
        _context = context;
        _activityLogService = activityLogService;
    }

    public Task<EmployeeAttendanceImportPreviewDto> PreviewAsync(
        Stream file,
        string fileName,
        CancellationToken cancellationToken = default)
    {
        var parsed = ZkTecoExceptionStatParser.Parse(file);
        return Task.FromResult(new EmployeeAttendanceImportPreviewDto
        {
            Dates = parsed.Dates,
            PunchCount = parsed.RowCount,
            FileName = fileName,
        });
    }

    public async Task<EmployeeAttendanceImportResultDto> ImportAsync(
        Stream file,
        string fileName,
        EmployeeAttendanceImportRulesDto rules,
        int? importedByUserId,
        CancellationToken cancellationToken = default)
    {
        var parsed = ZkTecoExceptionStatParser.Parse(file);
        var profile = await _context.CampusProfiles
            .OrderBy(x => x.ID)
            .FirstOrDefaultAsync(cancellationToken);
        var adminMinutes = BiometricAttendanceTypes.ClampMinutes(
            rules.AdminMinutesBefore,
            profile?.AdminEarlyMinutes ?? AttendanceImportDutyOffsets.AdminMinutesBefore);
        var coordinatorMinutes = BiometricAttendanceTypes.ClampMinutes(
            rules.CoordinatorMinutesBefore,
            profile?.CoordinatorEarlyMinutes ?? AttendanceImportDutyOffsets.CoordinatorMinutesBefore);
        var fridayCheckOut = !string.IsNullOrWhiteSpace(rules.FridayCheckOut)
            ? rules.FridayCheckOut
            : EmployeeAttendanceCalculator.FormatHhMm(profile?.FridayCheckOutTime);
        var teacherCheckInFallback = EmployeeAttendanceCalculator.FormatHhMm(profile?.TeacherCheckInTime);
        var teacherCheckOutFallback = EmployeeAttendanceCalculator.FormatHhMm(profile?.TeacherCheckOutTime);
        var dateRules = BuildDateRules(rules, fridayCheckOut, teacherCheckInFallback, teacherCheckOutFallback);
        if (dateRules.Count == 0)
            throw new ArgumentException("Select at least one date with teacher check-in and checkout times.");

        var importedBy = await ResolveUsernameAsync(importedByUserId, cancellationToken);

        var employees = await _context.Employees
            .Include(e => e.Designation)
            .Where(e => e.IsActive == true)
            .ToListAsync(cancellationToken);

        var employeeByCode = employees
            .Where(e => !string.IsNullOrWhiteSpace(e.Thumb_ID))
            .GroupBy(e => e.Thumb_ID!.Trim(), StringComparer.OrdinalIgnoreCase)
            .ToDictionary(g => g.Key, g => g.First(), StringComparer.OrdinalIgnoreCase);

        var minDate = dateRules.Keys.Min();
        var maxDate = dateRules.Keys.Max().AddDays(1);

        var existingRows = await _context.EmployeeAttendances
            .Where(a =>
                a.EmpID != null &&
                a.Date.HasValue &&
                a.Date.Value >= minDate &&
                a.Date.Value < maxDate)
            .ToListAsync(cancellationToken);

        var rowByEmpDate = existingRows
            .Where(r => r.EmpID.HasValue && r.Date.HasValue)
            .GroupBy(r => (r.EmpID!.Value, r.Date!.Value.Date))
            .ToDictionary(g => g.Key, g => g.OrderByDescending(r => r.ID).First());

        var created = 0;
        var overwritten = 0;
        var skippedUnknown = 0;
        var skippedEmpty = 0;
        var skippedNoDuty = 0;
        var unknownCodes = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var processedKeys = new HashSet<(int EmpId, DateTime Date)>();

        foreach (var punch in parsed.Punches)
        {
            if (!dateRules.TryGetValue(punch.Date, out var teacherTimes))
                continue;

            var hasPunch = !string.IsNullOrWhiteSpace(punch.CheckInTime) ||
                           !string.IsNullOrWhiteSpace(punch.CheckOutTime);
            if (!hasPunch)
            {
                skippedEmpty++;
                continue;
            }

            if (!employeeByCode.TryGetValue(punch.EmployeeCode.Trim(), out var employee))
            {
                skippedUnknown++;
                unknownCodes.Add(punch.EmployeeCode.Trim());
                continue;
            }

            var offset = AttendanceImportDutyOffsets.MinutesBeforeTeacher(
                employee.DesignationID,
                employee.Designation?.DesignationName,
                adminMinutes,
                coordinatorMinutes);
            var expectedCheckIn = AttendanceImportDutyOffsets.ShiftEarlier(teacherTimes.CheckIn, offset);
            var expectedCheckOut = AttendanceImportDutyOffsets.ShiftEarlier(teacherTimes.CheckOut, offset);
            if (!expectedCheckIn.HasValue && !expectedCheckOut.HasValue)
            {
                skippedNoDuty++;
                continue;
            }

            var key = (employee.ID, punch.Date);
            if (!rowByEmpDate.TryGetValue(key, out var row) || row is null)
            {
                row = new EmployeeAttendance
                {
                    EmpID = employee.ID,
                    Date = punch.Date,
                };
                _context.EmployeeAttendances.Add(row);
                rowByEmpDate[key] = row;
                ApplyImportedPunch(row, employee, punch, teacherTimes, offset, importedBy);
                created++;
                processedKeys.Add(key);
                continue;
            }

            ApplyImportedPunch(row, employee, punch, teacherTimes, offset, importedBy);
            if (processedKeys.Add(key))
                overwritten++;
        }

        await _activityLogService.WriteAsync(
            ActivityLogTypes.EmployeeAttendanceImport,
            ActivityLogEntityTypes.EmployeeAttendance,
            0,
            fileName,
            importedByUserId,
            new
            {
                source = "ZkTecoImport",
                fileName,
                created,
                overwritten,
                skippedUnknown,
                skippedEmpty,
                skippedNoDuty,
                adminMinutesBefore = adminMinutes,
                coordinatorMinutesBefore = coordinatorMinutes,
                fridayCheckOut,
                dates = dateRules.Keys.OrderBy(d => d).Select(d => d.ToString("yyyy-MM-dd")).ToList(),
                unknownEmployeeCodes = unknownCodes.OrderBy(c => c).Take(20).ToList(),
            },
            cancellationToken);

        await _context.SaveChangesAsync(cancellationToken);

        return new EmployeeAttendanceImportResultDto
        {
            CreatedCount = created,
            OverwrittenCount = overwritten,
            SkippedUnknownEmployeeCount = skippedUnknown,
            SkippedEmptyPunchCount = skippedEmpty,
            SkippedNoDutyTimeCount = skippedNoDuty,
            UnknownEmployeeCodes = unknownCodes.OrderBy(c => c).Take(20).ToList(),
        };
    }

    private static Dictionary<DateTime, (TimeSpan CheckIn, TimeSpan CheckOut)> BuildDateRules(
        EmployeeAttendanceImportRulesDto rules,
        string? fridayCheckOut,
        string? teacherCheckInFallback,
        string? teacherCheckOutFallback)
    {
        var map = new Dictionary<DateTime, (TimeSpan CheckIn, TimeSpan CheckOut)>();
        if (rules.Dates is null)
            return map;

        foreach (var item in rules.Dates)
        {
            var date = item.Date.Date;
            var checkOutText = string.IsNullOrWhiteSpace(item.TeacherCheckOut)
                ? teacherCheckOutFallback
                : item.TeacherCheckOut;
            if (date.DayOfWeek == DayOfWeek.Friday &&
                !string.IsNullOrWhiteSpace(fridayCheckOut))
            {
                checkOutText = fridayCheckOut;
            }

            var checkInText = string.IsNullOrWhiteSpace(item.TeacherCheckIn)
                ? teacherCheckInFallback
                : item.TeacherCheckIn;
            if (!EmployeeAttendanceCalculator.TryParseTimeOfDay(checkInText, out var checkIn) ||
                !EmployeeAttendanceCalculator.TryParseTimeOfDay(checkOutText, out var checkOut))
            {
                throw new ArgumentException(
                    $"Enter teacher check-in and checkout times for {date:yyyy-MM-dd}.");
            }

            map[date] = (checkIn, checkOut);
        }

        return map;
    }

    private static void ApplyImportedPunch(
        EmployeeAttendance row,
        Employee employee,
        ZkTecoPunchRow punch,
        (TimeSpan CheckIn, TimeSpan CheckOut) teacherTimes,
        int offsetMinutes,
        string importedBy)
    {
        var expectedCheckIn = AttendanceImportDutyOffsets.ShiftEarlier(teacherTimes.CheckIn, offsetMinutes);
        var expectedCheckOut = AttendanceImportDutyOffsets.ShiftEarlier(teacherTimes.CheckOut, offsetMinutes);
        ApplyPunchTimes(row, punch.Date, punch.CheckInTime, punch.CheckOutTime);
        var calc = EmployeeAttendanceCalculator.Apply(
            row,
            employee,
            punch.Date,
            expectedCheckIn,
            expectedCheckOut);
        row.UpdatedBy = importedBy;
        row.ChangeJson = BuildImportChangeJson(
            importedBy,
            punch.EmployeeCode,
            teacherTimes.CheckIn,
            teacherTimes.CheckOut,
            expectedCheckIn,
            expectedCheckOut,
            offsetMinutes,
            calc);
    }

    private static void ApplyPunchTimes(
        EmployeeAttendance row,
        DateTime date,
        string? checkInTime,
        string? checkOutTime)
    {
        if (string.IsNullOrWhiteSpace(checkInTime))
        {
            row.Time = null;
        }
        else if (EmployeeAttendanceCalculator.TryParseTimeOfDay(checkInTime, out var ci))
        {
            row.Time = EmployeeAttendanceCalculator.FormatHhMm(ci);
        }
        else
        {
            row.Time = null;
        }

        if (string.IsNullOrWhiteSpace(checkOutTime) ||
            !EmployeeAttendanceCalculator.TryParseTimeOfDay(checkOutTime, out var co))
        {
            row.CheckOutTime = null;
        }
        else
        {
            row.CheckOutTime = date.Date.Add(co);
        }

        if (!string.IsNullOrWhiteSpace(row.Time) || row.CheckOutTime.HasValue)
            row.Status = "P";
    }

    private static string BuildImportChangeJson(
        string editedBy,
        string employeeCode,
        TimeSpan teacherCheckIn,
        TimeSpan teacherCheckOut,
        TimeSpan? expectedCheckIn,
        TimeSpan? expectedCheckOut,
        int offsetMinutes,
        EmployeeAttendanceCalcResult calc) =>
        JsonSerializer.Serialize(new
        {
            Source = "ZkTecoImport",
            EditedBy = editedBy,
            EditedAt = PakistanTime.Now.ToString("o"),
            EmployeeCode = employeeCode,
            TeacherCheckIn = EmployeeAttendanceCalculator.FormatHhMm(teacherCheckIn),
            TeacherCheckOut = EmployeeAttendanceCalculator.FormatHhMm(teacherCheckOut),
            ExpectedCheckIn = EmployeeAttendanceCalculator.FormatHhMm(expectedCheckIn),
            ExpectedCheckOut = EmployeeAttendanceCalculator.FormatHhMm(expectedCheckOut),
            DutyOffsetMinutes = offsetMinutes,
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
}
