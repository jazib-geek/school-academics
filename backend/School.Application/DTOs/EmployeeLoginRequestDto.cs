namespace School.Application.DTOs;

public class EmployeeLoginRequestDto
{
    /// <summary>Biometric / device code (tblEmployee.Thumb_ID), shown as username on the login form.</summary>
    public string Username { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
}
