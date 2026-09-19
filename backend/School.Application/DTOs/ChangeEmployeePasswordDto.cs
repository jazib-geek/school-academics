using System.ComponentModel.DataAnnotations;

namespace School.Application.DTOs;

public class ChangeEmployeePasswordDto
{
    [Required, StringLength(100)]
    public string CurrentPassword { get; set; } = string.Empty;

    [Required, StringLength(100, MinimumLength = 6)]
    public string NewPassword { get; set; } = string.Empty;

    [Required, StringLength(100)]
    public string ConfirmPassword { get; set; } = string.Empty;
}
