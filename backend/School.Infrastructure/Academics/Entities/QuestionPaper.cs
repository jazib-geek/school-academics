namespace School.Infrastructure.Academics.Entities;

public class QuestionPaper
{
    public int Id { get; set; }
    public int ClassId { get; set; }
    public int SubjectId { get; set; }
    public string PaperName { get; set; } = string.Empty;
    public string? SchoolName { get; set; }
    public string? SchoolLogoUrl { get; set; }
    public int ExamTitleId { get; set; }
    public string? SessionLabel { get; set; }
    public string? ExamType { get; set; }
    public string? HeaderNote { get; set; }
    public string? Instructions { get; set; }
    public string? FooterNote { get; set; }
    public bool ShowSectionNames { get; set; }
    /// <summary>Sub-question labels within each section: roman (default), numeric, alpha.</summary>
    public string? SubQuestionNumberingStyle { get; set; }
    public bool WrapQuestionMarksInParentheses { get; set; }
    public string? SectionMetaJson { get; set; }
    /// <summary>JSON: print-layout overrides (notes, section text, question stems, spacing).</summary>
    public string? PrintAdjustmentsJson { get; set; }
    public int? TotalMarks { get; set; }
    public int? DurationMinutes { get; set; }
    public DateTime CreatedOn { get; set; }

    public AcademicClass? Class { get; set; }
    public AcademicSubject? Subject { get; set; }
    public ExamTitle? ExamTitle { get; set; }
    public ICollection<QuestionPaperQuestion> Questions { get; set; } = new List<QuestionPaperQuestion>();
}
