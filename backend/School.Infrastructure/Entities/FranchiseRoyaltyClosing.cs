namespace School.Infrastructure.Entities;

public class FranchiseRoyaltyClosing
{
    public int Id { get; set; }

    public int CalendarYear { get; set; }

    public int CalendarMonth { get; set; }

    public decimal TotalFeeCollected { get; set; }

    public decimal RoyaltySharePercent { get; set; }

    public decimal RoyaltyAmount { get; set; }

    public DateTime ClosedAtPkt { get; set; }

    public int? ClosedByUserId { get; set; }

    public string? ClosedByUserName { get; set; }

    public string? VoucherNo { get; set; }

    public string? EntryUser { get; set; }

    public DateTime CreatedAtPkt { get; set; }
}
