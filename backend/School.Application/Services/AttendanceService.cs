using Microsoft.EntityFrameworkCore;
using School.Application.Common;
using School.Application.DTOs;
using School.Application.Interfaces;
using School.Infrastructure.Data;
using School.Infrastructure.Entities;
using System.Globalization;

namespace School.Application.Services
{
    public class AttendanceService : IAttendanceService
    {
        private readonly AppDbContext _context;

        public AttendanceService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<List<AttendanceDto>> GetStudentAttendanceAsync(
      int studentId,
      int? month = null,
      int? year = null)
        {
            var records = await LoadStudentAttendanceRowsAsync(studentId, month, year);
            return MapStudentAttendanceRows(records);
        }

        public async Task<StudentAttendanceSummaryDto> GetStudentAttendanceSummaryAsync(
            int studentId,
            int? month = null,
            int? year = null)
        {
            var records = await LoadStudentAttendanceRowsAsync(studentId, month, year);
            var items = MapStudentAttendanceRows(records);
            var summary = BuildStudentAttendanceSummary(records, month, year);

            return new StudentAttendanceSummaryDto
            {
                DaysPresent = summary.DaysPresent,
                DaysAbsent = summary.DaysAbsent,
                DaysOnLeave = summary.DaysOnLeave,
                DaysHoliday = summary.DaysHoliday,
                TotalDays = summary.TotalDays,
                Ratio = summary.Ratio,
                Percentage = summary.Percentage,
                Records = items
            };
        }

        public async Task<ClassAttendanceSheetDto> GetClassAttendanceSheetAsync(DateTime date, int classSectionCompositeId)
        {
            var normalizedDate = date.Date;
            await EnsureAttendanceRowsAsync(normalizedDate, classSectionCompositeId);
            return await BuildClassAttendanceSheetAsync(normalizedDate, classSectionCompositeId);
        }

        public async Task<ClassAttendanceSheetDto> GetSchoolAttendanceSheetAsync(DateTime date)
        {
            var normalizedDate = date.Date;

            var classIds = await _context.Students
                .AsNoTracking()
                .Where(s => s.IsActive == true && s.ClassCompositeID != null)
                .Select(s => s.ClassCompositeID!.Value)
                .Distinct()
                .ToListAsync();

            foreach (var cid in classIds)
            {
                await EnsureAttendanceRowsAsync(normalizedDate, cid);
            }

            var studentRows = await (
                from s in _context.Students.AsNoTracking()
                where s.IsActive == true && s.ClassCompositeID != null
                join sec in _context.Sections.AsNoTracking() on s.ClassCompositeID equals sec.ID into secJoin
                from sec in secJoin.DefaultIfEmpty()
                select new
                {
                    s.Reg_Id,
                    s.FullName,
                    ClassId = s.ClassCompositeID!.Value,
                    SectionClassName = sec != null ? sec.ClassName : null,
                    SectionSectionName = sec != null ? sec.SectionName : null,
                }).ToListAsync();

            var attendanceRows = await _context.Attendances
                .AsNoTracking()
                .Where(a =>
                    a.Date.HasValue &&
                    a.Date.Value.Date == normalizedDate &&
                    a.StudentID.HasValue)
                .Select(a => new
                {
                    StudentId = a.StudentID!.Value,
                    a.Status,
                })
                .ToListAsync();

            var statusByStudent = attendanceRows
                .GroupBy(x => x.StudentId)
                .ToDictionary(g => g.Key, g => g.First().Status);

            var students = studentRows
                .OrderBy(r => FormatClassSectionDisplayName(r.SectionClassName, r.SectionSectionName))
                .ThenBy(r => r.FullName)
                .Select(r =>
                {
                    statusByStudent.TryGetValue(r.Reg_Id, out var rawStatus);
                    return new ClassAttendanceStudentDto
                    {
                        StudentId = r.Reg_Id,
                        StudentName = r.FullName ?? "-",
                        Status = NormalizeStatusForOutput(rawStatus),
                        ClassSectionCompositeIdForStudent = r.ClassId,
                        ClassNameForStudent = FormatClassSectionDisplayName(r.SectionClassName, r.SectionSectionName),
                    };
                })
                .ToList();

            return new ClassAttendanceSheetDto
            {
                ClassSectionCompositeId = 0,
                ClassName = "All classes",
                Date = normalizedDate,
                Students = students,
            };
        }

        public async Task<ClassAttendanceSheetDto> SetSchoolAttendancePresentForAllAsync(DateTime date)
        {
            var normalizedDate = date.Date;
            var normalizedStatus = StudentAttendanceStatuses.Present;

            var classIds = await _context.Students
                .AsNoTracking()
                .Where(s => s.IsActive == true && s.ClassCompositeID != null)
                .Select(s => s.ClassCompositeID!.Value)
                .Distinct()
                .ToListAsync();

            foreach (var cid in classIds)
            {
                await EnsureAttendanceRowsAsync(normalizedDate, cid);
            }

            var activeStudentIds = await _context.Students
                .AsNoTracking()
                .Where(s => s.IsActive == true && s.ClassCompositeID != null)
                .Select(s => s.Reg_Id)
                .ToListAsync();

            var rows = await _context.Attendances
                .Where(x =>
                    x.Date.HasValue &&
                    x.Date.Value.Date == normalizedDate &&
                    x.StudentID.HasValue &&
                    activeStudentIds.Contains(x.StudentID.Value))
                .ToListAsync();

            foreach (var row in rows)
            {
                row.Status = normalizedStatus;
                row.IsPresent = IsPresentFromStatus(normalizedStatus);
            }

            await _context.SaveChangesAsync();
            return await GetSchoolAttendanceSheetAsync(normalizedDate);
        }

        public async Task<ClassAttendanceSheetDto> SetClassAttendanceStatusForAllAsync(DateTime date, int classSectionCompositeId, string status)
        {
            var normalizedStatus = StudentAttendanceStatuses.RequireBulk(status);
            var normalizedDate = date.Date;

            await EnsureAttendanceRowsAsync(normalizedDate, classSectionCompositeId);

            var studentIds = await _context.Students
                .AsNoTracking()
                .Where(s => s.ClassCompositeID == classSectionCompositeId && s.IsActive == true)
                .Select(s => s.Reg_Id)
                .ToListAsync();

            var rows = await _context.Attendances
                .Where(x =>
                    x.Date.HasValue &&
                    x.Date.Value.Date == normalizedDate &&
                    x.StudentID.HasValue &&
                    studentIds.Contains(x.StudentID.Value))
                .ToListAsync();

            foreach (var row in rows)
            {
                row.Status = normalizedStatus;
                row.IsPresent = IsPresentFromStatus(normalizedStatus);
            }

            await _context.SaveChangesAsync();
            return await BuildClassAttendanceSheetAsync(normalizedDate, classSectionCompositeId);
        }

        public async Task<ClassAttendanceSheetDto> SetStudentAttendanceStatusAsync(
            DateTime date,
            int classSectionCompositeId,
            int studentId,
            string status)
        {
            var normalizedStatus = StudentAttendanceStatuses.Require(status);
            var normalizedDate = date.Date;

            await EnsureAttendanceRowsAsync(normalizedDate, classSectionCompositeId);

            var row = await _context.Attendances
                .FirstOrDefaultAsync(x =>
                    x.StudentID == studentId &&
                    x.Date.HasValue &&
                    x.Date.Value.Date == normalizedDate);

            if (row == null)
            {
                throw new InvalidOperationException("Attendance row not found for selected student and date.");
            }

            row.Status = normalizedStatus;
            row.IsPresent = IsPresentFromStatus(normalizedStatus);
            await _context.SaveChangesAsync();

            return await BuildClassAttendanceSheetAsync(normalizedDate, classSectionCompositeId);
        }

        public async Task<EmployeeAttendanceStatsDto> GetEmployeeAttendanceStatsAsync(DateTime? date = null)
        {
            var targetDate = (date ?? DateTime.Today).Date;

            var dayRows = _context.Attendances
                .AsNoTracking()
                .Where(x => x.Date.HasValue && x.Date.Value.Date == targetDate);

            var totalMarked = await dayRows.CountAsync();
            var presentCount = await dayRows.CountAsync(x => x.Status != null && x.Status.ToUpper() == "P");
            var absentCount = await dayRows.CountAsync(x => x.Status != null && x.Status.ToUpper() == "A");
            var lateCount = await dayRows.CountAsync(x => x.Status != null && x.Status.ToUpper() == "LT");
            var leaveCount = await dayRows.CountAsync(x => x.Status != null && x.Status.ToUpper() == "LV");
            var holidayCount = await dayRows.CountAsync(x => x.Status != null && x.Status.ToUpper() == "H");
            var classCount = await dayRows
                .Where(x => x.Student != null && x.Student.ClassCompositeID.HasValue)
                .Select(x => x.Student!.ClassCompositeID!.Value)
                .Distinct()
                .CountAsync();

            return new EmployeeAttendanceStatsDto
            {
                Date = targetDate,
                TotalMarked = totalMarked,
                PresentCount = presentCount,
                AbsentCount = absentCount,
                LateCount = lateCount,
                LeaveCount = leaveCount,
                HolidayCount = holidayCount,
                ClassCount = classCount
            };
        }

        public async Task<AttendanceReportDto> GetAttendanceReportAsync(
            DateTime dateFrom,
            DateTime dateTo,
            int? classSectionCompositeId = null,
            string? status = null)
        {
            var fromDate = dateFrom.Date;
            var toDate = dateTo.Date;
            if (toDate < fromDate)
            {
                throw new ArgumentException("dateTo must be greater than or equal to dateFrom.");
            }

            var normalizedStatus = string.IsNullOrWhiteSpace(status) ? null : StudentAttendanceStatuses.Require(status);
            var statusSqlKey = normalizedStatus?.ToUpperInvariant();

            var query = _context.Attendances
                .AsNoTracking()
                .Where(x => x.Date.HasValue && x.Date.Value.Date >= fromDate && x.Date.Value.Date <= toDate);

            if (classSectionCompositeId.HasValue)
            {
                query = query.Where(x =>
                    x.Student != null &&
                    x.Student.ClassCompositeID == classSectionCompositeId.Value);
            }

            if (!string.IsNullOrWhiteSpace(statusSqlKey))
            {
                query = query.Where(x => x.Status != null && x.Status.ToUpper() == statusSqlKey);
            }

            var rows = await query
                .OrderByDescending(x => x.Date)
                .ThenBy(x => x.Student != null ? x.Student.ClassCompositeID : null)
                .ThenBy(x => x.StudentID)
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
                    StudentName = x.Student != null && !string.IsNullOrWhiteSpace(x.Student.FullName) ? x.Student.FullName : "-",
                    StatusRaw = x.Status
                })
                .ToListAsync();

            var items = rows
                .Select(x => new AttendanceReportItemDto
                {
                    Date = x.Date,
                    ClassSectionCompositeId = x.ClassSectionCompositeId,
                    ClassName = FormatClassSectionDisplayName(x.SectionClassName, x.SectionSectionName),
                    StudentId = x.StudentId,
                    StudentName = x.StudentName,
                    Status = NormalizeStatusForOutput(x.StatusRaw)
                })
                .ToList();

            return new AttendanceReportDto
            {
                DateFrom = fromDate,
                DateTo = toDate,
                TotalRecords = items.Count,
                PresentCount = items.Count(x => x.Status == StudentAttendanceStatuses.Present),
                AbsentCount = items.Count(x => x.Status == StudentAttendanceStatuses.Absent),
                LateCount = items.Count(x => x.Status == StudentAttendanceStatuses.Late),
                LeaveCount = items.Count(x => x.Status == StudentAttendanceStatuses.Leave),
                HolidayCount = items.Count(x => x.Status == StudentAttendanceStatuses.Holiday),
                ClassCount = items.Select(x => x.ClassSectionCompositeId).Distinct().Count(),
                StudentCount = items.Select(x => x.StudentId).Distinct().Count(),
                Items = items
            };
        }

        private async Task EnsureAttendanceRowsAsync(DateTime date, int classSectionCompositeId)
        {
            var activeStudents = await _context.Students
                .AsNoTracking()
                .Where(x => x.ClassCompositeID == classSectionCompositeId && x.IsActive == true)
                .Select(x => new { x.Reg_Id })
                .ToListAsync();

            if (activeStudents.Count == 0)
            {
                return;
            }

            var studentIds = activeStudents.Select(x => x.Reg_Id).ToList();
            var existingStudentIds = await _context.Attendances
                .Where(x =>
                    x.Date.HasValue &&
                    x.Date.Value.Date == date &&
                    x.StudentID.HasValue &&
                    studentIds.Contains(x.StudentID.Value))
                .Select(x => x.StudentID!.Value)
                .ToListAsync();

            var existingSet = existingStudentIds.ToHashSet();
            var missingRows = new List<Attendance>();

            foreach (var student in activeStudents)
            {
                if (existingSet.Contains(student.Reg_Id))
                {
                    continue;
                }

                missingRows.Add(new Attendance
                {
                    StudentID = student.Reg_Id,
                    Date = date,
                    Day = date.Day,
                    Month = date.Month,
                    Year = date.Year,
                    Status = "A",
                    IsPresent = false
                });
            }

            if (missingRows.Count == 0)
            {
                return;
            }

            _context.Attendances.AddRange(missingRows);
            await _context.SaveChangesAsync();
        }

        private async Task<ClassAttendanceSheetDto> BuildClassAttendanceSheetAsync(DateTime date, int classSectionCompositeId)
        {
            var section = await _context.Sections
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.ID == classSectionCompositeId);

            var displayName = section == null
                ? $"Class {classSectionCompositeId}"
                : FormatClassSectionDisplayName(section.ClassName, section.SectionName);

            var students = await _context.Students
                .AsNoTracking()
                .Where(x => x.ClassCompositeID == classSectionCompositeId && x.IsActive == true)
                .OrderBy(x => x.Reg_Id)
                .Select(x => new
                {
                    x.Reg_Id,
                    x.FullName,
                    Attendance = _context.Attendances
                        .Where(a => a.StudentID == x.Reg_Id &&
                                    a.Date.HasValue &&
                                    a.Date.Value.Date == date)
                        .Select(a => a.Status)
                        .FirstOrDefault()
                })
                .ToListAsync();

            return new ClassAttendanceSheetDto
            {
                ClassSectionCompositeId = classSectionCompositeId,
                ClassName = displayName,
                Date = date,
                Students = students.Select(s => new ClassAttendanceStudentDto
                {
                    StudentId = s.Reg_Id,
                    StudentName = s.FullName ?? "-",
                    Status = NormalizeStatusForOutput(s.Attendance)
                }).ToList()
            };
        }

        /// <summary>
        /// Many sections store the full label (e.g. "Nursery-Red") in ClassName and repeat it in SectionName;
        /// avoid "Nursery-Red - Nursery-Red" when building display labels.
        /// </summary>
        private static string FormatClassSectionDisplayName(string? className, string? sectionName)
        {
            var cn = (className ?? string.Empty).Trim();
            var sn = (sectionName ?? string.Empty).Trim();

            if (string.IsNullOrEmpty(cn))
            {
                return string.IsNullOrEmpty(sn) ? "-" : sn;
            }

            if (string.IsNullOrEmpty(sn))
            {
                return cn;
            }

            if (string.Equals(cn, sn, StringComparison.OrdinalIgnoreCase))
            {
                return cn;
            }

            return $"{cn} - {sn}";
        }

        private static bool? IsPresentFromStatus(string status) =>
            StudentAttendanceStatuses.IsInSchool(status);

        private static string NormalizeStatusForOutput(string? status) =>
            StudentAttendanceStatuses.CanonicalizeOrDefault(status);

        private async Task<List<StudentAttendanceRow>> LoadStudentAttendanceRowsAsync(
            int studentId,
            int? month,
            int? year)
        {
            var query = _context.Attendances
                .Where(x => x.StudentID == studentId);

            if (month.HasValue)
            {
                query = query.Where(x => x.Month == month.Value);
            }

            if (year.HasValue)
            {
                query = query.Where(x => x.Year == year.Value);
            }

            return await query
                .OrderByDescending(x => x.Date)
                .Select(x => new StudentAttendanceRow
                {
                    Id = x.ID,
                    Date = x.Date,
                    Status = x.Status,
                    IsPresent = x.IsPresent,
                    Month = x.Month,
                    Year = x.Year,
                    SectionClassName = x.Student != null && x.Student.Section != null
                        ? x.Student.Section.ClassName
                        : null,
                    SectionSectionName = x.Student != null && x.Student.Section != null
                        ? x.Student.Section.SectionName
                        : null
                })
                .ToListAsync();
        }

        private static List<AttendanceDto> MapStudentAttendanceRows(IReadOnlyList<StudentAttendanceRow> records)
        {
            var result = new List<AttendanceDto>();

            foreach (var r in records)
            {
                string? monthYear = null;

                if (r.Month.HasValue && r.Year.HasValue)
                {
                    var dt = new DateTime(r.Year.Value, r.Month.Value, 1);
                    monthYear = dt.ToString("MMMM yyyy", CultureInfo.InvariantCulture);
                }

                var sectionName = FormatClassSectionDisplayName(r.SectionClassName, r.SectionSectionName);
                result.Add(new AttendanceDto
                {
                    Id = r.Id,
                    Date = r.Date,
                    Status = NormalizeStatusForOutput(r.Status),
                    IsPresent = r.IsPresent,
                    MonthYear = monthYear,
                    SectionName = sectionName == "-" ? null : sectionName
                });
            }

            return result;
        }

        private static (
            int DaysPresent,
            int DaysAbsent,
            int DaysOnLeave,
            int DaysHoliday,
            int TotalDays,
            string Ratio,
            string Percentage) BuildStudentAttendanceSummary(
            IReadOnlyList<StudentAttendanceRow> records,
            int? month,
            int? year)
        {
            var daysPresent = 0;
            var daysAbsent = 0;
            var daysOnLeave = 0;
            var daysHoliday = 0;

            var hasCalendarMonth = TryResolveSummaryCalendarMonth(month, year, records, out var summaryYear, out var summaryMonth);
            var lastCountedDay = hasCalendarMonth
                ? GetLastCountedDayInMonth(summaryYear, summaryMonth, DateTime.Today)
                : 0;
            var weekdayHolidaysInPeriod = 0;

            foreach (var r in records)
            {
                var status = StudentAttendanceStatuses.CanonicalizeOrDefault(r.Status);
                if (status == StudentAttendanceStatuses.Holiday)
                {
                    if (!hasCalendarMonth || IsInSummaryPeriodThroughDay(r, summaryYear, summaryMonth, lastCountedDay))
                    {
                        daysHoliday++;
                        if (IsWeekdayInSummaryPeriod(r, summaryYear, summaryMonth, lastCountedDay))
                        {
                            weekdayHolidaysInPeriod++;
                        }
                    }

                    continue;
                }

                if (hasCalendarMonth && !CountsAsWorkingAttendanceDay(r, summaryYear, summaryMonth, lastCountedDay))
                {
                    continue;
                }

                if (StudentAttendanceStatuses.IsInSchool(status))
                {
                    daysPresent++;
                }
                else if (status == StudentAttendanceStatuses.Absent)
                {
                    daysAbsent++;
                }
                else if (status == StudentAttendanceStatuses.Leave)
                {
                    daysOnLeave++;
                }
            }

            var totalDays = 0;
            var ratio = "0/0";
            var percentage = "0%";

            if (hasCalendarMonth && lastCountedDay > 0)
            {
                var sundaysInPeriod = CountSundaysThroughDay(summaryYear, summaryMonth, lastCountedDay);
                totalDays = lastCountedDay - sundaysInPeriod - weekdayHolidaysInPeriod;
                if (totalDays < 0)
                {
                    totalDays = 0;
                }

                ratio = $"{daysPresent}/{totalDays}";
                percentage = totalDays > 0
                    ? $"{(int)Math.Round(daysPresent * 100.0 / totalDays, MidpointRounding.AwayFromZero)}%"
                    : "0%";
            }

            return (daysPresent, daysAbsent, daysOnLeave, daysHoliday, totalDays, ratio, percentage);
        }

        private static int GetLastCountedDayInMonth(int summaryYear, int summaryMonth, DateTime today)
        {
            var daysInMonth = DateTime.DaysInMonth(summaryYear, summaryMonth);
            if (summaryYear > today.Year || (summaryYear == today.Year && summaryMonth > today.Month))
            {
                return 0;
            }

            if (summaryYear == today.Year && summaryMonth == today.Month)
            {
                return Math.Min(today.Day, daysInMonth);
            }

            return daysInMonth;
        }

        private static bool IsInSummaryPeriodThroughDay(
            StudentAttendanceRow row,
            int summaryYear,
            int summaryMonth,
            int lastCountedDay)
        {
            if (!row.Date.HasValue)
            {
                return true;
            }

            var date = row.Date.Value.Date;
            return date.Year == summaryYear && date.Month == summaryMonth && date.Day <= lastCountedDay;
        }

        private static bool IsWeekdayInSummaryPeriod(
            StudentAttendanceRow row,
            int summaryYear,
            int summaryMonth,
            int lastCountedDay)
        {
            if (!IsInSummaryPeriodThroughDay(row, summaryYear, summaryMonth, lastCountedDay))
            {
                return false;
            }

            if (!row.Date.HasValue)
            {
                return true;
            }

            return row.Date.Value.Date.DayOfWeek != DayOfWeek.Sunday;
        }

        private static bool CountsAsWorkingAttendanceDay(
            StudentAttendanceRow row,
            int summaryYear,
            int summaryMonth,
            int lastCountedDay)
        {
            if (!row.Date.HasValue)
            {
                return true;
            }

            var date = row.Date.Value.Date;
            if (date.Year != summaryYear || date.Month != summaryMonth)
            {
                return false;
            }

            if (date.Day > lastCountedDay)
            {
                return false;
            }

            return date.DayOfWeek != DayOfWeek.Sunday;
        }

        private static bool TryResolveSummaryCalendarMonth(
            int? month,
            int? year,
            IReadOnlyList<StudentAttendanceRow> records,
            out int summaryYear,
            out int summaryMonth)
        {
            if (month.HasValue && year.HasValue)
            {
                summaryYear = year.Value;
                summaryMonth = month.Value;
                return true;
            }

            foreach (var r in records)
            {
                if (r.Month.HasValue && r.Year.HasValue)
                {
                    summaryYear = r.Year.Value;
                    summaryMonth = r.Month.Value;
                    return true;
                }
            }

            foreach (var r in records)
            {
                if (r.Date.HasValue)
                {
                    summaryYear = r.Date.Value.Year;
                    summaryMonth = r.Date.Value.Month;
                    return true;
                }
            }

            summaryYear = 0;
            summaryMonth = 0;
            return false;
        }

        private static int CountSundaysThroughDay(int year, int month, int lastDay)
        {
            var count = 0;
            for (var day = 1; day <= lastDay; day++)
            {
                if (new DateTime(year, month, day).DayOfWeek == DayOfWeek.Sunday)
                {
                    count++;
                }
            }

            return count;
        }

        private sealed class StudentAttendanceRow
        {
            public int Id { get; init; }

            public DateTime? Date { get; init; }

            public string? Status { get; init; }

            public bool? IsPresent { get; init; }

            public int? Month { get; init; }

            public int? Year { get; init; }

            public string? SectionClassName { get; init; }

            public string? SectionSectionName { get; init; }
        }
    }
}
