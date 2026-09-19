namespace School.Infrastructure.Entities;

public class StationeryPurchaseLine
{
    public int ID { get; set; }
    public int PurchaseID { get; set; }
    public int ItemID { get; set; }
    public decimal Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal LineTotal { get; set; }

    public StationeryPurchase Purchase { get; set; } = null!;
    public StationeryItem Item { get; set; } = null!;
}
