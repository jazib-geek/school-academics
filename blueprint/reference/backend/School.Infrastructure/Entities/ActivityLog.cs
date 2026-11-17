namespace School.Infrastructure.Entities;

/// <summary>Table: tblActivityLog — campus activity audit trail (selective logging).</summary>
public class ActivityLog
{
    public int ID { get; set; }

    /// <summary>e.g. StudentEdit, StudentBulkEdit — extensible for other actions.</summary>
    public string ActivityType { get; set; } = string.Empty;

    /// <summary>e.g. Student — null when the log is not entity-scoped.</summary>
    public string? EntityType { get; set; }

    /// <summary>Primary key of the related entity (e.g. student Reg_Id).</summary>
    public int? EntityId { get; set; }

    /// <summary>Human-readable label at log time (e.g. student name).</summary>
    public string? EntityLabel { get; set; }

    /// <summary>Campus user (tblUser.ID) who performed the action.</summary>
    public int? UserId { get; set; }

    /// <summary>Denormalized username for display if the user row is later removed.</summary>
    public string? UserName { get; set; }

    /// <summary>When the activity occurred, in Pakistan time.</summary>
    public DateTime OccurredAtPkt { get; set; }

    /// <summary>
    /// Flexible JSON payload (old/new field diffs, metadata, etc.).
    /// Shape is activity-specific and may grow over time.
    /// </summary>
    public string? DetailsJson { get; set; }
}
