namespace School.Application.DTOs;

public class StudentLeaveReasonOptionDto
{
    public string Code { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
}

public class ParentLeaveSubmitRequestDto
{
    public DateOnly LeaveDate { get; set; }
    public string ReasonCode { get; set; } = string.Empty;
    public string? ReasonDetails { get; set; }
}

public class ParentLeaveApplicationItemDto
{
    public int Id { get; set; }
    public DateOnly LeaveDate { get; set; }
    public string ReasonCode { get; set; } = string.Empty;
    public string ReasonLabel { get; set; } = string.Empty;
    public string? ReasonDetails { get; set; }
    public string Status { get; set; } = string.Empty;
    public string StatusLabel { get; set; } = string.Empty;
    public DateTime SubmittedAtPkt { get; set; }
    public DateTime? ReviewedAtPkt { get; set; }
}

public class ParentLeaveApplicationListDto
{
    public IReadOnlyList<ParentLeaveApplicationItemDto> Items { get; set; } = [];
}

public class ParentLeaveSubmitResultDto
{
    public int Id { get; set; }
    public string Status { get; set; } = string.Empty;
}

public class CampusLeaveApplicationListItemDto
{
    public int Id { get; set; }
    public int StudentId { get; set; }
    public string StudentName { get; set; } = string.Empty;
    public string? ClassName { get; set; }
    public int FamilyId { get; set; }
    public DateOnly LeaveDate { get; set; }
    public string ReasonCode { get; set; } = string.Empty;
    public string ReasonLabel { get; set; } = string.Empty;
    public string? ReasonDetails { get; set; }
    public string Status { get; set; } = string.Empty;
    public string StatusLabel { get; set; } = string.Empty;
    public DateTime SubmittedAtPkt { get; set; }
    public DateTime? ReviewedAtPkt { get; set; }
    public string? ReviewedByUserKey { get; set; }
    public string? ReviewNote { get; set; }
}

public class CampusLeaveApplicationListDto
{
    public IReadOnlyList<CampusLeaveApplicationListItemDto> Items { get; set; } = [];
}

public class CampusLeaveDecisionRequestDto
{
    public string? ReviewNote { get; set; }
}

public class CampusLeaveDecisionResultDto
{
    public int Id { get; set; }
    public string Status { get; set; } = string.Empty;
}
