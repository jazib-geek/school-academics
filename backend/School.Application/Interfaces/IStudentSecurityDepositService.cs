using School.Application.DTOs;
using School.Infrastructure.Entities;

namespace School.Application.Interfaces;

public interface IStudentSecurityDepositService
{
    Task RecordDepositsFromReceiveAsync(
        IReadOnlyList<FeeAndFundCollection> receiveRows,
        string? entryUser,
        CancellationToken cancellationToken = default);

    Task ReverseDepositsForRemovedLedgerRowsAsync(
        IReadOnlyList<FeeAndFundCollection> removedRows,
        string? entryUser,
        string? notes,
        CancellationToken cancellationToken = default);

    Task AdjustDepositAfterReceiptEditAsync(
        int feeLedgerRowId,
        int studentId,
        decimal oldAmount,
        decimal newAmount,
        DateTime eventDate,
        int sessionYear,
        int? receiptId,
        string? entryUser,
        CancellationToken cancellationToken = default);

    Task<StudentSecurityDepositSummaryDto> GetSummaryAsync(
        int studentId,
        CancellationToken cancellationToken = default);

    Task EnsureCanGenerateSecurityChargeAsync(
        int studentId,
        CancellationToken cancellationToken = default);

    Task<RefundStudentSecurityDepositResultDto> RefundAsync(
        int studentId,
        RefundStudentSecurityDepositRequestDto request,
        int? userId,
        CancellationToken cancellationToken = default);
}
