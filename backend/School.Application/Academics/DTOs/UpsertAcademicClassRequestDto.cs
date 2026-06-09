namespace School.Application.Academics.DTOs;

public class UpsertAcademicClassRequestDto
{
    public int? Id { get; set; }
    public string ClassName { get; set; } = string.Empty;
}
