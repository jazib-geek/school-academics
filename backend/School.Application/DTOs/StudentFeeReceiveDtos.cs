namespace School.Application.DTOs;

public class ReceiveStudentFeeRequestDto
{
    public DateTime Date { get; set; }
    public string? ManualRcptNo { get; set; }
    public List<ReceiveStudentFeeItemDto> Items { get; set; } = [];
}

public class ReceiveStudentFeeItemDto
{
    public int StudentId { get; set; }
    public int FundTypeId { get; set; }
    public int Month { get; set; }
    public int Year { get; set; }
    public decimal Amount { get; set; }
}

public class ReceiveStudentFeeResponseDto
{
    public int TransactionId { get; set; }
    public DateTime Date { get; set; }
    public string ReceivedBy { get; set; } = string.Empty;
    public string Campus { get; set; } = string.Empty;
    public List<StudentFeeReceiptDto> Receipts { get; set; } = [];
}

public class StudentFeeReceiptDto
{
    public int TransactionId { get; set; }
    public int ReceiptId { get; set; }
    public int StudentId { get; set; }
    public int? FamilyCode { get; set; }
    public string StudentName { get; set; } = string.Empty;
    public string ClassName { get; set; } = string.Empty;
    public DateTime Date { get; set; }
    public string Time { get; set; } = string.Empty;
    public string ReceivedBy { get; set; } = string.Empty;
    public string Campus { get; set; } = string.Empty;
    public string? ManualRcptNo { get; set; }
    public decimal TotalReceived { get; set; }
    public decimal TotalRemaining { get; set; }
    public List<StudentFeeReceiptLineDto> Lines { get; set; } = [];
}

public class StudentFeeReceiptLineDto
{
    /// <summary>tblFeeAndFundCollection.ID — needed for receipt edit.</summary>
    public int Id { get; set; }
    public int FundTypeId { get; set; }
    public string Description { get; set; } = string.Empty;
    public int Month { get; set; }
    public int Year { get; set; }
    public decimal ActualAmount { get; set; }
    public decimal Concession { get; set; }
    public decimal PreviousReceived { get; set; }
    public decimal Amount { get; set; }
}
