namespace School.Infrastructure.Entities;

public class StationeryPurchase
{
    public int ID { get; set; }
    public DateTime PurchaseDate { get; set; }
    public string? Notes { get; set; }
    public decimal TotalAmount { get; set; }
    public bool PostedToAccounts { get; set; }
    public string? VoucherNo { get; set; }
    public string? ExpenseAccountId { get; set; }
    public string? EntryUser { get; set; }
    public DateTime CreatedAtPkt { get; set; }

    public ICollection<StationeryPurchaseLine> Lines { get; set; } = [];
}
