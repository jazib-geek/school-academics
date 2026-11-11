namespace School.Application.DTOs;

public class CustomNoticePreviewRequestDto
{
    public string AudienceId { get; set; } = string.Empty;
    public string? ClassName { get; set; }
    public string? BalanceOp { get; set; }
    public decimal? BalanceAmount { get; set; }
    public int? AbsentDays { get; set; }
    public int? ExamTypeId { get; set; }
    public decimal? MaxPercent { get; set; }
}

public class CustomNoticePreviewDto
{
    public string AudienceId { get; set; } = string.Empty;
    public string? ExamName { get; set; }
    public List<CustomNoticeStudentDto> Items { get; set; } = [];
}

public class CustomNoticeStudentDto
{
    public int StudentId { get; set; }
    public string StudentName { get; set; } = string.Empty;
    public string? ClassName { get; set; }
    public decimal TuitionBalance { get; set; }
    public decimal FundsBalance { get; set; }
    public decimal OverallBalance { get; set; }
    public int? AbsentDays { get; set; }
    public string? ExamName { get; set; }
    public decimal? Percent { get; set; }
}
