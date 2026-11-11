using Microsoft.EntityFrameworkCore;
using School.Application.Common;
using School.Application.DTOs;
using School.Application.Interfaces;
using School.Infrastructure.Data;

namespace School.Application.Services;

public class CustomNoticeService : ICustomNoticeService
{
    public const string OverallBalance = "overall-balance";
    public const string TuitionBalance = "tuition-balance";
    public const string FundsBalance = "funds-balance";
    public const string AbsentToday = "absent-today";
    public const string AbsentDays = "absent-days";
    public const string LowMarks = "low-marks";
    public const string WholeClass = "whole-class";
    public const string AbsentOwing = "absent-owing";

    private static readonly HashSet<string> KnownAudiences = new(StringComparer.OrdinalIgnoreCase)
    {
        OverallBalance,
        TuitionBalance,
        FundsBalance,
        AbsentToday,
        AbsentDays,
        LowMarks,
        WholeClass,
        AbsentOwing,
    };

    private readonly AppDbContext _context;

    public CustomNoticeService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<CustomNoticePreviewDto> PreviewAsync(CustomNoticePreviewRequestDto request)
    {
        var audience = (request.AudienceId ?? string.Empty).Trim().ToLowerInvariant();
        if (!KnownAudiences.Contains(audience))
        {
            throw new ArgumentException("Choose who should receive this notice.");
        }

        var className = (request.ClassName ?? string.Empty).Trim();
        if (audience == WholeClass && className.Length == 0)
        {
            throw new ArgumentException("Choose a class.");
        }

        var absentDays = request.AbsentDays ?? 0;
        if (audience == AbsentDays && (absentDays < 1 || absentDays > 30))
        {
            throw new ArgumentException("Enter how many school days, from 1 to 30.");
        }

        string? examName = null;
        var maxPercent = request.MaxPercent ?? 0;
        if (audience == LowMarks)
        {
            if (request.ExamTypeId is null or <= 0)
            {
                throw new ArgumentException("Choose an exam.");
            }

            if (request.MaxPercent is null || maxPercent < 0 || maxPercent > 100)
            {
                throw new ArgumentException("Enter a percent from 0 to 100.");
            }

            examName = await _context.ExamTypes
                .AsNoTracking()
                .Where(x => x.ID == request.ExamTypeId.Value)
                .Select(x => x.ExamTypeName)
                .FirstOrDefaultAsync();

            if (string.IsNullOrWhiteSpace(examName))
            {
                throw new ArgumentException("That exam was not found.");
            }
        }

        if (UsesBalanceCompare(audience) && request.BalanceAmount is < 0)
        {
            throw new ArgumentException("Enter an amount of zero or more.");
        }

        var studentsQuery = _context.Students
            .AsNoTracking()
            .Where(x => x.IsActive == true);

        if (className.Length > 0)
        {
            studentsQuery = studentsQuery.Where(x => x.Section != null && x.Section.ClassName == className);
        }

        var students = await studentsQuery
            .Select(x => new StudentRow(
                x.Reg_Id,
                x.FullName ?? "N/A",
                x.Section != null ? x.Section.ClassName : null))
            .ToListAsync();

        if (students.Count == 0)
        {
            return new CustomNoticePreviewDto { AudienceId = audience, ExamName = examName, Items = [] };
        }

        var studentIds = students.Select(x => x.Id).ToList();
        var balances = await LoadBalancesAsync(studentIds);

        HashSet<int>? absentToday = null;
        if (audience is AbsentToday or AbsentOwing)
        {
            absentToday = await LoadAbsentTodayAsync(studentIds);
        }

        Dictionary<int, int>? streaks = null;
        if (audience == AbsentDays)
        {
            streaks = await LoadAbsentStreaksAsync(studentIds);
        }

        Dictionary<int, decimal>? percents = null;
        if (audience == LowMarks)
        {
            percents = await LoadPercentsAsync(studentIds, request.ExamTypeId!.Value);
        }

        var items = new List<CustomNoticeStudentDto>(students.Count);
        foreach (var student in students)
        {
            balances.TryGetValue(student.Id, out var balance);
            var tuition = balance.Tuition;
            var funds = balance.Funds;
            var overall = tuition + funds;

            int? days = null;
            if (audience is AbsentToday or AbsentOwing)
            {
                days = 1;
            }
            else if (audience == AbsentDays && streaks!.TryGetValue(student.Id, out var streak))
            {
                days = streak;
            }

            decimal? percent = null;
            if (audience == LowMarks && percents!.TryGetValue(student.Id, out var mark))
            {
                percent = mark;
            }

            var include = audience switch
            {
                OverallBalance => MatchesBalance(overall, request.BalanceOp, request.BalanceAmount),
                TuitionBalance => MatchesBalance(tuition, request.BalanceOp, request.BalanceAmount),
                FundsBalance => MatchesBalance(funds, request.BalanceOp, request.BalanceAmount),
                AbsentToday => absentToday!.Contains(student.Id),
                AbsentDays => days.HasValue && days.Value >= absentDays,
                LowMarks => percent.HasValue && percent.Value < maxPercent,
                WholeClass => true,
                AbsentOwing => absentToday!.Contains(student.Id) && RoundMoney(overall) != 0,
                _ => false,
            };

            if (!include)
            {
                continue;
            }

            items.Add(new CustomNoticeStudentDto
            {
                StudentId = student.Id,
                StudentName = student.Name,
                ClassName = student.ClassName,
                TuitionBalance = tuition,
                FundsBalance = funds,
                OverallBalance = overall,
                AbsentDays = days,
                ExamName = examName,
                Percent = percent,
            });
        }

        items.Sort(static (a, b) =>
        {
            var classCompare = string.Compare(a.ClassName, b.ClassName, StringComparison.OrdinalIgnoreCase);
            return classCompare != 0 ? classCompare : a.StudentId.CompareTo(b.StudentId);
        });

        return new CustomNoticePreviewDto
        {
            AudienceId = audience,
            ExamName = examName,
            Items = items,
        };
    }

    private static bool UsesBalanceCompare(string audience) =>
        audience is OverallBalance or TuitionBalance or FundsBalance;

    private static bool MatchesBalance(decimal value, string? op, decimal? amount)
    {
        var rounded = RoundMoney(value);
        if (rounded == 0)
        {
            return false;
        }

        if (amount is null)
        {
            return true;
        }

        var threshold = RoundMoney(amount.Value);
        return (op ?? string.Empty).Trim().ToLowerInvariant() switch
        {
            "gt" => rounded > threshold,
            "lt" => rounded < threshold,
            "lte" => rounded <= threshold,
            "eq" => rounded == threshold,
            _ => rounded >= threshold,
        };
    }

    private static decimal RoundMoney(decimal value) =>
        Math.Round(value, 2, MidpointRounding.AwayFromZero);

    private async Task<Dictionary<int, BalanceRow>> LoadBalancesAsync(List<int> studentIds)
    {
        var ledgerRows = await _context.FeeAndFundCollections
            .AsNoTracking()
            .Where(x => (x.VoidAmount ?? 0) == 0)
            .Where(x => x.StudentID != null && studentIds.Contains(x.StudentID.Value))
            .Where(x => x.FundTypeID != null)
            .GroupBy(x => new { StudentId = x.StudentID!.Value, FundTypeId = x.FundTypeID!.Value })
            .Select(g => new
            {
                g.Key.StudentId,
                g.Key.FundTypeId,
                Net = g.Sum(x => (x.Payment ?? 0) - ((x.Recieved ?? 0) + (x.Discount ?? 0))),
            })
            .ToListAsync();

        var map = new Dictionary<int, BalanceRow>();
        foreach (var row in ledgerRows)
        {
            if (!map.TryGetValue(row.StudentId, out var current))
            {
                current = new BalanceRow(0, 0);
            }

            if (row.FundTypeId == 1)
            {
                current = current with { Tuition = current.Tuition + row.Net };
            }
            else if (row.FundTypeId > 1)
            {
                current = current with { Funds = current.Funds + row.Net };
            }

            map[row.StudentId] = current;
        }

        return map;
    }

    private async Task<HashSet<int>> LoadAbsentTodayAsync(List<int> studentIds)
    {
        var today = PakistanTime.TodayStart;
        var absentCode = StudentAttendanceStatuses.Absent;
        var ids = await _context.Attendances
            .AsNoTracking()
            .Where(a =>
                a.StudentID != null &&
                studentIds.Contains(a.StudentID.Value) &&
                a.Date.HasValue &&
                a.Date.Value.Date == today &&
                a.Status != null &&
                a.Status.ToUpper() == absentCode)
            .Select(a => a.StudentID!.Value)
            .Distinct()
            .ToListAsync();

        return ids.ToHashSet();
    }

    private async Task<Dictionary<int, int>> LoadAbsentStreaksAsync(List<int> studentIds)
    {
        var today = PakistanTime.TodayStart;
        var lookback = today.AddDays(-180);
        var rows = await _context.Attendances
            .AsNoTracking()
            .Where(a =>
                a.StudentID != null &&
                studentIds.Contains(a.StudentID.Value) &&
                a.Date.HasValue &&
                a.Date >= lookback &&
                a.Date < today.AddDays(1))
            .Select(a => new { StudentId = a.StudentID!.Value, Date = a.Date!.Value, a.Status })
            .ToListAsync();

        var streaks = new Dictionary<int, int>();
        foreach (var group in rows.GroupBy(x => x.StudentId))
        {
            var days = group
                .GroupBy(x => x.Date.Date)
                .Select(g => new { Date = g.Key, Status = PickDayStatus(g.Select(x => x.Status)) })
                .Where(x => x.Status != StudentAttendanceStatuses.Holiday)
                .OrderByDescending(x => x.Date)
                .ToList();

            var streak = 0;
            foreach (var day in days)
            {
                if (day.Status != StudentAttendanceStatuses.Absent)
                {
                    break;
                }

                streak++;
            }

            if (streak > 0)
            {
                streaks[group.Key] = streak;
            }
        }

        return streaks;
    }

    private static string PickDayStatus(IEnumerable<string?> statuses)
    {
        var codes = new List<string>();
        foreach (var status in statuses)
        {
            if (StudentAttendanceStatuses.TryCanonicalize(status, out var canonical))
            {
                codes.Add(canonical);
            }
        }

        if (codes.Count == 0 || codes.All(code => code == StudentAttendanceStatuses.Holiday))
        {
            return StudentAttendanceStatuses.Holiday;
        }

        if (codes.All(code => code == StudentAttendanceStatuses.Absent || code == StudentAttendanceStatuses.Holiday))
        {
            return StudentAttendanceStatuses.Absent;
        }

        return StudentAttendanceStatuses.Present;
    }

    private async Task<Dictionary<int, decimal>> LoadPercentsAsync(List<int> studentIds, int examTypeId)
    {
        var year = PakistanTime.Today.Year.ToString();
        var rows = await _context.Exams
            .AsNoTracking()
            .Where(x =>
                x.ExamTypeID == examTypeId &&
                x.StudentID != null &&
                studentIds.Contains(x.StudentID.Value) &&
                x.ObtainedMarks != null &&
                x.ObtainedMarks != -1 &&
                x.TotalMarks != null &&
                x.TotalMarks > 0)
            .Select(x => new
            {
                StudentId = x.StudentID!.Value,
                Obtained = x.ObtainedMarks!.Value,
                Total = x.TotalMarks!.Value,
                x.SessionYear,
            })
            .ToListAsync();

        var hasCurrentYear = rows.Any(x =>
            !string.IsNullOrWhiteSpace(x.SessionYear) &&
            x.SessionYear.Contains(year, StringComparison.Ordinal));

        if (hasCurrentYear)
        {
            rows = rows
                .Where(x => string.IsNullOrWhiteSpace(x.SessionYear) || x.SessionYear.Contains(year, StringComparison.Ordinal))
                .ToList();
        }

        var percents = new Dictionary<int, decimal>();
        foreach (var group in rows.GroupBy(x => x.StudentId))
        {
            var obtained = group.Sum(x => (decimal)x.Obtained);
            var total = group.Sum(x => (decimal)x.Total);
            if (total <= 0)
            {
                continue;
            }

            percents[group.Key] = Math.Round(obtained * 100m / total, 1, MidpointRounding.AwayFromZero);
        }

        return percents;
    }

    private readonly record struct StudentRow(int Id, string Name, string? ClassName);

    private readonly record struct BalanceRow(decimal Tuition, decimal Funds);

}
