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
    public string? SaturdayMustCheckinTime { get; set; }
    public string? SaturdayLeavingTime { get; set; }
    public string? FridayMustCheckinTime { get; set; }
    public string? FridayLeavingTime { get; set; }
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

    [RegularExpression(@"^([01]\d|2[0-3]):[0-5]\d$", ErrorMessage = "Saturday check-in time must use HH:mm format.")]
    public string? SaturdayMustCheckinTime { get; set; }

    [RegularExpression(@"^([01]\d|2[0-3]):[0-5]\d$", ErrorMessage = "Saturday checkout time must use HH:mm format.")]
    public string? SaturdayLeavingTime { get; set; }

    [RegularExpression(@"^([01]\d|2[0-3]):[0-5]\d$", ErrorMessage = "Friday check-in time must use HH:mm format.")]
    public string? FridayMustCheckinTime { get; set; }

    [RegularExpression(@"^([01]\d|2[0-3]):[0-5]\d$", ErrorMessage = "Friday checkout time must use HH:mm format.")]
    public string? FridayLeavingTime { get; set; }
}

public class DesignationStatusUpdateDto
{
    public bool IsActive { get; set; }
}
