namespace School.Application.DTOs;

public class ExamEntryMatrixDto
{
    public int SectionId { get; set; }
    public string? ClassName { get; set; }
    public int ExamTypeId { get; set; }
    public string? ExamTypeName { get; set; }
    public bool WasInitialized { get; set; }
    public int MissingStudentCount { get; set; }
    public int GrandTotalMarks { get; set; }
    public List<ExamEntryMissingStudentDto> MissingStudents { get; set; } = new();
    public List<ExamEntrySubjectColumnDto> Subjects { get; set; } = new();
    public List<ExamEntryStudentRowDto> Students { get; set; } = new();
}

public class ExamEntryMissingStudentDto
{
    public int RegId { get; set; }
    public string? StudentName { get; set; }
}

public class ExamEntrySubjectColumnDto
{
    public int SubjectId { get; set; }
    public string? SubjectName { get; set; }
    public string? ShortName { get; set; }
    public int TotalMarks { get; set; }
    public int PassingMarks { get; set; }
    public bool IsConfigured => TotalMarks > 0 && PassingMarks >= 0;
}

public class ExamEntryStudentRowDto
{
    public int Serial { get; set; }
    public int RegId { get; set; }
    public string? StudentName { get; set; }
    public string? AttendanceRatio { get; set; }
    public int TotalObtained { get; set; }
    public List<ExamEntryCellDto> Cells { get; set; } = new();
}

public class ExamEntryCellDto
{
    public int ExamId { get; set; }
    public int SubjectId { get; set; }
    public int? ObtainedMarks { get; set; }
    public string DisplayValue { get; set; } = "0";
}

public class LoadExamEntryMatrixRequestDto
{
    public int SectionId { get; set; }
    public int ExamTypeId { get; set; }
}

public class UpdateExamEntryCellRequestDto
{
    public int? ObtainedMarks { get; set; }
}

public class UpdateExamEntrySubjectMarksRequestDto
{
    public int SectionId { get; set; }
    public int ExamTypeId { get; set; }
    public int SubjectId { get; set; }
    public int? TotalMarks { get; set; }
    public int? PassingMarks { get; set; }
}

public class UpdateExamEntryAttendanceRequestDto
{
    public int SectionId { get; set; }
    public int ExamTypeId { get; set; }
    public int StudentId { get; set; }
    public string AttendanceRatio { get; set; } = string.Empty;
}

public class AddExamEntrySubjectRequestDto
{
    public int SectionId { get; set; }
    public int ExamTypeId { get; set; }
    public int SubjectId { get; set; }
    public int TotalMarks { get; set; }
    public int PassingMarks { get; set; }
}

public class ExamEntrySubjectOptionDto
{
    public int SubjectId { get; set; }
    public string? SubjectName { get; set; }
    public string? ShortName { get; set; }
}
