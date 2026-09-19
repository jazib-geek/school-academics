namespace School.Infrastructure.Entities;

public class DayClosing
{
    public int Id { get; set; }

    public DateOnly ClosingDate { get; set; }

    public decimal TotalCashCollected { get; set; }

    public decimal TotalExpenses { get; set; }

    public decimal RemainingCash { get; set; }

    public string? Narration { get; set; }

    public string? EntryUser { get; set; }

    public DateTime CreatedAtPkt { get; set; }

    public DateTime? UpdatedAtPkt { get; set; }
}
