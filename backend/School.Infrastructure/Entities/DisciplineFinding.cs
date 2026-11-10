namespace School.Infrastructure.Entities;

public class DisciplineFinding
{
    public int Id { get; set; }
    public int EmployeeId { get; set; }
    public DateOnly FindingDate { get; set; }
    public int? RoundId { get; set; }
    public string Kind { get; set; } = string.Empty;
    public string Place { get; set; } = string.Empty;
    public string WhatHappened { get; set; } = string.Empty;
    public string? WhatWasDone { get; set; }
    public DateTime CreatedAtPkt { get; set; }
    public DateTime? UpdatedAtPkt { get; set; }

    public Employee Employee { get; set; } = null!;
    public DisciplineRound? Round { get; set; }
    public ICollection<DisciplineFindingStudent> Students { get; set; } = [];
}
