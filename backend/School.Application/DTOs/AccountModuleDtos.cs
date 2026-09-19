using System.ComponentModel.DataAnnotations;

namespace School.Application.DTOs;

public class AccountLookupDto
{
    public int Id { get; set; }
    public string AccountId { get; set; } = string.Empty;
    public string AccountTitle { get; set; } = string.Empty;
    public int? MasterId { get; set; }
    public string? GroupId { get; set; }
    public string? SubGroupId { get; set; }
    public bool IsSystemAccount { get; set; }
}

public class AccountMasterDto
{
    public int MasterId { get; set; }
    public string Title { get; set; } = string.Empty;
}

public class AccountGroupDto
{
    public int Id { get; set; }
    public int? MasterId { get; set; }
    public string? MasterTitle { get; set; }
    public string GroupId { get; set; } = string.Empty;
    public string GroupTitle { get; set; } = string.Empty;
}

public class AccountSubGroupDto
{
    public int Id { get; set; }
    public int MasterId { get; set; }
    public string? MasterTitle { get; set; }
    public string GroupId { get; set; } = string.Empty;
    public string? GroupTitle { get; set; }
    public string SubGroupId { get; set; } = string.Empty;
    public string SubGroupName { get; set; } = string.Empty;
}

public class AccountLevel4Dto
{
    public int Id { get; set; }
    public int? MasterId { get; set; }
    public string? MasterTitle { get; set; }
    public string? GroupId { get; set; }
    public string? GroupTitle { get; set; }
    public string? SubGroupId { get; set; }
    public string? SubGroupName { get; set; }
    public string AccountId { get; set; } = string.Empty;
    public string AccountTitle { get; set; } = string.Empty;
    public bool IsSystemAccount { get; set; }
}

public class CreateAccountGroupRequestDto
{
    [Required]
    public int MasterId { get; set; }

    [Required, StringLength(200)]
    public string Title { get; set; } = string.Empty;
}

public class CreateAccountSubGroupRequestDto
{
    [Required, StringLength(50)]
    public string GroupId { get; set; } = string.Empty;

    [Required, StringLength(200)]
    public string Title { get; set; } = string.Empty;
}

public class CreateAccountRequestDto
{
    [Required, StringLength(50)]
    public string SubGroupId { get; set; } = string.Empty;

    [Required, StringLength(200)]
    public string AccountTitle { get; set; } = string.Empty;
}

public class RenameAccountNodeRequestDto
{
    [Required, StringLength(200)]
    public string Title { get; set; } = string.Empty;
}

public class VoucherLineInputDto
{
    [Required, StringLength(50)]
    public string AccountId { get; set; } = string.Empty;

    [StringLength(500)]
    public string? Narration { get; set; }

    [Range(0.01, double.MaxValue)]
    public decimal Amount { get; set; }
}

public class SaveVoucherRequestDto
{
    [Required]
    public DateTime Date { get; set; }

    [Required, MinLength(1)]
    public List<VoucherLineInputDto> Lines { get; set; } = [];
}

public class SaveVoucherResultDto
{
    public string VoucherNo { get; set; } = string.Empty;
    public string VoucherType { get; set; } = string.Empty;
    public decimal TotalAmount { get; set; }
}

public class AccountLedgerLineDto
{
    public int Serial { get; set; }
    public int Id { get; set; }
    public DateTime? Date { get; set; }
    public string? Narration { get; set; }
    public decimal Received { get; set; }
    public decimal Payment { get; set; }
    public decimal Balance { get; set; }
}

public class AccountLedgerResultDto
{
    public string AccountId { get; set; } = string.Empty;
    public string AccountTitle { get; set; } = string.Empty;
    public DateTime From { get; set; }
    public DateTime To { get; set; }
    public List<AccountLedgerLineDto> Lines { get; set; } = [];
    public decimal TotalReceived { get; set; }
    public decimal TotalPayment { get; set; }
    public decimal ClosingBalance { get; set; }
}

public class AccountSummaryRowDto
{
    public string AccountId { get; set; } = string.Empty;
    public string Account { get; set; } = string.Empty;
    public decimal Received { get; set; }
    public decimal Payment { get; set; }
    public decimal Balance { get; set; }
    public bool IsFeeOverlay { get; set; }
}

public class AccountSummaryResultDto
{
    public DateTime From { get; set; }
    public DateTime To { get; set; }
    public List<AccountSummaryRowDto> Rows { get; set; } = [];
    public decimal TotalReceived { get; set; }
    public decimal TotalPayment { get; set; }
    public decimal ClosingBalance { get; set; }
}

public class CashBookLineDto
{
    public int Id { get; set; }
    public string? VoucherNo { get; set; }
    public string AccountId { get; set; } = string.Empty;
    public string AccountTitle { get; set; } = string.Empty;
    public string? Narration { get; set; }
    public decimal Received { get; set; }
    public decimal Payment { get; set; }
}

public class CashBookDayDto
{
    public DateTime Date { get; set; }
    public List<CashBookLineDto> Lines { get; set; } = [];
}

public class CashBookResultDto
{
    public DateTime From { get; set; }
    public DateTime To { get; set; }
    public List<CashBookDayDto> Days { get; set; } = [];
    public decimal DailyExpensesTotal { get; set; }
    public decimal TuitionFee { get; set; }
    public decimal AdmissionFee { get; set; }
    public decimal MiscCharges { get; set; }
    public decimal PrevBalance { get; set; }
    public decimal Fine { get; set; }
    public decimal TotalReceived { get; set; }
    public decimal TotalPayment { get; set; }
    public decimal ClosingBalance { get; set; }
}
