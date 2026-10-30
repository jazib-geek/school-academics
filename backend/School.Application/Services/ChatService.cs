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

    /// <summary>Messenger-style quick reactions. Compared exactly, including variation selectors.</summary>
    private static readonly HashSet<string> AllowedReactions = new(StringComparer.Ordinal)
    {
        "\U0001F44D",
        "\u2764\uFE0F",
        "\U0001F606",
        "\U0001F62E",
        "\U0001F622",
        "\U0001F620",
    };

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

        var ordered = rows.OrderBy(x => x.Id).ToList();
        var reactions = await LoadReactionsAsync(ordered.Select(x => x.Id).ToList(), cancellationToken);
        return ordered.Select(x => Map(x, reactions.GetValueOrDefault(x.Id))).ToList();
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

    public async Task<ChatReactionEventDto> ReactAsync(
        int userId,
        long messageId,
        string? emoji,
        CancellationToken cancellationToken = default)
    {
        var normalized = string.IsNullOrWhiteSpace(emoji) ? null : emoji.Trim();
        if (normalized is not null && !AllowedReactions.Contains(normalized))
            throw new ArgumentException("Choose a reaction.");

        var cutoff = CutoffUtc;
        var message = await _context.ChatMessages
            .FirstOrDefaultAsync(x => x.Id == messageId && x.SentAtUtc >= cutoff, cancellationToken);
        if (message is null || (message.SenderUserId != userId && message.RecipientUserId != userId))
            throw new ArgumentException("That message is no longer available.");

        var existing = await _context.ChatReactions
            .FirstOrDefaultAsync(x => x.MessageId == messageId && x.UserId == userId, cancellationToken);
        var cleared = normalized is null || (existing is not null && existing.Emoji == normalized);

        if (cleared)
        {
            if (existing is not null)
                _context.ChatReactions.Remove(existing);
        }
        else if (existing is not null)
        {
            existing.Emoji = normalized;
            existing.CreatedAtUtc = DateTime.UtcNow;
        }
        else
        {
            _context.ChatReactions.Add(new ChatReaction
            {
                MessageId = messageId,
                UserId = userId,
                Emoji = normalized,
                CreatedAtUtc = DateTime.UtcNow,
            });
        }

        await _context.SaveChangesAsync(cancellationToken);

        var reactions = await _context.ChatReactions.AsNoTracking()
            .Where(x => x.MessageId == messageId)
            .OrderBy(x => x.Id)
            .Select(x => new ChatReactionDto { UserId = x.UserId, Emoji = x.Emoji })
            .ToListAsync(cancellationToken);

        return new ChatReactionEventDto
        {
            MessageId = messageId,
            SenderUserId = message.SenderUserId,
            RecipientUserId = message.RecipientUserId,
            ActorUserId = userId,
            Emoji = cleared ? null : normalized,
            MessagePreview = Preview(message.Body),
            Reactions = reactions,
        };
    }

    private static string Preview(string? body)
    {
        var text = (body ?? string.Empty).Trim().Replace('\r', ' ').Replace('\n', ' ');
        return text.Length <= 80 ? text : string.Concat(text.AsSpan(0, 80), "…");
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
    public static async Task<int> PurgeExpiredAsync(AppDbContext context, CancellationToken cancellationToken = default)
    {
        var cutoff = CutoffUtc;
        await context.ChatReactions
            .Where(x => context.ChatMessages.Any(m => m.Id == x.MessageId && m.SentAtUtc < cutoff))
            .ExecuteDeleteAsync(cancellationToken);
        return await context.ChatMessages
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

    private async Task<Dictionary<long, List<ChatReactionDto>>> LoadReactionsAsync(
        List<long> messageIds,
        CancellationToken cancellationToken)
    {
        if (messageIds.Count == 0)
            return [];

        var rows = await _context.ChatReactions.AsNoTracking()
            .Where(x => messageIds.Contains(x.MessageId))
            .OrderBy(x => x.Id)
            .Select(x => new { x.MessageId, x.UserId, x.Emoji })
            .ToListAsync(cancellationToken);

        return rows
            .GroupBy(x => x.MessageId)
            .ToDictionary(
                g => g.Key,
                g => g.Select(x => new ChatReactionDto { UserId = x.UserId, Emoji = x.Emoji }).ToList());
    }

    private static ChatMessageDto Map(ChatMessage x, IReadOnlyList<ChatReactionDto>? reactions = null) => new()
    {
        Id = x.Id,
        SenderUserId = x.SenderUserId,
        RecipientUserId = x.RecipientUserId,
        Body = x.Body,
        SentAtUtc = AsUtc(x.SentAtUtc),
        ReadAtUtc = x.ReadAtUtc is null ? null : AsUtc(x.ReadAtUtc.Value),
        Reactions = reactions is null ? [] : [.. reactions],
    };

    private static DateTime AsUtc(DateTime value) => DateTime.SpecifyKind(value, DateTimeKind.Utc);
}
