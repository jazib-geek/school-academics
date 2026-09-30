namespace School.Application.DTOs;

public class StudentFeeIncrementRequestDto
{
    public string Scope { get; set; } = "class";
    public int? ClassCompositeId { get; set; }
    public List<int> StudentIds { get; set; } = [];
    public decimal TuitionIncrement { get; set; }
    public int? NewTotalFee { get; set; }
    public string RegistrationDateMode { get; set; } = "all";
    public DateOnly? RegistrationDate { get; set; }
}

public class StudentFeeIncrementRowDto
{
    public int RegId { get; set; }
    public string? FullName { get; set; }
    public int? ClassCompositeId { get; set; }
    public string? ClassName { get; set; }
    public int? TotalFee { get; set; }
    public decimal? TuitionFee { get; set; }
    public decimal? Concession { get; set; }
    public int? NewTotalFee { get; set; }
    public decimal? NewTuitionFee { get; set; }
    public decimal? NewConcession { get; set; }
    public string? Error { get; set; }
    public DateTime? RecentFeeUpdateAtPkt { get; set; }
    public int? RecentFeeUpdateDaysAgo { get; set; }
    public bool RecentFeeUpdateWasIncrement { get; set; }
}

public class StudentFeeIncrementApplyDto
{
    public string PreviewId { get; set; } = string.Empty;
}
