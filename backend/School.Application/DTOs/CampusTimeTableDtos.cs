namespace School.Application.DTOs;

public class CampusTimeTableListItemDto
{
    public int ID { get; set; }
    public string Name { get; set; } = string.Empty;
    public byte FormatType { get; set; }
    public string FormatName { get; set; } = string.Empty;
    public string? DisplayTitle { get; set; }
    public string? Subtitle { get; set; }
    public bool IsDefault { get; set; }
    public bool IsActive { get; set; }
    public int PeriodCount { get; set; }
    public int ClassCount { get; set; }
    public int TeacherCount { get; set; }
    public int SlotCount { get; set; }
    public DateTime CreatedAtUtc { get; set; }
}

public class CampusTimeTablePeriodDto
{
    public int ID { get; set; }
    public int PeriodNumber { get; set; }
    public string? Label { get; set; }
    public string? StartTime { get; set; }
    public string? EndTime { get; set; }
    public int SortOrder { get; set; }
    public bool IsBreak { get; set; }
}

public class CampusTimeTableMemberClassDto
{
    public int ID { get; set; }
    public int SectionID { get; set; }
    public string ClassName { get; set; } = string.Empty;
    public int SortOrder { get; set; }
}

public class CampusTimeTableMemberTeacherDto
{
    public int ID { get; set; }
    public int EmployeeID { get; set; }
    public string EmployeeName { get; set; } = string.Empty;
    public string? Gender { get; set; }
    public int SortOrder { get; set; }
}

public class CampusTimeTableSlotDto
{
    public int ID { get; set; }
    public int SectionID { get; set; }
    public string ClassName { get; set; } = string.Empty;
    public int SubjectID { get; set; }
    public string SubjectName { get; set; } = string.Empty;
    public string? SubjectShortName { get; set; }
    public int EmployeeID { get; set; }
    public string EmployeeName { get; set; } = string.Empty;
    public string? Gender { get; set; }
    public int PeriodNumber { get; set; }
    /// <summary>0 = daily (V1). 1–7 reserved for Mon–Sun.</summary>
    public byte DayOfWeek { get; set; }
}

public class CampusTimeTableDetailDto
{
    public int ID { get; set; }
    public string Name { get; set; } = string.Empty;
    public byte FormatType { get; set; }
    public string FormatName { get; set; } = string.Empty;
    public string? DisplayTitle { get; set; }
    public string? Subtitle { get; set; }
    public bool IsDefault { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public DateTime? UpdatedAtUtc { get; set; }
    public IReadOnlyList<CampusTimeTablePeriodDto> Periods { get; set; } = [];
    public IReadOnlyList<CampusTimeTableMemberClassDto> Classes { get; set; } = [];
    public IReadOnlyList<CampusTimeTableMemberTeacherDto> Teachers { get; set; } = [];
    public IReadOnlyList<CampusTimeTableSlotDto> Slots { get; set; } = [];
}

public class CampusTimeTablePeriodInputDto
{
    public int PeriodNumber { get; set; }
    public string? Label { get; set; }
    /// <summary>HH:mm or HH:mm:ss</summary>
    public string? StartTime { get; set; }
    /// <summary>HH:mm or HH:mm:ss</summary>
    public string? EndTime { get; set; }
    public int SortOrder { get; set; }
    public bool IsBreak { get; set; }
}

public class CampusTimeTableCreateDto
{
    public string Name { get; set; } = string.Empty;
    /// <summary>1 = Class-wise, 2 = Teacher-wise + Free, 3 = Teacher-wise full.</summary>
    public byte FormatType { get; set; }
    public string? DisplayTitle { get; set; }
    public string? Subtitle { get; set; }
    public bool IsDefault { get; set; }
    public IReadOnlyList<CampusTimeTablePeriodInputDto> Periods { get; set; } = [];
    /// <summary>Section IDs (tblSection.ID). Required for format 1; optional filter for teacher formats.</summary>
    public IReadOnlyList<int> SectionIDs { get; set; } = [];
    /// <summary>Employee IDs. Required for formats 2 and 3; optional for format 1.</summary>
    public IReadOnlyList<int> EmployeeIDs { get; set; } = [];
    /// <summary>When true, seeds slots from Subject Allocation (EmployeeClass) into open periods where possible.</summary>
    public bool SeedFromAllocation { get; set; }
}

public class CampusTimeTableUpdateDto
{
    public string Name { get; set; } = string.Empty;
    public string? DisplayTitle { get; set; }
    public string? Subtitle { get; set; }
    public bool IsActive { get; set; } = true;
}

public class CampusTimeTableReplacePeriodsDto
{
    public IReadOnlyList<CampusTimeTablePeriodInputDto> Periods { get; set; } = [];
}

public class CampusTimeTableReplaceMembersDto
{
    public IReadOnlyList<int> SectionIDs { get; set; } = [];
    public IReadOnlyList<int> EmployeeIDs { get; set; } = [];
}

public class CampusTimeTableSlotInputDto
{
    public int? ID { get; set; }
    public int SectionID { get; set; }
    public int SubjectID { get; set; }
    public int EmployeeID { get; set; }
    public int PeriodNumber { get; set; }
    /// <summary>0 = daily (default). 1–7 reserved for Mon–Sun.</summary>
    public byte DayOfWeek { get; set; }
}

public class CampusTimeTableReplaceSlotsDto
{
    /// <summary>
    /// Full set of slots to keep. Missing existing IDs are deleted.
    /// Pass empty to clear all slots.
    /// </summary>
    public IReadOnlyList<CampusTimeTableSlotInputDto> Slots { get; set; } = [];
}

public class CampusTimeTableAllocationCandidateDto
{
    public int EmployeeID { get; set; }
    public string EmployeeName { get; set; } = string.Empty;
    public string? Gender { get; set; }
    public int SectionID { get; set; }
    public string ClassName { get; set; } = string.Empty;
    public int SubjectID { get; set; }
    public string SubjectName { get; set; } = string.Empty;
    public string? SubjectShortName { get; set; }
}

/// <summary>Print-ready payload for all three formats.</summary>
public class CampusTimeTablePrintDto
{
    public int ID { get; set; }
    public string Name { get; set; } = string.Empty;
    public byte FormatType { get; set; }
    public string FormatName { get; set; } = string.Empty;
    public string? DisplayTitle { get; set; }
    public string? Subtitle { get; set; }
    public IReadOnlyList<CampusTimeTablePeriodDto> Periods { get; set; } = [];
    public IReadOnlyList<CampusTimeTableMemberClassDto> Classes { get; set; } = [];
    public IReadOnlyList<CampusTimeTableMemberTeacherDto> Teachers { get; set; } = [];
    public IReadOnlyList<CampusTimeTableSlotDto> Slots { get; set; } = [];
    /// <summary>For format 2: free period numbers per teacher (keys are EmployeeID as string).</summary>
    public IReadOnlyDictionary<string, IReadOnlyList<int>> FreePeriodsByTeacher { get; set; }
        = new Dictionary<string, IReadOnlyList<int>>();
}
