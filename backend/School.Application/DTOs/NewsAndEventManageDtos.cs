namespace School.Application.DTOs;

public class NewsAndEventManageDto
{
    public int Id { get; set; }
    public DateTime? Date { get; set; }
    public string? Title { get; set; }
    public string? Type { get; set; }
    public string? Description { get; set; }
    public string? ImagePath { get; set; }
    public bool IsActive { get; set; }
    public bool ShowOnHome { get; set; }
}

public class UpsertNewsAndEventRequestDto
{
    public DateTime? Date { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Type { get; set; }
    public string? Description { get; set; }
    public string? ImagePath { get; set; }
    public bool IsActive { get; set; } = true;
    public bool ShowOnHome { get; set; }
}
