using School.Application.Common;

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
    public string PaymentMode { get; set; } = "Cash";
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
    public DateTime GeneratedAt { get; set; } = PakistanTime.Now;
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
    public DateTime GeneratedAt { get; set; } = PakistanTime.Now;
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
    public DateTime GeneratedAt { get; set; } = PakistanTime.Now;
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
    public DateTime GeneratedAt { get; set; } = PakistanTime.Now;
    public int PrevFundTypeId { get; set; } = 4;
    public int MiscFundTypeId { get; set; } = 3;
    public List<BalanceSheetMonthColumnDto> Months { get; set; } = [];
    public List<BalanceSheetRowDto> Rows { get; set; } = [];
    public BalanceSheetTotalsDto Totals { get; set; } = new();
}

public class FeeDashboardKpisDto
{
    public decimal CollectedToday { get; set; }
    public decimal CollectedMtd { get; set; }
    public decimal CollectedLastMonthSamePeriod { get; set; }
    public decimal CollectedSession { get; set; }
    public decimal TotalOutstanding { get; set; }
    public int DefaulterStudents { get; set; }
    public int DefaulterFamilies { get; set; }
    public int ActiveStudents { get; set; }
    public decimal CurrentMonthTuitionBilled { get; set; }
    public decimal CurrentMonthTuitionRecovered { get; set; }
    public decimal CurrentMonthCollectionRate { get; set; }
    public decimal OverallRecoveryPercent { get; set; }
    public decimal DiscountMtd { get; set; }
    public decimal ExpensesMtd { get; set; }
    public decimal NetProfitMtd { get; set; }
}

public class FeeDashboardTrendPointDto
{
    public int Month { get; set; }
    public int Year { get; set; }
    public string Label { get; set; } = string.Empty;
    public decimal TuitionBilled { get; set; }
    public decimal TuitionRecovered { get; set; }
    public decimal Received { get; set; }
    public decimal Discount { get; set; }
    public decimal Expenses { get; set; }
    public decimal NetProfit { get; set; }
    public decimal MarginPercent { get; set; }
}

public class FeeDashboardAgingBucketDto
{
    public string Key { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public int Students { get; set; }
}

public class FeeDashboardFundDto
{
    public int FundTypeId { get; set; }
    public string FundTypeName { get; set; } = string.Empty;
    public decimal Outstanding { get; set; }
    public int Students { get; set; }
}

public class FeeDashboardClassDto
{
    public string ClassName { get; set; } = string.Empty;
    public int ActiveStudents { get; set; }
    public int DefaulterStudents { get; set; }
    public decimal Charged { get; set; }
    public decimal Recovered { get; set; }
    public decimal Outstanding { get; set; }
    public decimal RecoveryPercent { get; set; }
}

public class FeeDashboardFamilyDto
{
    public int FamilyCode { get; set; }
    public string FatherName { get; set; } = string.Empty;
    public string FatherMobile { get; set; } = string.Empty;
    public string Students { get; set; } = string.Empty;
    public int Children { get; set; }
    public decimal Outstanding { get; set; }
    public int TuitionMonthsPending { get; set; }
    public DateTime? LastReceiptDate { get; set; }
}

public class FeeDashboardExpenseHeadDto
{
    public string HeadName { get; set; } = string.Empty;
    public decimal CurrentMonth { get; set; }
    public decimal PreviousMonth { get; set; }
}

public class FeeDashboardForecastDto
{
    public int DaysElapsed { get; set; }
    public int DaysInMonth { get; set; }
    public decimal ProjectedMonthEndCollection { get; set; }
    public decimal CurrentMonthRemainingDue { get; set; }
    public decimal MonthlyRosterTuition { get; set; }
    public string SessionLabel { get; set; } = string.Empty;
    public int SessionMonthsRemaining { get; set; }
    public decimal ExpectedRemainingSessionBilling { get; set; }
    public decimal SessionTuitionBilled { get; set; }
    public decimal SessionTuitionRecovered { get; set; }
    public decimal AvgMonthlyCollectionLast3 { get; set; }
    public decimal AvgMonthlyExpensesLast3 { get; set; }
}

public class FeeDashboardDto
{
    public DateTime GeneratedAt { get; set; } = PakistanTime.Now;
    public string MonthLabel { get; set; } = string.Empty;
    public FeeDashboardKpisDto Kpis { get; set; } = new();
    public List<FeeDashboardTrendPointDto> Trend { get; set; } = [];
    public List<FeeDashboardAgingBucketDto> Aging { get; set; } = [];
    public List<FeeDashboardFundDto> FundOutstanding { get; set; } = [];
    public List<FeeDashboardClassDto> Classes { get; set; } = [];
    public List<FeeDashboardFamilyDto> TopFamilies { get; set; } = [];
    public List<FeeDashboardExpenseHeadDto> ExpenseHeads { get; set; } = [];
    public FeeDashboardForecastDto Forecast { get; set; } = new();
}
