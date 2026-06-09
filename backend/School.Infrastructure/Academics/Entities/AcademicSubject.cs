namespace School.Infrastructure.Academics.Entities;

public class AcademicSubject
{
    public int Id { get; set; }
    public string SubjectName { get; set; } = string.Empty;

    public ICollection<Chapter> Chapters { get; set; } = new List<Chapter>();
    public ICollection<QuestionPaper> QuestionPapers { get; set; } = new List<QuestionPaper>();
}
