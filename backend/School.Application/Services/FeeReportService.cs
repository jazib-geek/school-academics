using Microsoft.EntityFrameworkCore;
using School.Application.Common;
using School.Application.DTOs;
using School.Application.Interfaces;
using School.Infrastructure.Data;
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
                Received = x.Recieved ?? 0
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
                Received = x.Recieved ?? 0
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
            ? CampusProfileService.CoalesceSession(CampusProfileService.CreateDefault(DateTime.Now.Year))
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
        var totalIncome = await _context.FeeAndFundCollections.Where(x => x.Date != null && x.Date.Value.Month == month && x.Date.Value.Year == year).SumAsync(x => x.Recieved ?? 0);

        var ownerAccountId = await _systemAccounts.GetOwnerDrawingsAccountIdAsync();

        var expenseQuery = _context.TransactionDetails
            .Where(x => x.Month == month && x.Year == year && (x.Debit ?? 0) > 0);

        if (!string.IsNullOrWhiteSpace(ownerAccountId))
        {
            expenseQuery = expenseQuery.Where(x => x.AccountID != ownerAccountId);
        }

        var expenseRows = await expenseQuery
            .GroupBy(x => x.SubGroupID ?? string.Empty)
            .Select(g => new
            {
                SubGroupId = g.Key,
                Amount = g.Sum(x => x.Debit ?? 0)
            })
            .Where(x => x.Amount > 0)
            .ToListAsync();

        var subGroupIds = expenseRows
            .Select(x => x.SubGroupId)
            .Where(x => !string.IsNullOrWhiteSpace(x))
            .Distinct()
            .ToList();

        var headNames = await _context.AccountSubGroups
            .Where(x => x.SubGroupID != null && subGroupIds.Contains(x.SubGroupID))
            .GroupBy(x => x.SubGroupID!)
            .Select(g => new { SubGroupId = g.Key, Name = g.Max(x => x.SubGroupName) })
            .ToDictionaryAsync(x => x.SubGroupId, x => x.Name);

        var expenseHeads = expenseRows
            .Select(row =>
            {
                var headName = !string.IsNullOrWhiteSpace(row.SubGroupId) &&
                               headNames.TryGetValue(row.SubGroupId, out var name) &&
                               !string.IsNullOrWhiteSpace(name)
                    ? name.Trim()
                    : string.IsNullOrWhiteSpace(row.SubGroupId) ? "Unclassified" : row.SubGroupId;

                return new IncomeExpenseHeadDto
                {
                    SubGroupId = row.SubGroupId,
                    HeadName = headName,
                    Amount = row.Amount
                };
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
            ? CampusProfileService.CoalesceSession(CampusProfileService.CreateDefault(DateTime.Now.Year))
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
