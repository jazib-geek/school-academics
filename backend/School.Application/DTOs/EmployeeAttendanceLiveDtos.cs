namespace School.Application.DTOs;

public class EmployeeAttendanceLiveDayDto
{
    public DateTime Date { get; set; }
    public int TotalEntries { get; set; }
    public int OnTimeCount { get; set; }
    public int LateCount { get; set; }
    public IReadOnlyList<EmployeeAttendanceLiveRowDto> Entries { get; set; } =
        Array.Empty<EmployeeAttendanceLiveRowDto>();
}

public class EmployeeAttendanceLiveRowDto
{
    public int AttendanceId { get; set; }
    public int EmployeeId { get; set; }
    public string EmployeeName { get; set; } = string.Empty;
    public DateTime Date { get; set; }
    public string? CheckInTime { get; set; }
    public string? CheckOutTime { get; set; }
    public int LateMinutes { get; set; }
    public int LateComings { get; set; }
    public string Status { get; set; } = string.Empty;
    public bool IsLate { get; set; }
}
