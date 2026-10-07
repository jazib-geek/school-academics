namespace School.Application.DTOs;

public class SubmitEmployeeAttendanceChangeRequestDto
{
    public int EmployeeAttendanceId { get; set; }
    public string? ProposedCheckInTime { get; set; }
    public string? ProposedCheckOutTime { get; set; }
    public string Reason { get; set; } = string.Empty;
}

public class EmployeeAttendanceChangeRequestSubmitResultDto
{
    public int Id { get; set; }
    public string Status { get; set; } = string.Empty;
}

public class EmployeeAttendanceChangeRequestListDto
{
    public IReadOnlyList<EmployeeAttendanceChangeRequestListItemDto> Items { get; set; } =
        Array.Empty<EmployeeAttendanceChangeRequestListItemDto>();
}

public class EmployeeAttendanceChangeRequestListItemDto
{
    public int Id { get; set; }
    public int EmployeeAttendanceId { get; set; }
    public int EmployeeId { get; set; }
    public string EmployeeName { get; set; } = string.Empty;
    public DateOnly AttendanceDate { get; set; }
    public string? CurrentCheckInTime { get; set; }
    public string? CurrentCheckOutTime { get; set; }
    public string? ProposedCheckInTime { get; set; }
    public string? ProposedCheckOutTime { get; set; }
    public string Reason { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string StatusLabel { get; set; } = string.Empty;
    public DateTime SubmittedAtPkt { get; set; }
    public string SubmittedByUserKey { get; set; } = string.Empty;
    public DateTime? ReviewedAtPkt { get; set; }
    public string? ReviewedByUserKey { get; set; }
    public string? ReviewNote { get; set; }
}

public class EmployeeAttendanceChangeRequestDecisionRequestDto
{
    public string? ReviewNote { get; set; }
}

public class EmployeeAttendanceChangeRequestDecisionResultDto
{
    public int Id { get; set; }
    public string Status { get; set; } = string.Empty;
}
