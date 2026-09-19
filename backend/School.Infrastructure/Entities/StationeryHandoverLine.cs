namespace School.Infrastructure.Entities;

public class StationeryHandoverLine
{
    public int ID { get; set; }
    public int HandoverID { get; set; }
    public int ItemID { get; set; }
    public decimal Quantity { get; set; }

    public StationeryHandover Handover { get; set; } = null!;
    public StationeryItem Item { get; set; } = null!;
}
