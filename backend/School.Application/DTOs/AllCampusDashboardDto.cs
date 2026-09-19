namespace School.Application.DTOs;

public class DashboardMoneyPointDto
{
    public string Label { get; set; } = string.Empty;
    public DateTime? Date { get; set; }
    public decimal Amount { get; set; }
}

public class DashboardCountPointDto
{
    public string Label { get; set; } = string.Empty;
    public DateTime? Date { get; set; }
    public int Count { get; set; }
}

public class DashboardAdmissionLeftPointDto
{
    public string Label { get; set; } = string.Empty;
    public DateTime? Date { get; set; }
    public int NewAdmissions { get; set; }
    public int LeftStudents { get; set; }
}

public class DashboardCategoryAmountDto
{
    public string Key { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public decimal Percentage { get; set; }
}

public class DashboardCategoryCountDto
{
    public string Key { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
    public int Count { get; set; }
    public decimal Percentage { get; set; }
}

public class DashboardCampusComparisonDto
{
    public string Campus { get; set; } = string.Empty;
    public string CampusLabel { get; set; } = string.Empty;
    public int TotalStudents { get; set; }
    public int ActiveStudentCount { get; set; }
    public int InactiveStudentCount { get; set; }
    public int NewAdmissionsToday { get; set; }
    public int NewAdmissionsLast30Days { get; set; }
    public decimal FeeCollectionToday { get; set; }
    public decimal FeeCollectionLast30Days { get; set; }
    public decimal TotalGenerated { get; set; }
    public decimal TotalReceived { get; set; }
    public decimal TotalDiscount { get; set; }
    public decimal TotalReceivable { get; set; }
    public decimal TuitionGenerated { get; set; }
    public decimal TuitionReceived { get; set; }
    public decimal TuitionDiscount { get; set; }
    public decimal TuitionReceivable { get; set; }
    public decimal AverageTuitionFee { get; set; }
    public decimal FundsGenerated { get; set; }
    public decimal FundsReceived { get; set; }
    public decimal FundsDiscount { get; set; }
    public decimal FundsReceivable { get; set; }
    public int FeeDefaulterCount { get; set; }
    public decimal TodayExpense { get; set; }
    public decimal ExpenseLast30Days { get; set; }
}

public class DashboardExpenseHeadDto
{
    public string HeadCode { get; set; } = string.Empty;
    public string HeadName { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public decimal Percentage { get; set; }
}

public class DashboardExpenseSubheadDto
{
    public string HeadCode { get; set; } = string.Empty;
    public string HeadName { get; set; } = string.Empty;
    public string SubheadCode { get; set; } = string.Empty;
    public string SubheadName { get; set; } = string.Empty;
    public decimal Amount { get; set; }
}

public class DashboardClassAdmissionDto
{
    public string ClassKey { get; set; } = string.Empty;
    public string ClassName { get; set; } = string.Empty;
    public int Count { get; set; }
}

public class DashboardClassStrengthDto
{
    public string ClassKey { get; set; } = string.Empty;
    public string ClassName { get; set; } = string.Empty;
    public int ActiveStudentCount { get; set; }
}

public class DashboardKpiTrendDto
{
    public decimal Value { get; set; }
    public decimal PreviousValue { get; set; }
    public decimal ChangeAbsolute { get; set; }
    public decimal ChangePercent { get; set; }
    public bool IsUp { get; set; }
    public string ComparisonLabel { get; set; } = string.Empty;
    public List<decimal> Sparkline { get; set; } = [];
}

public class DashboardAttendanceOverviewDto
{
    public int TotalStudents { get; set; }
    public int PresentCount { get; set; }
    public int AbsentCount { get; set; }
    public int OnLeaveCount { get; set; }
    public int MarkedCount { get; set; }
    public decimal PresentPercent { get; set; }
    public decimal AbsentPercent { get; set; }
    public decimal OnLeavePercent { get; set; }
}

public class DashboardBirthdayPersonDto
{
    public string Name { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public string? ClassOrDesignation { get; set; }
    public int? Id { get; set; }
}

public class DashboardLateCheckInDto
{
    public int EmployeeId { get; set; }
    public string EmployeeName { get; set; } = string.Empty;
    public string? DesignationName { get; set; }
    public string? CheckInTime { get; set; }
    public int LateMinutes { get; set; }
}

public class DashboardAlertDto
{
    public string Severity { get; set; } = "info";
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
}

public class DashboardRecentAdmissionDto
{
    public int StudentId { get; set; }
    public string StudentName { get; set; } = string.Empty;
    public string? ClassName { get; set; }
    public DateTime? AdmissionDate { get; set; }
}

public class DashboardTopDefaulterDto
{
    public int StudentId { get; set; }
    public string StudentName { get; set; } = string.Empty;
    public string? ClassName { get; set; }
    public decimal OutstandingAmount { get; set; }
}

public class CampusDashboardDetailDto
{
    public string Campus { get; set; } = string.Empty;
    public string CampusLabel { get; set; } = string.Empty;
    public DateTime GeneratedAt { get; set; }
    public DateTime Today { get; set; }
    public int TotalStudents { get; set; }
    public int ActiveStudentCount { get; set; }
    public int InactiveStudentCount { get; set; }
    public int NewAdmissionsToday { get; set; }
    public int NewAdmissionsLast30Days { get; set; }
    public decimal FeeCollectionToday { get; set; }
    public decimal FeeCollectionLast30Days { get; set; }
    public decimal TotalGenerated { get; set; }
    public decimal TotalReceived { get; set; }
    public decimal TotalDiscount { get; set; }
    public decimal TotalReceivable { get; set; }
    public decimal TuitionGenerated { get; set; }
    public decimal TuitionReceived { get; set; }
    public decimal TuitionDiscount { get; set; }
    public decimal TuitionReceivable { get; set; }
    public decimal AverageTuitionFee { get; set; }
    public decimal FundsGenerated { get; set; }
    public decimal FundsReceived { get; set; }
    public decimal FundsDiscount { get; set; }
    public decimal FundsReceivable { get; set; }
    public int FeeDefaulterCount { get; set; }
    public decimal TodayExpense { get; set; }
    public decimal ExpenseLast30Days { get; set; }
    public List<DashboardCategoryCountDto> StudentGenderDistribution { get; set; } = [];
    public List<DashboardClassAdmissionDto> AdmissionsByClassLast30Days { get; set; } = [];
    public List<DashboardClassStrengthDto> ClassStrength { get; set; } = [];
    public List<DashboardCountPointDto> NewAdmissionsTrendLast30Days { get; set; } = [];
    public List<DashboardAdmissionLeftPointDto> AdmissionsVsLeftTrendLast30Days { get; set; } = [];
    public List<DashboardMoneyPointDto> FeeCollectionTrendLast30Days { get; set; } = [];
    public List<DashboardCategoryAmountDto> FeeCollectionBreakdownLast30Days { get; set; } = [];
    public List<DashboardExpenseHeadDto> ExpenseHeadsLast30Days { get; set; } = [];
    public List<DashboardExpenseSubheadDto> ExpenseSubheadsLast30Days { get; set; } = [];

    // Home dashboard widgets
    public DashboardKpiTrendDto ActiveStudentsTrend { get; set; } = new();
    public DashboardKpiTrendDto FeeCollectionTodayTrend { get; set; } = new();
    public DashboardKpiTrendDto OutstandingReceivableTrend { get; set; } = new();
    public DashboardKpiTrendDto AttendanceTodayTrend { get; set; } = new();
    public DashboardAttendanceOverviewDto AttendanceOverview { get; set; } = new();
    public List<DashboardBirthdayPersonDto> BirthdaysToday { get; set; } = [];
    public List<DashboardLateCheckInDto> TeachersCheckedInLate { get; set; } = [];
    public List<DashboardAlertDto> Alerts { get; set; } = [];
    public List<DashboardRecentAdmissionDto> RecentAdmissions { get; set; } = [];
    public List<DashboardTopDefaulterDto> TopFeeDefaulters { get; set; } = [];
}

public class AllCampusDashboardDto
{
    public DateTime Date { get; set; }
    public DateTime GeneratedAt { get; set; }
    public int TotalStudentCount { get; set; }
    public int TotalActiveStudentCount { get; set; }
    public int TotalInactiveStudentCount { get; set; }
    public int TotalNewAdmissionsToday { get; set; }
    public int TotalNewAdmissionsLast30Days { get; set; }
    public decimal TotalFeeCollectionToday { get; set; }
    public decimal TotalFeeCollectionLast30Days { get; set; }
    public decimal TotalGenerated { get; set; }
    public decimal TotalReceived { get; set; }
    public decimal TotalDiscount { get; set; }
    public decimal TotalReceivable { get; set; }
    public decimal TotalTuitionGenerated { get; set; }
    public decimal TotalTuitionReceived { get; set; }
    public decimal TotalTuitionDiscount { get; set; }
    public decimal TotalTuitionReceivable { get; set; }
    public decimal TotalFundsGenerated { get; set; }
    public decimal TotalFundsReceived { get; set; }
    public decimal TotalFundsDiscount { get; set; }
    public decimal TotalFundsReceivable { get; set; }
    public int TotalFeeDefaulterCount { get; set; }
    public decimal TotalTodayExpense { get; set; }
    public decimal TotalExpenseLast30Days { get; set; }
    public List<DashboardCampusComparisonDto> Campuses { get; set; } = [];
    public List<DashboardCategoryCountDto> StudentGenderDistribution { get; set; } = [];
    public List<DashboardMoneyPointDto> FeeCollectionTrendLast30Days { get; set; } = [];
    public List<DashboardCountPointDto> AdmissionsTrendLast30Days { get; set; } = [];
    public List<DashboardExpenseHeadDto> ExpenseHeadsLast30Days { get; set; } = [];
    public List<DashboardCategoryAmountDto> FeeCollectionByCampusLast30Days { get; set; } = [];
    public List<DashboardCategoryAmountDto> ExpenseByCampusLast30Days { get; set; } = [];
}

public class CampusFeeCollectionByDateDto
{
    public DateTime Date { get; set; }
    public List<DashboardCategoryAmountDto> Campuses { get; set; } = [];
}

public class CampusExpenseByIntervalDto
{
    public int Days { get; set; }
    public DateTime From { get; set; }
    public DateTime To { get; set; }
    public List<DashboardCategoryAmountDto> Campuses { get; set; } = [];
}

public class CampusExpenseDetailItemDto
{
    public int Id { get; set; }
    public string VoucherNumber { get; set; } = string.Empty;
    public string VoucherType { get; set; } = string.Empty;
    public DateTime? Date { get; set; }
    public int? Month { get; set; }
    public int? Year { get; set; }
    public int? MasterId { get; set; }
    public string GroupId { get; set; } = string.Empty;
    public string SubGroupId { get; set; } = string.Empty;
    public string AccountId { get; set; } = string.Empty;
    public string AccountTitle { get; set; } = string.Empty;
    public string Narration { get; set; } = string.Empty;
    public decimal Debit { get; set; }
    public decimal Credit { get; set; }
    public int? SerialNo { get; set; }
}

public class CampusExpenseDetailDto
{
    public string Campus { get; set; } = string.Empty;
    public string CampusLabel { get; set; } = string.Empty;
    public int Days { get; set; }
    public DateTime From { get; set; }
    public DateTime To { get; set; }
    public decimal TotalDebit { get; set; }
    public int TotalRecords { get; set; }
    public List<CampusExpenseDetailItemDto> Items { get; set; } = [];
}

public class CampusFeeBalanceByMonthDto
{
    public int Month { get; set; }
    public int Year { get; set; }
    public List<DashboardCategoryAmountDto> Campuses { get; set; } = [];
}

public class CampusFeeBreakdownByMonthDto
{
    public string Campus { get; set; } = string.Empty;
    public int Month { get; set; }
    public int Year { get; set; }
    public List<DashboardCategoryAmountDto> Breakdown { get; set; } = [];
}

public class CampusAdmissionsVsLeftTrendDto
{
    public string Campus { get; set; } = string.Empty;
    public int Days { get; set; }
    public DateTime From { get; set; }
    public DateTime To { get; set; }
    public List<DashboardAdmissionLeftPointDto> Points { get; set; } = [];
}

public class CampusAdmissionsByMonthItemDto
{
    public string Campus { get; set; } = string.Empty;
    public string CampusLabel { get; set; } = string.Empty;
    public int NewAdmissions { get; set; }
    public int LeftStudents { get; set; }
}

public class CampusAdmissionsByMonthDto
{
    public int Month { get; set; }
    public int Year { get; set; }
    public List<CampusAdmissionsByMonthItemDto> Campuses { get; set; } = [];
}

public class CampusLeftStudentItemDto
{
    public int RegId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public DateTime? RegDate { get; set; }
    public DateTime? LeaveDate { get; set; }
    public string StudyDurationLabel { get; set; } = string.Empty;
    public int? StudyDurationDays { get; set; }
    public decimal OutstandingBalance { get; set; }
    public string? Reason { get; set; }
}

public class CampusLeftStudentsByMonthDto
{
    public string Campus { get; set; } = string.Empty;
    public string CampusLabel { get; set; } = string.Empty;
    public int Month { get; set; }
    public int Year { get; set; }
    public decimal TotalOutstandingBalance { get; set; }
    public List<CampusLeftStudentItemDto> Items { get; set; } = [];
}
