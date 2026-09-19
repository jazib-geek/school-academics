namespace School.Application.DTOs;

public class CampusLoginRequestDto
{
    public string Username { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
}

public class SwitchCampusRequestDto
{
    public string Campus { get; set; } = string.Empty;
}

public class LoginAsCampusUserRequestDto
{
    public int UserId { get; set; }
}
