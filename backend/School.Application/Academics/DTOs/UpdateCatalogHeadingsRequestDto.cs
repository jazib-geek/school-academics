namespace School.Application.Academics.DTOs;

public class UpdateCatalogHeadingsRequestDto
{
    public Dictionary<string, string> Headings { get; set; } = new();
}
