namespace School.Application.Academics.DTOs;

public class ExamTitleDto
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? ExamType { get; set; }
    public DateTime CreatedOn { get; set; }
}

public class UpsertExamTitleRequestDto
{
    public int? Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? ExamType { get; set; }
}
