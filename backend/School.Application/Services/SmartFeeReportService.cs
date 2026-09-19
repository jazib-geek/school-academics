using System.Globalization;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using School.Application.Common;
using School.Application.DTOs;
using School.Application.Interfaces;
using School.Infrastructure.Data;
using School.Infrastructure.Entities;

namespace School.Application.Services;

public class SmartFeeReportService : ISmartFeeReportService
{
    private readonly AppDbContext _context;
    private readonly IFeeReportService _feeReports;

    private static readonly CultureInfo Invariant = CultureInfo.InvariantCulture;

    public SmartFeeReportService(AppDbContext context, IFeeReportService feeReports)
    {
        _context = context;
        _feeReports = feeReports;
    }

    public Task<List<SmartFeeReportCatalogItemDto>> GetCatalogAsync() => Task.FromResult(BuildCatalog());

    public async Task<FeeExecutiveSnapshotDto> GetExecutiveSnapshotAsync()
    {
        var today = PakistanTime.Today.ToDateTime(TimeOnly.MinValue);
        var monthStart = new DateTime(today.Year, today.Month, 1);
        var lastMonth = monthStart.AddMonths(-1);
        var lastMonthSameDay = lastMonth.AddDays(Math.Min(today.Day, DateTime.DaysInMonth(lastMonth.Year, lastMonth.Month)) - 1);

        var receipts = _context.FeeAndFundCollections.Where(x =>
            x.Date.HasValue &&
            (x.Recieved ?? 0) > 0 &&
            x.Student != null);

        var collectedToday = await receipts
            .Where(x => x.Date!.Value.Date == today.Date)
            .SumAsync(x => x.Recieved ?? 0);

        var collectedMtd = await receipts
            .Where(x => x.Date!.Value.Date >= monthStart && x.Date!.Value.Date <= today.Date)
            .SumAsync(x => x.Recieved ?? 0);

        var collectedLastMonthSame = await receipts
            .Where(x => x.Date!.Value.Date >= lastMonth && x.Date!.Value.Date <= lastMonthSameDay)
            .SumAsync(x => x.Recieved ?? 0);

        var ledger = ActiveStudentLedger();

        var charged = await ledger.SumAsync(x => x.Payment ?? 0);
        var received = await ledger.SumAsync(x => (x.Recieved ?? 0) + (x.Discount ?? 0));
        var receivable = charged - received;

        var defaulterCount = await ledger
            .GroupBy(x => x.StudentID ?? 0)
            .Select(g => new
            {
                Outstanding = g.Sum(x => (x.Payment ?? 0) - ((x.Recieved ?? 0) + (x.Discount ?? 0)))
            })
            .CountAsync(x => x.Outstanding > 0);

        var activeStudentCount = await _context.Students.CountAsync(x =>
            x.IsActive == true);
        var recovery = charged > 0 ? Math.Round(received / charged * 100m, 1) : 0m;

        return new FeeExecutiveSnapshotDto
        {
            CollectedToday = collectedToday,
            CollectedMtd = collectedMtd,
            CollectedLastMonthSamePeriod = collectedLastMonthSame,
            TotalReceivable = receivable > 0 ? receivable : 0,
            DefaulterCount = defaulterCount,
            ActiveStudentCount = activeStudentCount,
            RecoveryPercent = recovery,
            ChargedAllTime = charged,
            ReceivedAllTime = received
        };
    }

    public async Task<SmartFeeReportResultDto> RunAsync(string reportId, Dictionary<string, object?> parameters)
    {
        var id = (reportId ?? string.Empty).Trim().ToLowerInvariant();
        var catalog = BuildCatalog().FirstOrDefault(x => x.Id == id)
            ?? throw new ArgumentException($"Unknown report '{reportId}'.");

        parameters ??= new Dictionary<string, object?>(StringComparer.OrdinalIgnoreCase);

        return id switch
        {
            "tuition-defaulters" => await TuitionDefaultersAsync(catalog, parameters),
            "fund-defaulters" => await FundDefaultersAsync(catalog, parameters),
            "overall-receivable" => await OverallReceivableAsync(catalog, parameters),
            "overall-receivable-class-wise" => await OverallReceivableClassWiseAsync(catalog, parameters),
            "top-defaulters" => await TopDefaultersAsync(catalog, parameters),
            "chronic-defaulters" => await ChronicDefaultersAsync(catalog, parameters),
            "aging-receivable" => await AgingReceivableAsync(catalog, parameters),
            "never-paid-period" => await NeverPaidPeriodAsync(catalog, parameters),
            "partial-payers" => await PartialPayersAsync(catalog, parameters),
            "family-receivable" => await FamilyReceivableAsync(catalog, parameters),
            "inactive-with-dues" => await InactiveWithDuesAsync(catalog, parameters),
            "dues-above-threshold" => await DuesAboveThresholdAsync(catalog, parameters),
            "collection-by-date" => await CollectionByDateAsync(catalog, parameters),
            "collection-by-interval" => await CollectionByIntervalAsync(catalog, parameters),
            "collection-by-fund" => await CollectionByFundAsync(catalog, parameters),
            "collection-by-class" => await CollectionByClassAsync(catalog, parameters),
            "collection-trend" => await CollectionTrendAsync(catalog, parameters),
            "collection-mom-compare" => await CollectionMomCompareAsync(catalog, parameters),
            "largest-receipts" => await LargestReceiptsAsync(catalog, parameters),
            "collector-performance" => await CollectorPerformanceAsync(catalog, parameters),
            "discount-given" => await DiscountGivenAsync(catalog, parameters),
            "voids-adjustments" => await VoidsAdjustmentsAsync(catalog, parameters),
            "zero-collection-days" => await ZeroCollectionDaysAsync(catalog, parameters),
            "class-wise-receivable" => await ClassWiseReceivableAsync(catalog, parameters),
            "recovery-rate" => await RecoveryRateAsync(catalog, parameters),
            "tuition-month-matrix" => await TuitionMonthMatrixAsync(catalog, parameters),
            "expected-income" => await ExpectedIncomeAsync(catalog, parameters),
            "concession-impact" => await ConcessionImpactAsync(catalog, parameters),
            "session-fee-snapshot" => await SessionFeeSnapshotAsync(catalog, parameters),
            "fund-mix-outstanding" => await FundMixOutstandingAsync(catalog, parameters),
            "students-fully-cleared" => await StudentsFullyClearedAsync(catalog, parameters),
            "new-charges-vs-receipts" => await NewChargesVsReceiptsAsync(catalog, parameters),
            _ => throw new ArgumentException($"Unknown report '{reportId}'.")
        };
    }

    // ——— Catalog ———

    private static List<SmartFeeReportCatalogItemDto> BuildCatalog()
    {
        var now = PakistanTime.Now;
        var today = now.ToString("yyyy-MM-dd");
        var monthStart = new DateTime(now.Year, now.Month, 1).ToString("yyyy-MM-dd");
        var month = now.Month;
        var year = now.Year;

        return
        [
            // Risk
            Item("tuition-defaulters", "Tuition Defaulters", "Students with outstanding tuition for a month/year.", "risk",
                "Who still owes this month's fee?", true,
                P(Param("month", "Month", "month", true, month), Param("year", "Year", "year", true, year), ClassOpt()),
                new() { ["month"] = month, ["year"] = year }),
            Item("fund-defaulters", "Fund Defaulters", "Outstanding by a specific fund type.", "risk",
                "Who owes admission, transport, or other funds?", true,
                P(Param("fundTypeId", "Fund Type", "fundType", true, null, "fundTypes"), ClassOpt())),
            Item("overall-receivable", "Overall Receivable", "Every active student with any outstanding balance.", "risk",
                "Full dues list for follow-up calls.", true,
                P(ClassOpt(), MinAmt("minOutstanding", 0)),
                new() { ["minOutstanding"] = 0 }),
            Item("overall-receivable-class-wise", "Overall receivable class wise", "Same receivables list, printed class-wise like the legacy sheet.", "risk",
                "Class sections with subtotals — ready to print.", true,
                P()),
            Item("top-defaulters", "Top Defaulters", "Highest outstanding balances campus-wide.", "risk",
                "Focus on the biggest risks first.", false,
                P(TopN(25), FundScopeOpt(), ClassOpt(), MinAmt("minOutstanding", 1)),
                new() { ["topN"] = 25, ["fundScope"] = "all", ["minOutstanding"] = 1 }),
            Item("chronic-defaulters", "Silent / Chronic Defaulters", "Still owes, but no payment in N months.", "risk",
                "Families that went quiet — priority outreach.", true,
                P(Param("monthsWithoutPayment", "Silent months", "int", true, 3), MinAmt("minOutstanding", 1), ClassOpt(), FundScopeOpt()),
                new() { ["monthsWithoutPayment"] = 3, ["minOutstanding"] = 1, ["fundScope"] = "all" }),
            Item("aging-receivable", "Aging Receivable", "Outstanding buckets by how old unpaid tuition months are.", "risk",
                "Is debt fresh or stuck for quarters?", true,
                P(FundScopeOpt(), ClassOpt()),
                new() { ["fundScope"] = "tuition" }),
            Item("never-paid-period", "Never Paid (Period)", "Charged in a period with zero receipts against that period.", "risk",
                "Generated fees with no payment at all.", false,
                P(Param("month", "Month", "month", true, month), Param("year", "Year", "year", true, year), FundScopeOpt(), ClassOpt())),
            Item("partial-payers", "Partial Payers", "Paid something but still carry outstanding.", "risk",
                "Almost there — easy collection wins.", true,
                P(MinAmt("minOutstanding", 1), FundScopeOpt(), ClassOpt()),
                new() { ["minOutstanding"] = 1, ["fundScope"] = "all" }),
            Item("family-receivable", "Family Receivable", "Sibling / family-code roll-up of outstanding.", "risk",
                "Call one guardian for multiple children.", true,
                P(MinAmt("minOutstanding", 1), ClassOpt()),
                new() { ["minOutstanding"] = 1 }),
            Item("inactive-with-dues", "Inactive Students With Dues", "Left or inactive students who still owe (only report that includes inactive).", "risk",
                "Recovery / write-off candidates.", true,
                P(MinAmt("minOutstanding", 1)),
                new() { ["minOutstanding"] = 1 }),
            Item("dues-above-threshold", "Dues Above Threshold", "Everyone owing more than X.", "risk",
                "Action list for the fee office.", false,
                P(MinAmt("minOutstanding", 10000), FundScopeOpt(), ClassOpt())),

            // Cash
            Item("collection-by-date", "Fee Collection on Date", "Every receipt on a single day.", "cash",
                "What came in today?", true,
                P(Param("date", "Date", "date", true, today)),
                new() { ["date"] = today }),
            Item("collection-by-interval", "Fee Collection by Interval", "Receipt detail between two dates.", "cash",
                "Period collection drill-down.", true,
                P(Param("dateFrom", "From", "date", true, monthStart), Param("dateTo", "To", "date", true, today)),
                new() { ["dateFrom"] = monthStart, ["dateTo"] = today }),
            Item("collection-by-fund", "Collection by Fund Type", "Receipts rolled up by fund type.", "cash",
                "Tuition vs funds mix in the till.", false,
                P(Param("dateFrom", "From", "date", true, monthStart), Param("dateTo", "To", "date", true, today)),
                new() { ["dateFrom"] = monthStart, ["dateTo"] = today }),
            Item("collection-by-class", "Collection by Class", "Which classes paid the most.", "cash",
                "Class-wise cash performance.", false,
                P(Param("dateFrom", "From", "date", true, monthStart), Param("dateTo", "To", "date", true, today), FundScopeOpt()),
                new() { ["dateFrom"] = monthStart, ["dateTo"] = today, ["fundScope"] = "all" }),
            Item("collection-trend", "Collection Trend", "Daily or monthly collection series.", "cash",
                "Are we trending up or down?", false,
                P(Param("dateFrom", "From", "date", true, monthStart), Param("dateTo", "To", "date", true, today),
                    Param("grain", "Grain", "grain", true, "day", null,
                    [
                        new() { Value = "day", Label = "Daily" },
                        new() { Value = "month", Label = "Monthly" }
                    ])),
                new() { ["dateFrom"] = monthStart, ["dateTo"] = today, ["grain"] = "day" }),
            Item("collection-mom-compare", "Month vs Last Month", "This month's collection vs previous month.", "cash",
                "Director MoM pulse check.", false,
                P(Param("month", "Month", "month", true, month), Param("year", "Year", "year", true, year)),
                new() { ["month"] = month, ["year"] = year }),
            Item("largest-receipts", "Largest Receipts", "Biggest receipt batches in a period.", "cash",
                "Catch-up payers and large settlements.", false,
                P(Param("dateFrom", "From", "date", true, monthStart), Param("dateTo", "To", "date", true, today), TopN(25)),
                new() { ["dateFrom"] = monthStart, ["dateTo"] = today, ["topN"] = 25 }),
            Item("collector-performance", "Collector Performance", "Receipts grouped by ReceivedBy.", "cash",
                "Who is collecting on the counter?", false,
                P(Param("dateFrom", "From", "date", true, monthStart), Param("dateTo", "To", "date", true, today)),
                new() { ["dateFrom"] = monthStart, ["dateTo"] = today }),
            Item("discount-given", "Discounts Given", "Discount/waiver amounts posted in period.", "cash",
                "How much did we waive?", false,
                P(Param("dateFrom", "From", "date", true, monthStart), Param("dateTo", "To", "date", true, today), ClassOpt())),
            Item("voids-adjustments", "Voids / Adjustments", "Voided amounts in a period.", "cash",
                "Leakage and correction check.", false,
                P(Param("dateFrom", "From", "date", true, monthStart), Param("dateTo", "To", "date", true, today))),
            Item("zero-collection-days", "Zero Collection Days", "Calendar days with no receipts.", "cash",
                "Quiet days that need attention.", false,
                P(Param("dateFrom", "From", "date", true, monthStart), Param("dateTo", "To", "date", true, today))),

            // Portfolio
            Item("class-wise-receivable", "Class-wise Receivable", "Outstanding aggregated by class.", "portfolio",
                "Where is money stuck by class?", true,
                P(FundScopeOpt(), Param("month", "Tuition month (optional)", "month", false, null), Param("year", "Tuition year (optional)", "year", false, null)),
                new() { ["fundScope"] = "all" }),
            Item("recovery-rate", "Recovery Rate by Class", "Charged vs received vs outstanding %.", "portfolio",
                "Health score per class.", true,
                P(FundScopeOpt()),
                new() { ["fundScope"] = "all" }),
            Item("tuition-month-matrix", "Tuition Month Matrix", "Outstanding by month for a year.", "portfolio",
                "Which fee months are stuck?", true,
                P(Param("year", "Year", "year", true, year), ClassOpt()),
                new() { ["year"] = year }),
            Item("expected-income", "Expected Income", "Session tuition receivables by month plus overall fund balances.", "portfolio",
                "Monthly estimated income sheet for the campus session.", true,
                P()),
            Item("concession-impact", "Concession Impact", "Students with fee concession vs ledger reality.", "portfolio",
                "Are concessions matched by collection?", false,
                P(ClassOpt(), MinAmt("minConcession", 1))),
            Item("session-fee-snapshot", "Session Fee Snapshot", "Roster tuition fee vs ledger charged/received/due.", "portfolio",
                "Book fee vs actual ledger.", false,
                P(ClassOpt())),
            Item("fund-mix-outstanding", "Fund Mix Outstanding", "Outstanding split by every fund type.", "portfolio",
                "Where dues sit by fund head.", true,
                P(),
                new()),
            Item("students-fully-cleared", "Fully Cleared Students", "Active students with zero outstanding.", "portfolio",
                "Good list — pride / certificates.", true,
                P(ClassOpt()),
                new()),
            Item("new-charges-vs-receipts", "Charges vs Receipts", "Payment generated vs received in a date window.", "portfolio",
                "Billing pressure vs cash in.", true,
                P(Param("dateFrom", "From", "date", true, monthStart), Param("dateTo", "To", "date", true, today)),
                new() { ["dateFrom"] = monthStart, ["dateTo"] = today }),
        ];
    }

    private static SmartFeeReportCatalogItemDto Item(
        string id, string title, string description, string category, string blurb, bool isPreset,
        List<SmartFeeReportParamDefDto> parameters, Dictionary<string, object?>? preset = null) => new()
    {
        Id = id,
        Title = title,
        Description = description,
        Category = category,
        DirectorBlurb = blurb,
        IsPreset = isPreset,
        PresetParameters = preset,
        Parameters = parameters
    };

    private static List<SmartFeeReportParamDefDto> P(params SmartFeeReportParamDefDto[] items) => [.. items];

    private static SmartFeeReportParamDefDto Param(string key, string label, string type, bool required, object? defaultValue, string? optionsSource = null, List<SmartFeeReportOptionDto>? options = null) =>
        new()
        {
            Key = key,
            Label = label,
            Type = type,
            Required = required,
            DefaultValue = defaultValue,
            OptionsSource = optionsSource,
            Options = options
        };

    private static SmartFeeReportParamDefDto ClassOpt() =>
        Param("className", "Class", "className", false, null, "classes");

    private static SmartFeeReportParamDefDto FundScopeOpt(bool required = false) =>
        Param("fundScope", "Fund scope", "fundScope", required, "all", null,
        [
            new() { Value = "all", Label = "All" },
            new() { Value = "tuition", Label = "Tuition only" },
            new() { Value = "funds", Label = "Funds only" }
        ]);

    private static SmartFeeReportParamDefDto TopN(int defaultN) =>
        Param("topN", "Top N", "topN", true, defaultN, null,
        [
            new() { Value = "10", Label = "Top 10" },
            new() { Value = "25", Label = "Top 25" },
            new() { Value = "50", Label = "Top 50" },
            new() { Value = "100", Label = "Top 100" }
        ]);

    private static SmartFeeReportParamDefDto MinAmt(string key, decimal def) =>
        Param(key, key.Contains("Concession", StringComparison.OrdinalIgnoreCase) ? "Min concession" : "Min outstanding", "decimal", false, def);

    // ——— Handlers: Risk ———

    private async Task<SmartFeeReportResultDto> TuitionDefaultersAsync(SmartFeeReportCatalogItemDto cat, Dictionary<string, object?> p)
    {
        var month = RequireMonth(p);
        var year = RequireYear(p);
        var className = GetString(p, "className");
        var data = await _feeReports.GetFeeDefaultersAsync(month, year);
        var rows = data.Items
            .Where(x => MatchClass(x.ClassName, className))
            .Select(x => Row(
                ("studentId", x.StudentId),
                ("studentName", x.StudentName),
                ("className", x.ClassName),
                ("month", x.Month),
                ("year", x.Year),
                ("outstandingAmount", x.OutstandingAmount)))
            .ToList();
        return Result(cat, rows, Cols(
            ("studentId", "Reg #", "number"),
            ("studentName", "Student", "text"),
            ("className", "Class", "text"),
            ("month", "Month", "number"),
            ("year", "Year", "number"),
            ("outstandingAmount", "Outstanding", "money")), "className", rows.Sum(r => Dec(r, "outstandingAmount")));
    }

    private async Task<SmartFeeReportResultDto> FundDefaultersAsync(SmartFeeReportCatalogItemDto cat, Dictionary<string, object?> p)
    {
        var fundTypeId = RequireInt(p, "fundTypeId");
        if (fundTypeId <= 1) throw new ArgumentException("fundTypeId must be greater than 1.");
        var className = GetString(p, "className");
        var data = await _feeReports.GetFundDefaultersAsync(fundTypeId);
        var rows = data.Items
            .Where(x => MatchClass(x.ClassName, className))
            .Select(x => Row(
                ("studentId", x.StudentId),
                ("studentName", x.StudentName),
                ("className", x.ClassName),
                ("fundTypeName", x.FundTypeName),
                ("outstandingAmount", x.OutstandingAmount)))
            .ToList();
        return Result(cat, rows, Cols(
            ("studentId", "Reg #", "number"),
            ("studentName", "Student", "text"),
            ("className", "Class", "text"),
            ("fundTypeName", "Fund", "text"),
            ("outstandingAmount", "Outstanding", "money")), "className", rows.Sum(r => Dec(r, "outstandingAmount")));
    }

    private async Task<SmartFeeReportResultDto> OverallReceivableAsync(SmartFeeReportCatalogItemDto cat, Dictionary<string, object?> p)
    {
        var className = GetString(p, "className");
        var min = GetDecimal(p, "minOutstanding") ?? 0;
        var data = await _feeReports.GetOverallReceivableAsync();
        var rows = data.Items
            .Where(x => MatchClass(x.ClassName, className) && x.OutstandingAmount >= min)
            .Select(x => Row(
                ("studentId", x.StudentId),
                ("studentName", x.StudentName),
                ("className", x.ClassName),
                ("totalGenerated", x.TotalGenerated),
                ("totalReceived", x.TotalReceived),
                ("outstandingAmount", x.OutstandingAmount),
                ("actualFee", x.ActualFee),
                ("prevBalance", x.PrevBalance),
                ("admissionFee", x.AdmissionFee),
                ("miscCharges", x.MiscCharges),
                ("tuitionOutstanding", x.TuitionOutstanding),
                // Net outstanding (Payment - Recieved), not sum of floored fund columns.
                ("classWiseTotal", x.OutstandingAmount)))
            .ToList();
        var overall = Result(cat, rows, Cols(
            ("studentId", "Reg #", "number"),
            ("studentName", "Student", "text"),
            ("className", "Class", "text"),
            ("totalGenerated", "Generated", "money"),
            ("totalReceived", "Received", "money"),
            ("outstandingAmount", "Outstanding", "money")), "className", data.TotalAmount);
        return overall;
    }

    private async Task<SmartFeeReportResultDto> OverallReceivableClassWiseAsync(SmartFeeReportCatalogItemDto cat, Dictionary<string, object?> p)
    {
        var data = await _feeReports.GetOverallReceivableAsync();
        var rows = data.Items
            .Select(x => Row(
                ("studentId", x.StudentId),
                ("studentName", x.StudentName),
                ("className", x.ClassName),
                ("actualFee", x.ActualFee),
                ("prevBalance", x.PrevBalance),
                ("admissionFee", x.AdmissionFee),
                ("miscCharges", x.MiscCharges),
                ("tuitionOutstanding", x.TuitionOutstanding),
                // Net outstanding (Payment - Recieved), not sum of floored fund columns.
                ("classWiseTotal", x.OutstandingAmount),
                ("totalGenerated", x.TotalGenerated),
                ("totalReceived", x.TotalReceived),
                ("outstandingAmount", x.OutstandingAmount)))
            .ToList();

        var result = Result(cat, rows, Cols(
            ("studentId", "Reg. No.", "number"),
            ("studentName", "Student Name", "text"),
            ("className", "Class", "text"),
            ("actualFee", "Actual Fee", "money"),
            ("prevBalance", "Prev Balance", "money"),
            ("admissionFee", "Admission Fee", "money"),
            ("miscCharges", "Misc Charges", "money"),
            ("tuitionOutstanding", "T.F", "money"),
            ("classWiseTotal", "Total", "money")), "className", data.TotalAmount);
        result.Layout = "receivable-class-wise";
        result.ExtraKpis =
        [
            new SmartFeeReportKpiDto
            {
                Key = "totalPrevBalance",
                Label = "Prev Balance",
                Value = data.TotalPrevBalance.ToString(CultureInfo.InvariantCulture),
                Format = "money"
            },
            new SmartFeeReportKpiDto
            {
                Key = "totalAdmissionFee",
                Label = "Admission Fee",
                Value = data.TotalAdmissionFee.ToString(CultureInfo.InvariantCulture),
                Format = "money"
            },
            new SmartFeeReportKpiDto
            {
                Key = "totalMiscCharges",
                Label = "Misc Charges",
                Value = data.TotalMiscCharges.ToString(CultureInfo.InvariantCulture),
                Format = "money"
            },
            new SmartFeeReportKpiDto
            {
                Key = "totalTuitionOutstanding",
                Label = "T.F",
                Value = data.TotalTuitionOutstanding.ToString(CultureInfo.InvariantCulture),
                Format = "money"
            }
        ];
        result.LayoutPayload = new OverallReceivableMasterTotalsDto
        {
            TotalPrevBalance = data.TotalPrevBalance,
            TotalAdmissionFee = data.TotalAdmissionFee,
            TotalMiscCharges = data.TotalMiscCharges,
            TotalTuitionOutstanding = data.TotalTuitionOutstanding,
            TotalAmount = data.TotalAmount
        };
        return result;
    }

    private async Task<SmartFeeReportResultDto> TopDefaultersAsync(SmartFeeReportCatalogItemDto cat, Dictionary<string, object?> p)
    {
        var topN = ClampTopN(GetInt(p, "topN") ?? 25);
        var scope = GetFundScope(p);
        var className = GetString(p, "className");
        var min = GetDecimal(p, "minOutstanding") ?? 1;

        var grouped = await ApplyFundScope(ActiveStudentLedger(), scope)
            .GroupBy(x => new
            {
                StudentId = x.StudentID ?? 0,
                StudentName = x.Student!.FullName,
                ClassName = x.Student.Section != null ? x.Student.Section.ClassName : null
            })
            .Select(g => new
            {
                g.Key.StudentId,
                g.Key.StudentName,
                g.Key.ClassName,
                Outstanding = g.Sum(x => (x.Payment ?? 0) - ((x.Recieved ?? 0) + (x.Discount ?? 0)))
            })
            .Where(x => x.Outstanding >= min)
            .OrderByDescending(x => x.Outstanding)
            .Take(topN)
            .ToListAsync();

        var rows = grouped
            .Where(x => MatchClass(x.ClassName, className))
            .Select(x => Row(
                ("studentId", x.StudentId),
                ("studentName", x.StudentName ?? "N/A"),
                ("className", x.ClassName),
                ("outstandingAmount", x.Outstanding)))
            .ToList();

        return Result(cat, rows, Cols(
            ("studentId", "Reg #", "number"),
            ("studentName", "Student", "text"),
            ("className", "Class", "text"),
            ("outstandingAmount", "Outstanding", "money")), "className", rows.Sum(r => Dec(r, "outstandingAmount")));
    }

    private async Task<SmartFeeReportResultDto> ChronicDefaultersAsync(SmartFeeReportCatalogItemDto cat, Dictionary<string, object?> p)
    {
        var months = Math.Clamp(GetInt(p, "monthsWithoutPayment") ?? 3, 1, 36);
        var min = GetDecimal(p, "minOutstanding") ?? 1;
        var scope = GetFundScope(p);
        var className = GetString(p, "className");
        var cutoff = PakistanTime.Today.ToDateTime(TimeOnly.MinValue).AddMonths(-months);

        var balances = await ApplyFundScope(ActiveStudentLedger(), scope)
            .GroupBy(x => new
            {
                StudentId = x.StudentID ?? 0,
                StudentName = x.Student!.FullName,
                ClassName = x.Student.Section != null ? x.Student.Section.ClassName : null
            })
            .Select(g => new
            {
                g.Key.StudentId,
                g.Key.StudentName,
                g.Key.ClassName,
                Outstanding = g.Sum(x => (x.Payment ?? 0) - ((x.Recieved ?? 0) + (x.Discount ?? 0))),
                LastReceipt = g.Where(x => (x.Recieved ?? 0) > 0).Max(x => x.Date)
            })
            .Where(x => x.Outstanding >= min && (x.LastReceipt == null || x.LastReceipt < cutoff))
            .OrderByDescending(x => x.Outstanding)
            .ToListAsync();

        var rows = balances
            .Where(x => MatchClass(x.ClassName, className))
            .Select(x => Row(
                ("studentId", x.StudentId),
                ("studentName", x.StudentName ?? "N/A"),
                ("className", x.ClassName),
                ("outstandingAmount", x.Outstanding),
                ("lastReceiptDate", x.LastReceipt.HasValue ? x.LastReceipt.Value.ToString("yyyy-MM-dd") : "Never"),
                ("silentMonths", months)))
            .ToList();

        return Result(cat, rows, Cols(
            ("studentId", "Reg #", "number"),
            ("studentName", "Student", "text"),
            ("className", "Class", "text"),
            ("outstandingAmount", "Outstanding", "money"),
            ("lastReceiptDate", "Last receipt", "text"),
            ("silentMonths", "Silent ≥ months", "number")), "className", rows.Sum(r => Dec(r, "outstandingAmount")),
            Extra(("silentCutoff", "No payment since", cutoff.ToString("yyyy-MM-dd"), "text")));
    }

    private async Task<SmartFeeReportResultDto> AgingReceivableAsync(SmartFeeReportCatalogItemDto cat, Dictionary<string, object?> p)
    {
        var scope = GetFundScope(p);
        var className = GetString(p, "className");
        var now = PakistanTime.Now;
        var currentKey = now.Year * 12 + now.Month;

        // For tuition: age by unpaid month keys. For funds/all: use last charge date age in days buckets via student outstanding + oldest unpaid month.
        var q = ApplyFundScope(ActiveStudentLedger(), scope);

        var buckets = new Dictionary<string, decimal>
        {
            ["0-30 days / current"] = 0,
            ["31-60 days / 1 mo"] = 0,
            ["61-90 days / 2 mo"] = 0,
            ["90+ days / 3+ mo"] = 0
        };
        var studentBucket = new Dictionary<int, (string Name, string? Class, string Bucket, decimal Outstanding)>();

        if (scope == "tuition" || scope == "all")
        {
            var tuitionRows = await ActiveStudentLedger()
                .Where(x => x.FundTypeID == 1 && x.Month != null && x.Year != null)
                .GroupBy(x => new
                {
                    StudentId = x.StudentID ?? 0,
                    StudentName = x.Student!.FullName,
                    ClassName = x.Student.Section != null ? x.Student.Section.ClassName : null,
                    x.Month,
                    x.Year
                })
                .Select(g => new
                {
                    g.Key.StudentId,
                    g.Key.StudentName,
                    g.Key.ClassName,
                    Month = g.Key.Month!.Value,
                    Year = g.Key.Year!.Value,
                    Outstanding = g.Sum(x => (x.Payment ?? 0) - ((x.Recieved ?? 0) + (x.Discount ?? 0)))
                })
                .Where(x => x.Outstanding > 0)
                .ToListAsync();

            foreach (var row in tuitionRows.Where(x => MatchClass(x.ClassName, className)))
            {
                var ageMonths = Math.Max(0, currentKey - (row.Year * 12 + row.Month));
                var bucket = ageMonths switch
                {
                    0 => "0-30 days / current",
                    1 => "31-60 days / 1 mo",
                    2 => "61-90 days / 2 mo",
                    _ => "90+ days / 3+ mo"
                };
                buckets[bucket] += row.Outstanding;
                if (!studentBucket.TryGetValue(row.StudentId, out var existing) || row.Outstanding > existing.Outstanding)
                {
                    // keep worst (oldest) bucket preference by age
                }
                if (!studentBucket.ContainsKey(row.StudentId) || ageMonths > AgeRank(studentBucket[row.StudentId].Bucket))
                {
                    studentBucket[row.StudentId] = (row.StudentName ?? "N/A", row.ClassName, bucket, 0);
                }
            }

            // fill student outstanding totals
            var totals = tuitionRows
                .Where(x => MatchClass(x.ClassName, className))
                .GroupBy(x => x.StudentId)
                .ToDictionary(g => g.Key, g => g.Sum(x => x.Outstanding));
            foreach (var kv in studentBucket.Keys.ToList())
            {
                var t = studentBucket[kv];
                studentBucket[kv] = (t.Name, t.Class, t.Bucket, totals.GetValueOrDefault(kv));
            }
        }
        else
        {
            var fundRows = await q
                .GroupBy(x => new
                {
                    StudentId = x.StudentID ?? 0,
                    StudentName = x.Student!.FullName,
                    ClassName = x.Student.Section != null ? x.Student.Section.ClassName : null
                })
                .Select(g => new
                {
                    g.Key.StudentId,
                    g.Key.StudentName,
                    g.Key.ClassName,
                    Outstanding = g.Sum(x => (x.Payment ?? 0) - ((x.Recieved ?? 0) + (x.Discount ?? 0))),
                    OldestDate = g.Where(x => (x.Payment ?? 0) > 0).Min(x => x.Date)
                })
                .Where(x => x.Outstanding > 0)
                .ToListAsync();

            foreach (var row in fundRows.Where(x => MatchClass(x.ClassName, className)))
            {
                var days = row.OldestDate.HasValue ? (now.Date - row.OldestDate.Value.Date).Days : 999;
                var bucket = days switch
                {
                    <= 30 => "0-30 days / current",
                    <= 60 => "31-60 days / 1 mo",
                    <= 90 => "61-90 days / 2 mo",
                    _ => "90+ days / 3+ mo"
                };
                buckets[bucket] += row.Outstanding;
                studentBucket[row.StudentId] = (row.StudentName ?? "N/A", row.ClassName, bucket, row.Outstanding);
            }
        }

        var rows = studentBucket.Values
            .OrderByDescending(x => x.Outstanding)
            .Select(x => Row(
                ("studentName", x.Name),
                ("className", x.Class),
                ("agingBucket", x.Bucket),
                ("outstandingAmount", x.Outstanding)))
            .ToList();

        var chart = new SmartFeeReportChartDto
        {
            Type = "bar",
            Labels = buckets.Keys.ToList(),
            Series = [new() { Name = "Outstanding", Data = buckets.Values.ToList() }]
        };

        var result = Result(cat, rows, Cols(
            ("studentName", "Student", "text"),
            ("className", "Class", "text"),
            ("agingBucket", "Aging", "text"),
            ("outstandingAmount", "Outstanding", "money")), "agingBucket", rows.Sum(r => Dec(r, "outstandingAmount")));
        result.Chart = chart;
        result.ExtraKpis = buckets.Select(b => new SmartFeeReportKpiDto
        {
            Key = b.Key,
            Label = b.Key,
            Value = b.Value.ToString("0", Invariant),
            Format = "money"
        }).ToList();
        return result;
    }

    private static int AgeRank(string bucket) => bucket switch
    {
        "90+ days / 3+ mo" => 3,
        "61-90 days / 2 mo" => 2,
        "31-60 days / 1 mo" => 1,
        _ => 0
    };

    private async Task<SmartFeeReportResultDto> NeverPaidPeriodAsync(SmartFeeReportCatalogItemDto cat, Dictionary<string, object?> p)
    {
        var month = RequireMonth(p);
        var year = RequireYear(p);
        var scope = GetFundScope(p);
        var className = GetString(p, "className");

        IQueryable<FeeAndFundCollection> q = scope switch
        {
            "tuition" => ActiveStudentLedger().Where(x => x.FundTypeID == 1 && x.Month == month && x.Year == year),
            "funds" => ApplyFundScope(ActiveStudentLedger(), "funds"),
            _ => ActiveStudentLedger().Where(x =>
                (x.FundTypeID == 1 && x.Month == month && x.Year == year) ||
                (x.FundTypeID ?? 0) > 1)
        };

        var rowsData = await q
            .GroupBy(x => new
            {
                StudentId = x.StudentID ?? 0,
                StudentName = x.Student!.FullName,
                ClassName = x.Student.Section != null ? x.Student.Section.ClassName : null
            })
            .Select(g => new
            {
                g.Key.StudentId,
                g.Key.StudentName,
                g.Key.ClassName,
                Charged = g.Sum(x => x.Payment ?? 0),
                Received = g.Sum(x => (x.Recieved ?? 0) + (x.Discount ?? 0)),
                Outstanding = g.Sum(x => (x.Payment ?? 0) - ((x.Recieved ?? 0) + (x.Discount ?? 0)))
            })
            .Where(x => x.Charged > 0 && x.Received == 0 && x.Outstanding > 0)
            .OrderByDescending(x => x.Outstanding)
            .ToListAsync();

        var rows = rowsData
            .Where(x => MatchClass(x.ClassName, className))
            .Select(x => Row(
                ("studentId", x.StudentId),
                ("studentName", x.StudentName ?? "N/A"),
                ("className", x.ClassName),
                ("charged", x.Charged),
                ("outstandingAmount", x.Outstanding)))
            .ToList();

        return Result(cat, rows, Cols(
            ("studentId", "Reg #", "number"),
            ("studentName", "Student", "text"),
            ("className", "Class", "text"),
            ("charged", "Charged", "money"),
            ("outstandingAmount", "Outstanding", "money")), "className", rows.Sum(r => Dec(r, "outstandingAmount")));
    }

    private async Task<SmartFeeReportResultDto> PartialPayersAsync(SmartFeeReportCatalogItemDto cat, Dictionary<string, object?> p)
    {
        var min = GetDecimal(p, "minOutstanding") ?? 1;
        var scope = GetFundScope(p);
        var className = GetString(p, "className");

        var data = await ApplyFundScope(ActiveStudentLedger(), scope)
            .GroupBy(x => new
            {
                StudentId = x.StudentID ?? 0,
                StudentName = x.Student!.FullName,
                ClassName = x.Student.Section != null ? x.Student.Section.ClassName : null
            })
            .Select(g => new
            {
                g.Key.StudentId,
                g.Key.StudentName,
                g.Key.ClassName,
                Charged = g.Sum(x => x.Payment ?? 0),
                Received = g.Sum(x => (x.Recieved ?? 0) + (x.Discount ?? 0)),
                Outstanding = g.Sum(x => (x.Payment ?? 0) - ((x.Recieved ?? 0) + (x.Discount ?? 0)))
            })
            .Where(x => x.Received > 0 && x.Outstanding >= min)
            .OrderByDescending(x => x.Outstanding)
            .ToListAsync();

        var rows = data
            .Where(x => MatchClass(x.ClassName, className))
            .Select(x => Row(
                ("studentId", x.StudentId),
                ("studentName", x.StudentName ?? "N/A"),
                ("className", x.ClassName),
                ("charged", x.Charged),
                ("received", x.Received),
                ("outstandingAmount", x.Outstanding),
                ("paidPercent", x.Charged > 0 ? Math.Round(x.Received / x.Charged * 100m, 1) : 0)))
            .ToList();

        return Result(cat, rows, Cols(
            ("studentId", "Reg #", "number"),
            ("studentName", "Student", "text"),
            ("className", "Class", "text"),
            ("charged", "Charged", "money"),
            ("received", "Received", "money"),
            ("outstandingAmount", "Outstanding", "money"),
            ("paidPercent", "Paid %", "percent")), "className", rows.Sum(r => Dec(r, "outstandingAmount")));
    }

    private async Task<SmartFeeReportResultDto> FamilyReceivableAsync(SmartFeeReportCatalogItemDto cat, Dictionary<string, object?> p)
    {
        var min = GetDecimal(p, "minOutstanding") ?? 1;
        var className = GetString(p, "className");

        var studentBalances = await ActiveStudentLedger()
            .GroupBy(x => new
            {
                StudentId = x.StudentID ?? 0,
                StudentName = x.Student!.FullName,
                FamilyCode = x.Student.Family_Code,
                FatherName = x.Student.Family != null ? x.Student.Family.FatherName : null,
                FatherMobile = x.Student.Family != null ? x.Student.Family.FatherMobileNo : null,
                ClassName = x.Student.Section != null ? x.Student.Section.ClassName : null
            })
            .Select(g => new
            {
                g.Key.StudentId,
                g.Key.StudentName,
                g.Key.FamilyCode,
                g.Key.FatherName,
                g.Key.FatherMobile,
                g.Key.ClassName,
                Outstanding = g.Sum(x => (x.Payment ?? 0) - ((x.Recieved ?? 0) + (x.Discount ?? 0)))
            })
            .Where(x => x.Outstanding > 0 && x.FamilyCode != null)
            .ToListAsync();

        if (!string.IsNullOrWhiteSpace(className))
        {
            studentBalances = studentBalances.Where(x => MatchClass(x.ClassName, className)).ToList();
        }

        var families = studentBalances
            .GroupBy(x => x.FamilyCode!.Value)
            .Select(g => new
            {
                FamilyCode = g.Key,
                StudentCount = g.Count(),
                Outstanding = g.Sum(x => x.Outstanding),
                FatherName = g.Select(s => s.FatherName).FirstOrDefault(n => !string.IsNullOrWhiteSpace(n)),
                FatherMobile = g.Select(s => s.FatherMobile).FirstOrDefault(n => !string.IsNullOrWhiteSpace(n)),
                Students = string.Join(", ", g.Select(s => s.StudentName).Distinct().Take(6)),
                Classes = string.Join(", ", g.Select(s => s.ClassName ?? "?").Distinct().Take(4))
            })
            .Where(x => x.Outstanding >= min)
            .OrderByDescending(x => x.Outstanding)
            .ToList();

        var rows = families.Select(x => Row(
            ("familyCode", x.FamilyCode),
            ("studentCount", x.StudentCount),
            ("students", x.Students),
            ("fatherName", string.IsNullOrWhiteSpace(x.FatherName) ? "-" : x.FatherName.Trim()),
            ("fatherMobile", string.IsNullOrWhiteSpace(x.FatherMobile) ? "-" : x.FatherMobile.Trim()),
            ("classes", x.Classes),
            ("outstandingAmount", x.Outstanding))).ToList();

        return Result(cat, rows, Cols(
            ("familyCode", "Family code", "number"),
            ("studentCount", "Children", "number"),
            ("students", "Students", "text"),
            ("fatherName", "Father name", "text"),
            ("fatherMobile", "Father contact", "text"),
            ("classes", "Classes", "text"),
            ("outstandingAmount", "Family due", "money")), null, rows.Sum(r => Dec(r, "outstandingAmount")));
    }

    private async Task<SmartFeeReportResultDto> InactiveWithDuesAsync(SmartFeeReportCatalogItemDto cat, Dictionary<string, object?> p)
    {
        var min = GetDecimal(p, "minOutstanding") ?? 1;
        var data = await InactiveStudentLedger()
            .GroupBy(x => new
            {
                StudentId = x.StudentID ?? 0,
                StudentName = x.Student!.FullName,
                ClassName = x.Student.Section != null ? x.Student.Section.ClassName : null
            })
            .Select(g => new
            {
                g.Key.StudentId,
                g.Key.StudentName,
                g.Key.ClassName,
                Outstanding = g.Sum(x => (x.Payment ?? 0) - ((x.Recieved ?? 0) + (x.Discount ?? 0)))
            })
            .Where(x => x.Outstanding >= min)
            .OrderByDescending(x => x.Outstanding)
            .ToListAsync();

        var rows = data.Select(x => Row(
            ("studentId", x.StudentId),
            ("studentName", x.StudentName ?? "N/A"),
            ("className", x.ClassName),
            ("outstandingAmount", x.Outstanding))).ToList();

        return Result(cat, rows, Cols(
            ("studentId", "Reg #", "number"),
            ("studentName", "Student", "text"),
            ("className", "Class", "text"),
            ("outstandingAmount", "Outstanding", "money")), "className", rows.Sum(r => Dec(r, "outstandingAmount")));
    }

    private async Task<SmartFeeReportResultDto> DuesAboveThresholdAsync(SmartFeeReportCatalogItemDto cat, Dictionary<string, object?> p)
    {
        p["topN"] = 500;
        return await TopDefaultersAsync(cat, p);
    }

    // ——— Handlers: Cash ———

    private async Task<SmartFeeReportResultDto> CollectionByDateAsync(SmartFeeReportCatalogItemDto cat, Dictionary<string, object?> p)
    {
        var date = RequireDate(p, "date");
        var data = await _feeReports.GetFeeCollectionOnDateAsync(date);
        var rows = data.Items.Select(x => CollectionRow(x)).ToList();
        return Result(cat, rows, CollectionColumns(), null, data.TotalAmount);
    }

    private async Task<SmartFeeReportResultDto> CollectionByIntervalAsync(SmartFeeReportCatalogItemDto cat, Dictionary<string, object?> p)
    {
        var (from, to) = RequireDateRange(p);
        var data = await _feeReports.GetFeeCollectionInIntervalAsync(from, to);
        var rows = data.Items.Select(x => CollectionRow(x)).ToList();
        return Result(cat, rows, CollectionColumns(), "transactionDate", data.TotalAmount);
    }

    private static Dictionary<string, object?> CollectionRow(FeeTransactionReportItemDto x)
    {
        string? monthName = null;
        string? yearText = null;

        if (x.Year is int year and > 0)
        {
            yearText = year.ToString(Invariant);
        }

        if (x.Month is int month and >= 1 and <= 12)
        {
            monthName = new DateTime(2000, month, 1).ToString("MMMM", Invariant);
        }

        return Row(
            ("rcptId", x.RcptId),
            ("manualRcptNo", x.ManualRcptNo),
            ("transactionId", x.TransactionId),
            ("transactionDate", x.TransactionDate.ToString("yyyy-MM-dd")),
            ("studentId", x.StudentId),
            ("studentName", x.StudentName),
            ("className", x.ClassName),
            ("fundTypeId", x.FundTypeId),
            ("fundTypeName", x.FundTypeName),
            ("month", monthName),
            ("year", yearText),
            ("received", x.Received));
    }

    private static List<SmartFeeReportColumnDto> CollectionColumns() => Cols(
        ("rcptId", "Rcpt ID", "number"),
        ("manualRcptNo", "Manual Rcpt#", "text"),
        ("transactionId", "Trx ID", "number"),
        ("studentId", "Std ID", "number"),
        ("studentName", "Name", "text"),
        ("className", "Class/Section", "text"),
        ("fundTypeName", "Type", "text"),
        ("month", "Month", "text"),
        ("year", "Year", "text"),
        ("received", "Amount", "money"));

    private async Task<SmartFeeReportResultDto> CollectionByFundAsync(SmartFeeReportCatalogItemDto cat, Dictionary<string, object?> p)
    {
        var (from, to) = RequireDateRange(p);
        var data = await ReceiptsInRange(from, to)
            .GroupBy(x => new
            {
                FundTypeId = x.FundTypeID ?? 0,
                FundTypeName = x.FundType != null ? x.FundType.FundTypeName : null
            })
            .Select(g => new
            {
                g.Key.FundTypeId,
                g.Key.FundTypeName,
                Amount = g.Sum(x => x.Recieved ?? 0),
                ReceiptLines = g.Count()
            })
            .OrderByDescending(x => x.Amount)
            .ToListAsync();

        var rows = data.Select(x => Row(
            ("fundTypeId", x.FundTypeId),
            ("fundTypeName", x.FundTypeName ?? $"Fund {x.FundTypeId}"),
            ("receiptLines", x.ReceiptLines),
            ("received", x.Amount))).ToList();

        var result = Result(cat, rows, Cols(
            ("fundTypeName", "Fund", "text"),
            ("receiptLines", "Lines", "number"),
            ("received", "Received", "money")), null, rows.Sum(r => Dec(r, "received")));
        result.Chart = new SmartFeeReportChartDto
        {
            Type = "bar",
            Labels = rows.Select(r => Str(r, "fundTypeName")).ToList(),
            Series = [new() { Name = "Received", Data = rows.Select(r => Dec(r, "received")).ToList() }]
        };
        return result;
    }

    private async Task<SmartFeeReportResultDto> CollectionByClassAsync(SmartFeeReportCatalogItemDto cat, Dictionary<string, object?> p)
    {
        var (from, to) = RequireDateRange(p);
        var scope = GetFundScope(p);
        var data = await ApplyFundScope(ReceiptsInRange(from, to), scope)
            .GroupBy(x => x.Student!.Section != null ? x.Student.Section.ClassName : "Unassigned")
            .Select(g => new
            {
                ClassName = g.Key,
                Amount = g.Sum(x => x.Recieved ?? 0),
                Students = g.Select(x => x.StudentID).Distinct().Count()
            })
            .OrderByDescending(x => x.Amount)
            .ToListAsync();

        var rows = data.Select(x => Row(
            ("className", x.ClassName),
            ("students", x.Students),
            ("received", x.Amount))).ToList();

        var result = Result(cat, rows, Cols(
            ("className", "Class", "text"),
            ("students", "Paying students", "number"),
            ("received", "Received", "money")), null, rows.Sum(r => Dec(r, "received")));
        result.Chart = new SmartFeeReportChartDto
        {
            Type = "bar",
            Labels = rows.Take(20).Select(r => Str(r, "className")).ToList(),
            Series = [new() { Name = "Received", Data = rows.Take(20).Select(r => Dec(r, "received")).ToList() }]
        };
        return result;
    }

    private async Task<SmartFeeReportResultDto> CollectionTrendAsync(SmartFeeReportCatalogItemDto cat, Dictionary<string, object?> p)
    {
        var (from, to) = RequireDateRange(p);
        var grain = (GetString(p, "grain") ?? "day").ToLowerInvariant();

        var raw = await ReceiptsInRange(from, to)
            .Select(x => new { Date = x.Date!.Value.Date, Amount = x.Recieved ?? 0 })
            .ToListAsync();

        List<(string Label, decimal Amount)> series;
        if (grain == "month")
        {
            series = raw
                .GroupBy(x => new DateTime(x.Date.Year, x.Date.Month, 1))
                .OrderBy(g => g.Key)
                .Select(g => (g.Key.ToString("MMM yyyy", Invariant), g.Sum(x => x.Amount)))
                .ToList();
        }
        else
        {
            series = raw
                .GroupBy(x => x.Date)
                .OrderBy(g => g.Key)
                .Select(g => (g.Key.ToString("yyyy-MM-dd"), g.Sum(x => x.Amount)))
                .ToList();
        }

        var rows = series.Select(x => Row(("period", x.Label), ("received", x.Amount))).ToList();
        var result = Result(cat, rows, Cols(
            ("period", "Period", "text"),
            ("received", "Received", "money")), null, rows.Sum(r => Dec(r, "received")));
        result.Chart = new SmartFeeReportChartDto
        {
            Type = "line",
            Labels = series.Select(x => x.Label).ToList(),
            Series = [new() { Name = "Received", Data = series.Select(x => x.Amount).ToList() }]
        };
        return result;
    }

    private async Task<SmartFeeReportResultDto> CollectionMomCompareAsync(SmartFeeReportCatalogItemDto cat, Dictionary<string, object?> p)
    {
        var month = RequireMonth(p);
        var year = RequireYear(p);
        var thisStart = new DateTime(year, month, 1);
        var thisEnd = thisStart.AddMonths(1).AddDays(-1);
        var prevStart = thisStart.AddMonths(-1);
        var prevEnd = thisStart.AddDays(-1);

        var thisAmt = await ReceiptsInRange(thisStart, thisEnd).SumAsync(x => x.Recieved ?? 0);
        var prevAmt = await ReceiptsInRange(prevStart, prevEnd).SumAsync(x => x.Recieved ?? 0);
        var delta = thisAmt - prevAmt;
        var pct = prevAmt > 0 ? Math.Round(delta / prevAmt * 100m, 1) : (thisAmt > 0 ? 100m : 0m);

        var rows = new List<Dictionary<string, object?>>
        {
            Row(("period", thisStart.ToString("MMMM yyyy", Invariant)), ("received", thisAmt), ("role", "Current")),
            Row(("period", prevStart.ToString("MMMM yyyy", Invariant)), ("received", prevAmt), ("role", "Previous")),
            Row(("period", "Change"), ("received", delta), ("role", "Delta"))
        };

        var result = Result(cat, rows, Cols(
            ("role", "Role", "text"),
            ("period", "Period", "text"),
            ("received", "Amount", "money")), null, thisAmt,
            Extra(("delta", "Change", delta.ToString("0", Invariant), "money"),
                ("changePercent", "Change %", pct.ToString("0.0", Invariant), "percent")));
        result.Chart = new SmartFeeReportChartDto
        {
            Type = "bar",
            Labels = [prevStart.ToString("MMM yyyy", Invariant), thisStart.ToString("MMM yyyy", Invariant)],
            Series = [new() { Name = "Collection", Data = [prevAmt, thisAmt] }]
        };
        return result;
    }

    private async Task<SmartFeeReportResultDto> LargestReceiptsAsync(SmartFeeReportCatalogItemDto cat, Dictionary<string, object?> p)
    {
        var (from, to) = RequireDateRange(p);
        var topN = ClampTopN(GetInt(p, "topN") ?? 25);

        var data = await ReceiptsInRange(from, to)
            .GroupBy(x => new
            {
                x.TransactionID,
                x.RcptID,
                StudentId = x.StudentID ?? 0,
                StudentName = x.Student!.FullName,
                ClassName = x.Student.Section != null ? x.Student.Section.ClassName : null,
                Date = x.Date!.Value.Date
            })
            .Select(g => new
            {
                g.Key.TransactionID,
                g.Key.RcptID,
                g.Key.StudentId,
                g.Key.StudentName,
                g.Key.ClassName,
                g.Key.Date,
                Amount = g.Sum(x => x.Recieved ?? 0)
            })
            .OrderByDescending(x => x.Amount)
            .Take(topN)
            .ToListAsync();

        var rows = data.Select(x => Row(
            ("transactionId", x.TransactionID),
            ("rcptId", x.RcptID),
            ("transactionDate", x.Date.ToString("yyyy-MM-dd")),
            ("studentId", x.StudentId),
            ("studentName", x.StudentName ?? "N/A"),
            ("className", x.ClassName),
            ("received", x.Amount))).ToList();

        return Result(cat, rows, Cols(
            ("transactionDate", "Date", "date"),
            ("rcptId", "Rcpt #", "number"),
            ("studentId", "Reg #", "number"),
            ("studentName", "Student", "text"),
            ("className", "Class", "text"),
            ("received", "Received", "money")), null, rows.Sum(r => Dec(r, "received")));
    }

    private async Task<SmartFeeReportResultDto> CollectorPerformanceAsync(SmartFeeReportCatalogItemDto cat, Dictionary<string, object?> p)
    {
        var (from, to) = RequireDateRange(p);
        var data = await ReceiptsInRange(from, to)
            .GroupBy(x => string.IsNullOrWhiteSpace(x.ReceivedBy) ? "Unassigned" : x.ReceivedBy!.Trim())
            .Select(g => new
            {
                Collector = g.Key,
                Amount = g.Sum(x => x.Recieved ?? 0),
                Lines = g.Count(),
                Receipts = g.Select(x => x.RcptID).Distinct().Count()
            })
            .OrderByDescending(x => x.Amount)
            .ToListAsync();

        var rows = data.Select(x => Row(
            ("collector", x.Collector),
            ("receipts", x.Receipts),
            ("lines", x.Lines),
            ("received", x.Amount))).ToList();

        var result = Result(cat, rows, Cols(
            ("collector", "Received by", "text"),
            ("receipts", "Receipts", "number"),
            ("lines", "Lines", "number"),
            ("received", "Received", "money")), null, rows.Sum(r => Dec(r, "received")));
        result.Chart = new SmartFeeReportChartDto
        {
            Type = "bar",
            Labels = rows.Select(r => Str(r, "collector")).ToList(),
            Series = [new() { Name = "Received", Data = rows.Select(r => Dec(r, "received")).ToList() }]
        };
        return result;
    }

    private async Task<SmartFeeReportResultDto> DiscountGivenAsync(SmartFeeReportCatalogItemDto cat, Dictionary<string, object?> p)
    {
        var (from, to) = RequireDateRange(p);
        var className = GetString(p, "className");
        var data = await ActiveStudentLedger()
            .Where(x => x.Date.HasValue && x.Date.Value.Date >= from && x.Date.Value.Date <= to && (x.Discount ?? 0) > 0)
            .Select(x => new
            {
                StudentId = x.StudentID ?? 0,
                StudentName = x.Student!.FullName,
                ClassName = x.Student.Section != null ? x.Student.Section.ClassName : null,
                Date = x.Date!.Value.Date,
                FundTypeName = x.FundType != null ? x.FundType.FundTypeName : null,
                Discount = x.Discount ?? 0
            })
            .OrderByDescending(x => x.Discount)
            .ToListAsync();

        var rows = data
            .Where(x => MatchClass(x.ClassName, className))
            .Select(x => Row(
                ("transactionDate", x.Date.ToString("yyyy-MM-dd")),
                ("studentId", x.StudentId),
                ("studentName", x.StudentName ?? "N/A"),
                ("className", x.ClassName),
                ("fundTypeName", x.FundTypeName ?? "N/A"),
                ("discount", x.Discount)))
            .ToList();

        return Result(cat, rows, Cols(
            ("transactionDate", "Date", "date"),
            ("studentId", "Reg #", "number"),
            ("studentName", "Student", "text"),
            ("className", "Class", "text"),
            ("fundTypeName", "Fund", "text"),
            ("discount", "Discount", "money")), "className", rows.Sum(r => Dec(r, "discount")));
    }

    private async Task<SmartFeeReportResultDto> VoidsAdjustmentsAsync(SmartFeeReportCatalogItemDto cat, Dictionary<string, object?> p)
    {
        var (from, to) = RequireDateRange(p);
        var data = await _context.FeeAndFundCollections
            .Where(x =>
                x.VoidDate.HasValue &&
                x.VoidDate.Value.Date >= from &&
                x.VoidDate.Value.Date <= to &&
                (x.VoidAmount ?? 0) > 0)
            .Select(x => new
            {
                StudentId = x.StudentID ?? 0,
                StudentName = x.Student != null ? x.Student.FullName : null,
                ClassName = x.Student != null && x.Student.Section != null ? x.Student.Section.ClassName : null,
                VoidDate = x.VoidDate!.Value.Date,
                VoidBy = x.VoidBy,
                VoidAmount = x.VoidAmount ?? 0
            })
            .OrderByDescending(x => x.VoidAmount)
            .ToListAsync();

        var rows = data.Select(x => Row(
            ("voidDate", x.VoidDate.ToString("yyyy-MM-dd")),
            ("studentId", x.StudentId),
            ("studentName", x.StudentName ?? "N/A"),
            ("className", x.ClassName),
            ("voidBy", x.VoidBy ?? "N/A"),
            ("voidAmount", x.VoidAmount))).ToList();

        return Result(cat, rows, Cols(
            ("voidDate", "Void date", "date"),
            ("studentId", "Reg #", "number"),
            ("studentName", "Student", "text"),
            ("className", "Class", "text"),
            ("voidBy", "Void by", "text"),
            ("voidAmount", "Void amount", "money")), null, rows.Sum(r => Dec(r, "voidAmount")));
    }

    private async Task<SmartFeeReportResultDto> ZeroCollectionDaysAsync(SmartFeeReportCatalogItemDto cat, Dictionary<string, object?> p)
    {
        var (from, to) = RequireDateRange(p);
        var daysWithCash = await ReceiptsInRange(from, to)
            .Select(x => x.Date!.Value.Date)
            .Distinct()
            .ToListAsync();
        var set = daysWithCash.ToHashSet();
        var zeros = new List<Dictionary<string, object?>>();
        for (var d = from; d <= to; d = d.AddDays(1))
        {
            if (d.DayOfWeek is DayOfWeek.Saturday or DayOfWeek.Sunday) continue;
            if (!set.Contains(d))
            {
                zeros.Add(Row(("date", d.ToString("yyyy-MM-dd")), ("weekday", d.ToString("dddd", Invariant)), ("received", 0m)));
            }
        }

        return Result(cat, zeros, Cols(
            ("date", "Date", "date"),
            ("weekday", "Weekday", "text"),
            ("received", "Received", "money")), null, 0,
            Extra(("zeroDays", "Zero days", zeros.Count.ToString(Invariant), "number")));
    }

    // ——— Handlers: Portfolio ———

    private async Task<SmartFeeReportResultDto> ClassWiseReceivableAsync(SmartFeeReportCatalogItemDto cat, Dictionary<string, object?> p)
    {
        var scope = GetFundScope(p);
        var month = GetInt(p, "month");
        var year = GetInt(p, "year");

        var q = ApplyFundScope(ActiveStudentLedger(), scope);
        if (scope == "tuition" && month.HasValue && year.HasValue)
        {
            q = q.Where(x => x.Month == month && x.Year == year);
        }

        var data = await q
            .GroupBy(x => x.Student!.Section != null ? x.Student.Section.ClassName : "Unassigned")
            .Select(g => new
            {
                ClassName = g.Key,
                Students = g.Select(x => x.StudentID).Distinct().Count(),
                Charged = g.Sum(x => x.Payment ?? 0),
                Received = g.Sum(x => (x.Recieved ?? 0) + (x.Discount ?? 0)),
                Outstanding = g.Sum(x => (x.Payment ?? 0) - ((x.Recieved ?? 0) + (x.Discount ?? 0)))
            })
            .Where(x => x.Outstanding > 0)
            .OrderByDescending(x => x.Outstanding)
            .ToListAsync();

        var rows = data.Select(x => Row(
            ("className", x.ClassName),
            ("students", x.Students),
            ("charged", x.Charged),
            ("received", x.Received),
            ("outstandingAmount", x.Outstanding))).ToList();

        var result = Result(cat, rows, Cols(
            ("className", "Class", "text"),
            ("students", "Students w/ ledger", "number"),
            ("charged", "Charged", "money"),
            ("received", "Received", "money"),
            ("outstandingAmount", "Outstanding", "money")), null, rows.Sum(r => Dec(r, "outstandingAmount")));
        result.Chart = new SmartFeeReportChartDto
        {
            Type = "bar",
            Labels = rows.Take(20).Select(r => Str(r, "className")).ToList(),
            Series = [new() { Name = "Outstanding", Data = rows.Take(20).Select(r => Dec(r, "outstandingAmount")).ToList() }]
        };
        return result;
    }

    private async Task<SmartFeeReportResultDto> RecoveryRateAsync(SmartFeeReportCatalogItemDto cat, Dictionary<string, object?> p)
    {
        var scope = GetFundScope(p);
        var data = await ApplyFundScope(ActiveStudentLedger(), scope)
            .GroupBy(x => x.Student!.Section != null ? x.Student.Section.ClassName : "Unassigned")
            .Select(g => new
            {
                ClassName = g.Key,
                Charged = g.Sum(x => x.Payment ?? 0),
                Received = g.Sum(x => (x.Recieved ?? 0) + (x.Discount ?? 0)),
                Outstanding = g.Sum(x => (x.Payment ?? 0) - ((x.Recieved ?? 0) + (x.Discount ?? 0)))
            })
            .Where(x => x.Charged > 0)
            .OrderBy(x => x.ClassName)
            .ToListAsync();

        var rows = data.Select(x => Row(
            ("className", x.ClassName),
            ("charged", x.Charged),
            ("received", x.Received),
            ("outstandingAmount", x.Outstanding),
            ("recoveryPercent", x.Charged > 0 ? Math.Round(x.Received / x.Charged * 100m, 1) : 0))).ToList();

        var campusCharged = data.Sum(x => x.Charged);
        var campusReceived = data.Sum(x => x.Received);
        var campusPct = campusCharged > 0 ? Math.Round(campusReceived / campusCharged * 100m, 1) : 0;

        return Result(cat, rows, Cols(
            ("className", "Class", "text"),
            ("charged", "Charged", "money"),
            ("received", "Received", "money"),
            ("outstandingAmount", "Outstanding", "money"),
            ("recoveryPercent", "Recovery %", "percent")), null, data.Sum(x => x.Outstanding),
            Extra(("campusRecovery", "Campus recovery %", campusPct.ToString("0.0", Invariant), "percent")));
    }

    private async Task<SmartFeeReportResultDto> TuitionMonthMatrixAsync(SmartFeeReportCatalogItemDto cat, Dictionary<string, object?> p)
    {
        var year = RequireYear(p);
        var className = GetString(p, "className");

        var data = await ActiveStudentLedger()
            .Where(x => x.FundTypeID == 1 && x.Year == year && x.Month != null)
            .GroupBy(x => new
            {
                Month = x.Month!.Value,
                ClassName = x.Student!.Section != null ? x.Student.Section.ClassName : "Unassigned"
            })
            .Select(g => new
            {
                g.Key.Month,
                g.Key.ClassName,
                Outstanding = g.Sum(x => (x.Payment ?? 0) - ((x.Recieved ?? 0) + (x.Discount ?? 0)))
            })
            .ToListAsync();

        if (!string.IsNullOrWhiteSpace(className))
            data = data.Where(x => MatchClass(x.ClassName, className)).ToList();

        var byMonth = data
            .GroupBy(x => x.Month)
            .OrderBy(g => g.Key)
            .Select(g => new
            {
                Month = g.Key,
                Label = new DateTime(year, g.Key, 1).ToString("MMMM", Invariant),
                Outstanding = g.Sum(x => x.Outstanding > 0 ? x.Outstanding : 0)
            })
            .ToList();

        var rows = byMonth.Select(x => Row(
            ("month", x.Month),
            ("monthLabel", x.Label),
            ("outstandingAmount", x.Outstanding))).ToList();

        var result = Result(cat, rows, Cols(
            ("monthLabel", "Month", "text"),
            ("outstandingAmount", "Outstanding", "money")), null, rows.Sum(r => Dec(r, "outstandingAmount")));
        result.Chart = new SmartFeeReportChartDto
        {
            Type = "bar",
            Labels = byMonth.Select(x => x.Label).ToList(),
            Series = [new() { Name = "Outstanding", Data = byMonth.Select(x => x.Outstanding).ToList() }]
        };
        return result;
    }

    private async Task<SmartFeeReportResultDto> ExpectedIncomeAsync(SmartFeeReportCatalogItemDto cat, Dictionary<string, object?> p)
    {
        var data = await _feeReports.GetExpectedIncomeReportAsync();
        var result = Result(cat, [], Cols(), null, data.NetTotal);
        result.Layout = "expected-income";
        result.LayoutPayload = data;
        result.ExtraKpis =
        [
            new() { Key = "tuitionTotal", Label = "Tuition expected", Value = data.TuitionTotal.ToString("0", Invariant), Format = "money" },
            new() { Key = "fundsTotal", Label = "Funds expected", Value = data.FundsTotal.ToString("0", Invariant), Format = "money" },
            new() { Key = "activeStudents", Label = "Active students", Value = data.ActiveStudentCount.ToString(Invariant), Format = "number" },
            new() { Key = "session", Label = "Session", Value = data.SessionLabel, Format = "text" }
        ];
        return result;
    }

    private async Task<SmartFeeReportResultDto> ConcessionImpactAsync(SmartFeeReportCatalogItemDto cat, Dictionary<string, object?> p)
    {
        var className = GetString(p, "className");
        var minConcession = GetDecimal(p, "minConcession") ?? 1;

        var students = await _context.Students
            .Where(x => x.IsActive == true && (x.FeeConcession ?? 0) >= minConcession)
            .Select(x => new
            {
                x.Reg_Id,
                x.FullName,
                ClassName = x.Section != null ? x.Section.ClassName : null,
                Concession = x.FeeConcession ?? 0,
                RosterFee = x.TutionFee ?? 0
            })
            .ToListAsync();

        if (!string.IsNullOrWhiteSpace(className))
            students = students.Where(x => MatchClass(x.ClassName, className)).ToList();

        var ids = students.Select(x => x.Reg_Id).ToList();
        var ledger = await ActiveStudentLedger()
            .Where(x => x.StudentID != null && ids.Contains(x.StudentID.Value))
            .GroupBy(x => x.StudentID!.Value)
            .Select(g => new
            {
                StudentId = g.Key,
                Charged = g.Sum(x => x.Payment ?? 0),
                Received = g.Sum(x => (x.Recieved ?? 0) + (x.Discount ?? 0)),
                Outstanding = g.Sum(x => (x.Payment ?? 0) - ((x.Recieved ?? 0) + (x.Discount ?? 0)))
            })
            .ToDictionaryAsync(x => x.StudentId);

        var rows = students.Select(s =>
        {
            ledger.TryGetValue(s.Reg_Id, out var L);
            return Row(
                ("studentId", s.Reg_Id),
                ("studentName", s.FullName ?? "N/A"),
                ("className", s.ClassName),
                ("rosterFee", s.RosterFee),
                ("concession", s.Concession),
                ("charged", L?.Charged ?? 0),
                ("received", L?.Received ?? 0),
                ("outstandingAmount", L?.Outstanding ?? 0));
        }).OrderByDescending(r => Dec(r, "concession")).ToList();

        return Result(cat, rows, Cols(
            ("studentId", "Reg #", "number"),
            ("studentName", "Student", "text"),
            ("className", "Class", "text"),
            ("rosterFee", "Roster fee", "money"),
            ("concession", "Concession", "money"),
            ("charged", "Charged", "money"),
            ("received", "Received", "money"),
            ("outstandingAmount", "Outstanding", "money")), "className", rows.Sum(r => Dec(r, "outstandingAmount")));
    }

    private async Task<SmartFeeReportResultDto> SessionFeeSnapshotAsync(SmartFeeReportCatalogItemDto cat, Dictionary<string, object?> p)
    {
        var className = GetString(p, "className");
        var students = await _context.Students
            .Where(x => x.IsActive == true)
            .Select(x => new
            {
                x.Reg_Id,
                x.FullName,
                ClassName = x.Section != null ? x.Section.ClassName : null,
                RosterFee = x.TutionFee ?? 0
            })
            .ToListAsync();

        if (!string.IsNullOrWhiteSpace(className))
            students = students.Where(x => MatchClass(x.ClassName, className)).ToList();

        var ledger = await ActiveStudentLedger()
            .GroupBy(x => x.StudentID ?? 0)
            .Select(g => new
            {
                StudentId = g.Key,
                Charged = g.Sum(x => x.Payment ?? 0),
                Received = g.Sum(x => (x.Recieved ?? 0) + (x.Discount ?? 0)),
                Outstanding = g.Sum(x => (x.Payment ?? 0) - ((x.Recieved ?? 0) + (x.Discount ?? 0)))
            })
            .ToDictionaryAsync(x => x.StudentId);

        var rows = students.Select(s =>
        {
            ledger.TryGetValue(s.Reg_Id, out var L);
            return Row(
                ("studentId", s.Reg_Id),
                ("studentName", s.FullName ?? "N/A"),
                ("className", s.ClassName),
                ("rosterFee", s.RosterFee),
                ("charged", L?.Charged ?? 0),
                ("received", L?.Received ?? 0),
                ("outstandingAmount", L?.Outstanding ?? 0));
        }).OrderBy(r => Str(r, "className")).ThenBy(r => Str(r, "studentName")).ToList();

        return Result(cat, rows, Cols(
            ("studentId", "Reg #", "number"),
            ("studentName", "Student", "text"),
            ("className", "Class", "text"),
            ("rosterFee", "Roster fee", "money"),
            ("charged", "Charged", "money"),
            ("received", "Received", "money"),
            ("outstandingAmount", "Outstanding", "money")), "className", rows.Sum(r => Dec(r, "outstandingAmount")));
    }

    private async Task<SmartFeeReportResultDto> FundMixOutstandingAsync(SmartFeeReportCatalogItemDto cat, Dictionary<string, object?> p)
    {
        var data = await ActiveStudentLedger()
            .GroupBy(x => new
            {
                FundTypeId = x.FundTypeID ?? 0,
                FundTypeName = x.FundType != null ? x.FundType.FundTypeName : null
            })
            .Select(g => new
            {
                g.Key.FundTypeId,
                g.Key.FundTypeName,
                Outstanding = g.Sum(x => (x.Payment ?? 0) - ((x.Recieved ?? 0) + (x.Discount ?? 0)))
            })
            .Where(x => x.Outstanding > 0)
            .OrderByDescending(x => x.Outstanding)
            .ToListAsync();

        var rows = data.Select(x => Row(
            ("fundTypeId", x.FundTypeId),
            ("fundTypeName", x.FundTypeName ?? (x.FundTypeId == 1 ? "Tuition" : $"Fund {x.FundTypeId}")),
            ("outstandingAmount", x.Outstanding))).ToList();

        var result = Result(cat, rows, Cols(
            ("fundTypeName", "Fund", "text"),
            ("outstandingAmount", "Outstanding", "money")), null, rows.Sum(r => Dec(r, "outstandingAmount")));
        result.Chart = new SmartFeeReportChartDto
        {
            Type = "bar",
            Labels = rows.Select(r => Str(r, "fundTypeName")).ToList(),
            Series = [new() { Name = "Outstanding", Data = rows.Select(r => Dec(r, "outstandingAmount")).ToList() }]
        };
        return result;
    }

    private async Task<SmartFeeReportResultDto> StudentsFullyClearedAsync(SmartFeeReportCatalogItemDto cat, Dictionary<string, object?> p)
    {
        var className = GetString(p, "className");
        var withLedger = await ActiveStudentLedger()
            .GroupBy(x => new
            {
                StudentId = x.StudentID ?? 0,
                StudentName = x.Student!.FullName,
                ClassName = x.Student.Section != null ? x.Student.Section.ClassName : null
            })
            .Select(g => new
            {
                g.Key.StudentId,
                g.Key.StudentName,
                g.Key.ClassName,
                Outstanding = g.Sum(x => (x.Payment ?? 0) - ((x.Recieved ?? 0) + (x.Discount ?? 0))),
                Charged = g.Sum(x => x.Payment ?? 0)
            })
            .Where(x => x.Charged > 0 && x.Outstanding <= 0)
            .OrderBy(x => x.ClassName)
            .ThenBy(x => x.StudentName)
            .ToListAsync();

        var rows = withLedger
            .Where(x => MatchClass(x.ClassName, className))
            .Select(x => Row(
                ("studentId", x.StudentId),
                ("studentName", x.StudentName ?? "N/A"),
                ("className", x.ClassName),
                ("charged", x.Charged),
                ("outstandingAmount", 0m)))
            .ToList();

        return Result(cat, rows, Cols(
            ("studentId", "Reg #", "number"),
            ("studentName", "Student", "text"),
            ("className", "Class", "text"),
            ("charged", "Charged", "money"),
            ("outstandingAmount", "Outstanding", "money")), "className", 0,
            Extra(("clearedCount", "Cleared students", rows.Count.ToString(Invariant), "number")));
    }

    private async Task<SmartFeeReportResultDto> NewChargesVsReceiptsAsync(SmartFeeReportCatalogItemDto cat, Dictionary<string, object?> p)
    {
        var (from, to) = RequireDateRange(p);
        var q = ActiveStudentLedger().Where(x => x.Date.HasValue && x.Date.Value.Date >= from && x.Date.Value.Date <= to);
        var charged = await q.SumAsync(x => x.Payment ?? 0);
        var received = await q.SumAsync(x => x.Recieved ?? 0);
        var discount = await q.SumAsync(x => x.Discount ?? 0);

        var byDay = await q
            .GroupBy(x => x.Date!.Value.Date)
            .Select(g => new
            {
                Date = g.Key,
                Charged = g.Sum(x => x.Payment ?? 0),
                Received = g.Sum(x => x.Recieved ?? 0)
            })
            .OrderBy(x => x.Date)
            .ToListAsync();

        var rows = byDay.Select(x => Row(
            ("date", x.Date.ToString("yyyy-MM-dd")),
            ("charged", x.Charged),
            ("received", x.Received),
            ("netPressure", x.Charged - x.Received))).ToList();

        var result = Result(cat, rows, Cols(
            ("date", "Date", "date"),
            ("charged", "Charged", "money"),
            ("received", "Received", "money"),
            ("netPressure", "Charged − received", "money")), null, charged - received,
            Extra(
                ("charged", "Period charged", charged.ToString("0", Invariant), "money"),
                ("received", "Period received", received.ToString("0", Invariant), "money"),
                ("discount", "Period discount", discount.ToString("0", Invariant), "money")));
        result.Chart = new SmartFeeReportChartDto
        {
            Type = "line",
            Labels = byDay.Select(x => x.Date.ToString("yyyy-MM-dd")).ToList(),
            Series =
            [
                new() { Name = "Charged", Data = byDay.Select(x => x.Charged).ToList() },
                new() { Name = "Received", Data = byDay.Select(x => x.Received).ToList() }
            ]
        };
        return result;
    }

    // ——— Query helpers ———

    /// <summary>
    /// Ledger for currently enrolled students only — use for defaulters / receivables / portfolio dues.
    /// Inactive-with-dues uses <see cref="InactiveStudentLedger"/> instead.
    /// Active = IsActive only (matches legacy Receivables).
    /// </summary>
    private IQueryable<FeeAndFundCollection> ActiveStudentLedger() =>
        _context.FeeAndFundCollections.Where(x =>
            x.Student != null &&
            x.Student.IsActive == true);

    /// <summary>Ledger for inactive students (recovery / write-off report only).</summary>
    private IQueryable<FeeAndFundCollection> InactiveStudentLedger() =>
        _context.FeeAndFundCollections.Where(x =>
            x.Student != null &&
            x.Student.IsActive != true);

    /// <summary>Receipt lines in a date range (any student with a payment row — historical cash).</summary>
    private IQueryable<FeeAndFundCollection> ReceiptsInRange(DateTime from, DateTime to) =>
        _context.FeeAndFundCollections.Where(x =>
            x.Student != null &&
            x.Date.HasValue &&
            x.Date.Value.Date >= from.Date &&
            x.Date.Value.Date <= to.Date &&
            (x.Recieved ?? 0) > 0);

    private static IQueryable<FeeAndFundCollection> ApplyFundScope(IQueryable<FeeAndFundCollection> q, string scope) =>
        scope switch
        {
            "tuition" => q.Where(x => x.FundTypeID == 1),
            "funds" => q.Where(x => (x.FundTypeID ?? 0) > 1),
            _ => q
        };

    private static bool MatchClass(string? className, string? filter) =>
        string.IsNullOrWhiteSpace(filter) ||
        string.Equals((className ?? string.Empty).Trim(), filter.Trim(), StringComparison.OrdinalIgnoreCase);

    // ——— Param helpers ———

    private static object? Unwrap(object? value)
    {
        if (value is JsonElement el)
        {
            return el.ValueKind switch
            {
                JsonValueKind.String => el.GetString(),
                JsonValueKind.Number when el.TryGetInt64(out var l) => l,
                JsonValueKind.Number => el.GetDecimal(),
                JsonValueKind.True => true,
                JsonValueKind.False => false,
                JsonValueKind.Null => null,
                _ => el.ToString()
            };
        }
        return value;
    }

    private static string? GetString(Dictionary<string, object?> p, string key)
    {
        if (!p.TryGetValue(key, out var raw) || raw is null) return null;
        var v = Unwrap(raw);
        var s = v?.ToString()?.Trim();
        return string.IsNullOrWhiteSpace(s) ? null : s;
    }

    private static int? GetInt(Dictionary<string, object?> p, string key)
    {
        var s = GetString(p, key);
        if (s is null) return null;
        if (int.TryParse(s, NumberStyles.Integer, Invariant, out var i)) return i;
        if (decimal.TryParse(s, NumberStyles.Number, Invariant, out var d)) return (int)d;
        return null;
    }

    private static decimal? GetDecimal(Dictionary<string, object?> p, string key)
    {
        var s = GetString(p, key);
        if (s is null) return null;
        return decimal.TryParse(s, NumberStyles.Number, Invariant, out var d) ? d : null;
    }

    private static DateTime? GetDate(Dictionary<string, object?> p, string key)
    {
        var s = GetString(p, key);
        if (s is null) return null;
        return DateTime.TryParse(s, Invariant, DateTimeStyles.AssumeLocal, out var d) ? d.Date : null;
    }

    private static int RequireMonth(Dictionary<string, object?> p)
    {
        var m = GetInt(p, "month") ?? throw new ArgumentException("month is required.");
        if (m is < 1 or > 12) throw new ArgumentException("month must be between 1 and 12.");
        return m;
    }

    private static int RequireYear(Dictionary<string, object?> p)
    {
        var y = GetInt(p, "year") ?? throw new ArgumentException("year is required.");
        if (y is < 2000 or > 2100) throw new ArgumentException("year is out of range.");
        return y;
    }

    private static int RequireInt(Dictionary<string, object?> p, string key) =>
        GetInt(p, key) ?? throw new ArgumentException($"{key} is required.");

    private static DateTime RequireDate(Dictionary<string, object?> p, string key) =>
        GetDate(p, key) ?? throw new ArgumentException($"{key} is required.");

    private static (DateTime From, DateTime To) RequireDateRange(Dictionary<string, object?> p)
    {
        var from = RequireDate(p, "dateFrom");
        var to = RequireDate(p, "dateTo");
        if (from > to) throw new ArgumentException("dateFrom cannot be greater than dateTo.");
        if ((to - from).TotalDays > 366) throw new ArgumentException("Date range cannot exceed 366 days.");
        return (from, to);
    }

    private static string GetFundScope(Dictionary<string, object?> p)
    {
        var s = (GetString(p, "fundScope") ?? "all").ToLowerInvariant();
        return s is "tuition" or "funds" or "all" ? s : "all";
    }

    private static int ClampTopN(int n) => Math.Clamp(n, 1, 500);

    // ——— Result helpers ———

    private static Dictionary<string, object?> Row(params (string Key, object? Value)[] cells)
    {
        var d = new Dictionary<string, object?>(StringComparer.OrdinalIgnoreCase);
        foreach (var (key, value) in cells) d[key] = value;
        return d;
    }

    private static List<SmartFeeReportColumnDto> Cols(params (string Key, string Label, string Format)[] cols) =>
        cols.Select(c => new SmartFeeReportColumnDto { Key = c.Key, Label = c.Label, Format = c.Format }).ToList();

    private static SmartFeeReportKpiDto[] Extra(params (string Key, string Label, string Value, string Format)[] kpis) =>
        kpis.Select(k => new SmartFeeReportKpiDto { Key = k.Key, Label = k.Label, Value = k.Value, Format = k.Format }).ToList().ToArray();

    private static SmartFeeReportResultDto Result(
        SmartFeeReportCatalogItemDto cat,
        List<Dictionary<string, object?>> rows,
        List<SmartFeeReportColumnDto> columns,
        string? groupBy,
        decimal totalAmount,
        params SmartFeeReportKpiDto[] extras) => new()
    {
        ReportId = cat.Id,
        Title = cat.Title,
        Category = cat.Category,
        GeneratedAt = PakistanTime.Now,
        TotalRecords = rows.Count,
        TotalAmount = totalAmount,
        Columns = columns,
        Rows = rows,
        GroupByKey = groupBy,
        ExtraKpis = extras.ToList()
    };

    private static decimal Dec(Dictionary<string, object?> row, string key)
    {
        if (!row.TryGetValue(key, out var v) || v is null) return 0;
        return decimal.TryParse(Convert.ToString(v, Invariant), NumberStyles.Number, Invariant, out var d) ? d : 0;
    }

    private static string Str(Dictionary<string, object?> row, string key) =>
        row.TryGetValue(key, out var v) ? Convert.ToString(v, Invariant) ?? string.Empty : string.Empty;
}
