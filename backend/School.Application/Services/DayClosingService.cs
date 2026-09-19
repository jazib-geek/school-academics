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

        var tuition = await SumFeeAsync(from, to, 1, cancellationToken);
        var admission = await SumFeeAsync(from, to, 2, cancellationToken);
        var misc = await SumFeeAsync(from, to, 3, cancellationToken);
        var prev = await SumFeeAsync(from, to, 4, cancellationToken);
        var fine = await SumFeeAsync(from, to, 6, cancellationToken);

        var feeTotal = tuition + admission + misc + prev + fine;
        var totalCashCollected = feeTotal + glCredits;
        var totalExpenses = glDebits;
        var suggested = Math.Max(0, totalCashCollected - totalExpenses);

        var recent = await _context.DayClosings
            .AsNoTracking()
            .OrderByDescending(x => x.ClosingDate)
            .Take(14)
            .ToListAsync(cancellationToken);

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
            GlCredits = glCredits,
            GlDebits = glDebits,
            Closing = existing is null ? null : Map(existing),
            RecentClosings = recent.Select(Map).ToList()
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
                x.Date.Value.Date >= from.Date &&
                x.Date.Value.Date <= to.Date)
            .SumAsync(x => x.Recieved ?? 0, cancellationToken);
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
