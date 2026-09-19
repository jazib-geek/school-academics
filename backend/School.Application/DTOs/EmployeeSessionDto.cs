namespace School.Application.DTOs;

public class EmployeeSessionDto
{
    public int ID { get; set; }
    public string EmployeeName { get; set; } = string.Empty;
    public string? Gender { get; set; }
    public string? Designation { get; set; }
}
