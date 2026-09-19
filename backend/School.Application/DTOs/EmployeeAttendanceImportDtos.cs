namespace School.Application.DTOs;

public class EmployeeAttendanceImportPreviewDto
{
    public IReadOnlyList<DateTime> Dates { get; set; } = [];
    public int PunchCount { get; set; }
    public string FileName { get; set; } = string.Empty;
}

public class EmployeeAttendanceImportRulesDto
{
    public IReadOnlyList<EmployeeAttendanceImportDateRuleDto> Dates { get; set; } =
        Array.Empty<EmployeeAttendanceImportDateRuleDto>();

    public int? AdminMinutesBefore { get; set; }
    public int? CoordinatorMinutesBefore { get; set; }
    public string? FridayCheckOut { get; set; }
}

public class EmployeeAttendanceImportDateRuleDto
{
    public DateTime Date { get; set; }
    public string TeacherCheckIn { get; set; } = string.Empty;
    public string TeacherCheckOut { get; set; } = string.Empty;
}

public class EmployeeAttendanceImportResultDto
{
    public int CreatedCount { get; set; }
    public int OverwrittenCount { get; set; }
    public int SkippedUnknownEmployeeCount { get; set; }
    public int SkippedEmptyPunchCount { get; set; }
    public int SkippedNoDutyTimeCount { get; set; }
    public IReadOnlyList<string> UnknownEmployeeCodes { get; set; } = [];
}
