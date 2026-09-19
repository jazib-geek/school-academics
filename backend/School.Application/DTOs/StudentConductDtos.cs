using System.ComponentModel.DataAnnotations;

namespace School.Application.DTOs;

public class StudentConductTagDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public int SortOrder { get; set; }
    public bool IsSystem { get; set; }
    public bool IsGood { get; set; }
    public bool IsActive { get; set; }
}

public class StudentConductTypeDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public int SortOrder { get; set; }
    public bool IsSystem { get; set; }
    public bool IsActive { get; set; }
    public IReadOnlyList<StudentConductTagDto> Tags { get; set; } = [];
}

public class StudentConductTypeUpsertDto
{
    [Required, StringLength(80)]
    public string Name { get; set; } = string.Empty;

    public int SortOrder { get; set; }
    public bool? IsActive { get; set; } = true;
}

public class StudentConductNoteTagDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public bool IsGood { get; set; }
}

public class StudentConductNoteDto
{
    public int Id { get; set; }
    public int StudentId { get; set; }
    public DateOnly NoteDate { get; set; }
    public int ConductTypeId { get; set; }
    public string ConductTypeName { get; set; } = string.Empty;
    public string? Remarks { get; set; }
    public int? RecordedByEmployeeId { get; set; }
    public string? RecordedByName { get; set; }
    public DateTime CreatedAtPkt { get; set; }
    public DateTime? UpdatedAtPkt { get; set; }
    public IReadOnlyList<StudentConductNoteTagDto> Tags { get; set; } = [];
}

public class StudentConductNoteUpsertDto
{
    [Required, Range(1, int.MaxValue)]
    public int StudentId { get; set; }

    [Required]
    public DateOnly NoteDate { get; set; }

    [Required, Range(1, int.MaxValue)]
    public int ConductTypeId { get; set; }

    public List<int> TagIds { get; set; } = [];

    [StringLength(500)]
    public string? Remarks { get; set; }
}

public class StudentConductClassSheetDto
{
    public int ClassSectionCompositeId { get; set; }
    public string ClassName { get; set; } = string.Empty;
    public DateOnly Date { get; set; }
    public List<StudentConductClassStudentDto> Students { get; set; } = [];
}

public class StudentConductClassStudentDto
{
    public int StudentId { get; set; }
    public string StudentName { get; set; } = string.Empty;
    public List<StudentConductNoteDto> Notes { get; set; } = [];
}

public class StudentConductHistoryDto
{
    public int StudentId { get; set; }
    public string StudentName { get; set; } = string.Empty;
    public int Year { get; set; }
    public int Month { get; set; }
    public List<StudentConductNoteDto> Notes { get; set; } = [];
}

public class StudentConductReportNoteDto
{
    public int Id { get; set; }
    public int StudentId { get; set; }
    public string StudentName { get; set; } = string.Empty;
    public string ClassName { get; set; } = string.Empty;
    public DateOnly NoteDate { get; set; }
    public int ConductTypeId { get; set; }
    public string ConductTypeName { get; set; } = string.Empty;
    public string? Remarks { get; set; }
    public string? RecordedByName { get; set; }
    public IReadOnlyList<StudentConductNoteTagDto> Tags { get; set; } = [];
}

public class StudentConductDayReportClassDto
{
    public string ClassName { get; set; } = string.Empty;
    public int Count { get; set; }
    public List<StudentConductReportNoteDto> Notes { get; set; } = [];
}

public class StudentConductDayReportDto
{
    public DateOnly Date { get; set; }
    public int TotalCount { get; set; }
    public int GoodCount { get; set; }
    public int BadCount { get; set; }
    public List<StudentConductDayReportClassDto> Classes { get; set; } = [];
}
