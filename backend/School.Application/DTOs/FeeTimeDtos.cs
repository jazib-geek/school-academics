using System.ComponentModel.DataAnnotations;

namespace School.Application.DTOs;

public class FeeTimeRowDto
{
    public int RegId { get; set; }
    public string? FullName { get; set; }
    public string? FatherName { get; set; }
    public string? ClassName { get; set; }
    public string? FeeTime { get; set; }
    public DateTime? UpdatedAt { get; set; }
}

public class FeeTimeSaveDto
{
    [Required, StringLength(500)]
    public string FeeTime { get; set; } = string.Empty;
}
