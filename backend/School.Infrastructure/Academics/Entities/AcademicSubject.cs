namespace School.Infrastructure.Academics.Entities;

public class AcademicSubject
{
    public int Id { get; set; }
    public string SubjectName { get; set; } = string.Empty;
    public bool IsSystem { get; set; }
    /// <summary>standard, english, or urdu. Later profiles (science) reuse this column.</summary>
    public string CatalogProfile { get; set; } = "standard";
    /// <summary>Optional heading overrides keyed by structure kind. Missing keys use code defaults.</summary>
    public string? CatalogHeadingDefaultsJson { get; set; }

    public ICollection<Chapter> Chapters { get; set; } = new List<Chapter>();
    public ICollection<QuestionPaper> QuestionPapers { get; set; } = new List<QuestionPaper>();
}
