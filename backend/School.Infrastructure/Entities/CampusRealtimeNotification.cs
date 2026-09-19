namespace School.Infrastructure.Entities;

/// <summary>Table: tblCampusRealtimeNotification — persisted campus bell/SSE notifications.</summary>
public class CampusRealtimeNotification
{
    public Guid Id { get; set; }
    public string Type { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string Severity { get; set; } = string.Empty;
    public string Link { get; set; } = string.Empty;
    public DateTime OccurredAtPkt { get; set; }
    public string? ActorUserKey { get; set; }
    /// <summary>JSON array of campus usernames that should not see this notification.</summary>
    public string? ExcludeUserKeysJson { get; set; }

    public ICollection<CampusRealtimeNotificationRead> Reads { get; set; } = new List<CampusRealtimeNotificationRead>();
}

/// <summary>Table: tblCampusRealtimeNotificationRead — per-user read receipts.</summary>
public class CampusRealtimeNotificationRead
{
    public Guid NotificationId { get; set; }
    public int UserId { get; set; }
    public DateTime ReadAtPkt { get; set; }

    public CampusRealtimeNotification Notification { get; set; } = null!;
}
