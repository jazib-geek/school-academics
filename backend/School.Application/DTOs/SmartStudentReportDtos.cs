namespace School.Application.DTOs;

public class SmartStudentReportRunRequestDto
{
    public string ReportId { get; set; } = string.Empty;
    public Dictionary<string, object?> Parameters { get; set; } = new(StringComparer.OrdinalIgnoreCase);
}

public class StudentExecutiveSnapshotDto
{
    public DateTime GeneratedAt { get; set; } = DateTime.Now;
    public int ActiveStudentCount { get; set; }
    public int InactiveStudentCount { get; set; }
    public int StruckOffMtd { get; set; }
    public int AdmissionsMtd { get; set; }
    public int ActiveFamilyCount { get; set; }
    public int ActiveClassCount { get; set; }
}
