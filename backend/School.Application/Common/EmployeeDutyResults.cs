namespace School.Application.Common;

public static class EmployeeDutyResults
{
    public const string OnTime = "OT";
    public const string Late = "LA";
    public const string EarlyLeave = "EL";
    public const string LateAndEarly = "LE";

    public static string FromMinutes(int lateMinutes, int earlyMinutes)
    {
        var late = lateMinutes > 0;
        var early = earlyMinutes > 0;
        if (late && early)
            return LateAndEarly;
        if (early)
            return EarlyLeave;
        if (late)
            return Late;
        return OnTime;
    }

    public static bool TryGetLabel(string? code, out string label)
    {
        label = Normalize(code) switch
        {
            OnTime => "On time",
            Late => "Late",
            EarlyLeave => "Left early",
            LateAndEarly => "Late, left early",
            _ => string.Empty,
        };
        return label.Length > 0;
    }

    /// <summary>True for late arrival, false for on time or early leave only, null when the code is blank.</summary>
    public static bool? IsLateArrival(string? code) =>
        Normalize(code) switch
        {
            Late or LateAndEarly => true,
            OnTime or EarlyLeave => false,
            _ => null,
        };

    private static string? Normalize(string? code) =>
        string.IsNullOrWhiteSpace(code) ? null : code.Trim().ToUpperInvariant();
}
