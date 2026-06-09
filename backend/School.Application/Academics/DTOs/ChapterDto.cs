namespace School.Application.Academics.DTOs;

public class ChapterDto
{
    public int Id { get; set; }
    public int ClassId { get; set; }
    public string ClassName { get; set; } = string.Empty;
    public int SubjectId { get; set; }
    public string SubjectName { get; set; } = string.Empty;
    public int ChapterNo { get; set; }
    public string ChapterName { get; set; } = string.Empty;
}
