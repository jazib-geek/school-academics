using Microsoft.EntityFrameworkCore;
using School.Application.Common;
using School.Application.DTOs;
using School.Application.Interfaces;
using School.Infrastructure.Data;
using School.Infrastructure.Entities;

namespace School.Application.Services;

public class AccountChartService : IAccountChartService
{
    private readonly AppDbContext _context;
    private readonly ISystemAccountResolver _systemAccounts;

    public AccountChartService(AppDbContext context, ISystemAccountResolver systemAccounts)
    {
        _context = context;
        _systemAccounts = systemAccounts;
    }

    public Task EnsureSystemAccountsAsync(CancellationToken cancellationToken = default) =>
        _systemAccounts.EnsureSystemAccountsAsync(cancellationToken);

    public async Task<IReadOnlyList<AccountMasterDto>> GetMastersAsync(CancellationToken cancellationToken = default)
    {
        await _systemAccounts.EnsureSystemAccountsAsync(cancellationToken);

        return await _context.AccountMasters
            .AsNoTracking()
            .OrderBy(x => x.MasterID)
            .Select(x => new AccountMasterDto
            {
                MasterId = x.MasterID,
                Title = x.Title ?? string.Empty
            })
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<AccountGroupDto>> GetGroupsAsync(
        int? masterId = null,
        CancellationToken cancellationToken = default)
    {
        var masters = await _context.AccountMasters.AsNoTracking()
            .ToDictionaryAsync(x => x.MasterID, x => x.Title ?? string.Empty, cancellationToken);

        var query = _context.AccountGroups.AsNoTracking().AsQueryable();
        if (masterId.HasValue)
            query = query.Where(x => x.MasterID == masterId);

        var rows = await query.OrderBy(x => x.GroupID).ToListAsync(cancellationToken);

        return rows.Select(x => new AccountGroupDto
        {
            Id = x.ID,
            MasterId = x.MasterID,
            MasterTitle = x.MasterID.HasValue && masters.TryGetValue(x.MasterID.Value, out var t) ? t : null,
            GroupId = x.GroupID ?? string.Empty,
            GroupTitle = x.GroupTitle ?? string.Empty
        }).ToList();
    }

    public async Task<IReadOnlyList<AccountSubGroupDto>> GetSubGroupsAsync(
        string? groupId = null,
        CancellationToken cancellationToken = default)
    {
        var masters = await _context.AccountMasters.AsNoTracking()
            .ToDictionaryAsync(x => x.MasterID, x => x.Title ?? string.Empty, cancellationToken);
        var groups = await _context.AccountGroups.AsNoTracking()
            .Where(x => x.GroupID != null)
            .ToDictionaryAsync(x => x.GroupID!, x => x.GroupTitle ?? string.Empty, cancellationToken);

        var query = _context.AccountSubGroups.AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(groupId))
            query = query.Where(x => x.GroupID == groupId);

        var rows = await query.OrderBy(x => x.SubGroupID).ToListAsync(cancellationToken);

        return rows.Select(x => new AccountSubGroupDto
        {
            Id = x.ID,
            MasterId = x.MasterID,
            MasterTitle = masters.TryGetValue(x.MasterID, out var mt) ? mt : null,
            GroupId = x.GroupID ?? string.Empty,
            GroupTitle = x.GroupID != null && groups.TryGetValue(x.GroupID, out var gt) ? gt : null,
            SubGroupId = x.SubGroupID ?? string.Empty,
            SubGroupName = x.SubGroupName ?? string.Empty
        }).ToList();
    }

    public async Task<IReadOnlyList<AccountLevel4Dto>> GetAccountsAsync(
        string? subGroupId = null,
        CancellationToken cancellationToken = default)
    {
        await _systemAccounts.EnsureSystemAccountsAsync(cancellationToken);

        var masters = await _context.AccountMasters.AsNoTracking()
            .ToDictionaryAsync(x => x.MasterID, x => x.Title ?? string.Empty, cancellationToken);
        var groups = await _context.AccountGroups.AsNoTracking()
            .Where(x => x.GroupID != null)
            .ToDictionaryAsync(x => x.GroupID!, x => x.GroupTitle ?? string.Empty, cancellationToken);
        var subGroups = await _context.AccountSubGroups.AsNoTracking()
            .Where(x => x.SubGroupID != null)
            .ToDictionaryAsync(x => x.SubGroupID!, x => x.SubGroupName ?? string.Empty, cancellationToken);

        var query = _context.Accounts.AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(subGroupId))
            query = query.Where(x => x.SubGroupID == subGroupId);

        var rows = await query.OrderBy(x => x.AccountID).ToListAsync(cancellationToken);

        return rows.Select(x => new AccountLevel4Dto
        {
            Id = x.ID,
            MasterId = x.MasterID,
            MasterTitle = x.MasterID.HasValue && masters.TryGetValue(x.MasterID.Value, out var mt) ? mt : null,
            GroupId = x.GroupID,
            GroupTitle = x.GroupID != null && groups.TryGetValue(x.GroupID, out var gt) ? gt : null,
            SubGroupId = x.SubGroupID,
            SubGroupName = x.SubGroupID != null && subGroups.TryGetValue(x.SubGroupID, out var sn) ? sn : null,
            AccountId = x.AccountID ?? string.Empty,
            AccountTitle = x.AccountTitle ?? string.Empty,
            IsSystemAccount = SystemAccountTitles.IsReserved(x.AccountTitle)
        }).ToList();
    }

    public async Task<IReadOnlyList<AccountLookupDto>> GetPostableAccountsAsync(
        bool excludeCashInHand = true,
        CancellationToken cancellationToken = default)
    {
        await _systemAccounts.EnsureSystemAccountsAsync(cancellationToken);
        var cashId = excludeCashInHand
            ? await _systemAccounts.GetCashInHandAccountIdAsync(cancellationToken)
            : null;

        var rows = await _context.Accounts
            .AsNoTracking()
            .Where(x => x.AccountID != null && x.AccountTitle != null)
            .OrderBy(x => x.AccountTitle)
            .ToListAsync(cancellationToken);

        return rows
            .Where(x => cashId is null || !string.Equals(x.AccountID, cashId, StringComparison.OrdinalIgnoreCase))
            .Select(x => new AccountLookupDto
            {
                Id = x.ID,
                AccountId = x.AccountID!,
                AccountTitle = x.AccountTitle!,
                MasterId = x.MasterID,
                GroupId = x.GroupID,
                SubGroupId = x.SubGroupID,
                IsSystemAccount = SystemAccountTitles.IsReserved(x.AccountTitle)
            })
            .ToList();
    }

    public async Task<AccountGroupDto> CreateGroupAsync(
        CreateAccountGroupRequestDto request,
        CancellationToken cancellationToken = default)
    {
        var title = NormalizeTitle(request.Title);
        await EnsureTitleAvailableAsync(title, cancellationToken);

        var master = await _context.AccountMasters
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.MasterID == request.MasterId, cancellationToken)
            ?? throw new KeyNotFoundException("Master account not found.");

        var siblings = await _context.AccountGroups
            .Where(x => x.MasterID == request.MasterId)
            .ToListAsync(cancellationToken);

        var postFix = siblings.Count + 1;
        var groupId = postFix > 9
            ? $"{request.MasterId}-{postFix}"
            : $"{request.MasterId}-0{postFix}";

        var entity = new AccountGroup
        {
            MasterID = request.MasterId,
            GroupID = groupId,
            GroupTitle = title
        };
        _context.AccountGroups.Add(entity);
        await _context.SaveChangesAsync(cancellationToken);

        return new AccountGroupDto
        {
            Id = entity.ID,
            MasterId = entity.MasterID,
            MasterTitle = master.Title,
            GroupId = entity.GroupID ?? string.Empty,
            GroupTitle = entity.GroupTitle ?? string.Empty
        };
    }

    public async Task<AccountSubGroupDto> CreateSubGroupAsync(
        CreateAccountSubGroupRequestDto request,
        CancellationToken cancellationToken = default)
    {
        var title = NormalizeTitle(request.Title);
        await EnsureTitleAvailableAsync(title, cancellationToken);

        var group = await _context.AccountGroups
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.GroupID == request.GroupId, cancellationToken)
            ?? throw new KeyNotFoundException("Account group not found.");

        if (group.MasterID is null)
            throw new InvalidOperationException("Account group is missing a master.");

        var siblings = await _context.AccountSubGroups
            .Where(x => x.GroupID == request.GroupId)
            .ToListAsync(cancellationToken);

        var postFix = siblings.Count + 1;
        var subGroupId = postFix > 9
            ? $"{request.GroupId}-0{postFix}"
            : $"{request.GroupId}-00{postFix}";

        var entity = new AccountSubGroup
        {
            MasterID = group.MasterID.Value,
            GroupID = request.GroupId,
            SubGroupID = subGroupId,
            SubGroupName = title
        };
        _context.AccountSubGroups.Add(entity);
        await _context.SaveChangesAsync(cancellationToken);

        var masterTitle = await _context.AccountMasters.AsNoTracking()
            .Where(x => x.MasterID == entity.MasterID)
            .Select(x => x.Title)
            .FirstOrDefaultAsync(cancellationToken);

        return new AccountSubGroupDto
        {
            Id = entity.ID,
            MasterId = entity.MasterID,
            MasterTitle = masterTitle,
            GroupId = entity.GroupID ?? string.Empty,
            GroupTitle = group.GroupTitle,
            SubGroupId = entity.SubGroupID ?? string.Empty,
            SubGroupName = entity.SubGroupName ?? string.Empty
        };
    }

    public async Task<AccountLevel4Dto> CreateAccountAsync(
        CreateAccountRequestDto request,
        string? entryUser,
        CancellationToken cancellationToken = default)
    {
        var title = NormalizeTitle(request.AccountTitle);
        if (SystemAccountTitles.IsReserved(title))
            throw new InvalidOperationException("System accounts cannot be created manually.");

        await EnsureAccountTitleAvailableAsync(title, cancellationToken);

        var subGroup = await _context.AccountSubGroups
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.SubGroupID == request.SubGroupId, cancellationToken)
            ?? throw new KeyNotFoundException("Account subgroup not found.");

        var siblings = await _context.Accounts
            .Where(x => x.SubGroupID == request.SubGroupId)
            .ToListAsync(cancellationToken);

        var postFix = siblings.Count + 1;
        var accountId = postFix > 9
            ? $"{request.SubGroupId}-00{postFix}"
            : $"{request.SubGroupId}-000{postFix}";

        var entity = new Account
        {
            MasterID = subGroup.MasterID,
            GroupID = subGroup.GroupID,
            SubGroupID = subGroup.SubGroupID,
            AccountID = accountId,
            AccountTitle = title,
            EntryUser = string.IsNullOrWhiteSpace(entryUser) ? "User" : entryUser.Trim(),
            CreationDate = PakistanTime.Today.ToDateTime(TimeOnly.MinValue),
            OpeningBalance = 0
        };
        _context.Accounts.Add(entity);
        await _context.SaveChangesAsync(cancellationToken);

        var list = await GetAccountsAsync(request.SubGroupId, cancellationToken);
        return list.First(x => x.Id == entity.ID);
    }

    public async Task RenameGroupAsync(
        int id,
        RenameAccountNodeRequestDto request,
        CancellationToken cancellationToken = default)
    {
        var entity = await _context.AccountGroups.FirstOrDefaultAsync(x => x.ID == id, cancellationToken)
            ?? throw new KeyNotFoundException("Account group not found.");

        var title = NormalizeTitle(request.Title);
        await EnsureTitleAvailableAsync(title, cancellationToken, excludeGroupId: id);
        entity.GroupTitle = title;
        await _context.SaveChangesAsync(cancellationToken);
    }

    public async Task RenameSubGroupAsync(
        int id,
        RenameAccountNodeRequestDto request,
        CancellationToken cancellationToken = default)
    {
        var entity = await _context.AccountSubGroups.FirstOrDefaultAsync(x => x.ID == id, cancellationToken)
            ?? throw new KeyNotFoundException("Account subgroup not found.");

        var title = NormalizeTitle(request.Title);
        await EnsureTitleAvailableAsync(title, cancellationToken, excludeSubGroupId: id);
        entity.SubGroupName = title;
        await _context.SaveChangesAsync(cancellationToken);
    }

    public async Task RenameAccountAsync(
        int id,
        RenameAccountNodeRequestDto request,
        CancellationToken cancellationToken = default)
    {
        var entity = await _context.Accounts.FirstOrDefaultAsync(x => x.ID == id, cancellationToken)
            ?? throw new KeyNotFoundException("Account not found.");

        if (SystemAccountTitles.IsReserved(entity.AccountTitle))
            throw new InvalidOperationException("System accounts cannot be renamed.");

        var title = NormalizeTitle(request.Title);
        if (SystemAccountTitles.IsReserved(title))
            throw new InvalidOperationException("This account title is reserved.");

        await EnsureAccountTitleAvailableAsync(title, cancellationToken, excludeId: id);
        entity.AccountTitle = title;
        await _context.SaveChangesAsync(cancellationToken);
    }

    private static string NormalizeTitle(string title)
    {
        if (string.IsNullOrWhiteSpace(title))
            throw new ArgumentException("Title is required.");
        return title.Trim();
    }

    private async Task EnsureAccountTitleAvailableAsync(
        string title,
        CancellationToken cancellationToken,
        int? excludeId = null)
    {
        var rows = await _context.Accounts.AsNoTracking()
            .Where(x => x.AccountTitle != null && (!excludeId.HasValue || x.ID != excludeId.Value))
            .Select(x => new { x.ID, x.AccountTitle })
            .ToListAsync(cancellationToken);

        if (rows.Any(x => string.Equals(x.AccountTitle!.Trim(), title, StringComparison.OrdinalIgnoreCase)))
            throw new InvalidOperationException("An account with this name already exists.");
    }

    private async Task EnsureTitleAvailableAsync(
        string title,
        CancellationToken cancellationToken,
        int? excludeGroupId = null,
        int? excludeSubGroupId = null)
    {
        var groups = await _context.AccountGroups.AsNoTracking()
            .Where(x => x.GroupTitle != null && (!excludeGroupId.HasValue || x.ID != excludeGroupId.Value))
            .Select(x => x.GroupTitle!)
            .ToListAsync(cancellationToken);

        if (groups.Any(x => string.Equals(x.Trim(), title, StringComparison.OrdinalIgnoreCase)))
            throw new InvalidOperationException("A group with this name already exists.");

        var subGroups = await _context.AccountSubGroups.AsNoTracking()
            .Where(x => x.SubGroupName != null && (!excludeSubGroupId.HasValue || x.ID != excludeSubGroupId.Value))
            .Select(x => x.SubGroupName!)
            .ToListAsync(cancellationToken);

        if (subGroups.Any(x => string.Equals(x.Trim(), title, StringComparison.OrdinalIgnoreCase)))
            throw new InvalidOperationException("A subgroup with this name already exists.");
    }
}
