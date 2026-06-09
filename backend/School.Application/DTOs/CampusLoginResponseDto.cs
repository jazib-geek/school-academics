namespace School.Application.DTOs;

public class CampusLoginResponseDto
{
    public int ID { get; set; }
    public string Username { get; set; } = string.Empty;
    public int? RoleID { get; set; }
    public string Token { get; set; } = string.Empty;
}
