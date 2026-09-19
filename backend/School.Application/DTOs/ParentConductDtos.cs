namespace School.Application.DTOs;

public static class ConductPolarities
{
    public const string Good = "good";
    public const string Bad = "bad";
    public const string Mixed = "mixed";
    public const string None = "none";
}

public class ParentConductInboxDto
{
    public int TotalUnread { get; set; }
    public bool ShouldPrompt { get; set; }
    public List<ParentConductInboxStudentDto> Students { get; set; } = [];
}

public class ParentConductInboxStudentDto
{
    public int StudentId { get; set; }
    public string StudentName { get; set; } = string.Empty;
    public int UnreadCount { get; set; }
    public ParentConductInboxLatestDto? Latest { get; set; }
}

public class ParentConductInboxLatestDto
{
    public int NoteId { get; set; }
    public DateOnly NoteDate { get; set; }
    public string Polarity { get; set; } = ConductPolarities.None;
    public string ConductTypeName { get; set; } = string.Empty;
    public List<string> ItemLabels { get; set; } = [];
    public string? Remarks { get; set; }
}

public class ParentConductMonthReportDto
{
    public int StudentId { get; set; }
    public string StudentName { get; set; } = string.Empty;
    public string? ClassName { get; set; }
    public int? FamilyId { get; set; }
    public int Year { get; set; }
    public int Month { get; set; }
    public ParentConductMonthSummaryDto Summary { get; set; } = new();
    public List<ParentConductNoteDto> Notes { get; set; } = [];
    public List<ParentConductCalendarDayDto> CalendarDays { get; set; } = [];
}

public class ParentConductMonthSummaryDto
{
    public int Good { get; set; }
    public int Bad { get; set; }
    public int Mixed { get; set; }
    public int Total { get; set; }
    public int Unread { get; set; }
}

public class ParentConductNoteDto
{
    public int Id { get; set; }
    public DateOnly NoteDate { get; set; }
    public string Weekday { get; set; } = string.Empty;
    public string Polarity { get; set; } = ConductPolarities.None;
    public int ConductTypeId { get; set; }
    public string ConductTypeName { get; set; } = string.Empty;
    public List<StudentConductNoteTagDto> Tags { get; set; } = [];
    public string? Remarks { get; set; }
    public string? RecordedByName { get; set; }
    public bool IsAcknowledged { get; set; }
    public DateTime CreatedAtPkt { get; set; }
}

public class ParentConductCalendarDayDto
{
    public DateOnly Date { get; set; }
    public string Polarity { get; set; } = ConductPolarities.None;
}

public class ParentConductAcknowledgeRequestDto
{
    public List<int> NoteIds { get; set; } = [];
}
