namespace School.Infrastructure.Academics.Entities;

public class AcademicClass
{
    public int Id { get; set; }
    public string ClassName { get; set; } = string.Empty;

    public ICollection<Chapter> Chapters { get; set; } = new List<Chapter>();
    public ICollection<QuestionPaper> QuestionPapers { get; set; } = new List<QuestionPaper>();
}
