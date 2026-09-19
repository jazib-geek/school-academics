namespace School.Application.DTOs;

public class FeeReceiptHistoryQueryDto
{
    public DateTime? DateFrom { get; set; }
    public DateTime? DateTo { get; set; }
    public string? StudentName { get; set; }
}

public class FeeReceiptHistoryItemDto
{
    public int ReceiptId { get; set; }
    public int TransactionId { get; set; }
    public int StudentId { get; set; }
    public string StudentName { get; set; } = string.Empty;
    public string ClassName { get; set; } = string.Empty;
    public int? FamilyCode { get; set; }
    public DateTime? Date { get; set; }
    public string? Time { get; set; }
    public string? ReceivedBy { get; set; }
    public string? ManualRcptNo { get; set; }
    public decimal TotalReceived { get; set; }
    public int LineCount { get; set; }

    /// <summary>True when this row is a tombstone for a hard-deleted (voided) receipt.</summary>
    public bool IsVoided { get; set; }

    /// <summary>Activity log id for voided rows (VOID print).</summary>
    public int? VoidActivityLogId { get; set; }
}

public class EditFeeReceiptRequestDto
{
    public DateTime? Date { get; set; }
    public List<EditFeeReceiptLineDto> Lines { get; set; } = [];
}

public class EditFeeReceiptLineDto
{
    /// <summary>tblFeeAndFundCollection.ID</summary>
    public int Id { get; set; }
    public decimal Amount { get; set; }
}

public class VoidFeeReceiptRequestDto
{
    public string? Reason { get; set; }
}

public class VoidedFeeReceiptQueryDto
{
    public DateOnly? DateFrom { get; set; }
    public DateOnly? DateTo { get; set; }
    public string? StudentName { get; set; }
    public int? ReceiptId { get; set; }
    public int PageNumber { get; set; } = 1;
    public int PageSize { get; set; } = 25;
}

public class VoidedFeeReceiptListItemDto
{
    public int ActivityLogId { get; set; }
    public int ReceiptId { get; set; }
    public int StudentId { get; set; }
    public string StudentName { get; set; } = string.Empty;
    public string ClassName { get; set; } = string.Empty;
    public DateTime? ReceiptDate { get; set; }
    public decimal TotalReceived { get; set; }
    public string? VoidedBy { get; set; }
    public DateTime VoidedAtPkt { get; set; }
    public string? Reason { get; set; }
}
