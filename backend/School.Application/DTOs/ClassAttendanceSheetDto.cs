namespace School.Application.DTOs;

public class ClassAttendanceSheetDto
{
    public int ClassSectionCompositeId { get; set; }
    public string ClassName { get; set; } = string.Empty;
    public DateTime Date { get; set; }
    public List<ClassAttendanceStudentDto> Students { get; set; } = new();
}

public class ClassAttendanceStudentDto
{
    public int StudentId { get; set; }
    public string StudentName { get; set; } = string.Empty;
    public string Status { get; set; } = "A";

    /// <summary>Populated on whole-school sheets: use with student status API.</summary>
    public int? ClassSectionCompositeIdForStudent { get; set; }

    /// <summary>Populated on whole-school sheets: class label for the row.</summary>
    public string? ClassNameForStudent { get; set; }
}
