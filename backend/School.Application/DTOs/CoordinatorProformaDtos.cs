using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace School.Application.DTOs;

public class CoordinatorProformaWorkspaceDto
{
    public string WingCode { get; set; } = "Primary";
    public string? Wing { get; set; }
    public string? Theme { get; set; }
    public string? SosWeek { get; set; }
    public string Status { get; set; } = "Draft";
    public bool Acknowledged { get; set; }
    public bool Approved { get; set; }
    public Dictionary<string, string>? Sections { get; set; }
    public Dictionary<string, bool>? PageOneChecks { get; set; }
    public CoordinatorProformaAttendanceSnapshotDto? AttendanceSnapshot { get; set; }
    public Dictionary<string, string>? NotebookSchedule { get; set; }
    public List<CoordinatorProformaEntryDto> Entries { get; set; } = [];
    public List<CoordinatorProformaActionDto> Actions { get; set; } = [];
    public List<CoordinatorProformaCommentDto> Comments { get; set; } = [];
    public List<CoordinatorProformaHistoryDto> History { get; set; } = [];
}

public class CoordinatorProformaAttendanceSnapshotDto
{
    public int? Active { get; set; }
    public int? Present { get; set; }
    public int? Absent { get; set; }
    public int? Faculty { get; set; }
    public int? PresentFaculty { get; set; }
    public List<string>? AbsentFaculty { get; set; }
}

public class CoordinatorProformaEntryDto
{
    public string Id { get; set; } = string.Empty;
    public string Section { get; set; } = string.Empty;
    public Dictionary<string, object?> Values { get; set; } = new();
    public List<CoordinatorProformaAttachmentDto> Attachments { get; set; } = [];
}

public class CoordinatorProformaAttachmentDto
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Kind { get; set; }
}

public class CoordinatorProformaActionDto
{
    public string Id { get; set; } = string.Empty;
    public string? Section { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Owner { get; set; }
    public string? Due { get; set; }
    public string Status { get; set; } = "Open";
    public List<CoordinatorProformaActionUpdateDto> Updates { get; set; } = [];
}

public class CoordinatorProformaActionUpdateDto
{
    public string? Status { get; set; }
    public string? Note { get; set; }
    public string? At { get; set; }
    public string? By { get; set; }
}

public class CoordinatorProformaCommentDto
{
    public string Text { get; set; } = string.Empty;
    public string? By { get; set; }
    public string? At { get; set; }
}

public class CoordinatorProformaHistoryDto
{
    public string Text { get; set; } = string.Empty;
    public string? By { get; set; }
    public string? At { get; set; }
}

public class CoordinatorProformaDayDto
{
    public int ReportId { get; set; }
    public DateOnly ReportDate { get; set; }
    public string WorkflowStatus { get; set; } = "Draft";
    public bool Acknowledged { get; set; }
    public bool Approved { get; set; }
    public string? SubmittedAt { get; set; }
    public CoordinatorProformaWorkspaceDto Workspace { get; set; } = new();
}

public class CoordinatorProformaSaveRequestDto
{
    [Required]
    public DateOnly ReportDate { get; set; }

    [Required]
    public CoordinatorProformaWorkspaceDto Workspace { get; set; } = new();
}

public class CoordinatorProformaSubmitRequestDto
{
    [Required]
    public DateOnly ReportDate { get; set; }
}

public class CoordinatorProformaMonitorCampusDto
{
    public string CampusKey { get; set; } = string.Empty;
    public string CampusName { get; set; } = string.Empty;
}

public class CoordinatorProformaMonitorRowDto
{
    public string CampusKey { get; set; } = string.Empty;
    public int ReportId { get; set; }
    public int CoordinatorEmployeeId { get; set; }
    public string Coordinator { get; set; } = string.Empty;
    public string WingCode { get; set; } = string.Empty;
    public string Wing { get; set; } = string.Empty;
    public DateOnly ReportDate { get; set; }
    public string Status { get; set; } = "Missing";
    public bool Acknowledged { get; set; }
    public bool Approved { get; set; }
    public string? SubmittedAt { get; set; }
    public int EntryCount { get; set; }
    public int ConcernCount { get; set; }
    public CoordinatorProformaWorkspaceDto? Workspace { get; set; }
}

public class CoordinatorProformaMonitorDayDto
{
    public DateOnly ReportDate { get; set; }
    public string CampusKey { get; set; } = string.Empty;
    public string CampusName { get; set; } = string.Empty;
    public IReadOnlyList<CoordinatorProformaMonitorRowDto> Reports { get; set; } = [];
}

public class CoordinatorProformaReviewRequestDto
{
    public string? Note { get; set; }
}

public class CoordinatorProformaMonitorQueryDto
{
    public DateOnly? ReportDate { get; set; }
    public string? CampusKey { get; set; }
}

public class CoordinatorProformaLookupsDto
{
    public IReadOnlyList<CoordinatorProformaChoiceOptionDto> Classes { get; set; } = [];
    public IReadOnlyList<CoordinatorProformaChoiceOptionDto> Subjects { get; set; } = [];
    public IReadOnlyList<CoordinatorProformaChoiceOptionDto> Teachers { get; set; } = [];
    public IReadOnlyList<CoordinatorProformaChoiceOptionDto> Students { get; set; } = [];
}

public class CoordinatorProformaChoiceOptionDto
{
    public int? Id { get; set; }
    public string Value { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
    public string? Description { get; set; }
    /// <summary>Section composite id — used to filter students by class/section.</summary>
    public int? SectionId { get; set; }
}
