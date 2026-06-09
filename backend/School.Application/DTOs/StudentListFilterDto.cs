namespace School.Application.DTOs;

public class StudentListFilterDto
{
    public string? Class { get; set; }
    /// <summary>Case-insensitive partial match on student full name.</summary>
    public string? Name { get; set; }
    /// <summary>Autocomplete: matches name (contains) or registration id (contains).</summary>
    public string? Search { get; set; }
    public int? Reg_Id { get; set; }
    public bool? IsActive { get; set; }
    public string? Gender { get; set; }
    public int PageNumber { get; set; } = 1;
    public int PageSize { get; set; } = 10;
}
