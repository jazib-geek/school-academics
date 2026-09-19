namespace School.Application.DTOs;

public class EmployeeLookupDto
{
    public int ID { get; set; }
    public string EmployeeName { get; set; } = string.Empty;
    public string? Gender { get; set; }
}

public class TeacherClassSubjectAssignmentDto
{
    public int ID { get; set; }
    public int EmployeeID { get; set; }
    public string EmployeeName { get; set; } = string.Empty;
    public string? Gender { get; set; }
    public int ClassID { get; set; }
    public string ClassName { get; set; } = string.Empty;
    public int SubjectID { get; set; }
    public string SubjectName { get; set; } = string.Empty;
}

public class TeacherClassSubjectAssignmentCreateDto
{
    public int EmployeeID { get; set; }
    public int ClassID { get; set; }
    public int SubjectID { get; set; }
}
