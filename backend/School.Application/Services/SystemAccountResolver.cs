using Microsoft.EntityFrameworkCore;
using School.Application.Common;
using School.Application.DTOs;
using School.Application.Interfaces;
using School.Infrastructure.Data;
using School.Infrastructure.Entities;

namespace School.Application.Services;

public class SystemAccountResolver : ISystemAccountResolver
{
    private readonly AppDbContext _context;

    public SystemAccountResolver(AppDbContext context) => _context = context;

    public async Task EnsureSystemAccountsAsync(CancellationToken cancellationToken = default)
    {
        await EnsureTitleAsync(SystemAccountTitles.CashInHand, preferCapital: false, cancellationToken);
        await EnsureTitleAsync(SystemAccountTitles.OwnerDrawings, preferCapital: true, cancellationToken);
    }

    public async Task<string?> GetCashInHandAccountIdAsync(CancellationToken cancellationToken = default)
    {
        var account = await FindByTitleAsync(SystemAccountTitles.CashInHand, cancellationToken);
        return account?.AccountID;
    }

    public async Task<string?> GetOwnerDrawingsAccountIdAsync(CancellationToken cancellationToken = default)
    {
        var account = await FindByTitleAsync(SystemAccountTitles.OwnerDrawings, cancellationToken);
        return account?.AccountID;
    }

    public async Task<AccountLookupDto?> GetCashInHandAsync(CancellationToken cancellationToken = default)
    {
        var account = await FindByTitleAsync(SystemAccountTitles.CashInHand, cancellationToken);
        return account is null ? null : Map(account);
    }

    public async Task<AccountLookupDto?> GetOwnerDrawingsAsync(CancellationToken cancellationToken = default)
    {
        var account = await FindByTitleAsync(SystemAccountTitles.OwnerDrawings, cancellationToken);
        return account is null ? null : Map(account);
    }

    private async Task<Account?> FindByTitleAsync(string title, CancellationToken cancellationToken)
    {
        var normalized = title.Trim();
        var rows = await _context.Accounts
            .AsNoTracking()
            .Where(x => x.AccountTitle != null)
            .ToListAsync(cancellationToken);

        return rows.FirstOrDefault(x =>
            string.Equals(x.AccountTitle!.Trim(), normalized, StringComparison.OrdinalIgnoreCase));
    }

    private async Task EnsureTitleAsync(string title, bool preferCapital, CancellationToken cancellationToken)
    {
        if (await FindByTitleAsync(title, cancellationToken) is not null)
            return;

        AccountSubGroup? subGroup = null;

        if (preferCapital)
        {
            subGroup = await _context.AccountSubGroups
                .AsNoTracking()
                .Where(x => x.MasterID == 5)
                .OrderBy(x => x.SubGroupID)
                .FirstOrDefaultAsync(cancellationToken);
        }

        if (subGroup is null && !preferCapital)
        {
            subGroup = await _context.AccountSubGroups
                .AsNoTracking()
                .Where(x => x.SubGroupID != null && x.SubGroupID.StartsWith("1-02"))
                .OrderBy(x => x.SubGroupID)
                .FirstOrDefaultAsync(cancellationToken);
        }

        subGroup ??= await _context.AccountSubGroups
            .AsNoTracking()
            .Where(x => x.SubGroupID != null)
            .OrderBy(x => x.SubGroupID)
            .FirstOrDefaultAsync(cancellationToken);

        if (subGroup?.SubGroupID is null)
            throw new InvalidOperationException(
                $"Cannot create system account '{title}' because no account subgroup exists.");

        var siblings = await _context.Accounts
            .Where(x => x.SubGroupID == subGroup.SubGroupID)
            .ToListAsync(cancellationToken);

        var postFix = siblings.Count + 1;
        var accountId = postFix > 9
            ? $"{subGroup.SubGroupID}-00{postFix}"
            : $"{subGroup.SubGroupID}-000{postFix}";

        _context.Accounts.Add(new Account
        {
            MasterID = subGroup.MasterID,
            GroupID = subGroup.GroupID,
            SubGroupID = subGroup.SubGroupID,
            AccountID = accountId,
            AccountTitle = title,
            EntryUser = "System",
            CreationDate = PakistanTime.Today.ToDateTime(TimeOnly.MinValue),
            OpeningBalance = 0
        });

        await _context.SaveChangesAsync(cancellationToken);
    }

    private static AccountLookupDto Map(Account account) => new()
    {
        Id = account.ID,
        AccountId = account.AccountID ?? string.Empty,
        AccountTitle = account.AccountTitle ?? string.Empty,
        MasterId = account.MasterID,
        GroupId = account.GroupID,
        SubGroupId = account.SubGroupID,
        IsSystemAccount = SystemAccountTitles.IsReserved(account.AccountTitle)
    };
}
