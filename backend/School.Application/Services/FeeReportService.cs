using Microsoft.EntityFrameworkCore;
using School.Application.Common;
using School.Application.DTOs;
using School.Application.Interfaces;
using School.Infrastructure.Data;
using School.Infrastructure.Entities;
using System.Globalization;

namespace School.Application.Services;

public class FeeReportService : IFeeReportService
{
    private readonly AppDbContext _context;
    private readonly ISystemAccountResolver _systemAccounts;

    public FeeReportService(AppDbContext context, ISystemAccountResolver systemAccounts)
    {
        _context = context;
        _systemAccounts = systemAccounts;
    }

    public async Task<FeeReportResponseDto<FeeTransactionReportItemDto>> GetFeeCollectionOnDateAsync(DateTime date)
    {
        var day = date.Date;

        var items = await _context.FeeAndFundCollections
            .Where(x => (x.VoidAmount ?? 0) == 0)
            .Where(x =>
                x.Date.HasValue &&
                x.Date.Value.Date == day &&
                (x.Recieved ?? 0) > 0 &&
                x.Student != null &&
                x.Student.IsActive == true)
            .OrderBy(x => x.RcptID)
            .Select(x => new FeeTransactionReportItemDto
            {
                RcptId = x.RcptID,
                ManualRcptNo = x.ManualRcptNo,
                TransactionId = x.TransactionID,
                StudentId = x.StudentID ?? 0,
                StudentName = x.Student != null ? (x.Student.FullName ?? "N/A") : "N/A",
                ClassName = x.Student != null && x.Student.Section != null ? x.Student.Section.ClassName : null,
                TransactionDate = x.Date ?? day,
                FundTypeId = x.FundTypeID,
                FundTypeName = x.FundType != null ? (x.FundType.FundTypeName ?? "N/A") : "N/A",
                Month = x.Month,
                Year = x.Year,
                Received = x.Recieved ?? 0,
                PaymentMode = x.PaymentMode == "Online" ? "Online" : "Cash"
            })
            .ToListAsync();

        return new FeeReportResponseDto<FeeTransactionReportItemDto>
        {
            TotalRecords = items.Count,
            TotalAmount = items.Sum(x => x.Received),
            Items = items
        };
    }

    public async Task<FeeReportResponseDto<FeeTransactionReportItemDto>> GetFeeCollectionInIntervalAsync(DateTime dateFrom, DateTime dateTo)
    {
        var from = dateFrom.Date;
        var to = dateTo.Date;

        var items = await _context.FeeAndFundCollections
            .Where(x => (x.VoidAmount ?? 0) == 0)
            .Where(x =>
                x.Date.HasValue &&
                x.Date.Value.Date >= from &&
                x.Date.Value.Date <= to &&
                (x.Recieved ?? 0) > 0 &&
                x.Student != null &&
                x.Student.IsActive == true)
            .OrderBy(x => x.Date)
            .ThenBy(x => x.RcptID)
            .Select(x => new FeeTransactionReportItemDto
            {
                RcptId = x.RcptID,
                ManualRcptNo = x.ManualRcptNo,
                TransactionId = x.TransactionID,
                StudentId = x.StudentID ?? 0,
                StudentName = x.Student != null ? (x.Student.FullName ?? "N/A") : "N/A",
                ClassName = x.Student != null && x.Student.Section != null ? x.Student.Section.ClassName : null,
                TransactionDate = x.Date ?? from,
                FundTypeId = x.FundTypeID,
                FundTypeName = x.FundType != null ? (x.FundType.FundTypeName ?? "N/A") : "N/A",
                Month = x.Month,
                Year = x.Year,
                Received = x.Recieved ?? 0,
                PaymentMode = x.PaymentMode == "Online" ? "Online" : "Cash"
            })
            .ToListAsync();

        return new FeeReportResponseDto<FeeTransactionReportItemDto>
        {
            TotalRecords = items.Count,
            TotalAmount = items.Sum(x => x.Received),
            Items = items
        };
    }

    public async Task<FeeReportResponseDto<FeeDefaulterItemDto>> GetFeeDefaultersAsync(int month, int year)
    {
        var rows = await _context.FeeAndFundCollections
            .Where(x => (x.VoidAmount ?? 0) == 0)
            .Where(x =>
                x.FundTypeID == 1 &&
                x.Month == month &&
                x.Year == year &&
                x.Student != null &&
                x.Student.IsActive == true)
            .GroupBy(x => new
            {
                StudentId = x.StudentID ?? 0,
                StudentName = x.Student != null ? x.Student.FullName : null,
                ClassName = x.Student != null && x.Student.Section != null ? x.Student.Section.ClassName : null,
                x.FundTypeID,
                FundTypeName = x.FundType != null ? x.FundType.FundTypeName : null,
                x.Month,
                x.Year
            })
            .Select(g => new FeeDefaulterItemDto
            {
                StudentId = g.Key.StudentId,
                StudentName = g.Key.StudentName ?? "N/A",
                ClassName = g.Key.ClassName,
                FundTypeId = g.Key.FundTypeID,
                FundTypeName = g.Key.FundTypeName ?? "N/A",
                Month = g.Key.Month,
                Year = g.Key.Year,
                OutstandingAmount = g.Sum(x => (x.Payment ?? 0) - ((x.Recieved ?? 0) + (x.Discount ?? 0)))
            })
            .Where(x => x.OutstandingAmount > 0)
            .OrderByDescending(x => x.OutstandingAmount)
            .ThenBy(x => x.StudentName)
            .ToListAsync();

        return new FeeReportResponseDto<FeeDefaulterItemDto>
        {
            TotalRecords = rows.Count,
            TotalAmount = rows.Sum(x => x.OutstandingAmount),
            Items = rows
        };
    }

    public async Task<FeeReportResponseDto<FeeDefaulterItemDto>> GetFundDefaultersAsync(int fundTypeId)
    {
        var rows = await _context.FeeAndFundCollections
            .Where(x => (x.VoidAmount ?? 0) == 0)
            .Where(x =>
                (x.FundTypeID ?? 0) > 1 &&
                x.FundTypeID == fundTypeId &&
                x.Student != null &&
                x.Student.IsActive == true)
            .GroupBy(x => new
            {
                StudentId = x.StudentID ?? 0,
                StudentName = x.Student != null ? x.Student.FullName : null,
                ClassName = x.Student != null && x.Student.Section != null ? x.Student.Section.ClassName : null,
                x.FundTypeID,
                FundTypeName = x.FundType != null ? x.FundType.FundTypeName : null
            })
            .Select(g => new FeeDefaulterItemDto
            {
                StudentId = g.Key.StudentId,
                StudentName = g.Key.StudentName ?? "N/A",
                ClassName = g.Key.ClassName,
                FundTypeId = g.Key.FundTypeID,
                FundTypeName = g.Key.FundTypeName ?? "N/A",
                OutstandingAmount = g.Sum(x => (x.Payment ?? 0) - ((x.Recieved ?? 0) + (x.Discount ?? 0)))
            })
            .Where(x => x.OutstandingAmount > 0)
            .OrderByDescending(x => x.OutstandingAmount)
            .ThenBy(x => x.StudentName)
            .ToListAsync();

        return new FeeReportResponseDto<FeeDefaulterItemDto>
        {
            TotalRecords = rows.Count,
            TotalAmount = rows.Sum(x => x.OutstandingAmount),
            Items = rows
        };
    }

    public async Task<FeeReportResponseDto<ReceivableItemDto>> GetOverallReceivableAsync()
    {
        const int tuitionFundTypeId = 1;
        const int admissionFundTypeId = 2;
        const int miscFundTypeId = 3;
        const int prevFundTypeId = 4;

        // Active = IsActive only (matches legacy Receivables / dashboard).
        var activeStudentsQuery = _context.Students
            .AsNoTracking()
            .Where(x => x.IsActive == true);

        var students = await activeStudentsQuery
            .Select(x => new
            {
                x.Reg_Id,
                x.FullName,
                ClassName = x.Section != null ? x.Section.ClassName : null,
                ActualFee = x.TutionFee ?? 0m
            })
            .ToListAsync();

        var activeStudentIds = activeStudentsQuery.Select(x => x.Reg_Id);

        // Legacy-accurate: SUM(Payment) - SUM(Recieved). Discount is unused.
        var fundBalances = await _context.FeeAndFundCollections
            .Where(x => (x.VoidAmount ?? 0) == 0)
            .AsNoTracking()
            .Where(x =>
                x.StudentID != null &&
                x.FundTypeID != null &&
                activeStudentIds.Contains(x.StudentID.Value))
            .GroupBy(x => new
            {
                StudentId = x.StudentID!.Value,
                FundTypeId = x.FundTypeID!.Value
            })
            .Select(g => new
            {
                g.Key.StudentId,
                g.Key.FundTypeId,
                Generated = g.Sum(x => x.Payment ?? 0),
                Received = g.Sum(x => x.Recieved ?? 0),
                Outstanding = g.Sum(x => (x.Payment ?? 0) - (x.Recieved ?? 0))
            })
            .ToListAsync();

        var byStudent = fundBalances
            .GroupBy(x => x.StudentId)
            .ToDictionary(g => g.Key, g => g.ToList());

        // Campus-wide net for all active students (includes credits) — matches legacy overall.
        var totalAmount = fundBalances.Sum(x => x.Outstanding);
        var totalByFund = fundBalances
            .GroupBy(x => x.FundTypeId)
            .ToDictionary(g => g.Key, g => g.Sum(x => x.Outstanding));

        static decimal FundTotal(Dictionary<int, decimal> map, int fundTypeId) =>
            map.TryGetValue(fundTypeId, out var value) ? value : 0m;

        static decimal Pos(decimal value) => value > 0 ? value : 0;

        var rows = new List<ReceivableItemDto>();
        foreach (var student in students)
        {
            byStudent.TryGetValue(student.Reg_Id, out var funds);
            funds ??= [];

            // Per-fund net (Payment − Recieved); no floor — matches legacy FundsBalance_ByType.
            decimal PickOutstanding(int fundTypeId)
            {
                var row = funds.FirstOrDefault(x => x.FundTypeId == fundTypeId);
                return row?.Outstanding ?? 0;
            }

            var totalGenerated = funds.Sum(x => x.Generated);
            var totalReceived = funds.Sum(x => x.Received);
            var net = totalGenerated - totalReceived;
            var outstanding = Pos(net);

            if (outstanding <= 0)
                continue;

            rows.Add(new ReceivableItemDto
            {
                StudentId = student.Reg_Id,
                StudentName = student.FullName ?? "N/A",
                ClassName = student.ClassName,
                ActualFee = student.ActualFee,
                PrevBalance = PickOutstanding(prevFundTypeId),
                AdmissionFee = PickOutstanding(admissionFundTypeId),
                MiscCharges = PickOutstanding(miscFundTypeId),
                TuitionOutstanding = PickOutstanding(tuitionFundTypeId),
                TotalGenerated = totalGenerated,
                TotalReceived = totalReceived,
                OutstandingAmount = outstanding
            });
        }

        rows = rows
            .OrderByDescending(x => x.OutstandingAmount)
            .ThenBy(x => x.StudentName)
            .ToList();

        return new FeeReportResponseDto<ReceivableItemDto>
        {
            TotalRecords = rows.Count,
            TotalAmount = totalAmount,
            TotalPrevBalance = FundTotal(totalByFund, prevFundTypeId),
            TotalAdmissionFee = FundTotal(totalByFund, admissionFundTypeId),
            TotalMiscCharges = FundTotal(totalByFund, miscFundTypeId),
            TotalTuitionOutstanding = FundTotal(totalByFund, tuitionFundTypeId),
            Items = rows
        };
    }

    public async Task<List<FundTypeOptionDto>> GetFundTypesAsync()
    {
        return await _context.FundTypes
            .Where(x => x.ID > 1)
            .OrderBy(x => x.FundTypeName)
            .Select(x => new FundTypeOptionDto
            {
                Id = x.ID,
                Name = x.FundTypeName ?? $"Fund {x.ID}"
            })
            .ToListAsync();
    }

    public async Task<ExpectedIncomeReportDto> GetExpectedIncomeReportAsync()
    {
        var profile = await _context.CampusProfiles
            .AsNoTracking()
            .OrderBy(x => x.ID)
            .FirstOrDefaultAsync();

        var session = profile is null
            ? CampusProfileService.CoalesceSession(CampusProfileService.CreateDefault(PakistanTime.Now.Year))
            : CampusProfileService.CoalesceSession(profile);

        if (session.StartMonth is null
            || session.StartYear is null
            || session.EndMonth is null
            || session.EndYear is null)
        {
            throw new InvalidOperationException("Session is not configured in institute settings.");
        }

        var startMonth = session.StartMonth.Value;
        var startYear = session.StartYear.Value;
        var endMonth = session.EndMonth.Value;
        var endYear = session.EndYear.Value;

        var monthSlots = BuildBalanceSheetMonths(startMonth, startYear, endMonth, endYear);
        var activeStudentIds = _context.Students
            .AsNoTracking()
            .Where(x => x.IsActive == true)
            .Select(x => x.Reg_Id);

        var tuitionRows = await _context.FeeAndFundCollections
            .Where(x => (x.VoidAmount ?? 0) == 0)
            .AsNoTracking()
            .Where(x =>
                x.FundTypeID == 1 &&
                x.StudentID != null &&
                activeStudentIds.Contains(x.StudentID.Value) &&
                x.Month != null &&
                x.Year != null)
            .GroupBy(x => new { Month = x.Month!.Value, Year = x.Year!.Value })
            .Select(g => new
            {
                g.Key.Month,
                g.Key.Year,
                Outstanding = g.Sum(x => (x.Payment ?? 0) - ((x.Recieved ?? 0) + (x.Discount ?? 0)))
            })
            .ToListAsync();

        var tuitionLookup = tuitionRows.ToDictionary(
            x => (x.Month, x.Year),
            x => x.Outstanding > 0 ? x.Outstanding : 0m);

        var tuitionByMonth = monthSlots.Select(slot =>
        {
            tuitionLookup.TryGetValue((slot.Month, slot.Year), out var amount);
            return new ExpectedIncomeMonthItemDto
            {
                Month = slot.Month,
                Year = slot.Year,
                MonthLabel = new DateTime(slot.Year, slot.Month, 1).ToString("MMMM", CultureInfo.InvariantCulture),
                Amount = amount
            };
        }).ToList();

        var fundTypeNames = await _context.FundTypes
            .AsNoTracking()
            .Where(x => x.ID > 1)
            .OrderBy(x => x.ID)
            .Select(x => new { x.ID, Name = x.FundTypeName })
            .ToListAsync();

        // Match legacy Balance.FundsBalance() / v_FeeMonthlyBalance:
        // Payment − Recieved for active students, but omit student/fund buckets with no charges
        // (orphan receipts only — e.g. Payment=0, Recieved>0 — are absent from the view).
        var perStudentFund = await _context.FeeAndFundCollections
            .Where(x => (x.VoidAmount ?? 0) == 0)
            .AsNoTracking()
            .Where(x =>
                (x.FundTypeID ?? 0) > 1 &&
                x.StudentID != null &&
                activeStudentIds.Contains(x.StudentID.Value))
            .GroupBy(x => new
            {
                StudentId = x.StudentID!.Value,
                FundTypeId = x.FundTypeID!.Value
            })
            .Select(g => new
            {
                g.Key.FundTypeId,
                Charged = g.Sum(x => x.Payment ?? 0),
                Outstanding = g.Sum(x => (x.Payment ?? 0) - (x.Recieved ?? 0))
            })
            .ToListAsync();

        var fundBalances = perStudentFund
            .Where(x => x.Charged > 0)
            .GroupBy(x => x.FundTypeId)
            .Select(g => new
            {
                FundTypeId = g.Key,
                Outstanding = g.Sum(x => x.Outstanding)
            })
            .ToList();

        var fundLookup = fundBalances.ToDictionary(x => x.FundTypeId, x => x.Outstanding);

        var fundRows = fundTypeNames.Select(ft =>
        {
            fundLookup.TryGetValue(ft.ID, out var amount);
            return new ExpectedIncomeFundItemDto
            {
                FundTypeId = ft.ID,
                FundTypeName = string.IsNullOrWhiteSpace(ft.Name) ? $"Fund {ft.ID}" : ft.Name!,
                Amount = amount
            };
        }).ToList();

        var activeStudentCount = await _context.Students
            .AsNoTracking()
            .CountAsync(x => x.IsActive == true);
        var now = PakistanTime.Now;

        return new ExpectedIncomeReportDto
        {
            SessionStartMonth = startMonth,
            SessionStartYear = startYear,
            SessionEndMonth = endMonth,
            SessionEndYear = endYear,
            SessionLabel = session.Label ?? $"{startYear}-{endYear}",
            ForMonthLabel = now.ToString("MMMM yyyy", CultureInfo.InvariantCulture),
            GeneratedAt = now,
            TuitionByMonth = tuitionByMonth,
            FundsOverall = fundRows,
            TuitionTotal = tuitionByMonth.Sum(x => x.Amount),
            FundsTotal = fundRows.Sum(x => x.Amount),
            ActiveStudentCount = activeStudentCount
        };
    }

    public async Task<IncomeStatementReportDto> GetIncomeStatementAsync(int month, int year)
    {
        var totalIncome = await _context.FeeAndFundCollections.Where(x => (x.VoidAmount ?? 0) == 0 && x.Date != null && x.Date.Value.Month == month && x.Date.Value.Year == year).SumAsync(x => x.Recieved ?? 0);

        var expenseQuery = (await ExpenseQueryAsync())
            .Where(x => x.Month == month && x.Year == year);

        var expenseRows = await expenseQuery
            .GroupBy(x => x.SubGroupID ?? string.Empty)
            .Select(g => new
            {
                SubGroupId = g.Key,
                Amount = g.Sum(x => x.Debit ?? 0)
            })
            .Where(x => x.Amount > 0)
            .ToListAsync();

        var headNames = await GetExpenseHeadNamesAsync(expenseRows.Select(x => x.SubGroupId));

        var expenseHeads = expenseRows
            .Select(row => new IncomeExpenseHeadDto
            {
                SubGroupId = row.SubGroupId,
                HeadName = ResolveExpenseHeadName(row.SubGroupId, headNames),
                Amount = row.Amount
            })
            .OrderBy(x => x.HeadName)
            .ToList();

        var totalExpenses = expenseHeads.Sum(x => x.Amount);

        return new IncomeStatementReportDto
        {
            Month = month,
            Year = year,
            MonthLabel = new DateTime(year, month, 1).ToString("MMMM yyyy", CultureInfo.InvariantCulture),
            TotalIncome = totalIncome,
            TotalExpenses = totalExpenses,
            NetProfit = totalIncome - totalExpenses,
            ExpenseHeads = expenseHeads
        };
    }

    private async Task<IQueryable<TransactionDetail>> ExpenseQueryAsync()
    {
        var ownerAccountId = await _systemAccounts.GetOwnerDrawingsAccountIdAsync();

        var query = _context.TransactionDetails
            .AsNoTracking()
            .Where(x => (x.Debit ?? 0) > 0);

        if (!string.IsNullOrWhiteSpace(ownerAccountId))
        {
            query = query.Where(x => x.AccountID != ownerAccountId);
        }

        return query;
    }

    private async Task<Dictionary<string, string?>> GetExpenseHeadNamesAsync(IEnumerable<string> subGroupIds)
    {
        var ids = subGroupIds
            .Where(x => !string.IsNullOrWhiteSpace(x))
            .Distinct()
            .ToList();

        if (ids.Count == 0)
        {
            return new Dictionary<string, string?>();
        }

        return await _context.AccountSubGroups
            .Where(x => x.SubGroupID != null && ids.Contains(x.SubGroupID))
            .GroupBy(x => x.SubGroupID!)
            .Select(g => new { SubGroupId = g.Key, Name = g.Max(x => x.SubGroupName) })
            .ToDictionaryAsync(x => x.SubGroupId, x => x.Name);
    }

    private static string ResolveExpenseHeadName(string subGroupId, Dictionary<string, string?> headNames) =>
        !string.IsNullOrWhiteSpace(subGroupId) &&
        headNames.TryGetValue(subGroupId, out var name) &&
        !string.IsNullOrWhiteSpace(name)
            ? name.Trim()
            : string.IsNullOrWhiteSpace(subGroupId) ? "Unclassified" : subGroupId;

    public async Task<FeeDashboardDto> GetFeeDashboardAsync(int months = 12)
    {
        const int tuitionFundTypeId = 1;

        months = Math.Clamp(months, 6, 24);

        var today = PakistanTime.Today.ToDateTime(TimeOnly.MinValue);
        var tomorrow = today.AddDays(1);
        var monthStart = new DateTime(today.Year, today.Month, 1);
        var lastMonthStart = monthStart.AddMonths(-1);
        var lastMonthSameDayEnd = lastMonthStart
            .AddDays(Math.Min(today.Day, DateTime.DaysInMonth(lastMonthStart.Year, lastMonthStart.Month)));
        var trendStart = monthStart.AddMonths(-(months - 1));
        var currentIndex = today.Year * 12 + today.Month;
        var trendStartIndex = trendStart.Year * 12 + trendStart.Month;

        var profile = await _context.CampusProfiles
            .AsNoTracking()
            .OrderBy(x => x.ID)
            .FirstOrDefaultAsync();
        var session = profile is null
            ? CampusProfileService.CoalesceSession(CampusProfileService.CreateDefault(today.Year))
            : CampusProfileService.CoalesceSession(profile);
        var hasSession = session.StartMonth is not null && session.StartYear is not null
            && session.EndMonth is not null && session.EndYear is not null;
        var sessionStartIndex = hasSession ? session.StartYear!.Value * 12 + session.StartMonth!.Value : currentIndex;
        var sessionEndIndex = hasSession ? session.EndYear!.Value * 12 + session.EndMonth!.Value : currentIndex;
        var sessionStartDate = hasSession ? new DateTime(session.StartYear!.Value, session.StartMonth!.Value, 1) : monthStart;

        var receipts = _context.FeeAndFundCollections
            .AsNoTracking()
            .Where(x => (x.VoidAmount ?? 0) == 0 &&
                        x.Date != null &&
                        x.Student != null &&
                        x.Student.IsActive == true);

        var receivedByMonth = await receipts
            .Where(x => x.Date >= trendStart)
            .GroupBy(x => new { x.Date!.Value.Year, x.Date.Value.Month })
            .Select(g => new
            {
                g.Key.Year,
                g.Key.Month,
                Received = g.Sum(x => x.Recieved ?? 0),
                Discount = g.Sum(x => x.Discount ?? 0)
            })
            .ToListAsync();
        var receivedLookup = receivedByMonth.ToDictionary(x => x.Year * 12 + x.Month);

        var collectedToday = await receipts
            .Where(x => x.Date >= today && x.Date < tomorrow)
            .SumAsync(x => x.Recieved ?? 0);
        var collectedLastMonthSame = await receipts
            .Where(x => x.Date >= lastMonthStart && x.Date < lastMonthSameDayEnd)
            .SumAsync(x => x.Recieved ?? 0);
        var collectedSession = await receipts
            .Where(x => x.Date >= sessionStartDate)
            .SumAsync(x => x.Recieved ?? 0);

        // Expenses (same rules as Profit Loss Statement).
        var expenseQuery = await ExpenseQueryAsync();
        var expensesByMonth = await expenseQuery
            .Where(x => x.Month != null && x.Year != null &&
                        x.Year.Value * 12 + x.Month.Value >= trendStartIndex &&
                        x.Year.Value * 12 + x.Month.Value <= currentIndex)
            .GroupBy(x => new { Year = x.Year!.Value, Month = x.Month!.Value })
            .Select(g => new { g.Key.Year, g.Key.Month, Amount = g.Sum(x => x.Debit ?? 0) })
            .ToListAsync();
        var expenseLookup = expensesByMonth.ToDictionary(x => x.Year * 12 + x.Month, x => x.Amount);

        // Tuition billed vs recovered by fee month (covers both trend and session windows).
        var tuitionFromIndex = Math.Min(trendStartIndex, sessionStartIndex);
        var tuitionByMonth = await _context.FeeAndFundCollections
            .AsNoTracking()
            .Where(x => (x.VoidAmount ?? 0) == 0 &&
                        x.FundTypeID == tuitionFundTypeId &&
                        x.Student != null &&
                        x.Student.IsActive == true &&
                        x.Month != null && x.Year != null &&
                        x.Year.Value * 12 + x.Month.Value >= tuitionFromIndex &&
                        x.Year.Value * 12 + x.Month.Value <= currentIndex)
            .GroupBy(x => new { Year = x.Year!.Value, Month = x.Month!.Value })
            .Select(g => new
            {
                g.Key.Year,
                g.Key.Month,
                Billed = g.Sum(x => x.Payment ?? 0),
                Recovered = g.Sum(x => (x.Recieved ?? 0) + (x.Discount ?? 0))
            })
            .ToListAsync();
        var tuitionLookup = tuitionByMonth.ToDictionary(x => x.Year * 12 + x.Month);

        var trend = new List<FeeDashboardTrendPointDto>();
        for (var i = 0; i < months; i++)
        {
            var slot = trendStart.AddMonths(i);
            var index = slot.Year * 12 + slot.Month;
            receivedLookup.TryGetValue(index, out var rec);
            tuitionLookup.TryGetValue(index, out var tui);
            expenseLookup.TryGetValue(index, out var exp);
            var received = rec?.Received ?? 0;
            var net = received - exp;

            trend.Add(new FeeDashboardTrendPointDto
            {
                Month = slot.Month,
                Year = slot.Year,
                Label = slot.ToString("MMM yy", CultureInfo.InvariantCulture),
                TuitionBilled = tui?.Billed ?? 0,
                TuitionRecovered = tui?.Recovered ?? 0,
                Received = received,
                Discount = rec?.Discount ?? 0,
                Expenses = exp,
                NetProfit = net,
                MarginPercent = received > 0 ? Math.Round(net / received * 100m, 1) : 0
            });
        }

        var current = trend[^1];

        // Active-student ledger: non-zero buckets only.
        var activeLedger = _context.FeeAndFundCollections
            .AsNoTracking()
            .Where(x => (x.VoidAmount ?? 0) == 0 &&
                        x.StudentID != null &&
                        x.Student != null &&
                        x.Student.IsActive == true);

        var buckets = await activeLedger
            .GroupBy(x => new
            {
                StudentId = x.StudentID!.Value,
                FundTypeId = x.FundTypeID ?? 0,
                Month = x.Month ?? 0,
                Year = x.Year ?? 0
            })
            .Select(g => new
            {
                g.Key.StudentId,
                g.Key.FundTypeId,
                g.Key.Month,
                g.Key.Year,
                Due = g.Sum(x => (x.Payment ?? 0) - ((x.Recieved ?? 0) + (x.Discount ?? 0)))
            })
            .Where(x => x.Due != 0)
            .ToListAsync();

        var classTotals = await activeLedger
            .GroupBy(x => x.Student!.Section != null ? x.Student.Section.ClassName : null)
            .Select(g => new
            {
                ClassName = g.Key,
                Charged = g.Sum(x => x.Payment ?? 0),
                Credited = g.Sum(x => (x.Recieved ?? 0) + (x.Discount ?? 0))
            })
            .ToListAsync();

        var roster = await _context.Students
            .AsNoTracking()
            .Where(x => x.IsActive == true)
            .Select(x => new
            {
                x.Reg_Id,
                x.FullName,
                x.Family_Code,
                x.TutionFee,
                ClassName = x.Section != null ? x.Section.ClassName : null,
                FatherName = x.Family != null ? x.Family.FatherName : null,
                FatherMobile = x.Family != null ? x.Family.FatherMobileNo : null
            })
            .ToListAsync();
        var rosterLookup = roster.ToDictionary(x => x.Reg_Id);

        var studentNet = buckets
            .GroupBy(x => x.StudentId)
            .ToDictionary(g => g.Key, g => g.Sum(x => x.Due));
        var defaulters = studentNet.Where(x => x.Value > 0).ToDictionary(x => x.Key, x => x.Value);

        var totalOutstanding = defaulters.Values.Sum();
        var defaulterFamilies = defaulters.Keys
            .Select(id => rosterLookup.TryGetValue(id, out var s) && s.Family_Code != null ? s.Family_Code.Value : -id)
            .Distinct()
            .Count();

        var totalCharged = classTotals.Sum(x => x.Charged);
        var totalCredited = classTotals.Sum(x => x.Credited);

        // Aging of pending amounts (positive buckets only).
        var positive = buckets.Where(x => x.Due > 0).ToList();
        var agingDefs = new (string Key, string Label)[]
        {
            ("current", "This month"),
            ("1-2", "1-2 months old"),
            ("3-5", "3-5 months old"),
            ("6+", "6+ months old"),
            ("funds-current", "Annual funds (this year)"),
            ("funds-older", "Annual funds (earlier years)")
        };
        string AgingKey(int fundTypeId, int month, int year)
        {
            if (fundTypeId == tuitionFundTypeId && month is >= 1 and <= 12)
            {
                var age = currentIndex - (year * 12 + month);
                return age <= 0 ? "current" : age <= 2 ? "1-2" : age <= 5 ? "3-5" : "6+";
            }

            return year >= today.Year ? "funds-current" : "funds-older";
        }

        var agingGroups = positive
            .GroupBy(x => AgingKey(x.FundTypeId, x.Month, x.Year))
            .ToDictionary(g => g.Key, g => new { Amount = g.Sum(x => x.Due), Students = g.Select(x => x.StudentId).Distinct().Count() });
        var aging = agingDefs.Select(d =>
        {
            agingGroups.TryGetValue(d.Key, out var g);
            return new FeeDashboardAgingBucketDto
            {
                Key = d.Key,
                Label = d.Label,
                Amount = g?.Amount ?? 0,
                Students = g?.Students ?? 0
            };
        }).ToList();

        // Outstanding by fund (net per student and fund).
        var fundNames = await _context.FundTypes
            .AsNoTracking()
            .Select(x => new { x.ID, x.FundTypeName })
            .ToDictionaryAsync(x => x.ID, x => x.FundTypeName);
        var fundOutstanding = buckets
            .GroupBy(x => new { x.StudentId, x.FundTypeId })
            .Select(g => new { g.Key.StudentId, g.Key.FundTypeId, Due = g.Sum(x => x.Due) })
            .Where(x => x.Due > 0)
            .GroupBy(x => x.FundTypeId)
            .Select(g => new FeeDashboardFundDto
            {
                FundTypeId = g.Key,
                FundTypeName = fundNames.TryGetValue(g.Key, out var n) && !string.IsNullOrWhiteSpace(n)
                    ? n.Trim()
                    : g.Key == tuitionFundTypeId ? "Tuition" : "Other",
                Outstanding = g.Sum(x => x.Due),
                Students = g.Select(x => x.StudentId).Distinct().Count()
            })
            .OrderByDescending(x => x.Outstanding)
            .ToList();

        // Class-wise.
        var rosterByClass = roster
            .GroupBy(x => string.IsNullOrWhiteSpace(x.ClassName) ? "Unassigned" : x.ClassName.Trim())
            .ToDictionary(g => g.Key, g => g.Count());
        var defaultersByClass = defaulters
            .GroupBy(x => rosterLookup.TryGetValue(x.Key, out var s) && !string.IsNullOrWhiteSpace(s.ClassName)
                ? s.ClassName.Trim()
                : "Unassigned")
            .ToDictionary(g => g.Key, g => new { Count = g.Count(), Amount = g.Sum(x => x.Value) });
        var classes = classTotals
            .GroupBy(x => string.IsNullOrWhiteSpace(x.ClassName) ? "Unassigned" : x.ClassName.Trim())
            .Select(g =>
            {
                var charged = g.Sum(x => x.Charged);
                var credited = g.Sum(x => x.Credited);
                defaultersByClass.TryGetValue(g.Key, out var d);
                rosterByClass.TryGetValue(g.Key, out var count);
                return new FeeDashboardClassDto
                {
                    ClassName = g.Key,
                    ActiveStudents = count,
                    DefaulterStudents = d?.Count ?? 0,
                    Charged = charged,
                    Recovered = credited,
                    Outstanding = d?.Amount ?? 0,
                    RecoveryPercent = charged > 0 ? Math.Round(credited / charged * 100m, 1) : 0
                };
            })
            .Where(x => x.Charged > 0 || x.Outstanding > 0)
            .ToList();

        // Top defaulter families.
        var pendingTuitionMonths = positive
            .Where(x => x.FundTypeId == tuitionFundTypeId)
            .GroupBy(x => x.StudentId)
            .ToDictionary(g => g.Key, g => g.Select(x => (x.Year, x.Month)).ToHashSet());
        var familyRows = defaulters
            .Select(x => new { StudentId = x.Key, Due = x.Value, Student = rosterLookup.GetValueOrDefault(x.Key) })
            .Where(x => x.Student?.Family_Code != null)
            .GroupBy(x => x.Student!.Family_Code!.Value)
            .Select(g => new
            {
                FamilyCode = g.Key,
                Outstanding = g.Sum(x => x.Due),
                StudentIds = g.Select(x => x.StudentId).ToList(),
                Names = g.Select(x => x.Student!.FullName).Where(n => !string.IsNullOrWhiteSpace(n)).Distinct().ToList(),
                FatherName = g.Select(x => x.Student!.FatherName).FirstOrDefault(n => !string.IsNullOrWhiteSpace(n)),
                FatherMobile = g.Select(x => x.Student!.FatherMobile).FirstOrDefault(n => !string.IsNullOrWhiteSpace(n))
            })
            .OrderByDescending(x => x.Outstanding)
            .Take(10)
            .ToList();

        var topStudentIds = familyRows.SelectMany(x => x.StudentIds).ToList();
        var lastReceipts = topStudentIds.Count == 0
            ? new Dictionary<int, DateTime>()
            : await receipts
                .Where(x => x.StudentID != null && topStudentIds.Contains(x.StudentID.Value) && (x.Recieved ?? 0) > 0)
                .GroupBy(x => x.StudentID!.Value)
                .Select(g => new { StudentId = g.Key, Last = g.Max(x => x.Date!.Value) })
                .ToDictionaryAsync(x => x.StudentId, x => x.Last);

        var topFamilies = familyRows.Select(f =>
        {
            var pendingMonths = f.StudentIds
                .SelectMany(id => pendingTuitionMonths.TryGetValue(id, out var set)
                    ? set
                    : Enumerable.Empty<(int Year, int Month)>())
                .Distinct()
                .Count();
            var lastDates = f.StudentIds
                .Where(lastReceipts.ContainsKey)
                .Select(id => lastReceipts[id])
                .ToList();
            return new FeeDashboardFamilyDto
            {
                FamilyCode = f.FamilyCode,
                FatherName = f.FatherName?.Trim() ?? string.Empty,
                FatherMobile = f.FatherMobile?.Trim() ?? string.Empty,
                Students = string.Join(", ", f.Names.Take(4).Select(n => n!.Trim())),
                Children = f.StudentIds.Count,
                Outstanding = f.Outstanding,
                TuitionMonthsPending = pendingMonths,
                LastReceiptDate = lastDates.Count > 0 ? lastDates.Max() : null
            };
        }).ToList();

        // Expense heads: this month vs previous month.
        var prevIndex = currentIndex - 1;
        var headRows = await expenseQuery
            .Where(x => x.Month != null && x.Year != null &&
                        x.Year.Value * 12 + x.Month.Value >= prevIndex &&
                        x.Year.Value * 12 + x.Month.Value <= currentIndex)
            .GroupBy(x => new { Index = x.Year!.Value * 12 + x.Month!.Value, SubGroupId = x.SubGroupID ?? string.Empty })
            .Select(g => new { g.Key.Index, g.Key.SubGroupId, Amount = g.Sum(x => x.Debit ?? 0) })
            .ToListAsync();
        var headNames = await GetExpenseHeadNamesAsync(headRows.Select(x => x.SubGroupId));
        var expenseHeads = headRows
            .GroupBy(x => ResolveExpenseHeadName(x.SubGroupId, headNames))
            .Select(g => new FeeDashboardExpenseHeadDto
            {
                HeadName = g.Key,
                CurrentMonth = g.Where(x => x.Index == currentIndex).Sum(x => x.Amount),
                PreviousMonth = g.Where(x => x.Index == prevIndex).Sum(x => x.Amount)
            })
            .Where(x => x.CurrentMonth > 0 || x.PreviousMonth > 0)
            .OrderByDescending(x => x.CurrentMonth)
            .ThenByDescending(x => x.PreviousMonth)
            .ToList();

        // Forecast.
        var daysInMonth = DateTime.DaysInMonth(today.Year, today.Month);
        var monthlyRoster = roster.Sum(x => x.TutionFee ?? 0);
        var sessionMonthsRemaining = hasSession ? Math.Max(0, sessionEndIndex - currentIndex) : 0;
        var sessionTuition = tuitionByMonth
            .Where(x => x.Year * 12 + x.Month >= sessionStartIndex && x.Year * 12 + x.Month <= currentIndex)
            .ToList();
        var lastThree = trend.Take(trend.Count - 1).TakeLast(3).ToList();

        return new FeeDashboardDto
        {
            GeneratedAt = PakistanTime.Now,
            MonthLabel = today.ToString("MMMM yyyy", CultureInfo.InvariantCulture),
            Kpis = new FeeDashboardKpisDto
            {
                CollectedToday = collectedToday,
                CollectedMtd = current.Received,
                CollectedLastMonthSamePeriod = collectedLastMonthSame,
                CollectedSession = collectedSession,
                TotalOutstanding = totalOutstanding,
                DefaulterStudents = defaulters.Count,
                DefaulterFamilies = defaulterFamilies,
                ActiveStudents = roster.Count,
                CurrentMonthTuitionBilled = current.TuitionBilled,
                CurrentMonthTuitionRecovered = current.TuitionRecovered,
                CurrentMonthCollectionRate = current.TuitionBilled > 0
                    ? Math.Round(current.TuitionRecovered / current.TuitionBilled * 100m, 1)
                    : 0,
                OverallRecoveryPercent = totalCharged > 0 ? Math.Round(totalCredited / totalCharged * 100m, 1) : 0,
                DiscountMtd = current.Discount,
                ExpensesMtd = current.Expenses,
                NetProfitMtd = current.NetProfit
            },
            Trend = trend,
            Aging = aging,
            FundOutstanding = fundOutstanding,
            Classes = classes,
            TopFamilies = topFamilies,
            ExpenseHeads = expenseHeads,
            Forecast = new FeeDashboardForecastDto
            {
                DaysElapsed = today.Day,
                DaysInMonth = daysInMonth,
                ProjectedMonthEndCollection = Math.Round(current.Received / today.Day * daysInMonth, 0),
                CurrentMonthRemainingDue = Math.Max(0, current.TuitionBilled - current.TuitionRecovered),
                MonthlyRosterTuition = monthlyRoster,
                SessionLabel = hasSession ? session.Label ?? $"{session.StartYear}-{session.EndYear}" : string.Empty,
                SessionMonthsRemaining = sessionMonthsRemaining,
                ExpectedRemainingSessionBilling = monthlyRoster * sessionMonthsRemaining,
                SessionTuitionBilled = sessionTuition.Sum(x => x.Billed),
                SessionTuitionRecovered = sessionTuition.Sum(x => x.Recovered),
                AvgMonthlyCollectionLast3 = lastThree.Count > 0 ? Math.Round(lastThree.Average(x => x.Received), 0) : 0,
                AvgMonthlyExpensesLast3 = lastThree.Count > 0 ? Math.Round(lastThree.Average(x => x.Expenses), 0) : 0
            }
        };
    }

    public async Task<BalanceSheetReportDto> GetBalanceSheetAsync()
    {
        const int tuitionFundTypeId = 1;
        const int prevFundTypeId = 4;
        const int miscFundTypeId = 3;

        var profile = await _context.CampusProfiles
            .AsNoTracking()
            .OrderBy(x => x.ID)
            .FirstOrDefaultAsync();

        var session = profile is null
            ? CampusProfileService.CoalesceSession(CampusProfileService.CreateDefault(PakistanTime.Now.Year))
            : CampusProfileService.CoalesceSession(profile);

        if (session.StartMonth is null
            || session.StartYear is null
            || session.EndMonth is null
            || session.EndYear is null)
        {
            throw new InvalidOperationException("Session is not configured in institute settings.");
        }

        var startMonth = session.StartMonth.Value;
        var startYear = session.StartYear.Value;
        var endMonth = session.EndMonth.Value;
        var endYear = session.EndYear.Value;

        var monthSlots = BuildBalanceSheetMonths(startMonth, startYear, endMonth, endYear);
        var monthColumns = monthSlots
            .Select(slot => new BalanceSheetMonthColumnDto
            {
                Month = slot.Month,
                Year = slot.Year,
                Key = $"m{slot.Month}_{slot.Year}",
                Label = new DateTime(slot.Year, slot.Month, 1).ToString("MMM", CultureInfo.InvariantCulture)
            })
            .ToList();

        var monthKeySet = monthSlots.Select(s => (s.Month, s.Year)).ToHashSet();
        var yearMin = monthSlots.Min(s => s.Year);
        var yearMax = monthSlots.Max(s => s.Year);

        // Active = IsActive only (matches legacy / dashboard).
        var activeStudentsQuery = _context.Students
            .AsNoTracking()
            .Where(x => x.IsActive == true);

        var students = await activeStudentsQuery
            .Select(x => new
            {
                x.Reg_Id,
                x.FullName,
                ClassName = x.Section != null ? x.Section.ClassName : null,
                TuitionFee = x.TutionFee ?? 0m
            })
            .OrderBy(x => x.Reg_Id)
            .ToListAsync();

        var activeStudentIds = activeStudentsQuery.Select(x => x.Reg_Id);

        var tuitionRows = await _context.FeeAndFundCollections
            .Where(x => (x.VoidAmount ?? 0) == 0)
            .AsNoTracking()
            .Where(x =>
                x.FundTypeID == tuitionFundTypeId &&
                x.StudentID != null &&
                activeStudentIds.Contains(x.StudentID.Value) &&
                x.Month != null &&
                x.Year != null &&
                x.Year >= yearMin &&
                x.Year <= yearMax)
            .GroupBy(x => new
            {
                StudentId = x.StudentID!.Value,
                Month = x.Month!.Value,
                Year = x.Year!.Value
            })
            .Select(g => new
            {
                g.Key.StudentId,
                g.Key.Month,
                g.Key.Year,
                Outstanding = g.Sum(x => (x.Payment ?? 0) - ((x.Recieved ?? 0) + (x.Discount ?? 0)))
            })
            .ToListAsync();

        var tuitionLookup = tuitionRows
            .Where(x => monthKeySet.Contains((x.Month, x.Year)) && x.Outstanding > 0)
            .ToDictionary(
                x => (x.StudentId, x.Month, x.Year),
                x => x.Outstanding);

        var fundRows = await _context.FeeAndFundCollections
            .Where(x => (x.VoidAmount ?? 0) == 0)
            .AsNoTracking()
            .Where(x =>
                (x.FundTypeID == prevFundTypeId || x.FundTypeID == miscFundTypeId) &&
                x.StudentID != null &&
                activeStudentIds.Contains(x.StudentID.Value))
            .GroupBy(x => new
            {
                StudentId = x.StudentID!.Value,
                FundTypeId = x.FundTypeID ?? 0
            })
            .Select(g => new
            {
                g.Key.StudentId,
                g.Key.FundTypeId,
                Outstanding = g.Sum(x => (x.Payment ?? 0) - ((x.Recieved ?? 0) + (x.Discount ?? 0)))
            })
            .ToListAsync();

        var fundLookup = fundRows
            .Where(x => x.Outstanding > 0)
            .ToDictionary(x => (x.StudentId, x.FundTypeId), x => x.Outstanding);

        var rows = new List<BalanceSheetRowDto>();
        foreach (var student in students)
        {
            var monthBalances = new List<decimal>(monthSlots.Count);
            decimal monthTotal = 0;
            foreach (var slot in monthSlots)
            {
                tuitionLookup.TryGetValue((student.Reg_Id, slot.Month, slot.Year), out var bal);
                if (bal < 0) bal = 0;
                monthBalances.Add(bal);
                monthTotal += bal;
            }

            fundLookup.TryGetValue((student.Reg_Id, prevFundTypeId), out var prev);
            fundLookup.TryGetValue((student.Reg_Id, miscFundTypeId), out var misc);
            if (prev < 0) prev = 0;
            if (misc < 0) misc = 0;

            var total = monthTotal + prev + misc;
            if (total <= 0) continue;

            rows.Add(new BalanceSheetRowDto
            {
                StudentId = student.Reg_Id,
                StudentName = student.FullName ?? "N/A",
                ClassName = student.ClassName,
                TuitionFee = student.TuitionFee,
                MonthBalances = monthBalances,
                PrevBalance = prev,
                MiscBalance = misc,
                Total = total
            });
        }

        var monthCount = monthColumns.Count;
        var totals = new BalanceSheetTotalsDto
        {
            TuitionFee = rows.Sum(r => r.TuitionFee),
            MonthBalances = Enumerable.Range(0, monthCount)
                .Select(i => rows.Sum(r => r.MonthBalances[i]))
                .ToList(),
            PrevBalance = rows.Sum(r => r.PrevBalance),
            MiscBalance = rows.Sum(r => r.MiscBalance),
            Total = rows.Sum(r => r.Total)
        };

        return new BalanceSheetReportDto
        {
            SessionStartYear = startYear,
            SessionEndYear = endYear,
            SessionStartMonth = startMonth,
            SessionEndMonth = endMonth,
            SessionLabel = session.Label ?? $"{startYear}-{endYear}",
            PrevFundTypeId = prevFundTypeId,
            MiscFundTypeId = miscFundTypeId,
            Months = monthColumns,
            Rows = rows,
            Totals = totals
        };
    }

    public async Task<BalanceSheetReportDto> GetCollectionSheetAsync()
    {
        const int tuitionFundTypeId = 1;
        const int prevFundTypeId = 4;
        const int miscFundTypeId = 3;

        var profile = await _context.CampusProfiles
            .AsNoTracking()
            .OrderBy(x => x.ID)
            .FirstOrDefaultAsync();

        var session = profile is null
            ? CampusProfileService.CoalesceSession(CampusProfileService.CreateDefault(PakistanTime.Now.Year))
            : CampusProfileService.CoalesceSession(profile);

        if (session.StartMonth is null
            || session.StartYear is null
            || session.EndMonth is null
            || session.EndYear is null)
        {
            throw new InvalidOperationException("Session is not configured in institute settings.");
        }

        var startMonth = session.StartMonth.Value;
        var startYear = session.StartYear.Value;
        var endMonth = session.EndMonth.Value;
        var endYear = session.EndYear.Value;
        var startIndex = startYear * 12 + startMonth;
        var endIndex = endYear * 12 + endMonth;

        var monthSlots = BuildBalanceSheetMonths(startMonth, startYear, endMonth, endYear);
        var monthColumns = monthSlots
            .Select(slot => new BalanceSheetMonthColumnDto
            {
                Month = slot.Month,
                Year = slot.Year,
                Key = $"m{slot.Month}_{slot.Year}",
                Label = new DateTime(slot.Year, slot.Month, 1).ToString("MMM", CultureInfo.InvariantCulture)
            })
            .ToList();

        var tuitionPayerIds = _context.FeeAndFundCollections
            .AsNoTracking()
            .Where(x => (x.VoidAmount ?? 0) == 0)
            .Where(x =>
                x.FundTypeID == tuitionFundTypeId &&
                x.StudentID != null &&
                x.Month != null &&
                x.Year != null &&
                (x.Recieved ?? 0) > 0 &&
                x.Year * 12 + x.Month >= startIndex &&
                x.Year * 12 + x.Month <= endIndex)
            .Select(x => x.StudentID!.Value);

        var fundPayerIds = _context.FeeAndFundCollections
            .AsNoTracking()
            .Where(x => (x.VoidAmount ?? 0) == 0)
            .Where(x =>
                (x.FundTypeID == prevFundTypeId || x.FundTypeID == miscFundTypeId) &&
                x.StudentID != null &&
                (x.Recieved ?? 0) > 0)
            .Select(x => x.StudentID!.Value);

        var payerIds = tuitionPayerIds.Union(fundPayerIds);

        var activePayerIds = _context.Students
            .AsNoTracking()
            .Where(x => x.IsActive == true && payerIds.Contains(x.Reg_Id))
            .Select(x => x.Reg_Id);

        var students = await _context.Students
            .AsNoTracking()
            .Where(x => activePayerIds.Contains(x.Reg_Id))
            .Select(x => new
            {
                x.Reg_Id,
                x.FullName,
                ClassName = x.Section != null ? x.Section.ClassName : null,
                TuitionFee = x.TutionFee ?? 0m
            })
            .OrderBy(x => x.Reg_Id)
            .ToListAsync();

        var tuitionRows = await _context.FeeAndFundCollections
            .AsNoTracking()
            .Where(x => (x.VoidAmount ?? 0) == 0)
            .Where(x =>
                x.FundTypeID == tuitionFundTypeId &&
                x.StudentID != null &&
                activePayerIds.Contains(x.StudentID.Value) &&
                x.Month != null &&
                x.Year != null &&
                (x.Recieved ?? 0) > 0 &&
                x.Year * 12 + x.Month >= startIndex &&
                x.Year * 12 + x.Month <= endIndex)
            .GroupBy(x => new
            {
                StudentId = x.StudentID!.Value,
                Month = x.Month!.Value,
                Year = x.Year!.Value
            })
            .Where(g => g.Sum(x => x.Recieved ?? 0) > 0)
            .Select(g => new
            {
                g.Key.StudentId,
                g.Key.Month,
                g.Key.Year,
                Collected = g.Sum(x => x.Recieved ?? 0)
            })
            .ToListAsync();

        var tuitionLookup = tuitionRows.ToDictionary(
            x => (x.StudentId, x.Month, x.Year),
            x => x.Collected);

        var fundRows = await _context.FeeAndFundCollections
            .AsNoTracking()
            .Where(x => (x.VoidAmount ?? 0) == 0)
            .Where(x =>
                (x.FundTypeID == prevFundTypeId || x.FundTypeID == miscFundTypeId) &&
                x.StudentID != null &&
                activePayerIds.Contains(x.StudentID.Value) &&
                (x.Recieved ?? 0) > 0)
            .GroupBy(x => new
            {
                StudentId = x.StudentID!.Value,
                FundTypeId = x.FundTypeID ?? 0
            })
            .Where(g => g.Sum(x => x.Recieved ?? 0) > 0)
            .Select(g => new
            {
                g.Key.StudentId,
                g.Key.FundTypeId,
                Collected = g.Sum(x => x.Recieved ?? 0)
            })
            .ToListAsync();

        var fundLookup = fundRows.ToDictionary(x => (x.StudentId, x.FundTypeId), x => x.Collected);

        var rows = new List<BalanceSheetRowDto>();
        foreach (var student in students)
        {
            var monthBalances = new List<decimal>(monthSlots.Count);
            decimal monthTotal = 0;
            foreach (var slot in monthSlots)
            {
                tuitionLookup.TryGetValue((student.Reg_Id, slot.Month, slot.Year), out var collected);
                if (collected < 0) collected = 0;
                monthBalances.Add(collected);
                monthTotal += collected;
            }

            fundLookup.TryGetValue((student.Reg_Id, prevFundTypeId), out var prev);
            fundLookup.TryGetValue((student.Reg_Id, miscFundTypeId), out var misc);
            if (prev < 0) prev = 0;
            if (misc < 0) misc = 0;

            var total = monthTotal + prev + misc;
            if (total <= 0) continue;

            rows.Add(new BalanceSheetRowDto
            {
                StudentId = student.Reg_Id,
                StudentName = student.FullName ?? "N/A",
                ClassName = student.ClassName,
                TuitionFee = student.TuitionFee,
                MonthBalances = monthBalances,
                PrevBalance = prev,
                MiscBalance = misc,
                Total = total
            });
        }

        var monthCount = monthColumns.Count;
        var totals = new BalanceSheetTotalsDto
        {
            TuitionFee = rows.Sum(r => r.TuitionFee),
            MonthBalances = Enumerable.Range(0, monthCount)
                .Select(i => rows.Sum(r => r.MonthBalances[i]))
                .ToList(),
            PrevBalance = rows.Sum(r => r.PrevBalance),
            MiscBalance = rows.Sum(r => r.MiscBalance),
            Total = rows.Sum(r => r.Total)
        };

        return new BalanceSheetReportDto
        {
            SessionStartYear = startYear,
            SessionEndYear = endYear,
            SessionStartMonth = startMonth,
            SessionEndMonth = endMonth,
            SessionLabel = session.Label ?? $"{startYear}-{endYear}",
            PrevFundTypeId = prevFundTypeId,
            MiscFundTypeId = miscFundTypeId,
            Months = monthColumns,
            Rows = rows,
            Totals = totals
        };
    }

    private static List<(int Month, int Year)> BuildBalanceSheetMonths(
        int startMonth,
        int startYear,
        int endMonth,
        int endYear)
    {
        var start = new DateTime(startYear, startMonth, 1);
        var end = new DateTime(endYear, endMonth, 1);
        if (end < start)
            throw new InvalidOperationException("Session end must be on or after the session start.");

        var slots = new List<(int Month, int Year)>();
        var cursor = start;
        while (cursor <= end)
        {
            slots.Add((cursor.Month, cursor.Year));
            cursor = cursor.AddMonths(1);
            if (slots.Count > 36)
                throw new InvalidOperationException("Session cannot span more than 36 months.");
        }

        return slots;
    }
}
