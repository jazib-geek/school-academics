namespace School.Application.DTOs;

public class StudentFundAmountsDto
{
    public int StudentId { get; set; }
    public IReadOnlyList<FundAmountItemDto> Amounts { get; set; } = [];
}

public class FundAmountItemDto
{
    public int FundTypeId { get; set; }
    public string Name { get; set; } = string.Empty;
    public decimal Amount { get; set; }
}

public class GenerateFundStudentRequestDto
{
    public int StudentId { get; set; }
    public IReadOnlyList<FundAmountItemDto> Amounts { get; set; } = [];
}

public class GenerateFundBulkRequestDto
{
    public int FundTypeId { get; set; }
    public decimal Amount { get; set; }

    /// <summary>
    /// Null or 0 = all active students; otherwise only that class composite.
    /// </summary>
    public int? ClassCompositeId { get; set; }
}
