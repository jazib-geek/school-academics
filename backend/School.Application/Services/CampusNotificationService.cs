using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using School.Application.Common;
using School.Application.DTOs;
using School.Application.Interfaces;
using School.Infrastructure.Data;
using School.Infrastructure.Entities;

namespace School.Application.Services;

public class CampusNotificationService : ICampusNotificationService
{
    /// <summary>Keep at most this many rows per notification type (oldest of that type dropped on insert).</summary>
    private const int MaxPerType = 100;

    /// <summary>Raw list size for the client (grouping collapses consecutive runs into fewer drawer slots).</summary>
    private const int ListFetchTake = 200;

    private readonly AppDbContext _db;
    private readonly TenantContext _tenantContext;
    private readonly ICampusNotificationSink _sink;

    public CampusNotificationService(
        AppDbContext db,
        TenantContext tenantContext,
        ICampusNotificationSink sink)
    {
        _db = db;
        _tenantContext = tenantContext;
        _sink = sink;
    }

    public async Task PublishAsync(CampusNotificationDto notification, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(notification);
        if (notification.Id == Guid.Empty)
        {
            notification.Id = Guid.NewGuid();
        }

        if (notification.OccurredAt == default)
        {
            notification.OccurredAt = PakistanTime.Now;
        }

        var excludeKeys = notification.Audience?.ExcludeUserKeys?
            .Where(x => !string.IsNullOrWhiteSpace(x))
            .Select(x => x.Trim())
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        var type = Truncate(notification.Type, 64);

        _db.CampusRealtimeNotifications.Add(new CampusRealtimeNotification
        {
            Id = notification.Id,
            Type = type,
            Title = Truncate(notification.Title, 200),
            Message = Truncate(notification.Message, 1000),
            Severity = Truncate(string.IsNullOrWhiteSpace(notification.Severity)
                ? CampusNotificationSeverities.Info
                : notification.Severity, 20),
            Link = Truncate(notification.Link ?? string.Empty, 500),
            OccurredAtPkt = notification.OccurredAt,
            ActorUserKey = string.IsNullOrWhiteSpace(notification.ActorUserKey)
                ? null
                : Truncate(notification.ActorUserKey.Trim(), 200),
            ExcludeUserKeysJson = excludeKeys is { Count: > 0 }
                ? JsonSerializer.Serialize(excludeKeys)
                : null,
        });

        await _db.SaveChangesAsync(cancellationToken);
        await PruneOldForTypeAsync(type, cancellationToken);

        await _sink.PublishAsync(_tenantContext.Campus, notification, cancellationToken);
    }

    public async Task<IReadOnlyList<CampusNotificationDto>> GetRecentForUserAsync(
        int userId,
        int take = ListFetchTake,
        CancellationToken cancellationToken = default)
    {
        if (userId <= 0) return [];

        take = Math.Clamp(take, 1, ListFetchTake);
        var username = await ResolveUsernameAsync(userId, cancellationToken);

        // Wider fetch so exclusions do not shrink the list too early.
        var recent = await _db.CampusRealtimeNotifications
            .AsNoTracking()
            .OrderByDescending(x => x.OccurredAtPkt)
            .Take(MaxPerType * 8)
            .ToListAsync(cancellationToken);

        var visible = recent
            .Where(x => !IsExcludedForUser(x, username))
            .Take(take)
            .ToList();

        if (visible.Count == 0) return [];

        var ids = visible.Select(x => x.Id).ToList();
        var readIds = await _db.CampusRealtimeNotificationReads
            .AsNoTracking()
            .Where(x => x.UserId == userId && ids.Contains(x.NotificationId))
            .Select(x => x.NotificationId)
            .ToListAsync(cancellationToken);
        var readSet = readIds.ToHashSet();

        return visible.Select(x => ToDto(x, readSet.Contains(x.Id))).ToList();
    }

    public async Task MarkAllReadAsync(int userId, CancellationToken cancellationToken = default)
    {
        if (userId <= 0) return;

        var username = await ResolveUsernameAsync(userId, cancellationToken);
        var recent = await _db.CampusRealtimeNotifications
            .AsNoTracking()
            .OrderByDescending(x => x.OccurredAtPkt)
            .Take(MaxPerType * 8)
            .ToListAsync(cancellationToken);

        var visibleIds = recent
            .Where(x => !IsExcludedForUser(x, username))
            .Take(ListFetchTake)
            .Select(x => x.Id)
            .ToList();

        if (visibleIds.Count == 0) return;

        var alreadyRead = await _db.CampusRealtimeNotificationReads
            .Where(x => x.UserId == userId && visibleIds.Contains(x.NotificationId))
            .Select(x => x.NotificationId)
            .ToListAsync(cancellationToken);
        var already = alreadyRead.ToHashSet();

        var now = PakistanTime.Now;
        foreach (var id in visibleIds.Where(id => !already.Contains(id)))
        {
            _db.CampusRealtimeNotificationReads.Add(new CampusRealtimeNotificationRead
            {
                NotificationId = id,
                UserId = userId,
                ReadAtPkt = now,
            });
        }

        await _db.SaveChangesAsync(cancellationToken);
    }

    private async Task PruneOldForTypeAsync(string type, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(type)) return;

        var keepIds = await _db.CampusRealtimeNotifications
            .Where(x => x.Type == type)
            .OrderByDescending(x => x.OccurredAtPkt)
            .Take(MaxPerType)
            .Select(x => x.Id)
            .ToListAsync(cancellationToken);

        if (keepIds.Count < MaxPerType) return;

        await _db.CampusRealtimeNotifications
            .Where(x => x.Type == type && !keepIds.Contains(x.Id))
            .ExecuteDeleteAsync(cancellationToken);
    }

    private async Task<string?> ResolveUsernameAsync(int userId, CancellationToken cancellationToken)
    {
        var username = await _db.Users
            .AsNoTracking()
            .Where(x => x.ID == userId)
            .Select(x => x.Username)
            .FirstOrDefaultAsync(cancellationToken);

        return string.IsNullOrWhiteSpace(username) ? null : username.Trim();
    }

    private static bool IsExcludedForUser(CampusRealtimeNotification notification, string? username)
    {
        if (string.IsNullOrWhiteSpace(username)) return false;

        var user = username.Trim();
        if (!string.IsNullOrWhiteSpace(notification.ActorUserKey)
            && string.Equals(notification.ActorUserKey.Trim(), user, StringComparison.OrdinalIgnoreCase))
        {
            return true;
        }

        foreach (var key in ParseExcludeKeys(notification.ExcludeUserKeysJson))
        {
            if (string.Equals(key, user, StringComparison.OrdinalIgnoreCase))
            {
                return true;
            }
        }

        return false;
    }

    private static IEnumerable<string> ParseExcludeKeys(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) yield break;

        string[]? keys = null;
        try
        {
            keys = JsonSerializer.Deserialize<string[]>(json);
        }
        catch
        {
            yield break;
        }

        if (keys is null) yield break;
        foreach (var key in keys)
        {
            if (!string.IsNullOrWhiteSpace(key))
            {
                yield return key.Trim();
            }
        }
    }

    private static CampusNotificationDto ToDto(CampusRealtimeNotification entity, bool read)
    {
        var exclude = ParseExcludeKeys(entity.ExcludeUserKeysJson).ToList();
        return new CampusNotificationDto
        {
            Id = entity.Id,
            Type = entity.Type,
            Title = entity.Title,
            Message = entity.Message,
            Severity = entity.Severity,
            Link = entity.Link,
            OccurredAt = entity.OccurredAtPkt,
            ActorUserKey = entity.ActorUserKey,
            Read = read,
            Audience = new CampusNotificationAudienceDto
            {
                Mode = CampusNotificationAudienceModes.AllCampusUsers,
                ExcludeUserKeys = exclude.Count > 0 ? exclude : null,
            },
        };
    }

    private static string Truncate(string? value, int max)
    {
        var text = value ?? string.Empty;
        return text.Length <= max ? text : text[..max];
    }
}
