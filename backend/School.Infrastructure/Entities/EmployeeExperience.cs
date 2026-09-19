namespace School.Infrastructure.Entities;

public class EmployeeExperience
{
    public int ID { get; set; }
    public int? EmpID { get; set; }
    public string? InstituteName { get; set; }
    public string? Designation { get; set; }
    public DateTime? FromDate { get; set; }
    public DateTime? ToDate { get; set; }
    public int? DurationYears { get; set; }
    public Employee? Employee { get; set; }
}
