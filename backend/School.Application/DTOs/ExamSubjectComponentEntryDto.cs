namespace School.Application.DTOs;

public class ExamSubjectComponentEntryDto
{
    public int SectionId { get; set; }
    public string? ClassName { get; set; }
    public int ExamTypeId { get; set; }
    public string? ExamTypeName { get; set; }
    public int SubjectId { get; set; }
    public string? SubjectName { get; set; }
    public string? SubjectShortName { get; set; }
    public int TotalMarks { get; set; }
    public int PassingMarks { get; set; }
    public int MissingStudentCount { get; set; }
    public List<ExamSubjectComponentHeaderDto> Headers { get; set; } = new();
    public List<ExamSubjectComponentStudentRowDto> Students { get; set; } = new();
}

public class ExamSubjectComponentHeaderDto
{
    public int HeaderId { get; set; }
    public string HeaderName { get; set; } = string.Empty;
    public decimal? MaxMarks { get; set; }
    public int SortOrder { get; set; }
}

public class ExamSubjectComponentStudentRowDto
{
    public int ExamId { get; set; }
    public int Serial { get; set; }
    public int RegId { get; set; }
    public string? StudentName { get; set; }
    public int ExistingObtainedMarks { get; set; }
    public decimal ComponentTotal { get; set; }
    public List<ExamSubjectComponentCellDto> Cells { get; set; } = new();
}

public class ExamSubjectComponentCellDto
{
    public int HeaderId { get; set; }
    public decimal Marks { get; set; }
}

public class AddExamSubjectComponentHeaderRequestDto
{
    public int SectionId { get; set; }
    public int ExamTypeId { get; set; }
    public int SubjectId { get; set; }
    public string HeaderName { get; set; } = string.Empty;
    public decimal? MaxMarks { get; set; }
}

public class SaveExamSubjectComponentMarksRequestDto
{
    public int SectionId { get; set; }
    public int ExamTypeId { get; set; }
    public int SubjectId { get; set; }
    public List<SaveExamSubjectComponentStudentMarksDto> Students { get; set; } = new();
}

public class SaveExamSubjectComponentStudentMarksDto
{
    public int ExamId { get; set; }
    public int StudentId { get; set; }
    public List<SaveExamSubjectComponentCellDto> Cells { get; set; } = new();
}

public class SaveExamSubjectComponentCellDto
{
    public int HeaderId { get; set; }
    public decimal Marks { get; set; }
}
