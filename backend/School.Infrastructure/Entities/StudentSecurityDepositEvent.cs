namespace School.Infrastructure.Entities;

public static class StudentSecurityDepositEventTypes
{
    public const string Deposit = "deposit";
    public const string Refund = "refund";
    public const string DepositReversal = "deposit_reversal";
}

public class StudentSecurityDepositEvent
{
    public int Id { get; set; }
    public int StudentId { get; set; }
    public string EventType { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public DateTime EventDatePkt { get; set; }
    public int SessionYear { get; set; }
    public int? FeeLedgerRowId { get; set; }
    public int? ReceiptId { get; set; }
    public string? VoucherNo { get; set; }
    public string? EntryUser { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAtPkt { get; set; }
}
