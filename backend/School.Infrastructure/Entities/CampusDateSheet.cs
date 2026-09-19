namespace School.Infrastructure.Entities;

/// <summary>
/// Cell content type for a datesheet entry.
/// 1 = Subject, 2 = Holiday, 3 = Regular class.
/// </summary>
public enum CampusDateSheetEntryType : byte
{
    Subject = 1,
    Holiday = 2,
    RegularClass = 3,
}

/// <summary>Table: tblCampusDateSheet</summary>
public class CampusDateSheet
{
    public int ID { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? DisplayTitle { get; set; }
    public string? Subtitle { get; set; }
    public DateOnly StartDate { get; set; }
    public DateOnly EndDate { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAtUtc { get; set; }
    public DateTime? UpdatedAtUtc { get; set; }

    public ICollection<CampusDateSheetDay> Days { get; set; } = [];
    public ICollection<CampusDateSheetClass> Classes { get; set; } = [];
    public ICollection<CampusDateSheetEntry> Entries { get; set; } = [];
}

/// <summary>Table: tblCampusDateSheetDay — exam date rows (Sundays excluded).</summary>
public class CampusDateSheetDay
{
    public int ID { get; set; }
    public int DateSheetID { get; set; }
    public DateOnly ExamDate { get; set; }
    /// <summary>Matches System.DayOfWeek: 0 = Sunday … 6 = Saturday.</summary>
    public byte DayOfWeek { get; set; }
    public int SortOrder { get; set; }

    public CampusDateSheet? DateSheet { get; set; }
}

/// <summary>Table: tblCampusDateSheetClass — class columns (tblClass levels).</summary>
public class CampusDateSheetClass
{
    public int ID { get; set; }
    public int DateSheetID { get; set; }
    public int ClassID { get; set; }
    public int SortOrder { get; set; }
    /// <summary>When set, classes sharing the same key render as one merged column.</summary>
    public int? MergeGroupKey { get; set; }

    public CampusDateSheet? DateSheet { get; set; }
    public Class? Class { get; set; }
}

/// <summary>Table: tblCampusDateSheetEntry — one cell per class × date.</summary>
public class CampusDateSheetEntry
{
    public int ID { get; set; }
    public int DateSheetID { get; set; }
    public int ClassID { get; set; }
    public DateOnly ExamDate { get; set; }
    public byte EntryType { get; set; }
    public int? SubjectID { get; set; }
    public string? DisplayText { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public DateTime? UpdatedAtUtc { get; set; }

    public CampusDateSheet? DateSheet { get; set; }
    public Class? Class { get; set; }
    public SubjectMaster? Subject { get; set; }
}
