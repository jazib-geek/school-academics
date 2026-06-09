namespace School.Application.DTOs;

public class StudentResultDto
{
    public int StudentId { get; set; }
    public int ExamTypeId { get; set; }

    public string? StudentName { get; set; }
    public string? FatherName { get; set; }
    public string? ClassName { get; set; }
    public string? ExamTypeName { get; set; }
    public string? AttendanceRatio { get; set; }

    public int TotalMarks { get; set; }
    public int TotalObtained { get; set; }
    public int Percentage { get; set; }

    public string? Grade { get; set; }
    public string? Remarks { get; set; }
    public int Position { get; set; }
    public string? PositionDisplay { get; set; }

    public List<StudentSubjectResultDto> Subjects { get; set; } = new();
}
