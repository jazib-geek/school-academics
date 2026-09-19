namespace School.Infrastructure.Entities;

/// <summary>
/// Single-row campus counter for fee receipt numbers (RcptID).
/// Never decremented on void so hard-deleted receipt numbers are never reused.
/// </summary>
public class FeeReceiptSequence
{
    public int ID { get; set; }

    /// <summary>Highest RcptID ever issued on this campus.</summary>
    public int LastIssuedRcptId { get; set; }
}
