namespace School.Application.DTOs;

public class StudentListFilterDto
{
    public string? Class { get; set; }
    /// <summary>Case-insensitive partial match on student/father name or father/mother contact.</summary>
    public string? Name { get; set; }
    /// <summary>Autocomplete: matches name, contacts, or registration id (contains).</summary>
    public string? Search { get; set; }
    public int? Reg_Id { get; set; }
    public bool? IsActive { get; set; }
    public string? Gender { get; set; }
    public bool? IsCreditStudent { get; set; }
    public string? SortBy { get; set; }
    public string? SortDirection { get; set; }
    public int PageNumber { get; set; } = 1;
    public int PageSize { get; set; } = 10;
}
