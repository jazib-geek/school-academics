namespace School.Application.DTOs;

public class ExamMarkSheetDto
{
    public int SectionId { get; set; }
    public string? ClassName { get; set; }
    public int ExamTypeId { get; set; }
    public string? ExamTypeName { get; set; }
    public int Strength { get; set; }
    public int GrandTotalMarks { get; set; }

    public List<ExamMarkSheetSubjectColumnDto> Subjects { get; set; } = new();
    public List<ExamMarkSheetStudentRowDto> Students { get; set; } = new();
    public List<ExamMarkSheetSubjectAverageDto> SubjectAverages { get; set; } = new();
}

public class ExamMarkSheetSubjectColumnDto
{
    public int SubjectId { get; set; }
    public string? SubjectName { get; set; }
    public string? ShortName { get; set; }
    public bool UsesGradeDisplay { get; set; }
    public int TotalMarks { get; set; }
    public int PassingMarks { get; set; }
    public int MaxMarks { get; set; }
}

public class ExamMarkSheetSubjectCellDto
{
    public int SubjectId { get; set; }
    public int? ObtainedMarks { get; set; }
    public bool UsesGradeDisplay { get; set; }
    public string? DisplayValue { get; set; }
}

public class ExamMarkSheetStudentRowDto
{
    public int Serial { get; set; }
    public int RegId { get; set; }
    public string? StudentName { get; set; }
    public string? AttendanceRatio { get; set; }
    public List<ExamMarkSheetSubjectCellDto> SubjectCells { get; set; } = new();
    public int TotalObtained { get; set; }
    public int TotalMarks { get; set; }
    public int Percentage { get; set; }
    public string? Grade { get; set; }
    public string? Remarks { get; set; }
    public int Position { get; set; }
    public string? PositionDisplay { get; set; }
}

public class ExamMarkSheetSubjectAverageDto
{
    public int SubjectId { get; set; }
    public int Percentage { get; set; }
}
