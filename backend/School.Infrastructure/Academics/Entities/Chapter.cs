namespace School.Infrastructure.Academics.Entities;

public class Chapter
{
    public int Id { get; set; }
    public int ClassId { get; set; }
    public int SubjectId { get; set; }
    public int ChapterNo { get; set; }
    public string ChapterName { get; set; } = string.Empty;

    public AcademicClass? Class { get; set; }
    public AcademicSubject? Subject { get; set; }
    public ICollection<QuestionCatalog> Questions { get; set; } = new List<QuestionCatalog>();
}
