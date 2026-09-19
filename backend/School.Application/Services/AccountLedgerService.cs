using Microsoft.EntityFrameworkCore;
using School.Application.DTOs;
using School.Application.Interfaces;
using School.Infrastructure.Data;

namespace School.Application.Services;

public class AccountLedgerService : IAccountLedgerService
{
    private readonly AppDbContext _context;

    public AccountLedgerService(AppDbContext context) => _context = context;

    public async Task<AccountLedgerResultDto> GetLedgerAsync(
        string accountId,
        DateTime from,
        DateTime to,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(accountId))
            throw new ArgumentException("Account is required.");

        var fromDate = from.Date;
        var toDate = to.Date;
        if (toDate < fromDate)
            throw new ArgumentException("End date must be on or after the start date.");

        var account = await _context.Accounts
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.AccountID == accountId, cancellationToken)
            ?? throw new KeyNotFoundException("Account not found.");

        var details = await _context.TransactionDetails
            .AsNoTracking()
            .Where(x =>
                x.AccountID == accountId &&
                x.Date != null &&
                x.Date.Value.Date >= fromDate &&
                x.Date.Value.Date <= toDate)
            .OrderBy(x => x.Date)
            .ThenBy(x => x.ID)
            .ToListAsync(cancellationToken);

        var lines = new List<AccountLedgerLineDto>();
        decimal balance = 0;
        var serial = 0;

        foreach (var item in details)
        {
            var debit = item.Debit ?? 0;
            var credit = item.Credit ?? 0;

            if (credit == 0)
            {
                serial++;
                balance = serial == 1 ? debit : balance + debit;
                lines.Add(new AccountLedgerLineDto
                {
                    Serial = serial,
                    Id = item.ID,
                    Date = item.Date,
                    Narration = item.Narration,
                    Received = 0,
                    Payment = debit,
                    Balance = balance
                });
            }
            else if (debit == 0)
            {
                serial++;
                balance = serial == 1 ? credit : balance - credit;
                lines.Add(new AccountLedgerLineDto
                {
                    Serial = serial,
                    Id = item.ID,
                    Date = item.Date,
                    Narration = item.Narration,
                    Received = credit,
                    Payment = 0,
                    Balance = balance
                });
            }
        }

        return new AccountLedgerResultDto
        {
            AccountId = account.AccountID ?? accountId,
            AccountTitle = account.AccountTitle ?? string.Empty,
            From = fromDate,
            To = toDate,
            Lines = lines,
            TotalReceived = lines.Sum(x => x.Received),
            TotalPayment = lines.Sum(x => x.Payment),
            ClosingBalance = lines.Count == 0 ? 0 : lines[^1].Balance
        };
    }
}
