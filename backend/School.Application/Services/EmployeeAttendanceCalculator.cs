using System.Globalization;
using School.Application.Common;
using School.Infrastructure.Entities;

namespace School.Application.Services;

public readonly record struct EmployeeAttendanceCalcResult(
    int LateMinutes,
    int EarlyMinutes,
    int LateComings,
    decimal? CurrentSalary,
    decimal? LateDeduction,
    decimal? TodaySalary);

public static class EmployeeAttendanceCalculator
{
    public static EmployeeAttendanceCalcResult Apply(
        EmployeeAttendance row,
        Employee employee,
        DateTime date,
        TimeSpan? expectedCheckIn,
        TimeSpan? expectedCheckOut)
    {
        var lateMinutes = CalculateLateMinutesFromStoredCheckIn(
            date,
            row.Time,
            expectedCheckIn,
            employee.Designation?.MustCheckinMinutesDifference);
        var earlyMinutes = 0;
        if (row.CheckOutTime.HasValue)
            earlyMinutes = CalculateEarlyMinutes(row.CheckOutTime.Value.TimeOfDay, expectedCheckOut);

        var lateComingSlabs = CountLateComings(lateMinutes + earlyMinutes);
        var currentSalary = RoundNullable(employee.Salary);
        var lateDeduction = CalculateLateDeductionOnThisDay(date, currentSalary, lateComingSlabs);
        var todaySalary = CalculateEmpSalaryOnThisDay(date, currentSalary, lateComingSlabs);

        row.LateComings = lateComingSlabs;
        row.CurrentSalary = currentSalary;
        row.LateDeduction = lateDeduction;
        row.TodaySalary = todaySalary;

        return new EmployeeAttendanceCalcResult(
            lateMinutes,
            earlyMinutes,
            lateComingSlabs,
            currentSalary,
            lateDeduction,
            todaySalary);
    }

    public static int CalculateEarlyMinutes(TimeSpan actual, TimeSpan? expected) =>
        expected.HasValue && actual < expected.Value
            ? (int)Math.Floor((expected.Value - actual).TotalMinutes)
            : 0;

    public static int CountLateComings(int minutesDifference)
    {
        if (minutesDifference <= 0)
            return 0;

        return Math.Min((minutesDifference - 1) / 30 + 1, 7);
    }

    public static int CalculateLateMinutesFromStoredCheckIn(
        DateTime date,
        string? checkInText,
        TimeSpan? expectedCheckIn,
        int? graceMinutes)
    {
        if (!expectedCheckIn.HasValue || string.IsNullOrWhiteSpace(checkInText))
            return 0;

        if (!TryParseAttendanceTime(date, checkInText, out var actualCheckIn))
            return 0;

        return DesignationTimeHelper.CalculateLateMinutes(actualCheckIn.TimeOfDay, expectedCheckIn, graceMinutes);
    }

    public static decimal? CalculateLateDeductionOnThisDay(
        DateTime date,
        decimal? monthlySalary,
        int lateComings)
    {
        if (!monthlySalary.HasValue || monthlySalary.Value <= 0 || lateComings <= 0)
            return 0;

        var salaryPer30Min = CalculateSalaryPerDay(date, monthlySalary.Value) / 12;
        return Math.Round(lateComings * salaryPer30Min, 2);
    }

    public static decimal? CalculateEmpSalaryOnThisDay(
        DateTime date,
        decimal? monthlySalary,
        int lateComings)
    {
        if (!monthlySalary.HasValue || monthlySalary.Value <= 0)
            return 0;

        var salaryPerDay = CalculateSalaryPerDay(date, monthlySalary.Value);
        var deduction = CalculateLateDeductionOnThisDay(date, monthlySalary, lateComings) ?? 0;
        return Math.Round(salaryPerDay - deduction, 2);
    }

    public static decimal? RoundNullable(decimal? value) =>
        value.HasValue ? Math.Round(value.Value, 2) : value;

    public static bool TryParseAttendanceTime(DateTime date, string timeText, out DateTime result)
    {
        if (TimeSpan.TryParse(timeText, CultureInfo.InvariantCulture, out var ts) ||
            TimeSpan.TryParse(timeText, out ts))
        {
            result = date.Date.Add(ts);
            return true;
        }

        if (DateTime.TryParse($"{date:yyyy-MM-dd} {timeText}", CultureInfo.InvariantCulture, DateTimeStyles.None, out result))
            return true;

        return DateTime.TryParse($"{date:yyyy-MM-dd} {timeText}", out result);
    }

    public static bool TryParseTimeOfDay(string? text, out TimeSpan time)
    {
        time = default;
        if (string.IsNullOrWhiteSpace(text))
            return false;

        var trimmed = text.Trim();
        if (TimeSpan.TryParse(trimmed, CultureInfo.InvariantCulture, out time) ||
            TimeSpan.TryParse(trimmed, out time))
            return true;

        if (DateTime.TryParse(
                trimmed,
                CultureInfo.InvariantCulture,
                DateTimeStyles.NoCurrentDateDefault,
                out var dt) ||
            DateTime.TryParse(trimmed, out dt))
        {
            time = dt.TimeOfDay;
            return true;
        }

        return false;
    }

    public static string FormatHhMm(TimeSpan? value) =>
        value.HasValue ? $"{value.Value.Hours:D2}:{value.Value.Minutes:D2}" : string.Empty;

    public static decimal CalculateSalaryPerDay(DateTime date, decimal monthlySalary) =>
        monthlySalary / DateTime.DaysInMonth(date.Year, date.Month);
}
