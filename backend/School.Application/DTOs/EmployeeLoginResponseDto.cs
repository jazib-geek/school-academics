namespace School.Application.DTOs;

public class EmployeeLoginResponseDto
{
    public int ID { get; set; }
    public string EmployeeName { get; set; } = string.Empty;
    public string? Gender { get; set; }
    public string? Designation { get; set; }
    public int? BranchID { get; set; }
    public bool IsCoordinator { get; set; }
    public string Token { get; set; } = string.Empty;
    public EmployeeAppAccessDto AppAccess { get; set; } = new();
}
