namespace School.Infrastructure.Entities;

public class StudentShortLeave
{
    public int Id { get; set; }

    public DateOnly LeaveDate { get; set; }

    public string PickupPersonName { get; set; } = string.Empty;

    public string PickupRelation { get; set; } = string.Empty;

    public string Reason { get; set; } = string.Empty;

    public TimeOnly PickupTime { get; set; }

    public bool PhoneConfirmationRequired { get; set; }

    public string? PhoneConfirmedWith { get; set; }

    public bool PhoneCallApproved { get; set; }

    public string ApprovedByUserName { get; set; } = string.Empty;

    public DateTime CreatedAtPkt { get; set; }

    public ICollection<StudentShortLeaveStudent> Students { get; set; } = new List<StudentShortLeaveStudent>();
}
