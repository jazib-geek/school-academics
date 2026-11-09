namespace School.Application.Common;

/// <summary>
/// How many minutes earlier than that date's teacher times a designation starts during ZKTeco import.
/// Teacher uses the entered times. Co-ordinator uses the co-ordinator offset.
/// Admin and every other designation, including a missing one, use the admin offset.
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

        if (NamesMatch(designationName, TeacherName))
            return TeacherMinutesBefore;

        return ClampMinutes(adminMinutesBefore, AdminMinutesBefore);
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
