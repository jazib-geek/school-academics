namespace School.Application.DTOs;

public class EmployeeLoginRequestDto
{
    public int ID { get; set; }
    public string Password { get; set; } = string.Empty;
}
