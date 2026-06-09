namespace School.Infrastructure.Academics.Entities;

public class QuestionPaperQuestion
{
    public int Id { get; set; }
    public int QuestionPaperId { get; set; }
    public int QuestionId { get; set; }
    public int QuestionOrder { get; set; }
    public int Marks { get; set; }
    public string? Section { get; set; }

    public QuestionPaper? QuestionPaper { get; set; }
    public QuestionCatalog? Question { get; set; }
}
