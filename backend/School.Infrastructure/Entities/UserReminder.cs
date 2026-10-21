namespace School.Infrastructure.Entities;

public class UserReminder
{
    public int Id { get; set; }

    public int OwnerUserId { get; set; }

    public int CreatedByUserId { get; set; }

    /// <summary>Reminder, Note, Todo, Instruction.</summary>
    public string Kind { get; set; } = "Reminder";

    public string Title { get; set; } = string.Empty;

    public string? Body { get; set; }

    public string? Color { get; set; }

    public bool IsPinned { get; set; }

    /// <summary>0 = normal, 1 = high, 2 = urgent.</summary>
    public byte Priority { get; set; }

    public DateTime? RemindAtUtc { get; set; }

    public DateTime? SnoozedUntilUtc { get; set; }

    /// <summary>Pending, Done, Dismissed.</summary>
    public string Status { get; set; } = "Pending";

    public DateTime? CompletedAtUtc { get; set; }

    public DateTime CreatedAtUtc { get; set; }

    public DateTime UpdatedAtUtc { get; set; }

    public bool IsDeleted { get; set; }
}
