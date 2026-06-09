namespace School.Application.DTOs;

public class EmployeeAttendanceStatsDto
{
    public DateTime Date { get; set; }
    public int TotalMarked { get; set; }
    public int PresentCount { get; set; }
    public int AbsentCount { get; set; }
    public int HolidayCount { get; set; }
    public int ClassCount { get; set; }
}
