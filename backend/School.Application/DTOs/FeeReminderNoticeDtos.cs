namespace School.Application.DTOs;

public class FeeReminderNoticeTemplateDto
{
    public int Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Greeting { get; set; } = string.Empty;
    public string BodyText { get; set; } = string.Empty;
    public string ClosingText { get; set; } = string.Empty;
    public int? DayOfMonth { get; set; }
    public int SortOrder { get; set; }
}

public class FeeReminderNoticeTemplateUpdateDto
{
    public string Title { get; set; } = string.Empty;
    public string Greeting { get; set; } = string.Empty;
    public string BodyText { get; set; } = string.Empty;
    public string ClosingText { get; set; } = string.Empty;
    public int? DayOfMonth { get; set; }
}

public class FeeReminderClassBalanceItemDto
{
    public int StudentId { get; set; }
    public string StudentName { get; set; } = string.Empty;
    public string? ClassName { get; set; }
    public decimal TuitionBalance { get; set; }
    public decimal FundsBalance { get; set; }
    public bool IsAbsentToday { get; set; }
}

public class FeeReminderClassBalancesDto
{
    public string ClassName { get; set; } = string.Empty;
    public List<FeeReminderClassBalanceItemDto> Items { get; set; } = [];
}
