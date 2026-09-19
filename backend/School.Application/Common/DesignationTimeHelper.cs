namespace School.Application.Common;

public static class DesignationTimeHelper
{
    public static TimeSpan? ToTimeOfDay(DateTime? value) =>
        value.HasValue ? value.Value.TimeOfDay : null;

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