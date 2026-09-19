namespace School.Application.DTOs;

public class AttendanceReportDto
{
    public DateTime DateFrom { get; set; }
    public DateTime DateTo { get; set; }
    public int TotalRecords { get; set; }
    public int PresentCount { get; set; }
    public int AbsentCount { get; set; }
    public int LateCount { get; set; }
    public int LeaveCount { get; set; }
    public int HolidayCount { get; set; }
    public int ClassCount { get; set; }
    public int StudentCount { get; set; }
    public List<AttendanceReportItemDto> Items { get; set; } = new();
}

public class AttendanceReportItemDto
{
    public DateTime Date { get; set; }
    public int ClassSectionCompositeId { get; set; }
    public string ClassName { get; set; } = string.Empty;
    public int StudentId { get; set; }
    public string StudentName { get; set; } = string.Empty;
    public string Status { get; set; } = "A";
}
