namespace School.Infrastructure.Entities;

public class DisciplineDayRound
{
    public int Id { get; set; }
    public int EmployeeId { get; set; }
    public DateOnly RoundDate { get; set; }
    public int RoundId { get; set; }
    public string Status { get; set; } = string.Empty;
    public string? Note { get; set; }
    public DateTime UpdatedAtPkt { get; set; }

    public Employee Employee { get; set; } = null!;
    public DisciplineRound Round { get; set; } = null!;
}
