namespace School.Infrastructure.Entities;

public class AbsentStudentFollowup
{
    public int Id { get; set; }
    public int StudentId { get; set; }
    public DateOnly AttendanceDate { get; set; }
    public int? ReasonId { get; set; }
    public string? Description { get; set; }
    public DateTime UpdatedAtPkt { get; set; }
    public string? UpdatedByName { get; set; }

    public Student Student { get; set; } = null!;
    public AbsentFollowupReason? Reason { get; set; }
}
