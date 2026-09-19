namespace School.Application.DTOs;

public class ClassLookupDto
{
    public int Id { get; set; }
    public string ClassName { get; set; } = string.Empty;
    public int? Fee { get; set; }
    public string? Branch { get; set; }
    public int? BranchId { get; set; }
}
