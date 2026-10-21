using System.Collections.Concurrent;
using Microsoft.EntityFrameworkCore;
using School.Application.DTOs;
using School.Application.Interfaces;
using School.Infrastructure.Data;
using School.Infrastructure.Entities;

namespace School.Application.Services;

public class ChatService : IChatService
{
    public static readonly TimeSpan Retention = TimeSpan.FromHours(48);
    public const int MaxBodyLength = 1000;
    private const int MaxConversationMessages = 300;

    private static readonly ConcurrentDictionary<string, DateTime> LastPurgeUtcByCampus =
        new(StringComparer.OrdinalIgnoreCase);

    private readonly AppDbContext _context;

    public ChatService(AppDbContext context)
    {
        _context = context;
    }

    private static DateTime CutoffUtc => DateTime.UtcNow - Retention;

    public async Task<List<ChatUserDto>> GetUsersAsync(
        int userId,
        IReadOnlyCollection<int> onlineUserIds,
        CancellationToken cancellationToken = default)
    {
        var cutoff = CutoffUtc;
        var users = await _context.Users.AsNoTracking()
            .Where(x => x.IsActive == true && x.ID != userId && x.Username != null && x.Username != "")
            .Select(x => new { x.ID, x.Username })
            .ToListAsync(cancellationToken);

        var messages = await _context.ChatMessages.AsNoTracking()
            .Where(x => x.SentAtUtc >= cutoff && (x.SenderUserId == userId || x.RecipientUserId == userId))
            .Select(x => new { x.Id, x.SenderUserId, x.RecipientUserId, x.Body, x.SentAtUtc, x.ReadAtUtc })
            .ToListAsync(cancellationToken);

        var byOther = messages
            .GroupBy(x => x.SenderUserId == userId ? x.RecipientUserId : x.SenderUserId)
            .ToDictionary(g => g.Key, g => g.OrderByDescending(x => x.Id).ToList());

        var online = onlineUserIds.ToHashSet();

        return users
            .Select(u =>
            {
                byOther.TryGetValue(u.ID, out var thread);
                var last = thread?.FirstOrDefault();
                return new ChatUserDto
                {
                    UserId = u.ID,
                    Username = u.Username!.Trim(),
                    IsOnline = online.Contains(u.ID),
                    UnreadCount = thread?.Count(x => x.SenderUserId == u.ID && x.ReadAtUtc == null) ?? 0,
                    LastMessage = last?.Body,
                    LastAtUtc = last is null ? null : AsUtc(last.SentAtUtc),
                    LastFromMe = last is not null && last.SenderUserId == userId,
                };
            })
            .OrderByDescending(x => x.UnreadCount > 0)
            .ThenByDescending(x => x.LastAtUtc ?? DateTime.MinValue)
            .ThenByDescending(x => x.IsOnline)
            .ThenBy(x => x.Username, StringComparer.OrdinalIgnoreCase)
            .ToList();
    }

    public async Task<List<ChatMessageDto>> GetConversationAsync(
        int userId,
        int otherUserId,
        long? afterId,
        CancellationToken cancellationToken = default)
    {
        var cutoff = CutoffUtc;
        var query = _context.ChatMessages.AsNoTracking()
            .Where(x => x.SentAtUtc >= cutoff
                        && ((x.SenderUserId == userId && x.RecipientUserId == otherUserId)
                            || (x.SenderUserId == otherUserId && x.RecipientUserId == userId)));

        if (afterId is > 0)
            query = query.Where(x => x.Id > afterId.Value);

        var rows = await query
            .OrderByDescending(x => x.Id)
            .Take(MaxConversationMessages)
            .ToListAsync(cancellationToken);

        return rows.OrderBy(x => x.Id).Select(Map).ToList();
    }

    public async Task<ChatMessageDto> SendAsync(
        string campus,
        int userId,
        SendChatMessageRequestDto request,
        CancellationToken cancellationToken = default)
    {
        var body = (request.Body ?? string.Empty).Trim();
        if (body.Length == 0)
            throw new ArgumentException("Type a message first.");
        if (body.Length > MaxBodyLength)
            throw new ArgumentException($"Message is too long (max {MaxBodyLength} characters).");
        if (request.RecipientUserId <= 0 || request.RecipientUserId == userId)
            throw new ArgumentException("Choose someone to message.");

        var recipientActive = await _context.Users.AsNoTracking()
            .AnyAsync(x => x.ID == request.RecipientUserId && x.IsActive == true, cancellationToken);
        if (!recipientActive)
            throw new ArgumentException("This user is not available.");

        var row = new ChatMessage
        {
            SenderUserId = userId,
            RecipientUserId = request.RecipientUserId,
            Body = body,
            SentAtUtc = DateTime.UtcNow,
        };
        _context.ChatMessages.Add(row);
        await _context.SaveChangesAsync(cancellationToken);

        await PurgeIfDueAsync(campus, cancellationToken);

        return Map(row);
    }

    public async Task<ChatReadEventDto?> MarkReadAsync(
        int userId,
        int otherUserId,
        CancellationToken cancellationToken = default)
    {
        var cutoff = CutoffUtc;
        var unread = _context.ChatMessages
            .Where(x => x.RecipientUserId == userId
                        && x.SenderUserId == otherUserId
                        && x.ReadAtUtc == null
                        && x.SentAtUtc >= cutoff);

        var upToId = await unread.MaxAsync(x => (long?)x.Id, cancellationToken);
        if (upToId is null)
            return null;

        var now = DateTime.UtcNow;
        await unread
            .Where(x => x.Id <= upToId.Value)
            .ExecuteUpdateAsync(s => s.SetProperty(x => x.ReadAtUtc, now), cancellationToken);

        return new ChatReadEventDto { ReaderUserId = userId, UpToId = upToId.Value, ReadAtUtc = AsUtc(now) };
    }

    public Task<int> GetUnreadCountAsync(int userId, CancellationToken cancellationToken = default)
    {
        var cutoff = CutoffUtc;
        return _context.ChatMessages.AsNoTracking()
            .CountAsync(
                x => x.RecipientUserId == userId && x.ReadAtUtc == null && x.SentAtUtc >= cutoff,
                cancellationToken);
    }

    /// <summary>Deletes chat rows older than the retention window on the given context.</summary>
    public static Task<int> PurgeExpiredAsync(AppDbContext context, CancellationToken cancellationToken = default)
    {
        var cutoff = CutoffUtc;
        return context.ChatMessages
            .Where(x => x.SentAtUtc < cutoff)
            .ExecuteDeleteAsync(cancellationToken);
    }

    private async Task PurgeIfDueAsync(string campus, CancellationToken cancellationToken)
    {
        var key = string.IsNullOrWhiteSpace(campus) ? "default" : campus.Trim();
        var now = DateTime.UtcNow;
        if (LastPurgeUtcByCampus.TryGetValue(key, out var last) && now - last < TimeSpan.FromMinutes(30))
            return;

        LastPurgeUtcByCampus[key] = now;
        try
        {
            await PurgeExpiredAsync(_context, cancellationToken);
        }
        catch
        {
            // Purge is best-effort; the hourly background job retries.
        }
    }

    private static ChatMessageDto Map(ChatMessage x) => new()
    {
        Id = x.Id,
        SenderUserId = x.SenderUserId,
        RecipientUserId = x.RecipientUserId,
        Body = x.Body,
        SentAtUtc = AsUtc(x.SentAtUtc),
        ReadAtUtc = x.ReadAtUtc is null ? null : AsUtc(x.ReadAtUtc.Value),
    };

    private static DateTime AsUtc(DateTime value) => DateTime.SpecifyKind(value, DateTimeKind.Utc);
}
