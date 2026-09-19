namespace School.Infrastructure.Entities;

public class EmployeeQualification
{
    public int ID { get; set; }
    public int? EmpID { get; set; }
    public string? Degree { get; set; }
    public string? Board { get; set; }
    public string? Grade { get; set; }
    public string? Marks { get; set; }
    public int? Year { get; set; }
    public string? Remarks { get; set; }
    public Employee? Employee { get; set; }
}
