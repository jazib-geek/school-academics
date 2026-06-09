using Microsoft.EntityFrameworkCore;
using School.Application.DTOs;
using School.Application.Interfaces;
using School.Infrastructure.Data;
using System.Globalization;

namespace School.Application.Services;

public class FeeReportService : IFeeReportService
{
    private readonly AppDbContext _context;

    public FeeReportService(AppDbContext context)
    {
        _context = context;
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
            .OrderBy(x => x.Date)
            .ThenBy(x => x.Student!.FullName)
            .Select(x => new FeeTransactionReportItemDto
            {
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
            .ThenBy(x => x.Student!.FullName)
            .Select(x => new FeeTransactionReportItemDto
            {
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
        var rows = await _context.FeeAndFundCollections
            .Where(x =>
                x.Student != null &&
                x.Student.IsActive == true)
            .GroupBy(x => new
            {
                StudentId = x.StudentID ?? 0,
                StudentName = x.Student != null ? x.Student.FullName : null,
                ClassName = x.Student != null && x.Student.Section != null ? x.Student.Section.ClassName : null
            })
            .Select(g => new ReceivableItemDto
            {
                StudentId = g.Key.StudentId,
                StudentName = g.Key.StudentName ?? "N/A",
                ClassName = g.Key.ClassName,
                TotalGenerated = g.Sum(x => x.Payment ?? 0),
                TotalReceived = g.Sum(x => (x.Recieved ?? 0) + (x.Discount ?? 0)),
                OutstandingAmount = g.Sum(x => (x.Payment ?? 0) - ((x.Recieved ?? 0) + (x.Discount ?? 0)))
            })
            .Where(x => x.OutstandingAmount > 0)
            .OrderByDescending(x => x.OutstandingAmount)
            .ThenBy(x => x.StudentName)
            .ToListAsync();

        return new FeeReportResponseDto<ReceivableItemDto>
        {
            TotalRecords = rows.Count,
            TotalAmount = rows.Sum(x => x.OutstandingAmount),
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

    public async Task<ExpectedIncomeReportDto> GetExpectedIncomeReportAsync(DateTime dateFrom, DateTime dateTo)
    {
        var from = dateFrom.Date;
        var to = dateTo.Date;

        var monthKeys = new List<(int Year, int Month)>();
        var cursor = new DateTime(from.Year, from.Month, 1);
        var endMonth = new DateTime(to.Year, to.Month, 1);
        while (cursor <= endMonth)
        {
            monthKeys.Add((cursor.Year, cursor.Month));
            cursor = cursor.AddMonths(1);
        }

        var tuitionByMonth = new List<ExpectedIncomeMonthItemDto>();
        foreach (var item in monthKeys)
        {
            var amount = await _context.FeeAndFundCollections
                .Where(x =>
                    x.Student != null &&
                    x.Student.IsActive == true &&
                    x.FundTypeID == 1 &&
                    x.Year == item.Year &&
                    x.Month == item.Month)
                .SumAsync(x => (x.Payment ?? 0) - ((x.Recieved ?? 0) + (x.Discount ?? 0)));

            tuitionByMonth.Add(new ExpectedIncomeMonthItemDto
            {
                Month = item.Month,
                Year = item.Year,
                MonthLabel = new DateTime(item.Year, item.Month, 1).ToString("MMMM yyyy", CultureInfo.InvariantCulture),
                Amount = amount > 0 ? amount : 0
            });
        }

        var fundRows = await _context.FeeAndFundCollections
            .Where(x =>
                x.Student != null &&
                x.Student.IsActive == true &&
                (x.FundTypeID ?? 0) > 1)
            .GroupBy(x => new
            {
                FundTypeId = x.FundTypeID ?? 0,
                FundTypeName = x.FundType != null ? x.FundType.FundTypeName : null
            })
            .Select(g => new ExpectedIncomeFundItemDto
            {
                FundTypeId = g.Key.FundTypeId,
                FundTypeName = g.Key.FundTypeName ?? string.Empty,
                Amount = g.Sum(x => (x.Payment ?? 0) - ((x.Recieved ?? 0) + (x.Discount ?? 0)))
            })
            .Where(x => x.Amount > 0)
            .OrderBy(x => x.FundTypeName)
            .ToListAsync();

        foreach (var fund in fundRows)
        {
            if (string.IsNullOrWhiteSpace(fund.FundTypeName))
            {
                fund.FundTypeName = $"Fund {fund.FundTypeId}";
            }
        }

        var activeStudentCount = await _context.Students.CountAsync(x => x.IsActive == true);

        return new ExpectedIncomeReportDto
        {
            DateFrom = from,
            DateTo = to,
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

        var expenseRows = await _context.TransactionDetails
            .Where(x => x.Month == month && x.Year == year && (x.Debit ?? 0) > 0)
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
}
