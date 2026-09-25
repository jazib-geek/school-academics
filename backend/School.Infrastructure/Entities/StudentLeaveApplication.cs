namespace School.Infrastructure.Entities;

public class StudentLeaveApplication
{
    public int Id { get; set; }
    public int StudentId { get; set; }
    public int FamilyId { get; set; }
    public DateOnly LeaveDate { get; set; }
    public string ReasonCode { get; set; } = string.Empty;
    public string? ReasonDetails { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateTime SubmittedAtPkt { get; set; }
    public DateTime? ReviewedAtPkt { get; set; }
    public string? ReviewedByUserKey { get; set; }
    public string? ReviewNote { get; set; }

    public Student Student { get; set; } = null!;
}
