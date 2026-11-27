namespace School.Infrastructure.Entities;

public class ParentPushDevice
{
    public long Id { get; set; }
    public Guid InstallationId { get; set; }
    public int FamilyDbId { get; set; }
    public string Token { get; set; } = "";
    public string TokenHash { get; set; } = "";
    public Guid RegistrationVersion { get; set; }
    public bool IsActive { get; set; }
    public DateTime UpdatedAtUtc { get; set; }
}

public class ParentAnnouncementPush
{
    public long Id { get; set; }
    // Retain the original queue/table identity; a row is either an announcement
    // or a class/date diary publication, never both.
    public int? AnnouncementId { get; set; }
    public NewsAndEvent? Announcement { get; set; }
    public int? DiaryClassId { get; set; }
    public DateOnly? DiaryDate { get; set; }
    public string Title { get; set; } = "";
    public DateTime CreatedAtUtc { get; set; }
    public List<ParentPushDelivery> Deliveries { get; set; } = [];
}

public class ParentPushDelivery
{
    public long Id { get; set; }
    public long PushId { get; set; }
    public ParentAnnouncementPush Push { get; set; } = null!;
    public long DeviceId { get; set; }
    public ParentPushDevice Device { get; set; } = null!;
    public Guid RegistrationVersion { get; set; }
    public int? StudentId { get; set; }
    public int Attempts { get; set; }
    public DateTime NextAttemptUtc { get; set; }
    public DateTime? CompletedAtUtc { get; set; }
    public DateTime? LeaseUntilUtc { get; set; }
    public Guid? LeaseId { get; set; }
    public string? Outcome { get; set; }
}
