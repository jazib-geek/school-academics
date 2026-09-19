namespace School.Application.DTOs;

public class SmartAttendanceReportRunRequestDto
{
    public string ReportId { get; set; } = string.Empty;
    public Dictionary<string, object?> Parameters { get; set; } = new(StringComparer.OrdinalIgnoreCase);
}

public class AttendanceExecutiveSnapshotDto
{
    public DateTime GeneratedAt { get; set; } = DateTime.Now;
    public DateTime SnapshotDate { get; set; }
    public int PresentCount { get; set; }
    public int AbsentCount { get; set; }
    public int LateCount { get; set; }
    public int LeaveCount { get; set; }
    public int HolidayCount { get; set; }
    public int TotalMarked { get; set; }
    public decimal PresentPercent { get; set; }
    public int ClassesMarked { get; set; }
    public decimal MtdAveragePresentPercent { get; set; }
}
