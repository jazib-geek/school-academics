namespace School.Application.DTOs;

public class EmployeeAttendanceManageDayDto
{
    public DateTime Date { get; set; }
    public int TotalEntries { get; set; }
    public bool HasDutyTimeAdjustment { get; set; }
    public IReadOnlyList<EmployeeAttendanceManageRowDto> Entries { get; set; } =
        Array.Empty<EmployeeAttendanceManageRowDto>();
    public IReadOnlyList<EmployeeAttendanceMissingEmployeeDto> MissingEmployees { get; set; } =
        Array.Empty<EmployeeAttendanceMissingEmployeeDto>();
    public IReadOnlyList<EmployeeAttendanceDayDesignationTimingDto> DesignationTimes { get; set; } =
        Array.Empty<EmployeeAttendanceDayDesignationTimingDto>();
}

public class EmployeeAttendanceDayDesignationTimingDto
{
    public int DesignationId { get; set; }
    public string DesignationName { get; set; } = string.Empty;
    public string? CheckInTime { get; set; }
    public string? CheckOutTime { get; set; }
    public int? GraceMinutes { get; set; }
    public int PunchCount { get; set; }
}

public class EmployeeAttendanceManageRowDto
{
    public int AttendanceId { get; set; }
    public int EmployeeId { get; set; }
    public string EmployeeName { get; set; } = string.Empty;
    public DateTime Date { get; set; }
    public string? CheckInTime { get; set; }
    public string? CheckOutTime { get; set; }
    public int LateMinutes { get; set; }
    public int LateComings { get; set; }
    public string Status { get; set; } = string.Empty;
    public bool IsLate { get; set; }
    public string? UpdatedBy { get; set; }
    public bool IsManuallyAdjusted { get; set; }
    public decimal? LateDeduction { get; set; }
    public decimal? TodaySalary { get; set; }
}

public class EmployeeAttendanceMissingEmployeeDto
{
    public int EmployeeId { get; set; }
    public string EmployeeName { get; set; } = string.Empty;
}

public class EditEmployeeAttendanceRequestDto
{
    public string? CheckInTime { get; set; }
    public string? CheckOutTime { get; set; }
}

public class MarkEmployeePresentRequestDto
{
    public int EmployeeId { get; set; }
    public DateTime Date { get; set; }
    public string CheckInTime { get; set; } = string.Empty;
    public string? CheckOutTime { get; set; }
}

public class BackfillEmployeeAttendanceRequestDto
{
    public int EmployeeId { get; set; }
    public IReadOnlyList<BackfillEmployeeAttendanceDayDto> Days { get; set; } =
        Array.Empty<BackfillEmployeeAttendanceDayDto>();
}

public class BackfillEmployeeAttendanceDayDto
{
    public DateTime Date { get; set; }
    public string CheckInTime { get; set; } = string.Empty;
    public string? CheckOutTime { get; set; }
}

public class BackfillEmployeeAttendanceResultDto
{
    public int EmployeeId { get; set; }
    public string EmployeeName { get; set; } = string.Empty;
    public int MarkedCount { get; set; }
    public int SkippedCount { get; set; }
}

public class BackfillEmployeeAttendanceExistingRequestDto
{
    public int EmployeeId { get; set; }
    public DateTime From { get; set; }
    public DateTime To { get; set; }
}

public class BackfillEmployeeAttendanceExistingDto
{
    public int EmployeeId { get; set; }
    public string EmployeeName { get; set; } = string.Empty;
    public IReadOnlyList<BackfillEmployeeAttendanceExistingDayDto> Days { get; set; } =
        Array.Empty<BackfillEmployeeAttendanceExistingDayDto>();
}

public class BackfillEmployeeAttendanceExistingDayDto
{
    public DateTime Date { get; set; }
    public string? CheckInTime { get; set; }
    public string? CheckOutTime { get; set; }
    public bool HasCheckIn { get; set; }
}

public class MarkEmployeeHolidayRequestDto
{
    public DateTime Date { get; set; }
    /// <summary>When false, employees who already have a row for the date are left unchanged.</summary>
    public bool OverwriteExisting { get; set; }
}

public class MarkEmployeeHolidayResultDto
{
    public DateTime Date { get; set; }
    public int MarkedCount { get; set; }
    public int SkippedCount { get; set; }
    public int ExistingCount { get; set; }
}

public class EmployeeAttendanceMutationResultDto
{
    public int AttendanceId { get; set; }
    public int EmployeeId { get; set; }
    public string EmployeeName { get; set; } = string.Empty;
    public DateTime Date { get; set; }
    public string? CheckInTime { get; set; }
    public string? CheckOutTime { get; set; }
    public int LateMinutes { get; set; }
    public int LateComings { get; set; }
    public string Status { get; set; } = string.Empty;
    public bool IsManuallyAdjusted { get; set; }
}

public class DeleteEmployeeAttendanceResultDto
{
    public int AttendanceId { get; set; }
    public int EmployeeId { get; set; }
    public string EmployeeName { get; set; } = string.Empty;
    public DateTime Date { get; set; }
}

public class RecalculateDutyTimesRequestDto
{
    public DateTime Date { get; set; }
    public IReadOnlyList<RecalculateDutyTimesDesignationDto> Designations { get; set; } =
        Array.Empty<RecalculateDutyTimesDesignationDto>();
}

public class RecalculateDutyTimesDesignationDto
{
    public int DesignationId { get; set; }
    public string? CheckInTime { get; set; }
    public string? CheckOutTime { get; set; }
}

public class RecalculateDutyTimesResultDto
{
    public DateTime Date { get; set; }
    public int RecalculatedCount { get; set; }
    public int SkippedCount { get; set; }
}