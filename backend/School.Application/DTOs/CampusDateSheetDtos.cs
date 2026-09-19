namespace School.Application.DTOs;

public class CampusDateSheetListItemDto
{
    public int ID { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? DisplayTitle { get; set; }
    public string? Subtitle { get; set; }
    public DateOnly StartDate { get; set; }
    public DateOnly EndDate { get; set; }
    public bool IsActive { get; set; }
    public int DayCount { get; set; }
    public int ClassCount { get; set; }
    public int EntryCount { get; set; }
    public DateTime CreatedAtUtc { get; set; }
}

public class CampusDateSheetDayDto
{
    public int ID { get; set; }
    public DateOnly ExamDate { get; set; }
    public byte DayOfWeek { get; set; }
    public string DayName { get; set; } = string.Empty;
    public int SortOrder { get; set; }
}

public class CampusDateSheetClassDto
{
    public int ID { get; set; }
    public int ClassID { get; set; }
    public string ClassName { get; set; } = string.Empty;
    public int SortOrder { get; set; }
    public int? MergeGroupKey { get; set; }
}

public class CampusDateSheetEntryDto
{
    public int ID { get; set; }
    public int ClassID { get; set; }
    public string ClassName { get; set; } = string.Empty;
    public DateOnly ExamDate { get; set; }
    public byte EntryType { get; set; }
    public int? SubjectID { get; set; }
    public string? SubjectName { get; set; }
    public string? SubjectShortName { get; set; }
    public string? DisplayText { get; set; }
    /// <summary>Resolved cell label for UI/print.</summary>
    public string CellLabel { get; set; } = string.Empty;
}

public class CampusDateSheetDetailDto
{
    public int ID { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? DisplayTitle { get; set; }
    public string? Subtitle { get; set; }
    public DateOnly StartDate { get; set; }
    public DateOnly EndDate { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public DateTime? UpdatedAtUtc { get; set; }
    public IReadOnlyList<CampusDateSheetDayDto> Days { get; set; } = [];
    public IReadOnlyList<CampusDateSheetClassDto> Classes { get; set; } = [];
    public IReadOnlyList<CampusDateSheetEntryDto> Entries { get; set; } = [];
}

public class CampusDateSheetPrintDto : CampusDateSheetDetailDto
{
}

public class CampusDateSheetClassInputDto
{
    public int ClassID { get; set; }
    public int? MergeGroupKey { get; set; }
}

public class CampusDateSheetCreateDto
{
    public string Name { get; set; } = string.Empty;
    public string? DisplayTitle { get; set; }
    public string? Subtitle { get; set; }
    public DateOnly StartDate { get; set; }
    public DateOnly EndDate { get; set; }
    public IReadOnlyList<CampusDateSheetClassInputDto> Classes { get; set; } = [];
}

public class CampusDateSheetUpdateDto
{
    public string Name { get; set; } = string.Empty;
    public string? DisplayTitle { get; set; }
    public string? Subtitle { get; set; }
    public bool IsActive { get; set; } = true;
}

public class CampusDateSheetReplaceClassesDto
{
    public IReadOnlyList<CampusDateSheetClassInputDto> Classes { get; set; } = [];
}

public class CampusDateSheetReplaceDaysDto
{
    /// <summary>Full set of exam dates to keep (Sundays are not allowed).</summary>
    public IReadOnlyList<DateOnly> ExamDates { get; set; } = [];
}

public class CampusDateSheetEntryInputDto
{
    public int? ID { get; set; }
    public int ClassID { get; set; }
    public DateOnly ExamDate { get; set; }
    public byte EntryType { get; set; }
    public int? SubjectID { get; set; }
    public string? DisplayText { get; set; }
}

public class CampusDateSheetReplaceEntriesDto
{
    /// <summary>
    /// Full set of entries to keep. Missing existing IDs are deleted.
    /// Pass empty to clear all entries.
    /// </summary>
    public IReadOnlyList<CampusDateSheetEntryInputDto> Entries { get; set; } = [];
}
