namespace School.Application.DTOs;

public class ClassAttendanceBulkStatusRequestDto
{
    public DateTime Date { get; set; }
    public int ClassSectionCompositeId { get; set; }
    public string Status { get; set; } = "A";
}

public class ClassAttendanceStudentStatusRequestDto
{
    public DateTime Date { get; set; }
    public int ClassSectionCompositeId { get; set; }
    public int StudentId { get; set; }
    public string Status { get; set; } = "A";
}
