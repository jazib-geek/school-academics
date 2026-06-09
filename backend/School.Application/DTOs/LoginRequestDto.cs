namespace School.Application.DTOs;

public class LoginRequestDto
{
    public int FamilyID { get; set; }
    public string Password { get; set; } = string.Empty;
}
