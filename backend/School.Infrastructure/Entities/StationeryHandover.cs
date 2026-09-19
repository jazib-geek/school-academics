namespace School.Infrastructure.Entities;

public class StationeryHandover
{
    public int ID { get; set; }
    public DateTime HandoverDate { get; set; }
    public int EmployeeID { get; set; }
    public string? Notes { get; set; }
    public string? EntryUser { get; set; }
    public DateTime CreatedAtPkt { get; set; }

    public Employee Employee { get; set; } = null!;
    public ICollection<StationeryHandoverLine> Lines { get; set; } = [];
}
