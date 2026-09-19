using Microsoft.EntityFrameworkCore;
using School.Application.DTOs;
using School.Application.Interfaces;
using School.Infrastructure.Data;

namespace School.Application.Services;

public class AccountCashBookService : IAccountCashBookService
{
    private readonly AppDbContext _context;

    public AccountCashBookService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<CashBookResultDto> GetCashBookAsync(
        DateTime from,
        DateTime to,
        CancellationToken cancellationToken = default)
    {
        var fromDate = from.Date;
        var toDate = to.Date;
        if (toDate < fromDate)
            throw new ArgumentException("End date must be on or after the start date.");

        var details = await (
            from d in _context.TransactionDetails.AsNoTracking()
            join a in _context.Accounts.AsNoTracking() on d.AccountID equals a.AccountID
            where d.Date != null && d.Date.Value.Date >= fromDate && d.Date.Value.Date <= toDate
            orderby d.Date, d.ID
            select new
            {
                d.ID,
                d.VoucherNumber,
                d.AccountID,
                AccountTitle = a.AccountTitle,
                d.Narration,
                d.Debit,
                d.Credit,
                Date = d.Date!.Value.Date
            }).ToListAsync(cancellationToken);

        var days = details
            .GroupBy(x => x.Date)
            .OrderBy(g => g.Key)
            .Select(g => new CashBookDayDto
            {
                Date = g.Key,
                Lines = g.Select(item => new CashBookLineDto
                {
                    Id = item.ID,
                    VoucherNo = item.VoucherNumber,
                    AccountId = item.AccountID ?? string.Empty,
                    AccountTitle = item.AccountTitle ?? string.Empty,
                    Narration = item.Narration,
                    Received = item.Credit ?? 0,
                    Payment = item.Debit ?? 0
                }).ToList()
            })
            .ToList();

        var allLines = days.SelectMany(d => d.Lines).ToList();
        var expenseTotal = allLines.Sum(x => x.Payment);
        var glCredits = allLines.Sum(x => x.Received);
        var glDebits = allLines.Sum(x => x.Payment);

        var tuition = await SumFeeAsync(fromDate, toDate, 1, cancellationToken);
        var admission = await SumFeeAsync(fromDate, toDate, 2, cancellationToken);
        var misc = await SumFeeAsync(fromDate, toDate, 3, cancellationToken);
        var prev = await SumFeeAsync(fromDate, toDate, 4, cancellationToken);
        var fine = await SumFeeAsync(fromDate, toDate, 6, cancellationToken);

        var feeTotal = tuition + admission + misc + prev + fine;
        var totalReceived = feeTotal + glCredits;
        var closing = totalReceived - glDebits;

        return new CashBookResultDto
        {
            From = fromDate,
            To = toDate,
            Days = days,
            DailyExpensesTotal = expenseTotal,
            TuitionFee = tuition,
            AdmissionFee = admission,
            MiscCharges = misc,
            PrevBalance = prev,
            Fine = fine,
            TotalReceived = totalReceived,
            TotalPayment = glDebits,
            ClosingBalance = closing
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
