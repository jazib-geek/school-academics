namespace School.Application.DTOs;

public class StudentAttendanceSummaryDto
{
    public int DaysPresent { get; set; }

    public int DaysAbsent { get; set; }

    public int DaysOnLeave { get; set; }

    public int DaysHoliday { get; set; }

    public int TotalDays { get; set; }

    public string Ratio { get; set; } = string.Empty;

    public string Percentage { get; set; } = string.Empty;

    public IReadOnlyList<AttendanceDto> Records { get; set; } = Array.Empty<AttendanceDto>();
}
