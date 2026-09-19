using System.Globalization;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using School.Application.Common;
using School.Application.DTOs;
using School.Application.Interfaces;
using School.Infrastructure.Data;

namespace School.Application.Services;

public class SmartAttendanceReportService : ISmartAttendanceReportService
{
    private static readonly CultureInfo Invariant = CultureInfo.InvariantCulture;

    private readonly AppDbContext _context;

    public SmartAttendanceReportService(AppDbContext context)
    {
        _context = context;
    }

    public Task<List<SmartFeeReportCatalogItemDto>> GetCatalogAsync() => Task.FromResult(BuildCatalog());

    public async Task<AttendanceExecutiveSnapshotDto> GetExecutiveSnapshotAsync()
    {
        var today = PakistanTime.Today.ToDateTime(TimeOnly.MinValue);
        var monthStart = new DateTime(today.Year, today.Month, 1);

        var dayRows = await _context.Attendances
            .AsNoTracking()
            .Where(x => x.Date.HasValue && x.Date.Value.Date == today.Date)
            .Select(x => new
            {
                x.Status,
                ClassCompositeId = x.Student != null ? x.Student.ClassCompositeID : null
            })
            .ToListAsync();

        var present = dayRows.Count(x => StatusEquals(x.Status, StudentAttendanceStatuses.Present));
        var absent = dayRows.Count(x => StatusEquals(x.Status, StudentAttendanceStatuses.Absent));
        var late = dayRows.Count(x => StatusEquals(x.Status, StudentAttendanceStatuses.Late));
        var leave = dayRows.Count(x => StatusEquals(x.Status, StudentAttendanceStatuses.Leave));
        var holiday = dayRows.Count(x => StatusEquals(x.Status, StudentAttendanceStatuses.Holiday));
        var working = present + absent + late + leave;
        var presentPercent = working > 0 ? Math.Round(100m * (present + late) / working, 1) : 0m;
        var classesMarked = dayRows
            .Where(x => x.ClassCompositeId.HasValue)
            .Select(x => x.ClassCompositeId!.Value)
            .Distinct()
            .Count();

        var mtdRows = await _context.Attendances
            .AsNoTracking()
            .Where(x =>
                x.Date.HasValue &&
                x.Date.Value.Date >= monthStart &&
                x.Date.Value.Date <= today.Date)
            .Select(x => new { Date = x.Date!.Value.Date, x.Status })
            .ToListAsync();

        var mtdByDay = mtdRows
            .GroupBy(x => x.Date)
            .Select(g =>
            {
                var inSchool = g.Count(x =>
                    StatusEquals(x.Status, StudentAttendanceStatuses.Present) ||
                    StatusEquals(x.Status, StudentAttendanceStatuses.Late));
                var workingDay = g.Count(x =>
                    StatusEquals(x.Status, StudentAttendanceStatuses.Present) ||
                    StatusEquals(x.Status, StudentAttendanceStatuses.Absent) ||
                    StatusEquals(x.Status, StudentAttendanceStatuses.Late) ||
                    StatusEquals(x.Status, StudentAttendanceStatuses.Leave));
                return workingDay > 0 ? 100m * inSchool / workingDay : (decimal?)null;
            })
            .Where(x => x.HasValue)
            .Select(x => x!.Value)
            .ToList();

        var mtdAvg = mtdByDay.Count > 0
            ? Math.Round(mtdByDay.Average(), 1)
            : 0m;

        return new AttendanceExecutiveSnapshotDto
        {
            GeneratedAt = PakistanTime.Now,
            SnapshotDate = today,
            PresentCount = present,
            AbsentCount = absent,
            LateCount = late,
            LeaveCount = leave,
            HolidayCount = holiday,
            TotalMarked = dayRows.Count,
            PresentPercent = presentPercent,
            ClassesMarked = classesMarked,
            MtdAveragePresentPercent = mtdAvg
        };
    }

    public async Task<SmartFeeReportResultDto> RunAsync(string reportId, Dictionary<string, object?> parameters)
    {
        var id = (reportId ?? string.Empty).Trim().ToLowerInvariant();
        var catalog = BuildCatalog().FirstOrDefault(x => x.Id == id)
            ?? throw new ArgumentException($"Unknown report '{reportId}'.");

        parameters ??= new Dictionary<string, object?>(StringComparer.OrdinalIgnoreCase);

        return id switch
        {
            "day-class-summary" => await DayClassSummaryAsync(catalog, parameters),
            "day-status-list" => await DayStatusListAsync(catalog, parameters),
            "summary-by-date" => await SummaryByDateAsync(catalog, parameters),
            "class-attendance" => await ClassAttendanceAsync(catalog, parameters),
            "absent-list" => await AbsentListAsync(catalog, parameters),
            "absent-list-ndays" => await AbsentListNDaysAsync(catalog, parameters),
            "this-student" => await ThisStudentAsync(catalog, parameters),
            "summary-by-interval" => await SummaryByIntervalAsync(catalog, parameters),
            "detailed-register" => await DetailedRegisterAsync(catalog, parameters),
            _ => throw new ArgumentException($"Unknown report '{reportId}'.")
        };
    }

    private static List<SmartFeeReportCatalogItemDto> BuildCatalog() =>
    [
        Item("day-class-summary", "Day Class Summary", "On one date: present / late / leave / absent / holiday counts by class.", "daily",
            "Class-wise headcount for a single day.",
            P(DateOpt(required: true), ClassCompositeOpt())),
        Item("day-status-list", "Day Status List", "On one date: student names by class, filtered by status.", "daily",
            "Who was present, late, on leave, absent, or on holiday that day?",
            P(DateOpt(required: true), ClassCompositeOpt(), StatusOpt())),
        Item("summary-by-date", "Summary by Date", "Day-wise present, late, leave, absent, holiday and attendance % over a range.", "daily",
            "How did attendance look each day?",
            P(DateFromOpt(required: true), DateToOpt(required: true), ClassCompositeOpt())),
        Item("class-attendance", "Class Attendance (Interval)", "Class-wise present / late / leave / absent / holiday totals over a range.", "daily",
            "Which classes need follow-up over a period?",
            P(DateFromOpt(required: true), DateToOpt(required: true), ClassCompositeOpt())),
        Item("absent-list", "Absent List", "Students marked absent in a date range.", "absentees",
            "Who was away and when?",
            P(DateFromOpt(required: true), DateToOpt(required: true), ClassCompositeOpt())),
        Item("absent-list-ndays", "Absent List (N Days)", "Students absent on at least N days in the range.", "absentees",
            "Chronic absentees for counselling.",
            P(DateFromOpt(required: true), DateToOpt(required: true),
                Param("minDays", "Minimum absent days", "int", true, 3),
                ClassCompositeOpt())),
        Item("this-student", "This Student", "Day-by-day attendance for one registration number.", "student",
            "Individual attendance history.",
            P(Param("studentId", "Reg ID", "int", true, null), DateFromOpt(), DateToOpt())),
        Item("summary-by-interval", "Summary by Interval", "Student-wise present / late / leave / absent / holiday counts and %.", "student",
            "Period summary for each student.",
            P(DateFromOpt(required: true), DateToOpt(required: true), ClassCompositeOpt())),
        Item("detailed-register", "Detailed Register", "Flat attendance register with optional status filter.", "daily",
            "Full day-by-day register dump.",
            P(DateFromOpt(required: true), DateToOpt(required: true), ClassCompositeOpt(), StatusOpt())),
    ];

    private async Task<SmartFeeReportResultDto> DayClassSummaryAsync(
        SmartFeeReportCatalogItemDto cat,
        Dictionary<string, object?> p)
    {
        var date = RequireDate(p);
        var classId = OptInt(p, "classCompositeId");
        var rows = await LoadAttendanceRowsAsync(date, date, classId);

        var resultRows = rows
            .GroupBy(x => new { x.ClassSectionCompositeId, x.ClassName })
            .OrderBy(g => g.Key.ClassName)
            .Select(g =>
            {
                var tally = Tally(g);
                return Dict(
                    ("className", g.Key.ClassName),
                    ("present", tally.Present),
                    ("late", tally.Late),
                    ("leave", tally.Leave),
                    ("absent", tally.Absent),
                    ("holiday", tally.Holiday),
                    ("total", g.Count()),
                    ("presentPercent", tally.PresentPercent));
            })
            .ToList();

        var totals = Tally(rows);

        return Result(cat, resultRows, Cols(
            ("className", "Class", "text"),
            ("present", "Present", "number"),
            ("late", "Late", "number"),
            ("leave", "Leave", "number"),
            ("absent", "Absent", "number"),
            ("holiday", "Holiday", "number"),
            ("total", "Total", "number"),
            ("presentPercent", "Present %", "percent")),
            null, 0,
            Extra(
                ("date", "Date", FormatDate(date), "text"),
                ("classes", "Classes", resultRows.Count.ToString(Invariant), "number"),
                ("present", "Present", totals.Present.ToString(Invariant), "number"),
                ("late", "Late", totals.Late.ToString(Invariant), "number"),
                ("leave", "Leave", totals.Leave.ToString(Invariant), "number"),
                ("absent", "Absent", totals.Absent.ToString(Invariant), "number"),
                ("holiday", "Holiday", totals.Holiday.ToString(Invariant), "number"),
                ("presentPercent", "Present %", totals.PresentPercent.ToString(Invariant), "percent")));
    }

    private async Task<SmartFeeReportResultDto> DayStatusListAsync(
        SmartFeeReportCatalogItemDto cat,
        Dictionary<string, object?> p)
    {
        var date = RequireDate(p);
        var classId = OptInt(p, "classCompositeId");
        var statusFilter = OptString(p, "status");
        if (!string.IsNullOrWhiteSpace(statusFilter))
        {
            statusFilter = StudentAttendanceStatuses.Require(statusFilter);
        }

        var rows = await LoadAttendanceRowsAsync(date, date, classId);
        if (!string.IsNullOrWhiteSpace(statusFilter))
        {
            rows = rows.Where(x => x.Status == statusFilter).ToList();
        }

        var resultRows = rows
            .OrderBy(x => x.ClassName)
            .ThenBy(x => x.StudentName)
            .Select(x => Dict(
                ("className", x.ClassName),
                ("regId", x.StudentId),
                ("studentName", x.StudentName),
                ("status", StudentAttendanceStatuses.Label(x.Status))))
            .ToList();

        var totals = Tally(rows);

        return Result(cat, resultRows, Cols(
            ("className", "Class", "text"),
            ("regId", "Reg ID", "text"),
            ("studentName", "Student", "text"),
            ("status", "Status", "text")),
            "className", 0,
            Extra(
                ("date", "Date", FormatDate(date), "text"),
                ("students", "Students", resultRows.Count.ToString(Invariant), "number"),
                ("present", "Present", totals.Present.ToString(Invariant), "number"),
                ("late", "Late", totals.Late.ToString(Invariant), "number"),
                ("leave", "Leave", totals.Leave.ToString(Invariant), "number"),
                ("absent", "Absent", totals.Absent.ToString(Invariant), "number"),
                ("holiday", "Holiday", totals.Holiday.ToString(Invariant), "number")));
    }

    private async Task<SmartFeeReportResultDto> SummaryByDateAsync(
        SmartFeeReportCatalogItemDto cat,
        Dictionary<string, object?> p)
    {
        var (from, to) = RequireDateRange(p);
        var classId = OptInt(p, "classCompositeId");
        var rows = await LoadAttendanceRowsAsync(from, to, classId);

        var resultRows = rows
            .GroupBy(x => x.Date)
            .OrderBy(g => g.Key)
            .Select(g =>
            {
                var tally = Tally(g);
                return Dict(
                    ("date", FormatDate(g.Key)),
                    ("present", tally.Present),
                    ("late", tally.Late),
                    ("leave", tally.Leave),
                    ("absent", tally.Absent),
                    ("holiday", tally.Holiday),
                    ("total", g.Count()),
                    ("presentPercent", tally.PresentPercent));
            })
            .ToList();

        var totals = Tally(rows);

        return Result(cat, resultRows, Cols(
            ("date", "Date", "date"),
            ("present", "Present", "number"),
            ("late", "Late", "number"),
            ("leave", "Leave", "number"),
            ("absent", "Absent", "number"),
            ("holiday", "Holiday", "number"),
            ("total", "Total", "number"),
            ("presentPercent", "Present %", "percent")),
            null, 0,
            Extra(
                ("days", "Days", resultRows.Count.ToString(Invariant), "number"),
                ("presentPercent", "Overall present %", totals.PresentPercent.ToString(Invariant), "percent")));
    }

    private async Task<SmartFeeReportResultDto> ClassAttendanceAsync(
        SmartFeeReportCatalogItemDto cat,
        Dictionary<string, object?> p)
    {
        var (from, to) = RequireDateRange(p);
        var classId = OptInt(p, "classCompositeId");
        var rows = await LoadAttendanceRowsAsync(from, to, classId);

        var resultRows = rows
            .GroupBy(x => new { x.ClassSectionCompositeId, x.ClassName })
            .OrderBy(g => g.Key.ClassName)
            .Select(g =>
            {
                var tally = Tally(g);
                return Dict(
                    ("className", g.Key.ClassName),
                    ("present", tally.Present),
                    ("late", tally.Late),
                    ("leave", tally.Leave),
                    ("absent", tally.Absent),
                    ("holiday", tally.Holiday),
                    ("total", g.Count()),
                    ("presentPercent", tally.PresentPercent),
                    ("studentCount", g.Select(x => x.StudentId).Distinct().Count()));
            })
            .ToList();

        return Result(cat, resultRows, Cols(
            ("className", "Class", "text"),
            ("studentCount", "Students", "number"),
            ("present", "Present", "number"),
            ("late", "Late", "number"),
            ("leave", "Leave", "number"),
            ("absent", "Absent", "number"),
            ("holiday", "Holiday", "number"),
            ("total", "Marked rows", "number"),
            ("presentPercent", "Present %", "percent")),
            null, 0,
            Extra(("classes", "Classes", resultRows.Count.ToString(Invariant), "number")));
    }

    private async Task<SmartFeeReportResultDto> AbsentListAsync(
        SmartFeeReportCatalogItemDto cat,
        Dictionary<string, object?> p)
    {
        var (from, to) = RequireDateRange(p);
        var classId = OptInt(p, "classCompositeId");
        var rows = (await LoadAttendanceRowsAsync(from, to, classId))
            .Where(x => x.Status == "A")
            .OrderByDescending(x => x.Date)
            .ThenBy(x => x.ClassName)
            .ThenBy(x => x.StudentName)
            .Select(x => Dict(
                ("date", FormatDate(x.Date)),
                ("regId", x.StudentId),
                ("studentName", x.StudentName),
                ("className", x.ClassName),
                ("status", StudentAttendanceStatuses.Label(StudentAttendanceStatuses.Absent)),
                ("contact", FormatMergedContacts(x.FatherContact, x.MotherContact))))
            .ToList();

        return Result(cat, rows, Cols(
            ("date", "Date", "date"),
            ("regId", "Reg ID", "text"),
            ("studentName", "Student", "text"),
            ("className", "Class", "text"),
            ("status", "Status", "text"),
            ("contact", "Contact", "text")),
            null, 0,
            Extra(("absences", "Absent rows", rows.Count.ToString(Invariant), "number")));
    }

    private async Task<SmartFeeReportResultDto> AbsentListNDaysAsync(
        SmartFeeReportCatalogItemDto cat,
        Dictionary<string, object?> p)
    {
        var (from, to) = RequireDateRange(p);
        var classId = OptInt(p, "classCompositeId");
        var minDays = OptInt(p, "minDays") ?? 3;
        if (minDays < 1) minDays = 1;

        var rows = await LoadAttendanceRowsAsync(from, to, classId);

        var resultRows = rows
            .Where(x => x.Status == "A")
            .GroupBy(x => new { x.StudentId, x.StudentName, x.ClassName })
            .Select(g => new
            {
                g.Key.StudentId,
                g.Key.StudentName,
                g.Key.ClassName,
                AbsentDays = g.Select(x => x.Date).Distinct().Count()
            })
            .Where(x => x.AbsentDays >= minDays)
            .OrderByDescending(x => x.AbsentDays)
            .ThenBy(x => x.StudentName)
            .Select(x => Dict(
                ("regId", x.StudentId),
                ("studentName", x.StudentName),
                ("className", x.ClassName),
                ("absentDays", x.AbsentDays)))
            .ToList();

        return Result(cat, resultRows, Cols(
            ("regId", "Reg ID", "text"),
            ("studentName", "Student", "text"),
            ("className", "Class", "text"),
            ("absentDays", "Absent days", "number")),
            null, 0,
            Extra(
                ("minDays", "Minimum days", minDays.ToString(Invariant), "number"),
                ("students", "Students", resultRows.Count.ToString(Invariant), "number")));
    }

    private async Task<SmartFeeReportResultDto> ThisStudentAsync(
        SmartFeeReportCatalogItemDto cat,
        Dictionary<string, object?> p)
    {
        var studentId = OptInt(p, "studentId") ?? throw new ArgumentException("studentId is required.");
        var today = PakistanTime.Today.ToDateTime(TimeOnly.MinValue);
        var from = OptDate(p, "dateFrom") ?? new DateTime(today.Year, today.Month, 1);
        var to = OptDate(p, "dateTo") ?? today;
        if (to < from) throw new ArgumentException("dateTo must be greater than or equal to dateFrom.");

        var student = await _context.Students
            .AsNoTracking()
            .Where(x => x.Reg_Id == studentId)
            .Select(x => new { x.Reg_Id, x.FullName, x.ClassCompositeID })
            .FirstOrDefaultAsync()
            ?? throw new ArgumentException($"Student {studentId} was not found.");

        var className = "-";
        if (student.ClassCompositeID.HasValue)
        {
            var section = await _context.Sections
                .AsNoTracking()
                .Where(x => x.ID == student.ClassCompositeID.Value)
                .Select(x => new { x.ClassName, x.SectionName })
                .FirstOrDefaultAsync();
            if (section != null)
            {
                className = FormatClassSectionDisplayName(section.ClassName, section.SectionName);
            }
        }

        var rawRows = await _context.Attendances
            .AsNoTracking()
            .Where(x =>
                x.StudentID == studentId &&
                x.Date.HasValue &&
                x.Date.Value.Date >= from &&
                x.Date.Value.Date <= to)
            .OrderByDescending(x => x.Date)
            .Select(x => new
            {
                Date = x.Date!.Value.Date,
                Status = x.Status
            })
            .ToListAsync();

        var resultRows = rawRows
            .Select(x =>
            {
                var status = StudentAttendanceStatuses.CanonicalizeOrDefault(x.Status);
                return new { Status = status, Row = Dict(
                    ("date", FormatDate(x.Date)),
                    ("className", className),
                    ("status", StudentAttendanceStatuses.Label(status))) };
            })
            .ToList();

        var totals = Tally(resultRows.Select(r => new AttendanceFlatRow { Status = r.Status }));
        var displayRows = resultRows.Select(r => r.Row).ToList();

        return Result(cat, displayRows, Cols(
            ("date", "Date", "date"),
            ("className", "Class", "text"),
            ("status", "Status", "text")),
            null, 0,
            Extra(
                ("student", "Student", $"{student.FullName ?? "-"} ({studentId.ToString(Invariant)})", "text"),
                ("present", "Present", totals.Present.ToString(Invariant), "number"),
                ("late", "Late", totals.Late.ToString(Invariant), "number"),
                ("leave", "Leave", totals.Leave.ToString(Invariant), "number"),
                ("absent", "Absent", totals.Absent.ToString(Invariant), "number"),
                ("holiday", "Holiday", totals.Holiday.ToString(Invariant), "number"),
                ("presentPercent", "Present %", totals.PresentPercent.ToString(Invariant), "percent")));
    }

    private async Task<SmartFeeReportResultDto> SummaryByIntervalAsync(
        SmartFeeReportCatalogItemDto cat,
        Dictionary<string, object?> p)
    {
        var (from, to) = RequireDateRange(p);
        var classId = OptInt(p, "classCompositeId");
        var rows = await LoadAttendanceRowsAsync(from, to, classId);

        var resultRows = rows
            .GroupBy(x => new { x.StudentId, x.StudentName, x.ClassName })
            .OrderBy(g => g.Key.ClassName)
            .ThenBy(g => g.Key.StudentName)
            .Select(g =>
            {
                var tally = Tally(g);
                return Dict(
                    ("regId", g.Key.StudentId),
                    ("studentName", g.Key.StudentName),
                    ("className", g.Key.ClassName),
                    ("present", tally.Present),
                    ("late", tally.Late),
                    ("leave", tally.Leave),
                    ("absent", tally.Absent),
                    ("holiday", tally.Holiday),
                    ("workingDays", tally.Working),
                    ("presentPercent", tally.PresentPercent));
            })
            .ToList();

        return Result(cat, resultRows, Cols(
            ("regId", "Reg ID", "text"),
            ("studentName", "Student", "text"),
            ("className", "Class", "text"),
            ("present", "Present", "number"),
            ("late", "Late", "number"),
            ("leave", "Leave", "number"),
            ("absent", "Absent", "number"),
            ("holiday", "Holiday", "number"),
            ("workingDays", "Working days", "number"),
            ("presentPercent", "Present %", "percent")),
            "className", 0,
            Extra(("students", "Students", resultRows.Count.ToString(Invariant), "number")));
    }

    private async Task<SmartFeeReportResultDto> DetailedRegisterAsync(
        SmartFeeReportCatalogItemDto cat,
        Dictionary<string, object?> p)
    {
        var (from, to) = RequireDateRange(p);
        var classId = OptInt(p, "classCompositeId");
        var statusFilter = OptString(p, "status");
        if (!string.IsNullOrWhiteSpace(statusFilter))
        {
            statusFilter = StudentAttendanceStatuses.Require(statusFilter);
        }

        var rows = await LoadAttendanceRowsAsync(from, to, classId);
        if (!string.IsNullOrWhiteSpace(statusFilter))
        {
            rows = rows.Where(x => x.Status == statusFilter).ToList();
        }

        var resultRows = rows
            .OrderByDescending(x => x.Date)
            .ThenBy(x => x.ClassName)
            .ThenBy(x => x.StudentName)
            .Select(x => Dict(
                ("date", FormatDate(x.Date)),
                ("regId", x.StudentId),
                ("studentName", x.StudentName),
                ("className", x.ClassName),
                ("status", StudentAttendanceStatuses.Label(x.Status))))
            .ToList();

        var totals = Tally(rows);

        return Result(cat, resultRows, Cols(
            ("date", "Date", "date"),
            ("regId", "Reg ID", "text"),
            ("studentName", "Student", "text"),
            ("className", "Class", "text"),
            ("status", "Status", "text")),
            null, 0,
            Extra(
                ("present", "Present", totals.Present.ToString(Invariant), "number"),
                ("late", "Late", totals.Late.ToString(Invariant), "number"),
                ("leave", "Leave", totals.Leave.ToString(Invariant), "number"),
                ("absent", "Absent", totals.Absent.ToString(Invariant), "number"),
                ("holiday", "Holiday", totals.Holiday.ToString(Invariant), "number"),
                ("rows", "Rows", resultRows.Count.ToString(Invariant), "number")));
    }

    private async Task<List<AttendanceFlatRow>> LoadAttendanceRowsAsync(
        DateTime from,
        DateTime to,
        int? classSectionCompositeId)
    {
        var query = _context.Attendances
            .AsNoTracking()
            .Where(x => x.Date.HasValue && x.Date.Value.Date >= from && x.Date.Value.Date <= to);

        if (classSectionCompositeId.HasValue)
        {
            query = query.Where(x =>
                x.Student != null &&
                x.Student.ClassCompositeID == classSectionCompositeId.Value);
        }

        var raw = await query
            .Select(x => new
            {
                Date = x.Date!.Value.Date,
                ClassSectionCompositeId = x.Student != null && x.Student.ClassCompositeID.HasValue
                    ? x.Student.ClassCompositeID.Value
                    : 0,
                SectionClassName = x.Student != null && x.Student.Section != null
                    ? x.Student.Section.ClassName
                    : null,
                SectionSectionName = x.Student != null && x.Student.Section != null
                    ? x.Student.Section.SectionName
                    : null,
                StudentId = x.StudentID ?? 0,
                StudentName = x.Student != null && !string.IsNullOrWhiteSpace(x.Student.FullName)
                    ? x.Student.FullName
                    : "-",
                FatherContact = x.Student != null && x.Student.Family != null
                    ? x.Student.Family.FatherMobileNo
                    : null,
                MotherContact = x.Student != null && x.Student.Family != null
                    ? x.Student.Family.MotherPhoneNo
                    : null,
                StatusRaw = x.Status
            })
            .ToListAsync();

        return raw
            .Where(x => x.StudentId > 0)
            .Select(x => new AttendanceFlatRow
            {
                Date = x.Date,
                ClassSectionCompositeId = x.ClassSectionCompositeId,
                ClassName = FormatClassSectionDisplayName(x.SectionClassName, x.SectionSectionName),
                StudentId = x.StudentId,
                StudentName = x.StudentName,
                FatherContact = x.FatherContact,
                MotherContact = x.MotherContact,
                Status = StudentAttendanceStatuses.CanonicalizeOrDefault(x.StatusRaw)
            })
            .ToList();
    }

    private static (DateTime From, DateTime To) RequireDateRange(Dictionary<string, object?> p)
    {
        var from = OptDate(p, "dateFrom") ?? throw new ArgumentException("dateFrom is required.");
        var to = OptDate(p, "dateTo") ?? throw new ArgumentException("dateTo is required.");
        if (to < from) throw new ArgumentException("dateTo must be greater than or equal to dateFrom.");
        return (from, to);
    }

    private static DateTime RequireDate(Dictionary<string, object?> p)
    {
        return OptDate(p, "date") ?? throw new ArgumentException("date is required.");
    }

    private static bool StatusEquals(string? status, string expected) =>
        StudentAttendanceStatuses.EqualsCode(status, expected);

    private readonly record struct StatusTally(int Present, int Absent, int Late, int Leave, int Holiday)
    {
        public int Working => Present + Absent + Late + Leave;
        public decimal PresentPercent => Working > 0 ? Math.Round(100m * (Present + Late) / Working, 1) : 0m;
    }

    private static StatusTally Tally(IEnumerable<AttendanceFlatRow> rows)
    {
        var present = 0;
        var absent = 0;
        var late = 0;
        var leave = 0;
        var holiday = 0;
        foreach (var row in rows)
        {
            switch (row.Status)
            {
                case StudentAttendanceStatuses.Present:
                    present++;
                    break;
                case StudentAttendanceStatuses.Absent:
                    absent++;
                    break;
                case StudentAttendanceStatuses.Late:
                    late++;
                    break;
                case StudentAttendanceStatuses.Leave:
                    leave++;
                    break;
                case StudentAttendanceStatuses.Holiday:
                    holiday++;
                    break;
            }
        }

        return new StatusTally(present, absent, late, leave, holiday);
    }

    private static string FormatClassSectionDisplayName(string? className, string? sectionName)
    {
        var cn = (className ?? string.Empty).Trim();
        var sn = (sectionName ?? string.Empty).Trim();

        if (string.IsNullOrEmpty(cn)) return string.IsNullOrEmpty(sn) ? "-" : sn;
        if (string.IsNullOrEmpty(sn)) return cn;
        if (string.Equals(cn, sn, StringComparison.OrdinalIgnoreCase)) return cn;
        if (cn.Contains(sn, StringComparison.OrdinalIgnoreCase)) return cn;
        return $"{cn} - {sn}";
    }

    private static string FormatDate(DateTime value) => value.ToString("dd/MM/yyyy", Invariant);

    private static Dictionary<string, object?> Dict(params (string Key, object? Value)[] items)
    {
        var dict = new Dictionary<string, object?>(StringComparer.OrdinalIgnoreCase);
        foreach (var (key, value) in items) dict[key] = value;
        return dict;
    }

    private static SmartFeeReportCatalogItemDto Item(
        string id, string title, string description, string category, string blurb,
        List<SmartFeeReportParamDefDto> parameters) => new()
    {
        Id = id,
        Title = title,
        Description = description,
        Category = category,
        DirectorBlurb = blurb,
        IsPreset = false,
        Parameters = parameters
    };

    private static List<SmartFeeReportParamDefDto> P(params SmartFeeReportParamDefDto[] items) => [.. items];

    private static SmartFeeReportParamDefDto Param(
        string key, string label, string type, bool required, object? defaultValue,
        string? optionsSource = null, List<SmartFeeReportOptionDto>? options = null) => new()
    {
        Key = key,
        Label = label,
        Type = type,
        Required = required,
        DefaultValue = defaultValue,
        OptionsSource = optionsSource,
        Options = options
    };

    private static SmartFeeReportParamDefDto ClassCompositeOpt() =>
        Param("classCompositeId", "Class", "classComposite", false, "", "classes");

    private static SmartFeeReportParamDefDto DateOpt(bool required = false) =>
        Param("date", "Date", "date", required, null);

    private static SmartFeeReportParamDefDto DateFromOpt(bool required = false) =>
        Param("dateFrom", "From", "date", required, null);

    private static SmartFeeReportParamDefDto DateToOpt(bool required = false) =>
        Param("dateTo", "To", "date", required, null);

    private static SmartFeeReportParamDefDto StatusOpt() =>
        Param("status", "Status", "select", false, "", null,
        [
            new SmartFeeReportOptionDto { Value = StudentAttendanceStatuses.Present, Label = "Present (P)" },
            new SmartFeeReportOptionDto { Value = StudentAttendanceStatuses.Absent, Label = "Absent (A)" },
            new SmartFeeReportOptionDto { Value = StudentAttendanceStatuses.Late, Label = "Late (Lt)" },
            new SmartFeeReportOptionDto { Value = StudentAttendanceStatuses.Leave, Label = "Leave (Lv)" },
            new SmartFeeReportOptionDto { Value = StudentAttendanceStatuses.Holiday, Label = "Holiday (H)" },
        ]);

    private static List<SmartFeeReportColumnDto> Cols(params (string Key, string Label, string Format)[] cols) =>
        cols.Select(c => new SmartFeeReportColumnDto { Key = c.Key, Label = c.Label, Format = c.Format }).ToList();

    private static SmartFeeReportKpiDto[] Extra(params (string Key, string Label, string Value, string Format)[] kpis) =>
        kpis.Select(k => new SmartFeeReportKpiDto { Key = k.Key, Label = k.Label, Value = k.Value, Format = k.Format }).ToArray();

    private static SmartFeeReportResultDto Result(
        SmartFeeReportCatalogItemDto cat,
        List<Dictionary<string, object?>> rows,
        List<SmartFeeReportColumnDto> columns,
        string? groupBy,
        decimal totalAmount,
        params SmartFeeReportKpiDto[] extras) => new()
    {
        ReportId = cat.Id,
        Title = cat.Title,
        Category = cat.Category,
        GeneratedAt = PakistanTime.Now,
        TotalRecords = rows.Count,
        TotalAmount = totalAmount,
        Columns = columns,
        Rows = rows,
        GroupByKey = groupBy,
        ExtraKpis = extras.ToList()
    };

    private static int? OptInt(Dictionary<string, object?> p, string key)
    {
        if (!p.TryGetValue(key, out var raw) || raw is null) return null;
        if (raw is JsonElement je)
        {
            if (je.ValueKind == JsonValueKind.Number && je.TryGetInt32(out var n)) return n;
            if (je.ValueKind == JsonValueKind.String && int.TryParse(je.GetString(), out n)) return n;
            return null;
        }
        return int.TryParse(Convert.ToString(raw, Invariant), NumberStyles.Integer, Invariant, out var v) ? v : null;
    }

    private static string? OptString(Dictionary<string, object?> p, string key)
    {
        if (!p.TryGetValue(key, out var raw) || raw is null) return null;
        if (raw is JsonElement je)
        {
            return je.ValueKind switch
            {
                JsonValueKind.String => je.GetString(),
                JsonValueKind.Null => null,
                _ => je.ToString()
            };
        }
        var text = Convert.ToString(raw, Invariant);
        return string.IsNullOrWhiteSpace(text) ? null : text;
    }

    private static DateTime? OptDate(Dictionary<string, object?> p, string key)
    {
        if (!p.TryGetValue(key, out var raw) || raw is null) return null;
        var text = raw is JsonElement je
            ? (je.ValueKind == JsonValueKind.String ? je.GetString() : je.ToString())
            : Convert.ToString(raw, Invariant);
        if (string.IsNullOrWhiteSpace(text)) return null;
        return DateTime.TryParse(text, Invariant, DateTimeStyles.AssumeLocal, out var dt) ? dt.Date : null;
    }

    private sealed class AttendanceFlatRow
    {
        public DateTime Date { get; set; }
        public int ClassSectionCompositeId { get; set; }
        public string ClassName { get; set; } = "-";
        public int StudentId { get; set; }
        public string StudentName { get; set; } = "-";
        public string? FatherContact { get; set; }
        public string? MotherContact { get; set; }
        public string Status { get; set; } = "A";
    }

    private static string FormatMergedContacts(string? fatherMobile, string? motherPhone)
    {
        var father = string.IsNullOrWhiteSpace(fatherMobile) ? "" : fatherMobile.Trim();
        var mother = string.IsNullOrWhiteSpace(motherPhone) ? "" : motherPhone.Trim();
        if (father.Length > 0 && mother.Length > 0) return $"{father} / {mother}";
        if (father.Length > 0) return father;
        if (mother.Length > 0) return mother;
        return "-";
    }
}
