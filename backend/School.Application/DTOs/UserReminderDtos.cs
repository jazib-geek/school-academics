namespace School.Application.DTOs;

public static class UserReminderKinds
{
    public const string Reminder = "Reminder";
    public const string Note = "Note";
    public const string Todo = "Todo";
    public const string Instruction = "Instruction";

    public static readonly string[] All = [Reminder, Note, Todo, Instruction];
}

public static class UserReminderStatuses
{
    public const string Pending = "Pending";
    public const string Done = "Done";
    public const string Dismissed = "Dismissed";
}

public class UserReminderDto
{
    public int Id { get; set; }

    public int OwnerUserId { get; set; }

    public string? OwnerName { get; set; }

    public int CreatedByUserId { get; set; }

    public string? CreatedByName { get; set; }

    public string Kind { get; set; } = UserReminderKinds.Reminder;

    public string Title { get; set; } = string.Empty;

    public string? Body { get; set; }

    public string? Color { get; set; }

    public bool IsPinned { get; set; }

    public int Priority { get; set; }

    public DateTime? RemindAtUtc { get; set; }

    public DateTime? SnoozedUntilUtc { get; set; }

    /// <summary>When the alarm should ring: snoozed time if set, else the reminder time.</summary>
    public DateTime? DueAtUtc { get; set; }

    public string Status { get; set; } = UserReminderStatuses.Pending;

    public DateTime? CompletedAtUtc { get; set; }

    public DateTime CreatedAtUtc { get; set; }

    public DateTime UpdatedAtUtc { get; set; }

    public bool IsAssigned { get; set; }

    public bool CanEdit { get; set; }
}

public class SaveUserReminderRequestDto
{
    public string? Kind { get; set; }

    public string? Title { get; set; }

    public string? Body { get; set; }

    public string? Color { get; set; }

    public bool IsPinned { get; set; }

    public int Priority { get; set; }

    /// <summary>Pakistan local date-time, e.g. 2026-10-21T15:30. Empty = no alarm.</summary>
    public string? RemindAtPkt { get; set; }

    /// <summary>Assign to another user (requires permission). Empty = myself.</summary>
    public int? OwnerUserId { get; set; }
}

public class SnoozeUserReminderRequestDto
{
    public int Minutes { get; set; }
}

public class ReminderUserOptionDto
{
    public int UserId { get; set; }

    public string Username { get; set; } = string.Empty;
}

public class UserReminderDeletedEventDto
{
    public int Id { get; set; }
}
