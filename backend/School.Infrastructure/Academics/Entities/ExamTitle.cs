namespace School.Infrastructure.Academics.Entities;

public class ExamTitle
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? ExamType { get; set; }
    public DateTime CreatedOn { get; set; }

    public ICollection<QuestionPaper> QuestionPapers { get; set; } = new List<QuestionPaper>();
}
