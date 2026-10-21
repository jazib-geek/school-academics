namespace School.Infrastructure.Academics.Entities;

public class QuestionCatalog
{
    public int Id { get; set; }
    public string Type { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public int ChapterId { get; set; }
    public string DescriptionText { get; set; } = string.Empty;
    /// <summary>Optional structure diagram as data URL (data:image/...;base64,...).</summary>
    public string? StemImage { get; set; }
    public string? McqOpt1 { get; set; }
    public string? McqOpt2 { get; set; }
    public string? McqOpt3 { get; set; }
    public string? McqOpt4 { get; set; }
    /// <summary>standard for MCQ/SAQ/LAQ/numerical. Language papers use a block kind plus BodyJson.</summary>
    public string StructureKind { get; set; } = "standard";
    public string? BodyJson { get; set; }

    public Chapter? Chapter { get; set; }
    public ICollection<QuestionPaperQuestion> QuestionPaperQuestions { get; set; } = new List<QuestionPaperQuestion>();
}
