namespace School.Application.Academics.DTOs;

public class InstituteSettingsDto
{
    public int Id { get; set; }
    public string? InstituteName { get; set; }
    public string? InstituteAddress { get; set; }
    public string? InstituteContact { get; set; }
    public string? InstituteEmail { get; set; }
    public string? InstituteLogo { get; set; }
}

public class UpsertInstituteSettingsRequestDto
{
    public int? Id { get; set; }
    public string? InstituteName { get; set; }
    public string? InstituteAddress { get; set; }
    public string? InstituteContact { get; set; }
    public string? InstituteEmail { get; set; }
    public string? InstituteLogo { get; set; }
}
