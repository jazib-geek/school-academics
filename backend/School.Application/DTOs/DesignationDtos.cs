using System.ComponentModel.DataAnnotations;

namespace School.Application.DTOs;

public class DesignationDto
{
    public int ID { get; set; }
    public string Name { get; set; } = string.Empty;
    public int? MustCheckinMinutesDifference { get; set; }
    public bool IsActive { get; set; }
    public string? MustCheckinTime { get; set; }
    public string? LeavingTime { get; set; }
    public int EmployeeCount { get; set; }
}

public class DesignationUpsertDto
{
    [Required, StringLength(250)]
    public string Name { get; set; } = string.Empty;

    public int? MustCheckinMinutesDifference { get; set; }
    public bool? IsActive { get; set; } = true;

    [RegularExpression(@"^([01]\d|2[0-3]):[0-5]\d$", ErrorMessage = "Check-in time must use HH:mm format.")]
    public string? MustCheckinTime { get; set; }

    [RegularExpression(@"^([01]\d|2[0-3]):[0-5]\d$", ErrorMessage = "Checkout time must use HH:mm format.")]
    public string? LeavingTime { get; set; }
}

public class DesignationStatusUpdateDto
{
    public bool IsActive { get; set; }
}
