using School.Infrastructure.Entities;

namespace School.Application.Common;

public static class DesignationTimeHelper
{
    public static TimeSpan? ToTimeOfDay(DateTime? value) =>
        value.HasValue ? value.Value.TimeOfDay : null;

    /// <summary>
    /// Weekday duty times, with Friday and Saturday columns when that date uses them.
    /// </summary>
    public static (DateTime? CheckIn, DateTime? CheckOut) SourcesForDate(Designation? designation, DateTime date)
    {
        if (designation is null)
            return (null, null);

        if (date.DayOfWeek == DayOfWeek.Saturday)
        {
            return (
                designation.SaturdayMustCheckinTime ?? designation.MustCheckinTime,
                designation.SaturdayLeavingTime ?? designation.LeavingTime);
        }

        if (date.DayOfWeek == DayOfWeek.Friday)
        {
            return (
                designation.FridayMustCheckinTime ?? designation.MustCheckinTime,
                designation.FridayLeavingTime ?? designation.LeavingTime);
        }

        return (designation.MustCheckinTime, designation.LeavingTime);
    }

    public static string? FormatTime(DateTime? value) =>
        value.HasValue ? value.Value.ToString("hh:mm tt") : null;

    public static string FormatDuration(int minutes)
    {
        if (minutes < 60)
            return $"{minutes} minute(s)";

        var hours = minutes / 60;
        var remainingMinutes = minutes % 60;
        return $"{hours}:{remainingMinutes:D2}";
    }

    /// <summary>
    /// Grace only forgives arrival up to must-check-in + grace.
    /// Once past that window, late minutes count from must-check-in, not from the grace deadline.
    /// </summary>
    public static int CalculateLateMinutes(TimeSpan actual, TimeSpan? expectedCheckIn, int? graceMinutes)
    {
        if (!expectedCheckIn.HasValue)
            return 0;

        var grace = Math.Max(graceMinutes.GetValueOrDefault(), 0);
        var graceDeadline = expectedCheckIn.Value.Add(TimeSpan.FromMinutes(grace));
        if (actual <= graceDeadline)
            return 0;

        return (int)Math.Floor((actual - expectedCheckIn.Value).TotalMinutes);
    }
}