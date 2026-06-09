namespace School.Application.Academics.DTOs;

public class UpsertChapterRequestDto
{
    public int? Id { get; set; }
    public int ClassId { get; set; }
    public int SubjectId { get; set; }
    public int ChapterNo { get; set; }
    public string ChapterName { get; set; } = string.Empty;
}
