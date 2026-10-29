using System.ComponentModel.DataAnnotations;

namespace School.Application.DTOs;

public class TeacherConductTagDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public int SortOrder { get; set; }
    public bool IsSystem { get; set; }
    public bool IsGood { get; set; }
    public bool IsActive { get; set; }
}

public class TeacherConductTypeDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public int SortOrder { get; set; }
    public bool IsSystem { get; set; }
    public bool IsActive { get; set; }
    public IReadOnlyList<TeacherConductTagDto> Tags { get; set; } = [];
}

public class TeacherConductTypeUpsertDto
{
    [Required, StringLength(80)]
    public string Name { get; set; } = string.Empty;

    public int SortOrder { get; set; }
    public bool? IsActive { get; set; } = true;
}

public class TeacherConductNoteTagDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public bool IsGood { get; set; }
}

public class TeacherConductNoteDto
{
    public int Id { get; set; }
    public int SubjectEmployeeId { get; set; }
    public DateOnly NoteDate { get; set; }
    public int ConductTypeId { get; set; }
    public string ConductTypeName { get; set; } = string.Empty;
    public string? Remarks { get; set; }
    public int? RecordedByEmployeeId { get; set; }
    public string? RecordedByName { get; set; }
    public DateTime CreatedAtPkt { get; set; }
    public DateTime? UpdatedAtPkt { get; set; }
    public IReadOnlyList<TeacherConductNoteTagDto> Tags { get; set; } = [];
}

public class TeacherConductNoteUpsertDto
{
    [Required, Range(1, int.MaxValue)]
    public int SubjectEmployeeId { get; set; }

    [Required]
    public DateOnly NoteDate { get; set; }

    [Required, Range(1, int.MaxValue)]
    public int ConductTypeId { get; set; }

    public List<int> TagIds { get; set; } = [];

    [StringLength(500)]
    public string? Remarks { get; set; }
}

public class TeacherConductHistoryDto
{
    public int SubjectEmployeeId { get; set; }
    public string EmployeeName { get; set; } = string.Empty;
    public string? DesignationName { get; set; }
    public int Year { get; set; }
    public int Month { get; set; }
    public List<TeacherConductNoteDto> Notes { get; set; } = [];
}

public class TeacherConductEmployeeLookupDto
{
    public int Id { get; set; }
    public string EmployeeName { get; set; } = string.Empty;
    public string? DesignationName { get; set; }
}

public class TeacherConductReportNoteDto
{
    public int Id { get; set; }
    public int SubjectEmployeeId { get; set; }
    public string EmployeeName { get; set; } = string.Empty;
    public string? DesignationName { get; set; }
    public DateOnly NoteDate { get; set; }
    public int ConductTypeId { get; set; }
    public string ConductTypeName { get; set; } = string.Empty;
    public string? Remarks { get; set; }
    public int? RecordedByEmployeeId { get; set; }
    public string? RecordedByName { get; set; }
    public IReadOnlyList<TeacherConductNoteTagDto> Tags { get; set; } = [];
}

public class TeacherConductDayReportGroupDto
{
    public int SubjectEmployeeId { get; set; }
    public string EmployeeName { get; set; } = string.Empty;
    public string? DesignationName { get; set; }
    public int Count { get; set; }
    public List<TeacherConductReportNoteDto> Notes { get; set; } = [];
}

public class TeacherConductDayReportDto
{
    public DateOnly Date { get; set; }
    public DateOnly DateTo { get; set; }
    public int TotalCount { get; set; }
    public int GoodCount { get; set; }
    public int BadCount { get; set; }
    public List<TeacherConductDayReportGroupDto> Teachers { get; set; } = [];
}
