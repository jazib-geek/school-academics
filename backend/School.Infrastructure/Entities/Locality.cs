namespace School.Infrastructure.Entities;

public class Locality
{
    public int ID { get; set; }
    public string? Town { get; set; }
    public bool? IsActive { get; set; }
    public ICollection<Employee> Employees { get; set; } = [];
}
