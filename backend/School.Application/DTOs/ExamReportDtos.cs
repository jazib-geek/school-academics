namespace School.Application.DTOs;

public class ExamExecutiveSnapshotDto
{
    public DateTime GeneratedAt { get; set; } = DateTime.Now;
    public int ActiveStudentCount { get; set; }
    public int ExamTypeCount { get; set; }
    public int ClassesWithMarks { get; set; }
    public int ActiveClassCount { get; set; }
}

public class AcademicProgressCardDto
{
    public int StudentId { get; set; }
    public string? StudentName { get; set; }
    public string? FatherName { get; set; }
    public string? ClassName { get; set; }
    public string? Address { get; set; }
    public string? Gender { get; set; }
    public string? SessionLabel { get; set; }
    public DateTime IssueDate { get; set; }
    public bool IsJunior { get; set; }

    public List<AcademicProgressExamTypeColumnDto> ExamTypes { get; set; } = [];
    public List<AcademicProgressSubjectRowDto> Subjects { get; set; } = [];
    public List<AcademicProgressExamSummaryDto> ExamSummaries { get; set; } = [];
}

public class AcademicProgressExamTypeColumnDto
{
    public int ExamTypeId { get; set; }
    public string? ExamTypeName { get; set; }
}

public class AcademicProgressSubjectRowDto
{
    public int SubjectId { get; set; }
    public string? SubjectName { get; set; }
    public bool UsesGradeDisplay { get; set; }
    public List<AcademicProgressCellDto> Cells { get; set; } = [];
}

public class AcademicProgressCellDto
{
    public int ExamTypeId { get; set; }
    public int TotalMarks { get; set; }
    public int? ObtainedMarks { get; set; }
    public string? DisplayTotal { get; set; }
    public string? DisplayObtained { get; set; }
    public bool HasMarks { get; set; }
}

public class AcademicProgressExamSummaryDto
{
    public int ExamTypeId { get; set; }
    public int TotalMarks { get; set; }
    public int TotalObtained { get; set; }
    public int Percentage { get; set; }
    public string? Grade { get; set; }
    public string? Remarks { get; set; }
    public string? LongRemarks { get; set; }
    public int Position { get; set; }
    public string? PositionDisplay { get; set; }
    public string? AttendanceRatio { get; set; }
    public bool HasResult { get; set; }
}

public class ExamTopPositionsDto
{
    public int ExamTypeId { get; set; }
    public string? ExamTypeName { get; set; }
    public int N { get; set; }
    public DateTime GeneratedAt { get; set; }
    public bool IsJunior { get; set; }
    public List<ExamTopPositionsClassGroupDto> Classes { get; set; } = [];
}

public class ExamTopPositionsClassGroupDto
{
    public int SectionId { get; set; }
    public int? ClassCode { get; set; }
    public string? ClassName { get; set; }
    public string? Branch { get; set; }
    public List<ExamTopPositionsStudentDto> Students { get; set; } = [];
}

public class ExamTopPositionsStudentDto
{
    public int StudentId { get; set; }
    public string? StudentName { get; set; }
    public string? FatherName { get; set; }
    public int Position { get; set; }
    public string? PositionDisplay { get; set; }
    public int TotalObtained { get; set; }
    public int TotalMarks { get; set; }
    public int Percentage { get; set; }
}

public class ExamAwardListRosterDto
{
    public int SectionId { get; set; }
    public string? ClassName { get; set; }
    public int? ExamTypeId { get; set; }
    public string? ExamTypeName { get; set; }
    public int SessionYear { get; set; }
    public List<ExamAwardListStudentDto> Students { get; set; } = [];
    public List<ExamAwardListSubjectColumnDto> Subjects { get; set; } = [];
}

public class ExamAwardListSubjectColumnDto
{
    public int SubjectId { get; set; }
    public string? SubjectName { get; set; }
    public string? ShortName { get; set; }
}

public class ExamAwardListStudentDto
{
    public int Serial { get; set; }
    public int RegId { get; set; }
    public string? StudentName { get; set; }
}
