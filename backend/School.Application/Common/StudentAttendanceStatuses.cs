namespace School.Application.Common;

public static class StudentAttendanceStatuses
{
    public const string Present = "P";
    public const string Absent = "A";
    public const string Late = "Lt";
    public const string Leave = "Lv";
    public const string Holiday = "H";

    public static readonly IReadOnlyList<string> All = [Present, Absent, Late, Leave, Holiday];
    public static readonly IReadOnlyList<string> Bulk = [Present, Absent, Holiday];

    public static bool TryCanonicalize(string? status, out string canonical)
    {
        canonical = Absent;
        if (string.IsNullOrWhiteSpace(status))
        {
            return false;
        }

        var key = status.Trim();
        if (key.Equals(Present, StringComparison.OrdinalIgnoreCase) ||
            key.Equals("Present", StringComparison.OrdinalIgnoreCase))
        {
            canonical = Present;
            return true;
        }

        if (key.Equals(Absent, StringComparison.OrdinalIgnoreCase) ||
            key.Equals("Absent", StringComparison.OrdinalIgnoreCase))
        {
            canonical = Absent;
            return true;
        }

        if (key.Equals(Late, StringComparison.OrdinalIgnoreCase) ||
            key.Equals("Late", StringComparison.OrdinalIgnoreCase))
        {
            canonical = Late;
            return true;
        }

        if (key.Equals(Leave, StringComparison.OrdinalIgnoreCase) ||
            key.Equals("Leave", StringComparison.OrdinalIgnoreCase))
        {
            canonical = Leave;
            return true;
        }

        if (key.Equals(Holiday, StringComparison.OrdinalIgnoreCase) ||
            key.Equals("Holiday", StringComparison.OrdinalIgnoreCase))
        {
            canonical = Holiday;
            return true;
        }

        return false;
    }

    public static string CanonicalizeOrDefault(string? status) =>
        TryCanonicalize(status, out var canonical) ? canonical : Absent;

    public static string Require(string? status)
    {
        if (!TryCanonicalize(status, out var canonical))
        {
            throw new ArgumentException("Status must be one of: P, A, Lt, Lv, H.");
        }

        return canonical;
    }

    public static string RequireBulk(string? status)
    {
        var canonical = Require(status);
        if (!IsBulk(canonical))
        {
            throw new ArgumentException("Mark all only supports P, A, H.");
        }

        return canonical;
    }

    public static bool IsBulk(string canonical) =>
        canonical == Present || canonical == Absent || canonical == Holiday;

    public static bool IsInSchool(string canonical) =>
        canonical == Present || canonical == Late;

    public static bool EqualsCode(string? status, string expected) =>
        string.Equals(CanonicalizeOrDefault(status), expected, StringComparison.Ordinal);

    public static string Label(string? status) => CanonicalizeOrDefault(status) switch
    {
        Present => "Present",
        Absent => "Absent",
        Late => "Late",
        Leave => "Leave",
        Holiday => "Holiday",
        _ => "Absent",
    };
}
