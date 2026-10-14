namespace School.Application.DTOs;

public class StudentShortLeaveDto
{
    public int Id { get; set; }
    public DateOnly LeaveDate { get; set; }
    public string PickupPersonName { get; set; } = string.Empty;
    public string PickupRelation { get; set; } = string.Empty;
    public string Reason { get; set; } = string.Empty;
    public string PickupTime { get; set; } = string.Empty;
    public bool PhoneConfirmationRequired { get; set; }
    public string? PhoneConfirmedWith { get; set; }
    public bool PhoneCallApproved { get; set; }
    public string ApprovedByUserName { get; set; } = string.Empty;
    public DateTime CreatedAtPkt { get; set; }
    public List<StudentShortLeaveStudentDto> Students { get; set; } = [];
}

public class StudentShortLeaveStudentDto
{
    public int StudentId { get; set; }
    public string StudentName { get; set; } = string.Empty;
    public string ClassName { get; set; } = string.Empty;
}

public class CreateStudentShortLeaveRequestDto
{
    public List<int> StudentIds { get; set; } = [];
    public string PickupPersonName { get; set; } = string.Empty;
    public string PickupRelation { get; set; } = string.Empty;
    public string Reason { get; set; } = string.Empty;
    public string PickupTime { get; set; } = string.Empty;
    public bool PhoneConfirmationRequired { get; set; }
    public string? PhoneConfirmedWith { get; set; }
    public bool PhoneCallApproved { get; set; }
}
