namespace School.Application.Common;

public static class PakistanTime
{
    private static readonly TimeZoneInfo PakistanZone = ResolvePakistanZone();

    public static DateOnly Today => DateOnly.FromDateTime(TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, PakistanZone));

    public static DateOnly Yesterday => Today.AddDays(-1);

    public static bool IsTodayOrYesterday(DateOnly date) => date == Today || date == Yesterday;

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
