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
    public int? RcptId { get; set; }
    public string? ManualRcptNo { get; set; }
    public int? TransactionId { get; set; }
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
    public decimal ActualFee { get; set; }
    public decimal PrevBalance { get; set; }
    public decimal AdmissionFee { get; set; }
    public decimal MiscCharges { get; set; }
    public decimal TuitionOutstanding { get; set; }
    public decimal TotalGenerated { get; set; }
    public decimal TotalReceived { get; set; }
    public decimal OutstandingAmount { get; set; }
}

public class FeeReportResponseDto<TItem>
{
    public DateTime GeneratedAt { get; set; } = DateTime.Now;
    public int TotalRecords { get; set; }
    public decimal TotalAmount { get; set; }
    /// <summary>Campus-wide active totals (Payment − Recieved), used by overall receivable footers.</summary>
    public decimal TotalPrevBalance { get; set; }
    public decimal TotalAdmissionFee { get; set; }
    public decimal TotalMiscCharges { get; set; }
    public decimal TotalTuitionOutstanding { get; set; }
    public List<TItem> Items { get; set; } = [];
}

public class OverallReceivableMasterTotalsDto
{
    public decimal TotalPrevBalance { get; set; }
    public decimal TotalAdmissionFee { get; set; }
    public decimal TotalMiscCharges { get; set; }
    public decimal TotalTuitionOutstanding { get; set; }
    public decimal TotalAmount { get; set; }
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
    public int SessionStartMonth { get; set; }
    public int SessionStartYear { get; set; }
    public int SessionEndMonth { get; set; }
    public int SessionEndYear { get; set; }
    public string SessionLabel { get; set; } = string.Empty;
    public string ForMonthLabel { get; set; } = string.Empty;
    public DateTime GeneratedAt { get; set; } = DateTime.Now;
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

public class BalanceSheetMonthColumnDto
{
    public int Month { get; set; }
    public int Year { get; set; }
    public string Key { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
}

public class BalanceSheetRowDto
{
    public int StudentId { get; set; }
    public string StudentName { get; set; } = string.Empty;
    public string? ClassName { get; set; }
    public decimal TuitionFee { get; set; }
    public List<decimal> MonthBalances { get; set; } = [];
    public decimal PrevBalance { get; set; }
    public decimal MiscBalance { get; set; }
    public decimal Total { get; set; }
}

public class BalanceSheetTotalsDto
{
    public decimal TuitionFee { get; set; }
    public List<decimal> MonthBalances { get; set; } = [];
    public decimal PrevBalance { get; set; }
    public decimal MiscBalance { get; set; }
    public decimal Total { get; set; }
}

public class BalanceSheetReportDto
{
    public int SessionStartYear { get; set; }
    public int SessionEndYear { get; set; }
    public int SessionStartMonth { get; set; }
    public int SessionEndMonth { get; set; }
    public string SessionLabel { get; set; } = string.Empty;
    public DateTime GeneratedAt { get; set; } = DateTime.Now;
    public int PrevFundTypeId { get; set; } = 4;
    public int MiscFundTypeId { get; set; } = 3;
    public List<BalanceSheetMonthColumnDto> Months { get; set; } = [];
    public List<BalanceSheetRowDto> Rows { get; set; } = [];
    public BalanceSheetTotalsDto Totals { get; set; } = new();
}
