namespace School.Infrastructure.Entities;

public class Designation
{
    public int ID { get; set; }
    public string? DesignationName { get; set; }
    public int? MustCheckinMinutesDifference { get; set; }
    public bool? IsActive { get; set; }
    public DateTime? MustCheckinTime { get; set; }
    public DateTime? LeavingTime { get; set; }
    public ICollection<Employee> Employees { get; set; } = [];
}
