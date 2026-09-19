namespace School.Application.DTOs;

public class StudentFeeBalanceDto
{
    public int StudentId { get; set; }
    public int? FamilyCode { get; set; }
    public DateTime AsOfDate { get; set; }
    public decimal TotalGenerated { get; set; }
    public decimal TotalReceived { get; set; }
    public decimal TotalDue { get; set; }
    public List<StudentFeeBalanceItemDto> Items { get; set; } = [];
}

public class StudentFeeBalanceItemDto
{
    public int StudentId { get; set; }
    public string StudentName { get; set; } = string.Empty;
    public string ClassName { get; set; } = string.Empty;
    public int? FamilyCode { get; set; }
    public int FundTypeId { get; set; }
    public string FundTypeName { get; set; } = string.Empty;
    public int Month { get; set; }
    public int Year { get; set; }
    public string PeriodLabel { get; set; } = string.Empty;
    public decimal Generated { get; set; }
    public decimal Received { get; set; }
    public decimal Due { get; set; }
}
