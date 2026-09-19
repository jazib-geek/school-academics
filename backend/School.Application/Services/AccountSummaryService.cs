using Microsoft.EntityFrameworkCore;
using School.Application.DTOs;
using School.Application.Interfaces;
using School.Infrastructure.Data;

namespace School.Application.Services;

public class AccountSummaryService : IAccountSummaryService
{
    private readonly AppDbContext _context;

    public AccountSummaryService(AppDbContext context) => _context = context;

    public async Task<AccountSummaryResultDto> GetSummaryAsync(
        DateTime from,
        DateTime to,
        CancellationToken cancellationToken = default)
    {
        var fromDate = from.Date;
        var toDate = to.Date;
        if (toDate < fromDate)
            throw new ArgumentException("End date must be on or after the start date.");

        var aggregates = await _context.TransactionDetails
            .AsNoTracking()
            .Where(x =>
                x.Date != null &&
                x.Date.Value.Date >= fromDate &&
                x.Date.Value.Date <= toDate &&
                x.AccountID != null)
            .GroupBy(x => x.AccountID!)
            .Select(g => new
            {
                AccountId = g.Key,
                TotalDebit = g.Sum(x => x.Debit ?? 0),
                TotalCredit = g.Sum(x => x.Credit ?? 0)
            })
            .Where(x => x.TotalDebit + x.TotalCredit > 0)
            .ToListAsync(cancellationToken);

        var accountIds = aggregates.Select(x => x.AccountId).ToList();
        var titles = await _context.Accounts
            .AsNoTracking()
            .Where(x => x.AccountID != null && accountIds.Contains(x.AccountID))
            .Select(x => new { x.AccountID, x.AccountTitle })
            .ToListAsync(cancellationToken);

        var titleMap = titles
            .Where(x => x.AccountID != null)
            .GroupBy(x => x.AccountID!, StringComparer.OrdinalIgnoreCase)
            .ToDictionary(g => g.Key, g => g.First().AccountTitle ?? g.Key, StringComparer.OrdinalIgnoreCase);

        var rows = aggregates
            .Select(x => new AccountSummaryRowDto
            {
                AccountId = x.AccountId,
                Account = titleMap.TryGetValue(x.AccountId, out var title) ? title : x.AccountId,
                Received = x.TotalCredit,
                Payment = x.TotalDebit,
                Balance = x.TotalDebit - x.TotalCredit,
                IsFeeOverlay = false
            })
            .OrderBy(x => x.AccountId)
            .ToList();

        var tuition = await SumFeeAsync(fromDate, toDate, 1, cancellationToken);
        var admission = await SumFeeAsync(fromDate, toDate, 2, cancellationToken);
        var misc = await SumFeeAsync(fromDate, toDate, 3, cancellationToken);
        var prev = await SumFeeAsync(fromDate, toDate, 4, cancellationToken);

        void AddFee(string label, decimal amount)
        {
            rows.Add(new AccountSummaryRowDto
            {
                AccountId = string.Empty,
                Account = label,
                Received = amount,
                Payment = 0,
                Balance = 0,
                IsFeeOverlay = true
            });
        }

        AddFee("Tuition Fee", tuition);
        AddFee("Admission Fee", admission);
        AddFee("Misc Charges", misc);
        AddFee("Prev Balance", prev);

        var glCredits = aggregates.Sum(x => x.TotalCredit);
        var glDebits = aggregates.Sum(x => x.TotalDebit);
        var feeTotal = tuition + admission + misc + prev;
        var totalReceived = feeTotal + glCredits;

        return new AccountSummaryResultDto
        {
            From = fromDate,
            To = toDate,
            Rows = rows,
            TotalReceived = totalReceived,
            TotalPayment = glDebits,
            ClosingBalance = totalReceived - glDebits
        };
    }

    private async Task<decimal> SumFeeAsync(
        DateTime from,
        DateTime to,
        int fundTypeId,
        CancellationToken cancellationToken)
    {
        return await _context.FeeAndFundCollections
            .AsNoTracking()
            .Where(x =>
                x.FundTypeID == fundTypeId &&
                x.Date != null &&
                x.Date.Value.Date >= from &&
                x.Date.Value.Date <= to)
            .SumAsync(x => x.Recieved ?? 0, cancellationToken);
    }
}
