namespace School.Infrastructure.Entities;

// Campus-local daily proforma. Report.WingCode is the wing in effect when the report is saved/submitted.

public sealed class CoordinatorProformaActor
{
    public int Id { get; set; }
    public string HomeCampusKey { get; set; } = string.Empty;
    public ProformaPrincipalType PrincipalType { get; set; }
    public int PrincipalId { get; set; }
    public string DisplayNameSnapshot { get; set; } = string.Empty;
}

public sealed class CoordinatorProformaReport
{
    public int Id { get; set; }
    public int CoordinatorEmployeeId { get; set; }
    public DateOnly ReportDate { get; set; }
    public ProformaWingCode WingCode { get; set; }
    public string? Theme { get; set; }
    public short? SosWeek { get; set; }
    public ProformaWorkflowStatus WorkflowStatus { get; set; } = ProformaWorkflowStatus.Draft;
    public int CurrentRevisionNumber { get; set; }
    public int TemplateVersion { get; set; } = 1;
    public DateTime CreatedAtUtc { get; set; }
    public DateTime UpdatedAtUtc { get; set; }
    public int CreatedByActorId { get; set; }
    public int UpdatedByActorId { get; set; }
    public byte[] RowVersion { get; set; } = Array.Empty<byte>();
    /// <summary>Coordinator workspace document (entries, checks, actions) while draft or returned.</summary>
    public string? DraftWorkspaceJson { get; set; }

    public Employee Coordinator { get; set; } = null!;
    public ICollection<CoordinatorProformaSection> Sections { get; set; } = new List<CoordinatorProformaSection>();
    public ICollection<CoordinatorProformaEntry> Entries { get; set; } = new List<CoordinatorProformaEntry>();
}

public sealed class CoordinatorProformaSection
{
    public int Id { get; set; }
    public int ReportId { get; set; }
    public ProformaSectionCode SectionCode { get; set; }
    public ProformaDeclaration? DeclarationCode { get; set; }
    public string? DeclarationNote { get; set; }

    public CoordinatorProformaReport Report { get; set; } = null!;
}

public sealed class CoordinatorProformaEntry
{
    public int Id { get; set; }
    public int ReportId { get; set; }
    public ProformaSectionCode SectionCode { get; set; }
    public int SortOrder { get; set; }
    public int? ClassSectionId { get; set; }
    public int? SubjectId { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public DateTime UpdatedAtUtc { get; set; }
    public int CreatedByActorId { get; set; }
    public int UpdatedByActorId { get; set; }
    public DateTime? DeletedAtUtc { get; set; }
    public byte[] RowVersion { get; set; } = Array.Empty<byte>();

    public CoordinatorProformaReport Report { get; set; } = null!;
    public CoordinatorProformaSection Section { get; set; } = null!;
    public Section? ClassSection { get; set; }
    public SubjectMaster? Subject { get; set; }
    public ICollection<CoordinatorProformaEntryStudent> Students { get; set; } = new List<CoordinatorProformaEntryStudent>();
    public ICollection<CoordinatorProformaEntryEmployee> Employees { get; set; } = new List<CoordinatorProformaEntryEmployee>();
}

public sealed class CoordinatorProformaEntryStudent
{
    public int EntryId { get; set; }
    public int StudentId { get; set; }
    public int SortOrder { get; set; }

    public CoordinatorProformaEntry Entry { get; set; } = null!;
    public Student Student { get; set; } = null!;
}

public sealed class CoordinatorProformaEntryEmployee
{
    public int EntryId { get; set; }
    public int EmployeeId { get; set; }
    public ProformaEmployeeRole RoleCode { get; set; }
    public int SortOrder { get; set; }

    public CoordinatorProformaEntry Entry { get; set; } = null!;
    public Employee Employee { get; set; } = null!;
}

public sealed class CoordinatorProformaCheckResponse
{
    public int EntryId { get; set; }
    public ProformaSectionCode SectionCode { get; set; }
    public ProformaCriterionCode CriterionCode { get; set; }
    public ProformaCheckResponseCode? ResponseCode { get; set; }
    public string? Remarks { get; set; }

    public CoordinatorProformaEntry Entry { get; set; } = null!;
}

public sealed class CoordinatorProformaSummaryTick
{
    public int ReportId { get; set; }
    public ProformaSummaryItem ItemCode { get; set; }
    public bool? IsTicked { get; set; }

    public CoordinatorProformaReport Report { get; set; } = null!;
}

public sealed class CoordinatorProformaNotebookSchedule
{
    public int ReportId { get; set; }
    public byte WeekdayNumber { get; set; }
    public string? PlannedCoverage { get; set; }

    public CoordinatorProformaReport Report { get; set; } = null!;
}

public sealed class CoordinatorProformaAttendanceSnapshot
{
    public int ReportId { get; set; }
    public int? ActiveStudents { get; set; }
    public int? PresentStudents { get; set; }
    public int? AbsentStudents { get; set; }
    public int? UnmarkedStudents { get; set; }
    public int? TotalFaculty { get; set; }
    public int? PresentFaculty { get; set; }
    public ProformaAttendanceScope ScopeCode { get; set; } = ProformaAttendanceScope.Campus;
    public ProformaAttendanceSource SourceCode { get; set; }
    public DateTime CapturedAtUtc { get; set; }
    public string? SourceNotes { get; set; }

    public CoordinatorProformaReport Report { get; set; } = null!;
}

public sealed class CoordinatorProformaAbsentFaculty
{
    public int ReportId { get; set; }
    public int EmployeeId { get; set; }
    public string? Note { get; set; }

    public CoordinatorProformaReport Report { get; set; } = null!;
    public Employee Employee { get; set; } = null!;
}

public sealed class CoordinatorProformaRevision
{
    public int Id { get; set; }
    public int ReportId { get; set; }
    public int RevisionNumber { get; set; }
    public DateTime SubmittedAtUtc { get; set; }
    public int SubmittedByActorId { get; set; }
    public string ActorDisplayNameSnapshot { get; set; } = string.Empty;
    public int TemplateVersion { get; set; }
    public int SnapshotSchemaVersion { get; set; }
    public int PrintTemplateVersion { get; set; }
    public string SnapshotJson { get; set; } = string.Empty;

    public CoordinatorProformaReport Report { get; set; } = null!;
}

public sealed class CoordinatorProformaReviewEvent
{
    public int Id { get; set; }
    public int RevisionId { get; set; }
    public ProformaReviewEventCode EventCode { get; set; }
    public int ActorId { get; set; }
    public string ActorDisplayNameSnapshot { get; set; } = string.Empty;
    public string? Note { get; set; }
    public DateTime CreatedAtUtc { get; set; }

    public CoordinatorProformaRevision Revision { get; set; } = null!;
}

public sealed class CoordinatorProformaComment
{
    public int Id { get; set; }
    public int ReportId { get; set; }
    public int? RevisionId { get; set; }
    public int ActorId { get; set; }
    public string ActorDisplayNameSnapshot { get; set; } = string.Empty;
    public string Text { get; set; } = string.Empty;
    public DateTime CreatedAtUtc { get; set; }

    public CoordinatorProformaReport Report { get; set; } = null!;
    public CoordinatorProformaRevision? Revision { get; set; }
}

public sealed class CoordinatorProformaAuditEvent
{
    public int Id { get; set; }
    public int ReportId { get; set; }
    public int? EntryId { get; set; }
    public int ActorId { get; set; }
    public string ActorDisplayNameSnapshot { get; set; } = string.Empty;
    public string EventCode { get; set; } = string.Empty;
    public DateTime CreatedAtUtc { get; set; }
    public int ChangeSchemaVersion { get; set; } = 1;
    public string? ChangeJson { get; set; }

    public CoordinatorProformaReport Report { get; set; } = null!;
    public CoordinatorProformaEntry? Entry { get; set; }
}

public sealed class CoordinatorProformaAction
{
    public int Id { get; set; }
    public int ReportId { get; set; }
    public int SourceEntryId { get; set; }
    public int? SourceRevisionId { get; set; }
    public string Title { get; set; } = string.Empty;
    public int? OwnerEmployeeId { get; set; }
    public DateOnly? DueDate { get; set; }
    public ProformaActionStatus StatusCode { get; set; } = ProformaActionStatus.Open;
    public DateTime CreatedAtUtc { get; set; }
    public DateTime UpdatedAtUtc { get; set; }
    public int CreatedByActorId { get; set; }
    public int UpdatedByActorId { get; set; }
    public byte[] RowVersion { get; set; } = Array.Empty<byte>();

    public CoordinatorProformaReport Report { get; set; } = null!;
    public CoordinatorProformaEntry SourceEntry { get; set; } = null!;
    public CoordinatorProformaRevision? SourceRevision { get; set; }
    public Employee? Owner { get; set; }
}

public sealed class CoordinatorProformaActionEvent
{
    public int Id { get; set; }
    public int ActionId { get; set; }
    public int ActorId { get; set; }
    public string ActorDisplayNameSnapshot { get; set; } = string.Empty;
    public ProformaActionEventCode EventCode { get; set; }
    public ProformaActionStatus? FromStatus { get; set; }
    public ProformaActionStatus? ToStatus { get; set; }
    public string? Note { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public int ChangeSchemaVersion { get; set; } = 1;
    public string? ChangeJson { get; set; }

    public CoordinatorProformaAction Action { get; set; } = null!;
}

public sealed class CoordinatorProformaAttachment
{
    public int Id { get; set; }
    public int EntryId { get; set; }
    public string StorageProvider { get; set; } = string.Empty;
    public string ObjectKey { get; set; } = string.Empty;
    public string OriginalFileName { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public long SizeBytes { get; set; }
    public int UploadedByActorId { get; set; }
    public string ActorDisplayNameSnapshot { get; set; } = string.Empty;
    public DateTime UploadedAtUtc { get; set; }
    public ProformaUploadStatus UploadStatus { get; set; } = ProformaUploadStatus.Pending;
    public DateTime? DeletedAtUtc { get; set; }

    public CoordinatorProformaEntry Entry { get; set; } = null!;
}
