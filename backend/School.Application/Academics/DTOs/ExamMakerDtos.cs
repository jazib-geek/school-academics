namespace School.Application.Academics.DTOs;

public class ExamBlueprintRuleDto
{
    public string? Section { get; set; }
    public string? Type { get; set; }
    public string? Category { get; set; }
    public int Count { get; set; }
    public int MarksPerQuestion { get; set; }
}

public class ExamSectionConfigDto
{
    public string SectionKey { get; set; } = string.Empty;
    public string? SectionName { get; set; }
    public string? HeadingText { get; set; }
    public string? InstructionText { get; set; }
    public string? MarksDisplayText { get; set; }
    /// <summary>SAQ/LAQ only: student attempts a subset of questions in the section.</summary>
    public bool OptionalQuestionsEnabled { get; set; }
    /// <summary>How many questions to attempt when <see cref="OptionalQuestionsEnabled"/> is true.</summary>
    public int? OptionalQuestionsAttemptCount { get; set; }
}

public class GenerateExamPaperRequestDto
{
    public int ClassId { get; set; }
    public int SubjectId { get; set; }
    public string SchoolName { get; set; } = string.Empty;
    public string? SchoolLogoUrl { get; set; }
    public int ExamTitleId { get; set; }
    public string? SessionLabel { get; set; }
    public string? ExamType { get; set; }
    public string? HeaderNote { get; set; }
    public string? Instructions { get; set; }
    public string? FooterNote { get; set; }
    public bool ShowSectionNames { get; set; }
    /// <summary>roman | numeric | alpha</summary>
    public string? SubQuestionNumberingStyle { get; set; }
    public bool WrapQuestionMarksInParentheses { get; set; }
    public int? DurationMinutes { get; set; }
    /// <summary>Version label within class/subject/exam title/type (e.g. Set A).</summary>
    public string? PaperName { get; set; }
    public List<int> ChapterIds { get; set; } = [];
    public List<ExamBlueprintRuleDto> Blueprint { get; set; } = [];
    public List<ExamSectionConfigDto> Sections { get; set; } = [];
}

public class SelectedQuestionRequestDto
{
    public int QuestionId { get; set; }
    public int QuestionOrder { get; set; }
    public int Marks { get; set; }
    public string? Section { get; set; }
}

public class CreateExamPaperFromSelectionRequestDto
{
    public int ClassId { get; set; }
    public int SubjectId { get; set; }
    public string SchoolName { get; set; } = string.Empty;
    public string? SchoolLogoUrl { get; set; }
    public int ExamTitleId { get; set; }
    public string? SessionLabel { get; set; }
    public string? ExamType { get; set; }
    public string? HeaderNote { get; set; }
    public string? Instructions { get; set; }
    public string? FooterNote { get; set; }
    public bool ShowSectionNames { get; set; }
    /// <summary>roman | numeric | alpha</summary>
    public string? SubQuestionNumberingStyle { get; set; }
    public bool WrapQuestionMarksInParentheses { get; set; }
    public int? DurationMinutes { get; set; }
    /// <summary>Version label within class/subject/exam title/type (e.g. Set A).</summary>
    public string PaperName { get; set; } = string.Empty;
    public List<int> ChapterIds { get; set; } = [];
    public List<SelectedQuestionRequestDto> SelectedQuestions { get; set; } = [];
    public List<ExamSectionConfigDto> Sections { get; set; } = [];
}

public class RandomQuestionChapterRuleDto
{
    public int ChapterId { get; set; }
    public int McqCount { get; set; }
    public int SaqCount { get; set; }
    public int LaqCount { get; set; }
}

public class QuestionChapterAvailabilityDto
{
    public int ChapterId { get; set; }
    public int McqCount { get; set; }
    public int SaqCount { get; set; }
    public int LaqCount { get; set; }
    public int NumericalCount { get; set; }
}

public class RandomizeExamPaperRequestDto
{
    public int? PaperId { get; set; }
    public int ClassId { get; set; }
    public int SubjectId { get; set; }
    public string SchoolName { get; set; } = string.Empty;
    public string? SchoolLogoUrl { get; set; }
    public int ExamTitleId { get; set; }
    public string? SessionLabel { get; set; }
    public string? ExamType { get; set; }
    public string? HeaderNote { get; set; }
    public string? Instructions { get; set; }
    public string? FooterNote { get; set; }
    public bool ShowSectionNames { get; set; }
    /// <summary>roman | numeric | alpha</summary>
    public string? SubQuestionNumberingStyle { get; set; }
    public bool WrapQuestionMarksInParentheses { get; set; }
    public int? DurationMinutes { get; set; }
    /// <summary>Version label within class/subject/exam title/type (e.g. Set A).</summary>
    public string PaperName { get; set; } = string.Empty;
    public List<ExamSectionConfigDto> Sections { get; set; } = [];
    public List<RandomQuestionChapterRuleDto> ChapterRules { get; set; } = [];
}

public class PaperQuestionItemDto
{
    public int Id { get; set; }
    public string Type { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public int ChapterId { get; set; }
    public string ChapterName { get; set; } = string.Empty;
    public int ChapterNo { get; set; }
    public string DescriptionText { get; set; } = string.Empty;
    public string? StemImage { get; set; }
    public string? McqOpt1 { get; set; }
    public string? McqOpt2 { get; set; }
    public string? McqOpt3 { get; set; }
    public string? McqOpt4 { get; set; }
    public int Marks { get; set; }
    public string? Section { get; set; }
    public int Order { get; set; }
}

public class ExamPaperDto
{
    public int Id { get; set; }
    public int ExamTitleId { get; set; }
    public int ClassId { get; set; }
    public int SubjectId { get; set; }
    public string ClassName { get; set; } = string.Empty;
    public string SubjectName { get; set; } = string.Empty;
    public string PaperName { get; set; } = string.Empty;
    public int? TotalMarks { get; set; }
    public int? DurationMinutes { get; set; }
    public DateTime CreatedOn { get; set; }
    public string? SchoolName { get; set; }
    public string? SchoolLogoUrl { get; set; }
    public string? ExamTitle { get; set; }
    public string? SessionLabel { get; set; }
    public string? ExamType { get; set; }
    public string? HeaderNote { get; set; }
    public string? Instructions { get; set; }
    public string? FooterNote { get; set; }
    public bool ShowSectionNames { get; set; }
    /// <summary>roman | numeric | alpha</summary>
    public string? SubQuestionNumberingStyle { get; set; }
    public bool WrapQuestionMarksInParentheses { get; set; }
    public List<ExamSectionConfigDto> Sections { get; set; } = [];
    public List<PaperQuestionItemDto> Questions { get; set; } = [];
}
