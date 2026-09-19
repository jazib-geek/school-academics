namespace School.Application.Common;

/// <summary>
/// Minutes earlier than teacher duty times during ZKTeco sheet import.
/// Campus profile stores the defaults; these constants are the fallback.
/// </summary>
public static class AttendanceImportDutyOffsets
{
    public const string TeacherName = "Teacher";
    public const string CoordinatorName = "Co-ordinator";
    public const string AdminName = "Admin";

    public const int TeacherMinutesBefore = 0;
    public const int CoordinatorMinutesBefore = 15;
    public const int AdminMinutesBefore = 30;

    public static int MinutesBeforeTeacher(
        int? designationId,
        string? designationName,
        int? adminMinutesBefore = null,
        int? coordinatorMinutesBefore = null)
    {
        if (designationId == EmployeeDesignations.Coordinator ||
            NamesMatch(designationName, CoordinatorName))
        {
            return ClampMinutes(coordinatorMinutesBefore, CoordinatorMinutesBefore);
        }

        if (EmployeeDesignations.IsAdminName(designationName) ||
            NamesMatch(designationName, AdminName))
        {
            return ClampMinutes(adminMinutesBefore, AdminMinutesBefore);
        }

        return TeacherMinutesBefore;
    }

    public static TimeSpan? ShiftEarlier(TimeSpan? teacherTime, int minutesBefore)
    {
        if (!teacherTime.HasValue)
            return null;

        var shifted = teacherTime.Value.Subtract(TimeSpan.FromMinutes(Math.Max(minutesBefore, 0)));
        return shifted < TimeSpan.Zero ? TimeSpan.Zero : shifted;
    }

    private static bool NamesMatch(string? actual, string expected) =>
        !string.IsNullOrWhiteSpace(actual) &&
        actual.Trim().Equals(expected, StringComparison.OrdinalIgnoreCase);

    private static int ClampMinutes(int? value, int fallback)
    {
        if (!value.HasValue)
            return fallback;
        if (value.Value < 0)
            return 0;
        return value.Value > 1440 ? 1440 : value.Value;
    }
}
