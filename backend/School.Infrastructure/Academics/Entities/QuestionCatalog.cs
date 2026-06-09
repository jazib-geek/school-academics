namespace School.Infrastructure.Academics.Entities;

public class QuestionCatalog
{
    public int Id { get; set; }
    public string Type { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public int ChapterId { get; set; }
    public string DescriptionText { get; set; } = string.Empty;
    public string? McqOpt1 { get; set; }
    public string? McqOpt2 { get; set; }
    public string? McqOpt3 { get; set; }
    public string? McqOpt4 { get; set; }

    public Chapter? Chapter { get; set; }
    public ICollection<QuestionPaperQuestion> QuestionPaperQuestions { get; set; } = new List<QuestionPaperQuestion>();
}
