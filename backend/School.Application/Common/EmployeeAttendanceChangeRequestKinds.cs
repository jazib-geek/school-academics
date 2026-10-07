namespace School.Application.Common;

public static class EmployeeAttendanceChangeRequestKinds
{
    public const string Change = "change";
    public const string MarkPresent = "mark_present";

    public static readonly IReadOnlyList<string> All = [Change, MarkPresent];

    public static bool TryNormalize(string? value, out string normalized)
    {
        normalized = Change;
        if (string.IsNullOrWhiteSpace(value))
            return true;

        var key = value.Trim();
        if (key.Equals("MarkPresent", StringComparison.OrdinalIgnoreCase)
            || key.Equals("markpresent", StringComparison.OrdinalIgnoreCase))
        {
            normalized = MarkPresent;
            return true;
        }

        foreach (var kind in All)
        {
            if (key.Equals(kind, StringComparison.OrdinalIgnoreCase))
            {
                normalized = kind;
                return true;
            }
        }

        return false;
    }

    public static string RequireKind(string? value)
    {
        if (!TryNormalize(value, out var normalized))
            throw new ArgumentException("Request type is not valid.");

        return normalized;
    }

    public static string Label(string kind) => kind switch
    {
        MarkPresent => "Mark present",
        _ => "Time change",
    };
}
