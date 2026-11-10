namespace School.Infrastructure.Entities;

public class Designation
{
    public int ID { get; set; }
    public string? DesignationName { get; set; }
    public int? MustCheckinMinutesDifference { get; set; }
    public bool? IsActive { get; set; }
    public DateTime? MustCheckinTime { get; set; }
    public DateTime? LeavingTime { get; set; }
    public DateTime? SaturdayMustCheckinTime { get; set; }
    public DateTime? SaturdayLeavingTime { get; set; }
    public DateTime? FridayMustCheckinTime { get; set; }
    public DateTime? FridayLeavingTime { get; set; }
    public ICollection<Employee> Employees { get; set; } = [];
}
