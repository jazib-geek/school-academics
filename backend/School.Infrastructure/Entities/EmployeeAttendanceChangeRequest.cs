namespace School.Infrastructure.Entities;

public class EmployeeAttendanceChangeRequest
{
    public int Id { get; set; }
    public int? EmployeeAttendanceId { get; set; }
    public int EmployeeId { get; set; }
    public string RequestKind { get; set; } = string.Empty;
    public DateOnly AttendanceDate { get; set; }
    public string? ProposedCheckInTime { get; set; }
    public string? ProposedCheckOutTime { get; set; }
    public string Reason { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public DateTime SubmittedAtPkt { get; set; }
    public string SubmittedByUserKey { get; set; } = string.Empty;
    public DateTime? ReviewedAtPkt { get; set; }
    public string? ReviewedByUserKey { get; set; }
    public string? ReviewNote { get; set; }

    public EmployeeAttendance? EmployeeAttendance { get; set; }
}
