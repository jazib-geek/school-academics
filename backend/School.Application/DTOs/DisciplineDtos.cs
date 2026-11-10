using System.ComponentModel.DataAnnotations;

namespace School.Application.DTOs;

public class DisciplineRoundDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Status { get; set; }
    public string? Note { get; set; }
}

public class DisciplineFindingStudentDto
{
    public int StudentId { get; set; }
    public string StudentName { get; set; } = string.Empty;
    public string ClassName { get; set; } = string.Empty;
}

public class DisciplineFindingDto
{
    public int Id { get; set; }
    public int? RoundId { get; set; }
    public string Kind { get; set; } = string.Empty;
    public string Place { get; set; } = string.Empty;
    public string WhatHappened { get; set; } = string.Empty;
    public string? WhatWasDone { get; set; }
    public List<DisciplineFindingStudentDto> Students { get; set; } = [];
}

public class DisciplineDayReportDto
{
    public string WhatWasDone { get; set; } = string.Empty;
    public string? AnythingElse { get; set; }
    public DateTime SubmittedAtPkt { get; set; }
}

public class DisciplineDayDto
{
    public DateOnly Date { get; set; }
    public bool Submitted { get; set; }
    public List<DisciplineRoundDto> Rounds { get; set; } = [];
    public List<DisciplineFindingDto> Findings { get; set; } = [];
    public DisciplineDayReportDto? Report { get; set; }
}

public class DisciplineCampusInchargeDto
{
    public int EmployeeId { get; set; }
    public string EmployeeName { get; set; } = string.Empty;
    public bool Submitted { get; set; }
    public List<DisciplineRoundDto> Rounds { get; set; } = [];
    public List<DisciplineFindingDto> Findings { get; set; } = [];
    public DisciplineDayReportDto? Report { get; set; }
}

public class DisciplineCampusDayDto
{
    public DateOnly Date { get; set; }
    public List<DisciplineCampusInchargeDto> Incharges { get; set; } = [];
}

public class DisciplineRoundSaveDto
{
    public DateOnly Date { get; set; }
    [Range(1, int.MaxValue)]
    public int RoundId { get; set; }
    [Required, StringLength(20)]
    public string Status { get; set; } = string.Empty;
    [StringLength(300)]
    public string? Note { get; set; }
}

public class DisciplineFindingSaveDto
{
    public int? Id { get; set; }
    public DateOnly Date { get; set; }
    public int? RoundId { get; set; }
    [Required, StringLength(20)]
    public string Kind { get; set; } = string.Empty;
    [Required, StringLength(80)]
    public string Place { get; set; } = string.Empty;
    [Required, StringLength(500)]
    public string WhatHappened { get; set; } = string.Empty;
    [StringLength(500)]
    public string? WhatWasDone { get; set; }
    public List<int> StudentIds { get; set; } = [];
}

public class DisciplineDayReportSaveDto
{
    public DateOnly Date { get; set; }
    [Required, StringLength(1000)]
    public string WhatWasDone { get; set; } = string.Empty;
    [StringLength(1000)]
    public string? AnythingElse { get; set; }
}
