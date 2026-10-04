using School.Application.Common;

namespace School.Application.DTOs;

public static class EmployeeNotificationTypes
{
    public const string ProformaApproved = "proforma_approved";
    public const string ProformaReturned = "proforma_returned";
    public const string ProformaSubmitted = "proforma_submitted";
    public const string ProformaHeadComment = "proforma_head_comment";
}

public class EmployeeNotificationDto
{
    public Guid Id { get; set; }
    public string Type { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string Severity { get; set; } = CampusNotificationSeverities.Info;
    public string Link { get; set; } = string.Empty;
    public DateTime OccurredAt { get; set; }
    public bool Read { get; set; }
}

public static class EmployeeNotificationFactory
{
    public static EmployeeNotificationDto ProformaApproved(DateOnly reportDate, string? headName = null)
    {
        var dateText = reportDate.ToString("d MMM yyyy");
        var by = string.IsNullOrWhiteSpace(headName) ? "Academic head" : headName.Trim();
        return new EmployeeNotificationDto
        {
            Id = Guid.NewGuid(),
            Type = EmployeeNotificationTypes.ProformaApproved,
            Title = "Daily report approved",
            Message = $"Your proforma for {dateText} was approved by {by}.",
            Severity = CampusNotificationSeverities.Success,
            Link = "/employee/coordinator-workspace",
            OccurredAt = PakistanTime.Now,
        };
    }

    public static EmployeeNotificationDto ProformaReturned(DateOnly reportDate, string? note, string? headName = null)
    {
        var dateText = reportDate.ToString("d MMM yyyy");
        var by = string.IsNullOrWhiteSpace(headName) ? "Academic head" : headName.Trim();
        var trimmed = (note ?? string.Empty).Trim();
        var detail = trimmed.Length > 0
            ? (trimmed.Length > 180 ? $"{trimmed[..180]}…" : trimmed)
            : "Open your report to see what to fix.";
        return new EmployeeNotificationDto
        {
            Id = Guid.NewGuid(),
            Type = EmployeeNotificationTypes.ProformaReturned,
            Title = "Daily report returned",
            Message = $"Your proforma for {dateText} was returned by {by}. {detail}",
            Severity = CampusNotificationSeverities.Warning,
            Link = "/employee/coordinator-workspace",
            OccurredAt = PakistanTime.Now,
        };
    }

    public static EmployeeNotificationDto ProformaHeadComment(DateOnly reportDate, string? headName, string? commentText)
    {
        var dateText = reportDate.ToString("d MMM yyyy");
        var by = string.IsNullOrWhiteSpace(headName) ? "Academic head" : headName.Trim();
        var trimmed = (commentText ?? string.Empty).Trim();
        var detail = trimmed.Length > 0
            ? (trimmed.Length > 120 ? $"{trimmed[..120]}…" : trimmed)
            : "Open your report to read the note.";
        return new EmployeeNotificationDto
        {
            Id = Guid.NewGuid(),
            Type = EmployeeNotificationTypes.ProformaHeadComment,
            Title = "Note on your daily report",
            Message = $"{by} left a note on your proforma for {dateText}: {detail}",
            Severity = CampusNotificationSeverities.Info,
            Link = $"/employee/coordinator-workspace?date={reportDate:yyyy-MM-dd}&focus=headNotes",
            OccurredAt = PakistanTime.Now,
        };
    }

    public static EmployeeNotificationDto ProformaSubmitted(
        string coordinatorName,
        DateOnly reportDate,
        int coordinatorEmployeeId,
        string campusKey)
    {
        var dateText = reportDate.ToString("d MMM yyyy");
        var name = string.IsNullOrWhiteSpace(coordinatorName) ? "A coordinator" : coordinatorName.Trim();
        var campus = string.IsNullOrWhiteSpace(campusKey) ? string.Empty : campusKey.Trim().ToLowerInvariant();
        var link = coordinatorEmployeeId > 0 && campus.Length > 0
            ? $"/employee/coordinator-monitoring?date={reportDate:yyyy-MM-dd}&campus={Uri.EscapeDataString(campus)}&coordinator={coordinatorEmployeeId}"
            : "/employee/coordinator-monitoring";
        return new EmployeeNotificationDto
        {
            Id = Guid.NewGuid(),
            Type = EmployeeNotificationTypes.ProformaSubmitted,
            Title = "Coordinator report submitted",
            Message = $"{name} submitted the daily proforma for {dateText}.",
            Severity = CampusNotificationSeverities.Info,
            Link = link,
            OccurredAt = PakistanTime.Now,
        };
    }
}
