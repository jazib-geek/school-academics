using System.ComponentModel.DataAnnotations;

namespace School.Application.DTOs;

public class DayClosingDto
{
    public int Id { get; set; }
    public DateOnly ClosingDate { get; set; }
    public decimal TotalCashCollected { get; set; }
    public decimal TotalExpenses { get; set; }
    public decimal RemainingCash { get; set; }
    public string? Narration { get; set; }
    public string? EntryUser { get; set; }
    public DateTime CreatedAtPkt { get; set; }
}

public class DayClosingPreviewDto
{
    public DateOnly ClosingDate { get; set; }
    public DateOnly TodayPkt { get; set; }
    public bool IsToday { get; set; }
    public bool IsClosed { get; set; }
    public bool CanClose { get; set; }

    /// <summary>Fee receipts + GL credits for the day.</summary>
    public decimal TotalCashCollected { get; set; }

    /// <summary>GL debits / operating payments for the day.</summary>
    public decimal TotalExpenses { get; set; }

    /// <summary>Suggested RemainingCash = max(0, Collected - Expenses).</summary>
    public decimal SuggestedRemainingCash { get; set; }

    public decimal TuitionFee { get; set; }
    public decimal AdmissionFee { get; set; }
    public decimal MiscCharges { get; set; }
    public decimal PrevBalance { get; set; }
    public decimal Fine { get; set; }
    public decimal GlCredits { get; set; }
    public decimal GlDebits { get; set; }

    public DayClosingDto? Closing { get; set; }
    public List<DayClosingDto> RecentClosings { get; set; } = [];
}

public class CloseDayRequestDto
{
    [Required]
    public DateOnly ClosingDate { get; set; }

    [Range(0, double.MaxValue)]
    public decimal RemainingCash { get; set; }

    [StringLength(500)]
    public string? Narration { get; set; }
}
