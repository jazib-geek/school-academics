namespace School.Infrastructure.Entities;

/// <summary>Table: tblEmployeeRealtimeNotification — employee portal bell / SSE (per coordinator).</summary>
public class EmployeeRealtimeNotification
{
    public Guid Id { get; set; }
    public int EmployeeId { get; set; }
    public string Type { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string Severity { get; set; } = string.Empty;
    public string Link { get; set; } = string.Empty;
    public DateTime OccurredAtPkt { get; set; }

    public ICollection<EmployeeRealtimeNotificationRead> Reads { get; set; } = new List<EmployeeRealtimeNotificationRead>();
}

/// <summary>Table: tblEmployeeRealtimeNotificationRead — read receipts for employee notifications.</summary>
public class EmployeeRealtimeNotificationRead
{
    public Guid NotificationId { get; set; }
    public int EmployeeId { get; set; }
    public DateTime ReadAtPkt { get; set; }

    public EmployeeRealtimeNotification Notification { get; set; } = null!;
}
