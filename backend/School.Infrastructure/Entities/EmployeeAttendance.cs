namespace School.Infrastructure.Entities;

public class EmployeeAttendance
{
    public int ID { get; set; }
    public int? EmpID { get; set; }
    public DateTime? Date { get; set; }
    /// <summary>Check-in time (stored as text, e.g. 07:34).</summary>
    public string? Time { get; set; }
    public string? Type { get; set; }
    public string? Status { get; set; }
    /// <summary>Frozen duty result: OT, LA, EL, or LE. Null on older rows.</summary>
    public string? DutyResult { get; set; }
    public int? LateComings { get; set; }
    public decimal? CurrentSalary { get; set; }
    public decimal? LateDeduction { get; set; }
    public decimal? TodaySalary { get; set; }
    public string? UpdatedBy { get; set; }
    public string? ChangeJson { get; set; }
    public DateTime? CheckOutTime { get; set; }
}
