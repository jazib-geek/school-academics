using System.ComponentModel.DataAnnotations;

namespace School.Application.DTOs;

public class LocalityDto
{
    public int Id { get; set; }
    public string Town { get; set; } = string.Empty;
    public bool IsActive { get; set; }
}

public class LocalityUpsertDto
{
    [Required, StringLength(50)]
    public string Town { get; set; } = string.Empty;

    public bool IsActive { get; set; } = true;
}

public class LocalityStatusUpdateDto
{
    public bool IsActive { get; set; }
}
