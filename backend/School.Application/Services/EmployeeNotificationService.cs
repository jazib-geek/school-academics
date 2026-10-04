using Microsoft.EntityFrameworkCore;
using School.Application.Common;
using School.Application.DTOs;
using School.Application.Interfaces;
using School.Infrastructure.Data;
using School.Infrastructure.Entities;

namespace School.Application.Services;

public class EmployeeNotificationService : IEmployeeNotificationService
{
    private const int MaxPerType = 100;
    private const int ListFetchTake = 200;

    private readonly AppDbContext _db;
    private readonly TenantContext _tenantContext;
    private readonly IEmployeeNotificationSink _sink;

    public EmployeeNotificationService(
        AppDbContext db,
        TenantContext tenantContext,
        IEmployeeNotificationSink sink)
    {
        _db = db;
        _tenantContext = tenantContext;
        _sink = sink;
    }

    public async Task PublishForEmployeeAsync(
        int employeeId,
        EmployeeNotificationDto notification,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(notification);
        if (employeeId <= 0) return;

        if (notification.Id == Guid.Empty)
        {
            notification.Id = Guid.NewGuid();
        }

        if (notification.OccurredAt == default)
        {
            notification.OccurredAt = PakistanTime.Now;
        }

        var type = Truncate(notification.Type, 64);

        _db.EmployeeRealtimeNotifications.Add(new EmployeeRealtimeNotification
        {
            Id = notification.Id,
            EmployeeId = employeeId,
            Type = type,
            Title = Truncate(notification.Title, 200),
            Message = Truncate(notification.Message, 1000),
            Severity = Truncate(string.IsNullOrWhiteSpace(notification.Severity)
                ? CampusNotificationSeverities.Info
                : notification.Severity, 20),
            Link = Truncate(notification.Link ?? string.Empty, 500),
            OccurredAtPkt = notification.OccurredAt,
        });

        await _db.SaveChangesAsync(cancellationToken);
        await PruneOldForEmployeeTypeAsync(employeeId, type, cancellationToken);

        await _sink.PublishAsync(_tenantContext.Campus, employeeId, notification, cancellationToken);
    }

    public async Task<IReadOnlyList<EmployeeNotificationDto>> GetRecentForEmployeeAsync(
        int employeeId,
        int take = ListFetchTake,
        CancellationToken cancellationToken = default)
    {
        if (employeeId <= 0) return [];

        take = Math.Clamp(take, 1, ListFetchTake);

        var recent = await _db.EmployeeRealtimeNotifications
            .AsNoTracking()
            .Where(x => x.EmployeeId == employeeId)
            .OrderByDescending(x => x.OccurredAtPkt)
            .Take(take)
            .ToListAsync(cancellationToken);

        if (recent.Count == 0) return [];

        var ids = recent.Select(x => x.Id).ToList();
        var readIds = await _db.EmployeeRealtimeNotificationReads
            .AsNoTracking()
            .Where(x => x.EmployeeId == employeeId && ids.Contains(x.NotificationId))
            .Select(x => x.NotificationId)
            .ToListAsync(cancellationToken);
        var readSet = readIds.ToHashSet();

        return recent.Select(x => ToDto(x, readSet.Contains(x.Id))).ToList();
    }

    public async Task MarkAllReadAsync(int employeeId, CancellationToken cancellationToken = default)
    {
        if (employeeId <= 0) return;

        var visibleIds = await _db.EmployeeRealtimeNotifications
            .AsNoTracking()
            .Where(x => x.EmployeeId == employeeId)
            .OrderByDescending(x => x.OccurredAtPkt)
            .Take(ListFetchTake)
            .Select(x => x.Id)
            .ToListAsync(cancellationToken);

        if (visibleIds.Count == 0) return;

        var alreadyRead = await _db.EmployeeRealtimeNotificationReads
            .Where(x => x.EmployeeId == employeeId && visibleIds.Contains(x.NotificationId))
            .Select(x => x.NotificationId)
            .ToListAsync(cancellationToken);
        var already = alreadyRead.ToHashSet();

        var now = PakistanTime.Now;
        foreach (var id in visibleIds.Where(id => !already.Contains(id)))
        {
            _db.EmployeeRealtimeNotificationReads.Add(new EmployeeRealtimeNotificationRead
            {
                NotificationId = id,
                EmployeeId = employeeId,
                ReadAtPkt = now,
            });
        }

        await _db.SaveChangesAsync(cancellationToken);
    }

    private async Task PruneOldForEmployeeTypeAsync(int employeeId, string type, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(type)) return;

        var keepIds = await _db.EmployeeRealtimeNotifications
            .Where(x => x.EmployeeId == employeeId && x.Type == type)
            .OrderByDescending(x => x.OccurredAtPkt)
            .Take(MaxPerType)
            .Select(x => x.Id)
            .ToListAsync(cancellationToken);

        if (keepIds.Count < MaxPerType) return;

        await _db.EmployeeRealtimeNotifications
            .Where(x => x.EmployeeId == employeeId && x.Type == type && !keepIds.Contains(x.Id))
            .ExecuteDeleteAsync(cancellationToken);
    }

    private static EmployeeNotificationDto ToDto(EmployeeRealtimeNotification entity, bool read) =>
        new()
        {
            Id = entity.Id,
            Type = entity.Type,
            Title = entity.Title,
            Message = entity.Message,
            Severity = entity.Severity,
            Link = entity.Link,
            OccurredAt = entity.OccurredAtPkt,
            Read = read,
        };

    private static string Truncate(string value, int max) =>
        value.Length <= max ? value : value[..max];
}
