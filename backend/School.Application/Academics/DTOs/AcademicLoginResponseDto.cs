namespace School.Application.Academics.DTOs;

public class AcademicLoginResponseDto
{
    public int Id { get; set; }
    public string UserName { get; set; } = string.Empty;
    public string Token { get; set; } = string.Empty;
    public InstituteSettingsDto? InstituteSettings { get; set; }
}
