namespace School.Application.Common;

public static class StudentLeaveApplicationStatuses
{
    public const string Pending = "pending";
    public const string Approved = "approved";
    public const string Rejected = "rejected";

    public static readonly IReadOnlyList<string> All = [Pending, Approved, Rejected];

    public static bool TryNormalize(string? value, out string normalized)
    {
        normalized = Pending;
        if (string.IsNullOrWhiteSpace(value))
            return false;

        var key = value.Trim();
        foreach (var status in All)
        {
            if (key.Equals(status, StringComparison.OrdinalIgnoreCase))
            {
                normalized = status;
                return true;
            }
        }

        return false;
    }

    public static string RequireFilter(string? value)
    {
        if (string.IsNullOrWhiteSpace(value) || value.Trim().Equals("all", StringComparison.OrdinalIgnoreCase))
            return string.Empty;

        if (!TryNormalize(value, out var normalized))
            throw new ArgumentException("Status filter is not valid.");

        return normalized;
    }

    public static string Label(string status) => status switch
    {
        Approved => "Approved",
        Rejected => "Rejected",
        _ => "Pending",
    };
}
