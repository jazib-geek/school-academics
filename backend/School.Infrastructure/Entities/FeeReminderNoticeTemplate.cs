namespace School.Infrastructure.Entities;

public class FeeReminderNoticeTemplate
{
    public int Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Greeting { get; set; } = string.Empty;
    public string BodyText { get; set; } = string.Empty;
    public string ClosingText { get; set; } = string.Empty;
    public int? DayOfMonth { get; set; }
    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;
}
