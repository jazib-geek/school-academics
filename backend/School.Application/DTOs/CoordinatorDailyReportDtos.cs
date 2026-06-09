namespace School.Application.DTOs;

public class CoordinatorDailyReportDto
{
    public int Id { get; set; }
    public int CoordinatorEmployeeId { get; set; }
    /// <summary>Set when the coordinator employee navigation is loaded (e.g. campus monitor).</summary>
    public string? CoordinatorEmployeeName { get; set; }
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
    public IReadOnlyList<CoordinatorModDutyDto> ModDuties { get; set; } = Array.Empty<CoordinatorModDutyDto>();
    public IReadOnlyList<CoordinatorAbsentTeacherDto> AbsentTeachers { get; set; } = Array.Empty<CoordinatorAbsentTeacherDto>();
    public IReadOnlyList<CoordinatorWorkingReportLineDto> WorkingReportLines { get; set; } = Array.Empty<CoordinatorWorkingReportLineDto>();
}

public class CoordinatorModDutyDto
{
    public int Id { get; set; }
    public string DutyScope { get; set; } = string.Empty;
    public string? DutyScopeOtherLabel { get; set; }
    public int OnDutyEmployeeId { get; set; }
    public string? OnDutyEmployeeName { get; set; }
    public string? Notes { get; set; }
}

public class CoordinatorAbsentTeacherDto
{
    public int Id { get; set; }
    public int EmployeeId { get; set; }
    public string? EmployeeName { get; set; }
    public string? Notes { get; set; }
}

public class CoordinatorWorkingReportLineDto
{
    public int Id { get; set; }
    public int LineOrder { get; set; }
    public string ActivityDescription { get; set; } = string.Empty;
}

public class CoordinatorAssemblyUpsertDto
{
    public bool? AssemblyConductedPerPolicy { get; set; }
    public string? MoralLessonTopic { get; set; }
    public string? UniformCheckNotes { get; set; }
    public string? CampusCleanlinessNotes { get; set; }
    public string? TeachersInClassesNotes { get; set; }
}

public class CoordinatorModDutyInputDto
{
    public string DutyScope { get; set; } = string.Empty;
    public string? DutyScopeOtherLabel { get; set; }
    public int OnDutyEmployeeId { get; set; }
    public string? Notes { get; set; }
}

public class CoordinatorAbsentTeacherInputDto
{
    public int EmployeeId { get; set; }
    public string? Notes { get; set; }
}

public class CoordinatorWorkingReportLineInputDto
{
    public int LineOrder { get; set; }
    public string ActivityDescription { get; set; } = string.Empty;
}

/// <summary>Class-wise present/total for a day (from attendance, not persisted on coordinator tables).</summary>
public class CoordinatorClassAttendanceSummaryDto
{
    public int ClassSectionCompositeId { get; set; }
    public string ClassName { get; set; } = string.Empty;
    public int PresentCount { get; set; }
    public int TotalCount { get; set; }
}

/// <summary>Everything head office would see for one coordinator day (DB + computed attendance).</summary>
public class CoordinatorHeadOfficeDayBundleDto
{
    public CoordinatorDailyReportDto? Report { get; set; }
    public IReadOnlyList<CoordinatorClassAttendanceSummaryDto> ClassAttendanceSummaries { get; set; } = Array.Empty<CoordinatorClassAttendanceSummaryDto>();
}

/// <summary>Campus admin view: campus-wide attendance for the day plus every coordinator report row for that date.</summary>
public class CoordinatorDailyReportCampusMonitorDto
{
    public DateOnly ReportDate { get; set; }
    public IReadOnlyList<CoordinatorClassAttendanceSummaryDto> ClassAttendanceSummaries { get; set; } = Array.Empty<CoordinatorClassAttendanceSummaryDto>();
    public IReadOnlyList<CoordinatorDailyReportDto> CoordinatorReports { get; set; } = Array.Empty<CoordinatorDailyReportDto>();
}

/// <summary>POST body: arrival time for the logged-in coordinator.</summary>
public class CoordinatorArrivalPostRequestDto
{
    public DateOnly ReportDate { get; set; }
    public TimeOnly? ArrivalTime { get; set; }
}

/// <summary>POST body: assembly / morning-round fields.</summary>
public class CoordinatorAssemblyPostRequestDto : CoordinatorAssemblyUpsertDto
{
    public DateOnly ReportDate { get; set; }
}

public class CoordinatorModDutiesPostRequestDto
{
    public DateOnly ReportDate { get; set; }
    public List<CoordinatorModDutyInputDto> Duties { get; set; } = new();
}

public class CoordinatorAbsentTeachersPostRequestDto
{
    public DateOnly ReportDate { get; set; }
    public List<CoordinatorAbsentTeacherInputDto> AbsentTeachers { get; set; } = new();
}

public class CoordinatorWorkingReportLinesPostRequestDto
{
    public DateOnly ReportDate { get; set; }
    public List<CoordinatorWorkingReportLineInputDto> Lines { get; set; } = new();
}

/// <summary>Minimal row for MOD / absent-teacher pickers (tblEmployee).</summary>
public class CoordinatorEmployeePickDto
{
    public int Id { get; set; }
    public string? EmployeeName { get; set; }
}
