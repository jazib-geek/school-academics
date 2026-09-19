namespace School.Application.DTOs;

public class EmployeeMyAssignmentsDto
{
    public int EmployeeId { get; set; }
    public string EmployeeName { get; set; } = string.Empty;
    public int ClassCount { get; set; }
    public int SubjectCount { get; set; }
    public IReadOnlyList<EmployeeMyAssignmentClassDto> Classes { get; set; } =
        Array.Empty<EmployeeMyAssignmentClassDto>();
}

public class EmployeeMyAssignmentClassDto
{
    public int ClassId { get; set; }
    public string ClassName { get; set; } = string.Empty;
    public IReadOnlyList<EmployeeMyAssignmentSubjectDto> Subjects { get; set; } =
        Array.Empty<EmployeeMyAssignmentSubjectDto>();
}

public class EmployeeMyAssignmentSubjectDto
{
    public int SubjectId { get; set; }
    public string SubjectName { get; set; } = string.Empty;
}

public class EmployeeMyTimetableDto
{
    public int? TimetableId { get; set; }
    public string TimetableName { get; set; } = string.Empty;
    public string? Subtitle { get; set; }
    public bool HasTimetable { get; set; }
    public IReadOnlyList<EmployeeMyTimetableSlotDto> Slots { get; set; } =
        Array.Empty<EmployeeMyTimetableSlotDto>();
}

public class EmployeeMyTimetableSlotDto
{
    public int PeriodNumber { get; set; }
    public string PeriodLabel { get; set; } = string.Empty;
    public string? StartTime { get; set; }
    public string? EndTime { get; set; }
    public int SectionId { get; set; }
    public string ClassName { get; set; } = string.Empty;
    public int SubjectId { get; set; }
    public string SubjectName { get; set; } = string.Empty;
    public string? SubjectShortName { get; set; }
}
