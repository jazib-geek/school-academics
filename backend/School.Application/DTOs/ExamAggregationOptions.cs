namespace School.Application.DTOs;

/// <summary>
/// Controls whether Drawing / Stemp subject marks count toward exam totals and ranking.
/// Defaults exclude both (legacy Alt behaviour).
/// </summary>
public class ExamAggregationOptions
{
    public bool IncludeDrawingInTotals { get; set; }
    public bool IncludeStempInTotals { get; set; }

    public static ExamAggregationOptions Default => new();
}
