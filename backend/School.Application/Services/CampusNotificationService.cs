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

    private static readonly JsonSerializerOptions AudienceJsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true,
    };

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
        var audienceJson = SerializeAudience(notification.Audience);

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
            AudienceJson = audienceJson,
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
        var access = await LoadUserAccessAsync(userId, cancellationToken);
        if (access is null) return [];

        var recent = await _db.CampusRealtimeNotifications
            .AsNoTracking()
            .OrderByDescending(x => x.OccurredAtPkt)
            .Take(MaxPerType * 8)
            .ToListAsync(cancellationToken);

        var visible = recent
            .Where(x => IsVisibleToUser(x, access))
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

        var access = await LoadUserAccessAsync(userId, cancellationToken);
        if (access is null) return;

        var recent = await _db.CampusRealtimeNotifications
            .AsNoTracking()
            .OrderByDescending(x => x.OccurredAtPkt)
            .Take(MaxPerType * 8)
            .ToListAsync(cancellationToken);

        var visibleIds = recent
            .Where(x => IsVisibleToUser(x, access))
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

    public async Task<bool> IsVisibleToUserAsync(
        int userId,
        CampusNotificationDto notification,
        CancellationToken cancellationToken = default)
    {
        if (userId <= 0 || notification is null) return false;

        var access = await LoadUserAccessAsync(userId, cancellationToken);
        if (access is null) return false;

        var entity = new CampusRealtimeNotification
        {
            Type = notification.Type ?? string.Empty,
            ActorUserKey = notification.ActorUserKey,
            ExcludeUserKeysJson = notification.Audience?.ExcludeUserKeys is { Count: > 0 }
                ? JsonSerializer.Serialize(notification.Audience.ExcludeUserKeys)
                : null,
            AudienceJson = SerializeAudience(notification.Audience),
        };

        return IsVisibleToUser(entity, access);
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

    private sealed class UserNotificationAccess
    {
        public string? Username { get; init; }
        public bool IsSuperAdmin { get; init; }
        public HashSet<string> PermissionCodes { get; init; } = new(StringComparer.OrdinalIgnoreCase);
    }

    private async Task<UserNotificationAccess?> LoadUserAccessAsync(int userId, CancellationToken cancellationToken)
    {
        var user = await _db.Users
            .AsNoTracking()
            .Where(x => x.ID == userId && x.IsActive == true)
            .Select(x => new { x.Username, x.IsSuperAdmin })
            .FirstOrDefaultAsync(cancellationToken);

        if (user is null || string.IsNullOrWhiteSpace(user.Username))
            return null;

        var username = user.Username.Trim();
        var rights = await _db.UserRights
            .AsNoTracking()
            .Where(x => x.UserName == username && x.HasAccess == true && x.ModuleCode != null)
            .Select(x => x.ModuleCode!)
            .ToListAsync(cancellationToken);

        var codes = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var code in rights)
        {
            if (!string.IsNullOrWhiteSpace(code))
                codes.Add(code.Trim());
        }

        return new UserNotificationAccess
        {
            Username = username,
            IsSuperAdmin = user.IsSuperAdmin,
            PermissionCodes = codes,
        };
    }

    private bool IsVisibleToUser(CampusRealtimeNotification notification, UserNotificationAccess access)
    {
        if (IsExcludedForUser(notification, access.Username))
            return false;

        var audience = ParseAudience(notification.AudienceJson);
        if (string.Equals(
                audience.Mode,
                CampusNotificationAudienceModes.Permission,
                StringComparison.OrdinalIgnoreCase))
        {
            if (access.IsSuperAdmin)
                return true;

            var required = audience.PermissionCodes?
                .Where(x => !string.IsNullOrWhiteSpace(x))
                .Select(x => x.Trim())
                .ToList();

            if (required is not { Count: > 0 })
                return false;

            return required.Any(code => access.PermissionCodes.Contains(code));
        }

        if (string.Equals(
                notification.Type,
                CampusNotificationTypes.EmployeeAttendanceChangeRequest,
                StringComparison.OrdinalIgnoreCase))
        {
            return access.IsSuperAdmin || access.PermissionCodes.Contains("edit_emp_attendance");
        }

        return true;
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

    private static CampusNotificationAudienceDto ParseAudience(string? json)
    {
        if (string.IsNullOrWhiteSpace(json))
        {
            return new CampusNotificationAudienceDto
            {
                Mode = CampusNotificationAudienceModes.AllCampusUsers,
            };
        }

        try
        {
            var parsed = JsonSerializer.Deserialize<CampusNotificationAudienceDto>(json, AudienceJsonOptions);
            if (parsed is null)
                return new CampusNotificationAudienceDto();

            if (string.IsNullOrWhiteSpace(parsed.Mode))
                parsed.Mode = CampusNotificationAudienceModes.AllCampusUsers;

            return parsed;
        }
        catch
        {
            return new CampusNotificationAudienceDto
            {
                Mode = CampusNotificationAudienceModes.AllCampusUsers,
            };
        }
    }

    private static string? SerializeAudience(CampusNotificationAudienceDto? audience)
    {
        if (audience is null)
            return null;

        if (string.Equals(
                audience.Mode,
                CampusNotificationAudienceModes.AllCampusUsers,
                StringComparison.OrdinalIgnoreCase)
            && (audience.PermissionCodes is null || audience.PermissionCodes.Count == 0))
        {
            return null;
        }

        return JsonSerializer.Serialize(audience, AudienceJsonOptions);
    }

    private static CampusNotificationDto ToDto(CampusRealtimeNotification entity, bool read)
    {
        var exclude = ParseExcludeKeys(entity.ExcludeUserKeysJson).ToList();
        var audience = ParseAudience(entity.AudienceJson);
        if (exclude.Count > 0)
            audience.ExcludeUserKeys = exclude;

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
            Audience = audience,
        };
    }

    private static string Truncate(string? value, int max)
    {
        var text = value ?? string.Empty;
        return text.Length <= max ? text : text[..max];
    }
}
