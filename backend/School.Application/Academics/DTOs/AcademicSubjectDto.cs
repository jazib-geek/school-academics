namespace School.Application.Academics.DTOs;

public class AcademicSubjectDto
{
    public int Id { get; set; }
    public string SubjectName { get; set; } = string.Empty;
    public bool IsSystem { get; set; }
    public string CatalogProfile { get; set; } = "standard";
    public Dictionary<string, string> CatalogHeadingDefaults { get; set; } = new();
}
