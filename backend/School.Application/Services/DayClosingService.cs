using Microsoft.EntityFrameworkCore;
using School.Application.Common;
using School.Application.DTOs;
using School.Application.Interfaces;
using School.Infrastructure.Data;
using School.Infrastructure.Entities;

namespace School.Application.Services;

public class DayClosingService : IDayClosingService
{
    private readonly AppDbContext _context;
    private readonly ICampusNotificationService _notificationService;

    public DayClosingService(
        AppDbContext context,
        ICampusNotificationService notificationService)
    {
        _context = context;
        _notificationService = notificationService;
    }

    public async Task<DayClosingPreviewDto> GetPreviewAsync(
        DateOnly closingDate,
        CancellationToken cancellationToken = default)
    {
        var today = PakistanTime.Today;
        var day = closingDate;
        var from = day.ToDateTime(TimeOnly.MinValue);
        var to = day.ToDateTime(TimeOnly.MinValue);

        var existing = await _context.DayClosings
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.ClosingDate == day, cancellationToken);

        var gl = await _context.TransactionDetails
            .AsNoTracking()
            .Where(x => x.Date != null && x.Date.Value.Date == from.Date)
            .GroupBy(_ => 1)
            .Select(g => new
            {
                Credits = g.Sum(x => x.Credit ?? 0),
                Debits = g.Sum(x => x.Debit ?? 0)
            })
            .FirstOrDefaultAsync(cancellationToken);

        var glCredits = gl?.Credits ?? 0;
        var glDebits = gl?.Debits ?? 0;

        var cashByFund = await SumFeesByFundAsync(from, to, onlineOnly: false, cancellationToken);
        var onlineByFund = await SumFeesByFundAsync(from, to, onlineOnly: true, cancellationToken);

        var tuition = Pick(cashByFund, 1);
        var admission = Pick(cashByFund, 2);
        var misc = Pick(cashByFund, 3);
        var prev = Pick(cashByFund, 4);
        var fine = Pick(cashByFund, 6);
        var securityDeposit = Pick(cashByFund, 7);
        var tuitionOnline = Pick(onlineByFund, 1);
        var admissionOnline = Pick(onlineByFund, 2);
        var miscOnline = Pick(onlineByFund, 3);
        var prevOnline = Pick(onlineByFund, 4);
        var fineOnline = Pick(onlineByFund, 6);
        var securityDepositOnline = Pick(onlineByFund, 7);
        var onlineFee = tuitionOnline + admissionOnline + miscOnline + prevOnline + fineOnline + securityDepositOnline;

        var feeCashTotal = tuition + admission + misc + prev + fine + securityDeposit;
        var totalCashCollected = feeCashTotal + glCredits;
        var totalExpenses = glDebits;
        var suggested = Math.Max(0, totalCashCollected - totalExpenses);

        var recent = await _context.DayClosings
            .AsNoTracking()
            .OrderByDescending(x => x.ClosingDate)
            .Take(14)
            .ToListAsync(cancellationToken);

        var collectedByDate = await SumCollectedByDateAsync(
            recent.Select(x => x.ClosingDate).ToList(),
            cancellationToken);

        var isToday = day == today;
        var isClosed = existing is not null;

        return new DayClosingPreviewDto
        {
            ClosingDate = day,
            TodayPkt = today,
            IsToday = isToday,
            IsClosed = isClosed,
            CanClose = isToday && !isClosed,
            TotalCashCollected = totalCashCollected,
            TotalExpenses = totalExpenses,
            SuggestedRemainingCash = suggested,
            TuitionFee = tuition,
            AdmissionFee = admission,
            MiscCharges = misc,
            PrevBalance = prev,
            Fine = fine,
            SecurityDeposit = securityDeposit,
            TuitionFeeOnline = tuitionOnline,
            AdmissionFeeOnline = admissionOnline,
            MiscChargesOnline = miscOnline,
            PrevBalanceOnline = prevOnline,
            FineOnline = fineOnline,
            SecurityDepositOnline = securityDepositOnline,
            OnlineFee = onlineFee,
            GlCredits = glCredits,
            GlDebits = glDebits,
            Closing = existing is null ? null : Map(existing),
            RecentClosings = recent.Select(x =>
            {
                var dto = Map(x);
                if (collectedByDate.TryGetValue(x.ClosingDate, out var collected))
                    dto.TotalCashCollected = collected;
                return dto;
            }).ToList()
        };
    }

    public async Task<DayClosingDto> CloseDayAsync(
        CloseDayRequestDto request,
        string? entryUser,
        CancellationToken cancellationToken = default)
    {
        var today = PakistanTime.Today;
        if (request.ClosingDate != today)
            throw new InvalidOperationException("Only today's date can be closed.");

        if (request.RemainingCash < 0)
            throw new ArgumentException("Remaining cash cannot be negative.");

        var exists = await _context.DayClosings
            .AsNoTracking()
            .AnyAsync(x => x.ClosingDate == request.ClosingDate, cancellationToken);

        if (exists)
            throw new InvalidOperationException("This day is already closed.");

        var preview = await GetPreviewAsync(request.ClosingDate, cancellationToken);

        var user = string.IsNullOrWhiteSpace(entryUser) ? null : entryUser.Trim();
        if (user is { Length: > 50 })
            user = user[..50];

        var entity = new DayClosing
        {
            ClosingDate = request.ClosingDate,
            TotalCashCollected = preview.TotalCashCollected,
            TotalExpenses = preview.TotalExpenses,
            RemainingCash = Math.Round(request.RemainingCash, 0, MidpointRounding.AwayFromZero),
            Narration = string.IsNullOrWhiteSpace(request.Narration) ? null : request.Narration.Trim(),
            EntryUser = user,
            CreatedAtPkt = PakistanTime.Now
        };

        _context.DayClosings.Add(entity);
        await _context.SaveChangesAsync(cancellationToken);

        var actor = string.IsNullOrWhiteSpace(user) ? "Staff" : user;
        await _notificationService.PublishAsync(
            CampusNotificationFactory.Create(
                CampusNotificationTypes.DayClosed,
                "Day closed",
                $"{actor} closed the day for {entity.ClosingDate:dd MMM yyyy}.",
                "/campus/accounts/day-closing",
                CampusNotificationSeverities.Info,
                ["day_closing"],
                actorUserKey: user),
            cancellationToken);

        return Map(entity);
    }

    private static readonly int[] DayClosingFundTypeIds = [1, 2, 3, 4, 6, 7];

    private static decimal Pick(IReadOnlyDictionary<int, decimal> amounts, int fundTypeId) =>
        amounts.TryGetValue(fundTypeId, out var amount) ? amount : 0;

    private async Task<Dictionary<DateOnly, decimal>> SumCollectedByDateAsync(
        IReadOnlyCollection<DateOnly> dates,
        CancellationToken cancellationToken)
    {
        var map = dates.Distinct().ToDictionary(d => d, _ => 0m);
        if (map.Count == 0)
            return map;

        var from = dates.Min().ToDateTime(TimeOnly.MinValue);
        var to = dates.Max().ToDateTime(TimeOnly.MinValue);

        var feeRows = await _context.FeeAndFundCollections
            .AsNoTracking()
            .Where(x => (x.VoidAmount ?? 0) == 0)
            .Where(x =>
                x.FundTypeID != null &&
                DayClosingFundTypeIds.Contains(x.FundTypeID.Value) &&
                x.Date != null &&
                x.Date.Value.Date >= from.Date &&
                x.Date.Value.Date <= to.Date)
            .GroupBy(x => x.Date!.Value.Date)
            .Select(g => new { Day = g.Key, Amount = g.Sum(x => x.Recieved ?? 0) })
            .ToListAsync(cancellationToken);

        var glRows = await _context.TransactionDetails
            .AsNoTracking()
            .Where(x =>
                x.Date != null &&
                x.Date.Value.Date >= from.Date &&
                x.Date.Value.Date <= to.Date)
            .GroupBy(x => x.Date!.Value.Date)
            .Select(g => new { Day = g.Key, Amount = g.Sum(x => x.Credit ?? 0) })
            .ToListAsync(cancellationToken);

        foreach (var row in feeRows)
        {
            var day = DateOnly.FromDateTime(row.Day);
            if (map.ContainsKey(day))
                map[day] += row.Amount;
        }

        foreach (var row in glRows)
        {
            var day = DateOnly.FromDateTime(row.Day);
            if (map.ContainsKey(day))
                map[day] += row.Amount;
        }

        return map;
    }

    private async Task<Dictionary<int, decimal>> SumFeesByFundAsync(
        DateTime from,
        DateTime to,
        bool onlineOnly,
        CancellationToken cancellationToken)
    {
        var query = _context.FeeAndFundCollections
            .AsNoTracking()
            .Where(x => (x.VoidAmount ?? 0) == 0)
            .Where(x =>
                x.FundTypeID != null &&
                DayClosingFundTypeIds.Contains(x.FundTypeID.Value) &&
                x.Date != null &&
                x.Date.Value.Date >= from.Date &&
                x.Date.Value.Date <= to.Date);

        query = onlineOnly
            ? query.Where(x => x.PaymentMode != null && x.PaymentMode.ToLower() == "online")
            : query.Where(x => x.PaymentMode == null || x.PaymentMode.ToLower() != "online");

        var rows = await query
            .GroupBy(x => x.FundTypeID)
            .Select(g => new { FundTypeId = g.Key, Amount = g.Sum(x => x.Recieved ?? 0) })
            .ToListAsync(cancellationToken);

        return rows
            .Where(x => x.FundTypeId.HasValue)
            .ToDictionary(x => x.FundTypeId!.Value, x => x.Amount);
    }

    private static DayClosingDto Map(DayClosing x) => new()
    {
        Id = x.Id,
        ClosingDate = x.ClosingDate,
        TotalCashCollected = x.TotalCashCollected,
        TotalExpenses = x.TotalExpenses,
        RemainingCash = x.RemainingCash,
        Narration = x.Narration,
        EntryUser = x.EntryUser,
        CreatedAtPkt = x.CreatedAtPkt
    };
}
