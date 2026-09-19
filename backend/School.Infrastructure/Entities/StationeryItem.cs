namespace School.Infrastructure.Entities;

public class StationeryItem
{
    public int ID { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string Unit { get; set; } = "pcs";
    public bool IsActive { get; set; } = true;

    public ICollection<StationeryPurchaseLine> PurchaseLines { get; set; } = [];
    public ICollection<StationeryHandoverLine> HandoverLines { get; set; } = [];
}
