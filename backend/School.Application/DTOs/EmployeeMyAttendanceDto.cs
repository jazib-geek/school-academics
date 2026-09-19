namespace School.Application.DTOs;

public class EmployeeMyAttendanceDto
{
    public int EmployeeId { get; set; }
    public string EmployeeName { get; set; } = string.Empty;
    public string? DesignationName { get; set; }
    public int Year { get; set; }
    public int Month { get; set; }
    public string MonthLabel { get; set; } = string.Empty;
    public int PresentDays { get; set; }
    public int LateDays { get; set; }
    public int AbsentDays { get; set; }
    public int HolidayDays { get; set; }
    public IReadOnlyList<EmployeeMyAttendanceDayDto> Days { get; set; } =
        Array.Empty<EmployeeMyAttendanceDayDto>();
}

public class EmployeeMyAttendanceDayDto
{
    public DateTime Date { get; set; }
    public string DayLabel { get; set; } = string.Empty;
    public string? CheckInTime { get; set; }
    public string? CheckOutTime { get; set; }
    public int LateMinutes { get; set; }
    public bool IsLate { get; set; }
    public bool HasPunch { get; set; }
    public bool IsHoliday { get; set; }
    /// <summary>Staff-facing label, e.g. On time / Late / Left early / Late, left early.</summary>
    public string StatusLabel { get; set; } = string.Empty;
}
