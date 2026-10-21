namespace School.Application.Common;

public static class PakistanTime
{
    private static readonly TimeZoneInfo PakistanZone = ResolvePakistanZone();

    public static DateOnly Today => DateOnly.FromDateTime(Now);

    /// <summary>Midnight on the Pakistan calendar date. Use instead of <see cref="DateTime.Today"/>.</summary>
    public static DateTime TodayStart => Now.Date;

    public static DateOnly Yesterday => Today.AddDays(-1);

    public static DateOnly Tomorrow => Today.AddDays(1);

    /// <summary>Current date/time in Pakistan (Asia/Karachi). Use for attendance/enrollment timestamps.</summary>
    public static DateTime Now => TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, PakistanZone);

    /// <summary>Converts a Pakistan wall-clock time to UTC (Kind = Utc).</summary>
    public static DateTime ToUtc(DateTime pakistanLocal) =>
        TimeZoneInfo.ConvertTimeToUtc(DateTime.SpecifyKind(pakistanLocal, DateTimeKind.Unspecified), PakistanZone);

    public static bool IsTodayOrYesterday(DateOnly date) => date == Today || date == Yesterday;

    /// <summary>Class diary upload window: yesterday, today, or tomorrow (Pakistan).</summary>
    public static bool IsAllowedDiaryDate(DateOnly date) =>
        date == Yesterday || date == Today || date == Tomorrow;

    private static TimeZoneInfo ResolvePakistanZone()
    {
        try
        {
            return TimeZoneInfo.FindSystemTimeZoneById("Asia/Karachi");
        }
        catch (TimeZoneNotFoundException)
        {
            return TimeZoneInfo.FindSystemTimeZoneById("Pakistan Standard Time");
        }
    }
}
