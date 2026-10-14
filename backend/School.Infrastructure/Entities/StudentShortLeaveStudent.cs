namespace School.Infrastructure.Entities;

public class StudentShortLeaveStudent
{
    public int Id { get; set; }

    public int ShortLeaveId { get; set; }

    public int StudentId { get; set; }

    /// <summary>Copied from the pass so one student cannot have two passes on the same day.</summary>
    public DateOnly LeaveDate { get; set; }

    public StudentShortLeave ShortLeave { get; set; } = null!;

    public Student Student { get; set; } = null!;
}
