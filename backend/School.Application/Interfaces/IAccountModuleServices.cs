using School.Application.DTOs;

namespace School.Application.Interfaces;

public interface ISystemAccountResolver
{
    Task EnsureSystemAccountsAsync(CancellationToken cancellationToken = default);

    /// <summary>Returns tblAccounts.AccountID (string code), not the int PK.</summary>
    Task<string?> GetCashInHandAccountIdAsync(CancellationToken cancellationToken = default);

    Task<string?> GetOwnerDrawingsAccountIdAsync(CancellationToken cancellationToken = default);

    Task<AccountLookupDto?> GetCashInHandAsync(CancellationToken cancellationToken = default);

    Task<AccountLookupDto?> GetOwnerDrawingsAsync(CancellationToken cancellationToken = default);
}

public interface IAccountChartService
{
    Task EnsureSystemAccountsAsync(CancellationToken cancellationToken = default);

    Task<IReadOnlyList<AccountMasterDto>> GetMastersAsync(CancellationToken cancellationToken = default);

    Task<IReadOnlyList<AccountGroupDto>> GetGroupsAsync(int? masterId = null, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<AccountSubGroupDto>> GetSubGroupsAsync(string? groupId = null, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<AccountLevel4Dto>> GetAccountsAsync(string? subGroupId = null, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<AccountLookupDto>> GetPostableAccountsAsync(
        bool excludeCashInHand = true,
        CancellationToken cancellationToken = default);

    Task<AccountGroupDto> CreateGroupAsync(CreateAccountGroupRequestDto request, CancellationToken cancellationToken = default);

    Task<AccountSubGroupDto> CreateSubGroupAsync(CreateAccountSubGroupRequestDto request, CancellationToken cancellationToken = default);

    Task<AccountLevel4Dto> CreateAccountAsync(
        CreateAccountRequestDto request,
        string? entryUser,
        CancellationToken cancellationToken = default);

    Task RenameGroupAsync(int id, RenameAccountNodeRequestDto request, CancellationToken cancellationToken = default);

    Task RenameSubGroupAsync(int id, RenameAccountNodeRequestDto request, CancellationToken cancellationToken = default);

    Task RenameAccountAsync(int id, RenameAccountNodeRequestDto request, CancellationToken cancellationToken = default);
}

public interface IAccountVoucherService
{
    Task<SaveVoucherResultDto> SaveCashPaymentAsync(
        SaveVoucherRequestDto request,
        string? entryUser,
        CancellationToken cancellationToken = default);

    Task<SaveVoucherResultDto> SaveCashReceiptAsync(
        SaveVoucherRequestDto request,
        string? entryUser,
        CancellationToken cancellationToken = default);
}

public interface IAccountLedgerService
{
    Task<AccountLedgerResultDto> GetLedgerAsync(
        string accountId,
        DateTime from,
        DateTime to,
        CancellationToken cancellationToken = default);
}

public interface IAccountCashBookService
{
    Task<CashBookResultDto> GetCashBookAsync(
        DateTime from,
        DateTime to,
        CancellationToken cancellationToken = default);
}

public interface IAccountSummaryService
{
    Task<AccountSummaryResultDto> GetSummaryAsync(
        DateTime from,
        DateTime to,
        CancellationToken cancellationToken = default);
}
