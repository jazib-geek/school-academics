namespace School.Infrastructure.Entities;

public class CoordinatorDailyReport
{
    public int Id { get; set; }
    public int CoordinatorEmployeeId { get; set; }
    public DateOnly ReportDate { get; set; }
    public TimeOnly? ArrivalTime { get; set; }
    public DateTime? ArrivalRecordedAtUtc { get; set; }
    public bool? AssemblyConductedPerPolicy { get; set; }
    public string? MoralLessonTopic { get; set; }
    public string? UniformCheckNotes { get; set; }
    public string? CampusCleanlinessNotes { get; set; }
    public string? TeachersInClassesNotes { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public DateTime UpdatedAtUtc { get; set; }
    public byte[] RowVersion { get; set; } = Array.Empty<byte>();

    public Employee? Coordinator { get; set; }
    public ICollection<CoordinatorModDuty> ModDuties { get; set; } = new List<CoordinatorModDuty>();
    public ICollection<CoordinatorDailyAbsentTeacher> AbsentTeachers { get; set; } = new List<CoordinatorDailyAbsentTeacher>();
    public ICollection<CoordinatorWorkingReportLine> WorkingReportLines { get; set; } = new List<CoordinatorWorkingReportLine>();
}

public class CoordinatorModDuty
{
    public int Id { get; set; }
    public int CoordinatorDailyReportId { get; set; }
    public string DutyScope { get; set; } = string.Empty;
    public string? DutyScopeOtherLabel { get; set; }
    public int OnDutyEmployeeId { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAtUtc { get; set; }

    public CoordinatorDailyReport DailyReport { get; set; } = null!;
    public Employee? OnDutyEmployee { get; set; }
}

public class CoordinatorDailyAbsentTeacher
{
    public int Id { get; set; }
    public int CoordinatorDailyReportId { get; set; }
    public int EmployeeId { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAtUtc { get; set; }

    public CoordinatorDailyReport DailyReport { get; set; } = null!;
    public Employee? Employee { get; set; }
}

public class CoordinatorWorkingReportLine
{
    public int Id { get; set; }
    public int CoordinatorDailyReportId { get; set; }
    public int LineOrder { get; set; }
    public string ActivityDescription { get; set; } = string.Empty;
    public DateTime CreatedAtUtc { get; set; }

    public CoordinatorDailyReport DailyReport { get; set; } = null!;
}
