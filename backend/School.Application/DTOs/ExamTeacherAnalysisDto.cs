namespace School.Application.DTOs;

public class ExamTeacherAnalysisDto
{
    public int SectionId { get; set; }
    public string? ClassName { get; set; }
    public int EmployeeId { get; set; }
    public string? EmployeeName { get; set; }
    public int ExamTypeId { get; set; }
    public string? ExamTypeName { get; set; }
    public List<ExamTeacherAnalysisSubjectRowDto> Subjects { get; set; } = new();
}

public class ExamTeacherAnalysisSubjectRowDto
{
    public int SubjectId { get; set; }
    public string? SubjectName { get; set; }
    public string? ShortName { get; set; }
    public bool UsesGradeDisplay { get; set; }
    public int Percentage { get; set; }
    public ExamTeacherAnalysisExtremumDto? Max { get; set; }
    public ExamTeacherAnalysisExtremumDto? Min { get; set; }
}

public class ExamTeacherAnalysisExtremumDto
{
    public int ObtainedMarks { get; set; }
    public int StudentId { get; set; }
    public string? StudentName { get; set; }
}

public class ExamTeacherPerformanceGridDto
{
    public int EmployeeId { get; set; }
    public string? EmployeeName { get; set; }
    public List<ExamTeacherPerformanceColumnDto> Columns { get; set; } = new();
    public List<ExamTeacherPerformanceRowDto> Rows { get; set; } = new();
}

public class ExamTeacherPerformanceColumnDto
{
    public string Key { get; set; } = string.Empty;
    public int ClassId { get; set; }
    public string? ClassName { get; set; }
    public int SubjectId { get; set; }
    public string? SubjectName { get; set; }
}

public class ExamTeacherPerformanceRowDto
{
    public int ExamTypeId { get; set; }
    public string? ExamTypeName { get; set; }
    public List<ExamTeacherPerformanceCellDto> Cells { get; set; } = new();
}

public class ExamTeacherPerformanceCellDto
{
    public string ColumnKey { get; set; } = string.Empty;
    public int? Percentage { get; set; }
}
