namespace School.Infrastructure.Entities;

public class StationeryBudget
{
    public int ID { get; set; }
    public int Year { get; set; }
    public int Month { get; set; }
    public string Period { get; set; } = "Month";
    public string? Notes { get; set; }
    public decimal TotalAmount { get; set; }
    public string? EntryUser { get; set; }
    public DateTime CreatedAtPkt { get; set; }

    public ICollection<StationeryBudgetLine> Lines { get; set; } = [];
}
