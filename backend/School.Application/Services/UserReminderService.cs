using System.Globalization;
using Microsoft.EntityFrameworkCore;
using School.Application.Common;
using School.Application.DTOs;
using School.Application.Interfaces;
using School.Infrastructure.Data;
using School.Infrastructure.Entities;

namespace School.Application.Services;

public class UserReminderService : IUserReminderService
{
    private const int MaxTitleLength = 200;
    private const int MaxBodyLength = 4000;
    private static readonly TimeSpan DueLookahead = TimeSpan.FromHours(24);

    private readonly AppDbContext _context;

    public UserReminderService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<List<UserReminderDto>> ListMineAsync(
        int userId,
        string? kind,
        CancellationToken cancellationToken = default)
    {
        var query = _context.UserReminders.AsNoTracking()
            .Where(x => !x.IsDeleted && x.OwnerUserId == userId);

        var normalizedKind = NormalizeKind(kind, allowEmpty: true);
        if (normalizedKind is not null)
            query = query.Where(x => x.Kind == normalizedKind);

        var rows = await query
            .OrderByDescending(x => x.IsPinned)
            .ThenByDescending(x => x.UpdatedAtUtc)
            .Take(500)
            .ToListAsync(cancellationToken);

        return await MapManyAsync(rows, userId, cancellationToken);
    }

    public async Task<List<UserReminderDto>> GetDueAsync(int userId, CancellationToken cancellationToken = default)
    {
        var horizon = DateTime.UtcNow + DueLookahead;
        var rows = await _context.UserReminders.AsNoTracking()
            .Where(x => !x.IsDeleted
                        && x.OwnerUserId == userId
                        && x.Status == UserReminderStatuses.Pending
                        && x.RemindAtUtc != null
                        && (x.SnoozedUntilUtc ?? x.RemindAtUtc) <= horizon)
            .OrderBy(x => x.SnoozedUntilUtc ?? x.RemindAtUtc)
            .Take(100)
            .ToListAsync(cancellationToken);

        return await MapManyAsync(rows, userId, cancellationToken);
    }

    public async Task<List<UserReminderDto>> ListAssignedByMeAsync(
        int userId,
        CancellationToken cancellationToken = default)
    {
        var rows = await _context.UserReminders.AsNoTracking()
            .Where(x => !x.IsDeleted && x.CreatedByUserId == userId && x.OwnerUserId != userId)
            .OrderByDescending(x => x.CreatedAtUtc)
            .Take(300)
            .ToListAsync(cancellationToken);

        return await MapManyAsync(rows, userId, cancellationToken);
    }

    public Task<List<ReminderUserOptionDto>> GetAssignableUsersAsync(
        int userId,
        CancellationToken cancellationToken = default) =>
        _context.Users.AsNoTracking()
            .Where(x => x.IsActive == true && x.ID != userId && x.Username != null && x.Username != "")
            .OrderBy(x => x.Username)
            .Select(x => new ReminderUserOptionDto { UserId = x.ID, Username = x.Username!.Trim() })
            .ToListAsync(cancellationToken);

    public async Task<UserReminderDto> CreateAsync(
        int userId,
        bool canAssign,
        SaveUserReminderRequestDto request,
        CancellationToken cancellationToken = default)
    {
        var ownerId = await ResolveOwnerAsync(userId, canAssign, request.OwnerUserId, cancellationToken);
        var now = DateTime.UtcNow;
        var row = new UserReminder
        {
            OwnerUserId = ownerId,
            CreatedByUserId = userId,
            Status = UserReminderStatuses.Pending,
            CreatedAtUtc = now,
        };

        Apply(row, request, isNew: true);
        row.UpdatedAtUtc = now;

        _context.UserReminders.Add(row);
        await _context.SaveChangesAsync(cancellationToken);
        return await MapOneAsync(row, userId, cancellationToken);
    }

    public async Task<UserReminderDto> UpdateAsync(
        int userId,
        bool canAssign,
        int id,
        SaveUserReminderRequestDto request,
        CancellationToken cancellationToken = default)
    {
        var row = await FindAsync(id, cancellationToken);
        if (row.CreatedByUserId != userId)
            throw new UnauthorizedAccessException("Only the person who created this item can edit it.");

        row.OwnerUserId = await ResolveOwnerAsync(userId, canAssign, request.OwnerUserId, cancellationToken);
        Apply(row, request, isNew: false);
        row.UpdatedAtUtc = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);
        return await MapOneAsync(row, userId, cancellationToken);
    }

    public async Task<UserReminderDto> DeleteAsync(int userId, int id, CancellationToken cancellationToken = default)
    {
        var row = await FindAsync(id, cancellationToken);
        if (row.CreatedByUserId != userId)
            throw new UnauthorizedAccessException("Only the person who created this item can delete it.");

        row.IsDeleted = true;
        row.UpdatedAtUtc = DateTime.UtcNow;
        await _context.SaveChangesAsync(cancellationToken);
        return await MapOneAsync(row, userId, cancellationToken);
    }

    public async Task<UserReminderDto> SetStatusAsync(
        int userId,
        int id,
        string status,
        CancellationToken cancellationToken = default)
    {
        var row = await FindOwnedAsync(userId, id, cancellationToken);
        var now = DateTime.UtcNow;

        row.Status = status;
        row.CompletedAtUtc = status == UserReminderStatuses.Pending ? null : now;
        if (status == UserReminderStatuses.Pending)
            row.SnoozedUntilUtc = null;
        row.UpdatedAtUtc = now;

        await _context.SaveChangesAsync(cancellationToken);
        return await MapOneAsync(row, userId, cancellationToken);
    }

    public async Task<UserReminderDto> SnoozeAsync(
        int userId,
        int id,
        int minutes,
        CancellationToken cancellationToken = default)
    {
        if (minutes < 1 || minutes > 24 * 60)
            throw new ArgumentException("Snooze must be between 1 minute and 24 hours.");

        var row = await FindOwnedAsync(userId, id, cancellationToken);
        var now = DateTime.UtcNow;
        row.SnoozedUntilUtc = now.AddMinutes(minutes);
        row.Status = UserReminderStatuses.Pending;
        row.UpdatedAtUtc = now;

        await _context.SaveChangesAsync(cancellationToken);
        return await MapOneAsync(row, userId, cancellationToken);
    }

    public async Task<UserReminderDto> TogglePinAsync(int userId, int id, CancellationToken cancellationToken = default)
    {
        var row = await FindOwnedAsync(userId, id, cancellationToken);
        row.IsPinned = !row.IsPinned;
        row.UpdatedAtUtc = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);
        return await MapOneAsync(row, userId, cancellationToken);
    }

    private void Apply(UserReminder row, SaveUserReminderRequestDto request, bool isNew)
    {
        var title = (request.Title ?? string.Empty).Trim();
        if (title.Length == 0)
            throw new ArgumentException("Title is required.");
        if (title.Length > MaxTitleLength)
            throw new ArgumentException($"Title is too long (max {MaxTitleLength} characters).");

        var body = string.IsNullOrWhiteSpace(request.Body) ? null : request.Body.Trim();
        if (body is { Length: > MaxBodyLength })
            throw new ArgumentException($"Details are too long (max {MaxBodyLength} characters).");

        var kind = NormalizeKind(request.Kind, allowEmpty: false)!;
        var remindAtUtc = ParsePakistanDateTime(request.RemindAtPkt);

        if (kind == UserReminderKinds.Reminder && remindAtUtc is null)
            throw new ArgumentException("Pick a date and time for the reminder.");

        var timeChanged = remindAtUtc != row.RemindAtUtc;
        if (remindAtUtc is not null && timeChanged && remindAtUtc < DateTime.UtcNow.AddMinutes(-1))
            throw new ArgumentException("Pick a time in the future.");

        row.Kind = kind;
        row.Title = title;
        row.Body = body;
        row.Color = string.IsNullOrWhiteSpace(request.Color) ? null : request.Color.Trim()[..Math.Min(20, request.Color.Trim().Length)];
        row.IsPinned = request.IsPinned;
        row.Priority = (byte)Math.Clamp(request.Priority, 0, 2);
        row.RemindAtUtc = remindAtUtc;

        if (!isNew && timeChanged)
        {
            row.SnoozedUntilUtc = null;
            if (row.Status == UserReminderStatuses.Dismissed)
            {
                row.Status = UserReminderStatuses.Pending;
                row.CompletedAtUtc = null;
            }
        }
    }

    private async Task<int> ResolveOwnerAsync(
        int userId,
        bool canAssign,
        int? requestedOwnerId,
        CancellationToken cancellationToken)
    {
        if (requestedOwnerId is null or <= 0 || requestedOwnerId == userId)
            return userId;

        if (!canAssign)
            throw new UnauthorizedAccessException("You are not allowed to assign reminders to other users.");

        var active = await _context.Users.AsNoTracking()
            .AnyAsync(x => x.ID == requestedOwnerId && x.IsActive == true, cancellationToken);
        if (!active)
            throw new ArgumentException("The selected user is not available.");

        return requestedOwnerId.Value;
    }

    private async Task<UserReminder> FindAsync(int id, CancellationToken cancellationToken) =>
        await _context.UserReminders.FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted, cancellationToken)
        ?? throw new KeyNotFoundException("This item no longer exists.");

    private async Task<UserReminder> FindOwnedAsync(int userId, int id, CancellationToken cancellationToken)
    {
        var row = await FindAsync(id, cancellationToken);
        if (row.OwnerUserId != userId)
            throw new UnauthorizedAccessException("Only the person this item is for can update it.");
        return row;
    }

    private static string? NormalizeKind(string? kind, bool allowEmpty)
    {
        if (string.IsNullOrWhiteSpace(kind))
            return allowEmpty ? null : UserReminderKinds.Reminder;

        var match = UserReminderKinds.All.FirstOrDefault(
            x => string.Equals(x, kind.Trim(), StringComparison.OrdinalIgnoreCase));
        return match ?? throw new ArgumentException("Unknown item type.");
    }

    private static DateTime? ParsePakistanDateTime(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return null;

        if (!DateTime.TryParse(
                value.Trim(),
                CultureInfo.InvariantCulture,
                DateTimeStyles.AllowWhiteSpaces,
                out var local))
        {
            throw new ArgumentException("The reminder time is not valid.");
        }

        var utc = PakistanTime.ToUtc(local);
        return new DateTime(utc.Year, utc.Month, utc.Day, utc.Hour, utc.Minute, 0, DateTimeKind.Utc);
    }

    private async Task<UserReminderDto> MapOneAsync(UserReminder row, int viewerId, CancellationToken cancellationToken) =>
        (await MapManyAsync([row], viewerId, cancellationToken))[0];

    private async Task<List<UserReminderDto>> MapManyAsync(
        List<UserReminder> rows,
        int viewerId,
        CancellationToken cancellationToken)
    {
        var userIds = rows.SelectMany(x => new[] { x.OwnerUserId, x.CreatedByUserId }).Distinct().ToList();
        var names = userIds.Count == 0
            ? new Dictionary<int, string>()
            : await _context.Users.AsNoTracking()
                .Where(x => userIds.Contains(x.ID))
                .ToDictionaryAsync(x => x.ID, x => (x.Username ?? string.Empty).Trim(), cancellationToken);

        return rows.Select(x => new UserReminderDto
        {
            Id = x.Id,
            OwnerUserId = x.OwnerUserId,
            OwnerName = names.GetValueOrDefault(x.OwnerUserId),
            CreatedByUserId = x.CreatedByUserId,
            CreatedByName = names.GetValueOrDefault(x.CreatedByUserId),
            Kind = x.Kind,
            Title = x.Title,
            Body = x.Body,
            Color = x.Color,
            IsPinned = x.IsPinned,
            Priority = x.Priority,
            RemindAtUtc = AsUtc(x.RemindAtUtc),
            SnoozedUntilUtc = AsUtc(x.SnoozedUntilUtc),
            DueAtUtc = AsUtc(x.SnoozedUntilUtc ?? x.RemindAtUtc),
            Status = x.Status,
            CompletedAtUtc = AsUtc(x.CompletedAtUtc),
            CreatedAtUtc = DateTime.SpecifyKind(x.CreatedAtUtc, DateTimeKind.Utc),
            UpdatedAtUtc = DateTime.SpecifyKind(x.UpdatedAtUtc, DateTimeKind.Utc),
            IsAssigned = x.OwnerUserId != x.CreatedByUserId,
            CanEdit = x.CreatedByUserId == viewerId,
        }).ToList();
    }

    private static DateTime? AsUtc(DateTime? value) =>
        value is null ? null : DateTime.SpecifyKind(value.Value, DateTimeKind.Utc);
}
