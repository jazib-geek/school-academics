namespace School.Infrastructure.Entities;

/// <summary>
/// Format of a campus timetable print layout.
/// 1 = Class-wise (rows = classes, period columns with times).
/// 2 = Teacher-wise with Free column.
/// 3 = Teacher-wise full (serial + periods).
/// </summary>
public enum CampusTimeTableFormat : byte
{
    ClassWise = 1,
    TeacherWiseWithFree = 2,
    TeacherWiseFull = 3,
}

/// <summary>Table: tblCampusTimeTable. Legacy tblTimeTable is unused.</summary>
public class CampusTimeTable
{
    public int ID { get; set; }
    public string Name { get; set; } = string.Empty;
    public byte FormatType { get; set; }
    public string? DisplayTitle { get; set; }
    public string? Subtitle { get; set; }
    public bool IsDefault { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAtUtc { get; set; }
    public DateTime? UpdatedAtUtc { get; set; }

    public ICollection<CampusTimeTablePeriod> Periods { get; set; } = [];
    public ICollection<CampusTimeTableMemberClass> MemberClasses { get; set; } = [];
    public ICollection<CampusTimeTableMemberTeacher> MemberTeachers { get; set; } = [];
    public ICollection<CampusTimeTableSlot> Slots { get; set; } = [];
}

/// <summary>Table: tblCampusTimeTablePeriod</summary>
public class CampusTimeTablePeriod
{
    public int ID { get; set; }
    public int TimeTableID { get; set; }
    public int PeriodNumber { get; set; }
    public string? Label { get; set; }
    public TimeSpan? StartTime { get; set; }
    public TimeSpan? EndTime { get; set; }
    public int SortOrder { get; set; }
    public bool IsBreak { get; set; }

    public CampusTimeTable? TimeTable { get; set; }
}

/// <summary>Table: tblCampusTimeTableMemberClass</summary>
public class CampusTimeTableMemberClass
{
    public int ID { get; set; }
    public int TimeTableID { get; set; }
    public int SectionID { get; set; }
    public int SortOrder { get; set; }

    public CampusTimeTable? TimeTable { get; set; }
    public Section? Section { get; set; }
}

/// <summary>Table: tblCampusTimeTableMemberTeacher</summary>
public class CampusTimeTableMemberTeacher
{
    public int ID { get; set; }
    public int TimeTableID { get; set; }
    public int EmployeeID { get; set; }
    public int SortOrder { get; set; }

    public CampusTimeTable? TimeTable { get; set; }
    public Employee? Employee { get; set; }
}

/// <summary>
/// Table: tblCampusTimeTableSlot.
/// DayOfWeek: 0 = daily (V1); 1–7 reserved for Mon–Sun.
/// </summary>
public class CampusTimeTableSlot
{
    public int ID { get; set; }
    public int TimeTableID { get; set; }
    public int SectionID { get; set; }
    public int SubjectID { get; set; }
    public int EmployeeID { get; set; }
    public int PeriodNumber { get; set; }
    public byte DayOfWeek { get; set; }
    /// <summary>0 = primary line in cell; 1 = second parallel group (split period).</summary>
    public byte LineIndex { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public DateTime? UpdatedAtUtc { get; set; }

    public CampusTimeTable? TimeTable { get; set; }
    public Section? Section { get; set; }
    public SubjectMaster? Subject { get; set; }
    public Employee? Employee { get; set; }
}
