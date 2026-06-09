namespace School.Application.DTOs;

public class FeeReportFilterDto
{
    public DateTime? Date { get; set; }
    public DateTime? DateFrom { get; set; }
    public DateTime? DateTo { get; set; }
    public int? Month { get; set; }
    public int? Year { get; set; }
    public int? FundTypeId { get; set; }
}

public class FeeTransactionReportItemDto
{
    public int StudentId { get; set; }
    public string StudentName { get; set; } = string.Empty;
    public string? ClassName { get; set; }
    public DateTime TransactionDate { get; set; }
    public int? FundTypeId { get; set; }
    public string FundTypeName { get; set; } = string.Empty;
    public int? Month { get; set; }
    public int? Year { get; set; }
    public decimal Received { get; set; }
}

public class FeeDefaulterItemDto
{
    public int StudentId { get; set; }
    public string StudentName { get; set; } = string.Empty;
    public string? ClassName { get; set; }
    public int? FundTypeId { get; set; }
    public string FundTypeName { get; set; } = string.Empty;
    public int? Month { get; set; }
    public int? Year { get; set; }
    public decimal OutstandingAmount { get; set; }
}

public class ReceivableItemDto
{
    public int StudentId { get; set; }
    public string StudentName { get; set; } = string.Empty;
    public string? ClassName { get; set; }
    public decimal TotalGenerated { get; set; }
    public decimal TotalReceived { get; set; }
    public decimal OutstandingAmount { get; set; }
}

public class FeeReportResponseDto<TItem>
{
    public DateTime GeneratedAt { get; set; } = DateTime.Now;
    public int TotalRecords { get; set; }
    public decimal TotalAmount { get; set; }
    public List<TItem> Items { get; set; } = [];
}

public class FundTypeOptionDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
}

public class ExpectedIncomeMonthItemDto
{
    public int Month { get; set; }
    public int Year { get; set; }
    public string MonthLabel { get; set; } = string.Empty;
    public decimal Amount { get; set; }
}

public class ExpectedIncomeFundItemDto
{
    public int FundTypeId { get; set; }
    public string FundTypeName { get; set; } = string.Empty;
    public decimal Amount { get; set; }
}

public class ExpectedIncomeReportDto
{
    public DateTime DateFrom { get; set; }
    public DateTime DateTo { get; set; }
    public List<ExpectedIncomeMonthItemDto> TuitionByMonth { get; set; } = [];
    public List<ExpectedIncomeFundItemDto> FundsOverall { get; set; } = [];
    public decimal TuitionTotal { get; set; }
    public decimal FundsTotal { get; set; }
    public decimal NetTotal => TuitionTotal + FundsTotal;
    public int ActiveStudentCount { get; set; }
}

public class IncomeExpenseHeadDto
{
    public string SubGroupId { get; set; } = string.Empty;
    public string HeadName { get; set; } = string.Empty;
    public decimal Amount { get; set; }
}

public class IncomeStatementReportDto
{
    public int Month { get; set; }
    public int Year { get; set; }
    public string MonthLabel { get; set; } = string.Empty;
    public DateTime GeneratedAt { get; set; } = DateTime.Now;
    public decimal TotalIncome { get; set; }
    public decimal TotalExpenses { get; set; }
    public decimal NetProfit { get; set; }
    public List<IncomeExpenseHeadDto> ExpenseHeads { get; set; } = [];
}
