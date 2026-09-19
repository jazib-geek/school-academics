using School.Application.Common;

namespace School.Application.DTOs;

public static class CampusNotificationTypes
{
    public const string DiaryUpload = "diary_upload";
    public const string AttendanceCheckIn = "attendance_check_in";
    public const string AttendanceCheckOut = "attendance_check_out";
    public const string StudentRegistered = "student_registered";
    public const string FeeReceived = "fee_received";
    public const string DayClosed = "day_closed";
    public const string StudentConduct = "student_conduct";
}

public static class CampusNotificationSeverities
{
    public const string Info = "info";
    public const string Success = "success";
    public const string Warning = "warning";
}

/// <summary>
/// Who should receive this notification. Starter always uses <see cref="CampusNotificationAudienceModes.AllCampusUsers"/>.
/// Future: switch Mode to Permission / Users and fill the matching lists; clients filter accordingly.
/// </summary>
public static class CampusNotificationAudienceModes
{
    public const string AllCampusUsers = "all_campus_users";
    public const string Permission = "permission";
    public const string Users = "users";
}

public class CampusNotificationAudienceDto
{
    public string Mode { get; set; } = CampusNotificationAudienceModes.AllCampusUsers;

    /// <summary>Future: when Mode is Permission, only users holding any of these campus permission codes.</summary>
    public IReadOnlyList<string>? PermissionCodes { get; set; }

    /// <summary>Future: when Mode is Users, specific campus usernames or user keys.</summary>
    public IReadOnlyList<string>? UserKeys { get; set; }

    /// <summary>Campus usernames that should not see this toast (e.g. the actor).</summary>
    public IReadOnlyList<string>? ExcludeUserKeys { get; set; }
}

public class CampusNotificationDto
{
    public Guid Id { get; set; }
    public string Type { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string Severity { get; set; } = CampusNotificationSeverities.Info;
    public string Link { get; set; } = string.Empty;
    public DateTime OccurredAt { get; set; }
    /// <summary>Campus username of the user who triggered the event (if known).</summary>
    public string? ActorUserKey { get; set; }
    public CampusNotificationAudienceDto Audience { get; set; } = new();
    /// <summary>True when this user has already opened/acknowledged the notification.</summary>
    public bool Read { get; set; }
}

public static class CampusNotificationFactory
{
    public static CampusNotificationDto Create(
        string type,
        string title,
        string message,
        string link,
        string severity = CampusNotificationSeverities.Info,
        IReadOnlyList<string>? suggestedPermissionCodes = null,
        string? actorUserKey = null)
    {
        var actor = string.IsNullOrWhiteSpace(actorUserKey) ? null : actorUserKey.Trim();
        return new CampusNotificationDto
        {
            Id = Guid.NewGuid(),
            Type = type,
            Title = title,
            Message = message,
            Severity = severity,
            Link = link,
            OccurredAt = PakistanTime.Now,
            ActorUserKey = actor,
            Audience = new CampusNotificationAudienceDto
            {
                // Broadcast to everyone for now; PermissionCodes / ExcludeUserKeys reserved for targeting.
                Mode = CampusNotificationAudienceModes.AllCampusUsers,
                PermissionCodes = suggestedPermissionCodes,
                ExcludeUserKeys = actor is null ? null : [actor],
            },
        };
    }
}
