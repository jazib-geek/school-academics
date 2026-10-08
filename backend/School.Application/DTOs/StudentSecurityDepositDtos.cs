namespace School.Application.DTOs;

public class StudentSecurityDepositSummaryDto
{
    public int StudentId { get; set; }
    public string StudentName { get; set; } = string.Empty;
    public decimal HeldAmount { get; set; }
    public decimal NetDeposited { get; set; }
    public decimal TotalRefunded { get; set; }
    public bool HasRefundHistory { get; set; }
    public bool CanGenerateSecurityCharge { get; set; }
    public decimal LedgerReceivedCurrentSession { get; set; }
    public IReadOnlyList<StudentSecurityDepositEventDto> Events { get; set; } = [];
}

public class StudentSecurityDepositEventDto
{
    public int Id { get; set; }
    public string EventType { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public DateTime EventDate { get; set; }
    public int SessionYear { get; set; }
    public int? ReceiptId { get; set; }
    public string? VoucherNo { get; set; }
    public string? EntryUser { get; set; }
    public string? Notes { get; set; }
}

public class RefundStudentSecurityDepositRequestDto
{
    public decimal Amount { get; set; }
    public DateTime Date { get; set; }
    public bool PostToAccounts { get; set; } = true;
    public string? Notes { get; set; }
}

public class RefundStudentSecurityDepositResultDto
{
    public decimal RefundedAmount { get; set; }
    public decimal HeldAfter { get; set; }
    public string? VoucherNo { get; set; }
    public int EventId { get; set; }
}
