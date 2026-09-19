namespace School.Application.Common;

public static class BiometricAttendanceTypes
{
    public const string Kiosk = "Kiosk";
    public const string ZkTeco = "ZkTeco";
    public const string Default = ZkTeco;

    public static readonly TimeSpan DefaultTeacherCheckIn = new(7, 15, 0);
    public static readonly TimeSpan DefaultTeacherCheckOut = new(13, 30, 0);
    public static readonly TimeSpan DefaultFridayCheckOut = new(12, 30, 0);
    public const int DefaultAdminEarlyMinutes = 30;
    public const int DefaultCoordinatorEarlyMinutes = 15;

    public static bool IsKiosk(string? value) =>
        string.Equals(value?.Trim(), Kiosk, StringComparison.OrdinalIgnoreCase);

    public static string Normalize(string? value) => IsKiosk(value) ? Kiosk : ZkTeco;

    public static int ClampMinutes(int? value, int fallback)
    {
        var minutes = value ?? fallback;
        if (minutes < 0)
            return 0;
        return minutes > 1440 ? 1440 : minutes;
    }
}
