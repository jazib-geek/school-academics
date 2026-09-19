using Microsoft.EntityFrameworkCore;
using School.Application.Common;
using School.Application.DTOs;
using School.Application.Interfaces;
using School.Infrastructure.Data;
using School.Infrastructure.Entities;

namespace School.Application.Services;

public class AccountVoucherService : IAccountVoucherService
{
    private readonly AppDbContext _context;
    private readonly ISystemAccountResolver _systemAccounts;

    public AccountVoucherService(AppDbContext context, ISystemAccountResolver systemAccounts)
    {
        _context = context;
        _systemAccounts = systemAccounts;
    }

    public Task<SaveVoucherResultDto> SaveCashPaymentAsync(
        SaveVoucherRequestDto request,
        string? entryUser,
        CancellationToken cancellationToken = default) =>
        SaveAsync("CPV", isPayment: true, request, entryUser, cancellationToken);

    public Task<SaveVoucherResultDto> SaveCashReceiptAsync(
        SaveVoucherRequestDto request,
        string? entryUser,
        CancellationToken cancellationToken = default) =>
        SaveAsync("CRV", isPayment: false, request, entryUser, cancellationToken);

    private async Task<SaveVoucherResultDto> SaveAsync(
        string voucherType,
        bool isPayment,
        SaveVoucherRequestDto request,
        string? entryUser,
        CancellationToken cancellationToken)
    {
        await _systemAccounts.EnsureSystemAccountsAsync(cancellationToken);

        if (request.Lines is null || request.Lines.Count == 0)
            throw new ArgumentException("Add at least one line before saving.");

        var cashAccountId = await _systemAccounts.GetCashInHandAccountIdAsync(cancellationToken);
        var date = request.Date.Date;
        var user = string.IsNullOrWhiteSpace(entryUser) ? "User" : entryUser.Trim();
        if (user.Length > 20)
            user = user[..20];

        if (request.Lines.Any(x => string.IsNullOrWhiteSpace(x.AccountId)))
            throw new ArgumentException("Each line needs an account.");

        var accountIds = request.Lines
            .Select(x => x.AccountId.Trim())
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        if (cashAccountId is not null &&
            accountIds.Any(id => string.Equals(id, cashAccountId, StringComparison.OrdinalIgnoreCase)))
        {
            throw new InvalidOperationException("Cash in hand cannot be selected on this voucher.");
        }

        var accounts = await _context.Accounts
            .AsNoTracking()
            .Where(x => x.AccountID != null && accountIds.Contains(x.AccountID))
            .ToListAsync(cancellationToken);

        var accountMap = accounts
            .Where(x => x.AccountID != null)
            .GroupBy(x => x.AccountID!, StringComparer.OrdinalIgnoreCase)
            .ToDictionary(g => g.Key, g => g.First(), StringComparer.OrdinalIgnoreCase);

        foreach (var line in request.Lines)
        {
            if (line.Amount <= 0)
                throw new ArgumentException("Amount must be greater than zero.");
            if (!accountMap.ContainsKey(line.AccountId.Trim()))
                throw new KeyNotFoundException($"Account '{line.AccountId}' was not found.");
        }

        var voucherNo = await GenerateVoucherCodeAsync(voucherType, date, cancellationToken);
        var totalAmount = request.Lines.Sum(x => x.Amount);

        _context.TransactionMasters.Add(new TransactionMaster
        {
            VoucherNo = voucherNo,
            VoucherType = voucherType,
            TransactionDate = date,
            EntryUser = user,
            TotalAmount = totalAmount,
            Status = "Completed"
        });

        var serial = 1;
        foreach (var line in request.Lines)
        {
            var account = accountMap[line.AccountId.Trim()];
            _context.TransactionDetails.Add(new TransactionDetail
            {
                VoucherNumber = voucherNo,
                VoucherType = voucherType,
                Date = date,
                Month = date.Month,
                Year = date.Year,
                MasterID = account.MasterID,
                GroupID = account.GroupID,
                SubGroupID = account.SubGroupID,
                AccountID = account.AccountID,
                Narration = string.IsNullOrWhiteSpace(line.Narration) ? null : line.Narration.Trim(),
                Debit = isPayment ? line.Amount : 0,
                Credit = isPayment ? 0 : line.Amount,
                SerialNo = serial++
            });
        }

        await _context.SaveChangesAsync(cancellationToken);

        return new SaveVoucherResultDto
        {
            VoucherNo = voucherNo,
            VoucherType = voucherType,
            TotalAmount = totalAmount
        };
    }

    private async Task<string> GenerateVoucherCodeAsync(
        string voucherType,
        DateTime date,
        CancellationToken cancellationToken)
    {
        var voucherMeta = await _context.VoucherTypes
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.VoucherTypeDenotion == voucherType, cancellationToken)
            ?? throw new InvalidOperationException($"Voucher type '{voucherType}' is not configured.");

        var prefix = voucherMeta.Prefix ?? string.Empty;
        var month = date.Month;
        var year = date.Year;

        var count = await _context.TransactionDetails
            .AsNoTracking()
            .CountAsync(
                x => x.Month == month && x.Year == year && x.VoucherType == voucherType,
                cancellationToken);

        var yy = PakistanTime.Now.ToString("yy");
        var mm = month.ToString("00");

        if (count == 0)
            return $"{yy}{mm}{prefix}0001";

        return $"{yy}{mm}{prefix}{(count + 1).ToString("0000")}";
    }
}
