namespace School.Infrastructure.Entities;

public class DisciplineDayReport
{
    public int Id { get; set; }
    public int EmployeeId { get; set; }
    public DateOnly ReportDate { get; set; }
    public string WhatWasDone { get; set; } = string.Empty;
    public string? AnythingElse { get; set; }
    public DateTime SubmittedAtPkt { get; set; }

    public Employee Employee { get; set; } = null!;
}
