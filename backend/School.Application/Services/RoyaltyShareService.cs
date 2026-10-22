using Microsoft.EntityFrameworkCore;
using School.Application.Common;
using School.Application.DTOs;
using School.Application.Interfaces;
using School.Infrastructure.Data;
using School.Infrastructure.Entities;
using System.Data;
using System.Globalization;

namespace School.Application.Services;

public class RoyaltyShareService : IRoyaltyShareService
{
    private readonly AppDbContext _context;
    private readonly IAccountVoucherService _voucherService;
    private readonly ISystemAccountResolver _systemAccounts;

    public RoyaltyShareService(
        AppDbContext context,
        IAccountVoucherService voucherService,
        ISystemAccountResolver systemAccounts)
    {
        _context = context;
        _voucherService = voucherService;
        _systemAccounts = systemAccounts;
    }

    public async Task<RoyaltyShareMetaDto> GetMetaAsync(CancellationToken cancellationToken = default)
    {
        var profile = await GetProfileAsync(cancellationToken);
        return new RoyaltyShareMetaDto
        {
            IsFranchise = profile?.IsFranchise == true,
            RoyaltySharePercent = profile?.IsFranchise == true ? profile.RoyaltySharePercent : null
        };
    }

    public async Task<RoyaltyShareMonthDto> GetMonthAsync(
        int year,
        int month,
        CancellationToken cancellationToken = default)
    {
        var profile = await RequireFranchiseProfileAsync(cancellationToken);
        ValidateMonth(year, month);

        var closing = await _context.FranchiseRoyaltyClosings
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.CalendarYear == year && x.CalendarMonth == month, cancellationToken);

        if (closing is not null)
            return await MapClosedMonthAsync(closing, profile, cancellationToken);

        var (from, to) = MonthRange(year, month);
        var percent = profile.RoyaltySharePercent ?? 0;
        var breakdown = await GetFundBreakdownAsync(from, to, percent, cancellationToken);
        var total = breakdown.Sum(x => x.Collected);
        var royalty = ComputeRoyaltyAmount(total, percent);

        return new RoyaltyShareMonthDto
        {
            CalendarYear = year,
            CalendarMonth = month,
            IsClosed = false,
            TotalFeeCollected = total,
            RoyaltySharePercent = percent,
            RoyaltyAmount = royalty,
            CampusLabel = profile.CampusLabel,
            SchoolName = profile.SchoolName,
            FundBreakdown = breakdown
        };
    }

    public async Task<IReadOnlyList<RoyaltyShareHistoryItemDto>> GetHistoryAsync(
        int limit = 24,
        CancellationToken cancellationToken = default)
    {
        await RequireFranchiseProfileAsync(cancellationToken);

        var take = Math.Clamp(limit, 1, 120);
        var rows = await _context.FranchiseRoyaltyClosings
            .AsNoTracking()
            .OrderByDescending(x => x.CalendarYear)
            .ThenByDescending(x => x.CalendarMonth)
            .Take(take)
            .ToListAsync(cancellationToken);

        return rows.Select(MapHistory).ToList();
    }

    public async Task<RoyaltyShareMonthDto> CloseMonthAsync(
        int year,
        int month,
        int closedByUserId,
        string? closedByUserName,
        string? entryUser,
        CancellationToken cancellationToken = default)
    {
        var profile = await RequireFranchiseProfileAsync(cancellationToken);
        ValidateMonth(year, month);

        var exists = await _context.FranchiseRoyaltyClosings
            .AsNoTracking()
            .AnyAsync(x => x.CalendarYear == year && x.CalendarMonth == month, cancellationToken);

        if (exists)
            throw new InvalidOperationException("This month is already closed.");

        var (from, to) = MonthRange(year, month);
        var percent = profile.RoyaltySharePercent ?? 0;
        var breakdown = await GetFundBreakdownAsync(from, to, percent, cancellationToken);
        var total = breakdown.Sum(x => x.Collected);
        var royalty = ComputeRoyaltyAmount(total, percent);

        if (royalty <= 0)
            throw new InvalidOperationException("Royalty amount must be greater than zero to close this month.");

        await using var transaction = await _context.Database.BeginTransactionAsync(
            IsolationLevel.Serializable,
            cancellationToken);

        await _systemAccounts.EnsureSystemAccountsAsync(cancellationToken);
        var accountId = await _systemAccounts.GetFranchiseRoyaltyAccountIdAsync(cancellationToken)
            ?? throw new InvalidOperationException(
                "Royalty share expense account is not set up. Contact your administrator.");

        var closeDate = PakistanTime.Today.ToDateTime(TimeOnly.MinValue);
        var monthLabel = new DateTime(year, month, 1).ToString("MMM yyyy", CultureInfo.InvariantCulture);
        var narration = $"Royalty share — {monthLabel}";
        var user = TruncateUser(entryUser ?? closedByUserName);

        var voucher = await _voucherService.SaveCashPaymentAsync(
            new SaveVoucherRequestDto
            {
                Date = closeDate,
                Lines =
                [
                    new VoucherLineInputDto
                    {
                        AccountId = accountId,
                        Amount = royalty,
                        Narration = narration
                    }
                ]
            },
            user,
            cancellationToken);

        var now = PakistanTime.Now;
        var entity = new FranchiseRoyaltyClosing
        {
            CalendarYear = year,
            CalendarMonth = month,
            TotalFeeCollected = total,
            RoyaltySharePercent = percent,
            RoyaltyAmount = royalty,
            ClosedAtPkt = now,
            ClosedByUserId = closedByUserId > 0 ? closedByUserId : null,
            ClosedByUserName = string.IsNullOrWhiteSpace(closedByUserName) ? null : closedByUserName.Trim(),
            VoucherNo = voucher.VoucherNo,
            EntryUser = user,
            CreatedAtPkt = now
        };

        _context.FranchiseRoyaltyClosings.Add(entity);
        await _context.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        return await MapClosedMonthAsync(entity, profile, cancellationToken);
    }

    private async Task<CampusProfile> RequireFranchiseProfileAsync(CancellationToken cancellationToken)
    {
        var profile = await GetProfileAsync(cancellationToken);
        if (profile?.IsFranchise != true)
            throw new InvalidOperationException("Royalty share reporting is not enabled for this campus.");

        if (profile.RoyaltySharePercent is null or <= 0)
            throw new InvalidOperationException("The agreed royalty share rate is not configured for this campus.");

        return profile;
    }

    private async Task<CampusProfile?> GetProfileAsync(CancellationToken cancellationToken)
    {
        return await _context.CampusProfiles
            .AsNoTracking()
            .OrderBy(x => x.ID)
            .FirstOrDefaultAsync(cancellationToken);
    }

    private static void ValidateMonth(int year, int month)
    {
        if (year < 2000 || year > 2100)
            throw new ArgumentException("Year is out of range.");
        if (month < 1 || month > 12)
            throw new ArgumentException("Month must be between 1 and 12.");
    }

    private static (DateTime From, DateTime To) MonthRange(int year, int month)
    {
        var from = new DateTime(year, month, 1);
        var to = from.AddMonths(1).AddDays(-1);
        return (from, to);
    }

    private async Task<IReadOnlyList<RoyaltyShareFundLineDto>> GetFundBreakdownAsync(
        DateTime from,
        DateTime to,
        decimal royaltyPercent,
        CancellationToken cancellationToken)
    {
        var rows = await _context.FeeAndFundCollections
            .AsNoTracking()
            .Where(x => (x.VoidAmount ?? 0) == 0)
            .Where(x =>
                x.Date.HasValue
                && x.Date.Value.Date >= from.Date
                && x.Date.Value.Date <= to.Date
                && (x.Recieved ?? 0) > 0)
            .GroupBy(x => x.FundTypeID ?? 0)
            .Select(g => new
            {
                FundTypeId = g.Key,
                Collected = g.Sum(x => x.Recieved ?? 0)
            })
            .OrderBy(x => x.FundTypeId)
            .ToListAsync(cancellationToken);

        var fundTypeIds = rows.Select(x => x.FundTypeId).Where(x => x > 0).Distinct().ToList();
        var nameMap = fundTypeIds.Count == 0
            ? new Dictionary<int, string>()
            : await _context.FundTypes
                .AsNoTracking()
                .Where(x => fundTypeIds.Contains(x.ID))
                .ToDictionaryAsync(x => x.ID, x => x.FundTypeName ?? "Fee", cancellationToken);

        return rows.Select(row =>
        {
            var collected = Math.Round(row.Collected, 0, MidpointRounding.AwayFromZero);
            var name = row.FundTypeId > 0 && nameMap.TryGetValue(row.FundTypeId, out var n)
                ? n
                : row.FundTypeId > 0
                    ? $"Fund {row.FundTypeId}"
                    : "Other";
            return new RoyaltyShareFundLineDto
            {
                FundTypeId = row.FundTypeId,
                FundTypeName = name ?? "Fee",
                Collected = collected,
                RoyaltyShare = ComputeRoyaltyAmount(collected, royaltyPercent)
            };
        }).ToList();
    }

    private static decimal ComputeRoyaltyAmount(decimal totalFeeCollected, decimal percent) =>
        Math.Round(totalFeeCollected * percent / 100m, 0, MidpointRounding.AwayFromZero);

    private async Task<RoyaltyShareMonthDto> MapClosedMonthAsync(
        FranchiseRoyaltyClosing closing,
        CampusProfile profile,
        CancellationToken cancellationToken)
    {
        var (from, to) = MonthRange(closing.CalendarYear, closing.CalendarMonth);
        var breakdown = await GetFundBreakdownAsync(from, to, closing.RoyaltySharePercent, cancellationToken);

        return new RoyaltyShareMonthDto
        {
            CalendarYear = closing.CalendarYear,
            CalendarMonth = closing.CalendarMonth,
            IsClosed = true,
            TotalFeeCollected = closing.TotalFeeCollected,
            RoyaltySharePercent = closing.RoyaltySharePercent,
            RoyaltyAmount = closing.RoyaltyAmount,
            VoucherNo = closing.VoucherNo,
            ClosedByUserName = closing.ClosedByUserName,
            ClosedAtPkt = closing.ClosedAtPkt,
            CampusLabel = profile.CampusLabel,
            SchoolName = profile.SchoolName,
            FundBreakdown = breakdown
        };
    }

    private static RoyaltyShareHistoryItemDto MapHistory(FranchiseRoyaltyClosing x) =>
        new()
        {
            Id = x.Id,
            CalendarYear = x.CalendarYear,
            CalendarMonth = x.CalendarMonth,
            TotalFeeCollected = x.TotalFeeCollected,
            RoyaltySharePercent = x.RoyaltySharePercent,
            RoyaltyAmount = x.RoyaltyAmount,
            VoucherNo = x.VoucherNo,
            ClosedByUserName = x.ClosedByUserName,
            ClosedAtPkt = x.ClosedAtPkt
        };

    private static string? TruncateUser(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return "User";
        var user = value.Trim();
        return user.Length > 20 ? user[..20] : user;
    }
}
