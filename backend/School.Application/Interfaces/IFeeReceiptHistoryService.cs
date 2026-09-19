using School.Application.DTOs;

namespace School.Application.Interfaces;

public interface IFeeReceiptHistoryService
{
    Task<IReadOnlyList<FeeReceiptHistoryItemDto>> SearchAsync(
        FeeReceiptHistoryQueryDto query,
        CancellationToken cancellationToken = default);

    Task<StudentFeeReceiptDto> GetReceiptForReprintAsync(
        int receiptId,
        CancellationToken cancellationToken = default);

    Task VoidReceiptAsync(
        int receiptId,
        VoidFeeReceiptRequestDto request,
        int? userId,
        CancellationToken cancellationToken = default);

    Task EditReceiptAsync(
        int receiptId,
        EditFeeReceiptRequestDto request,
        int? userId,
        CancellationToken cancellationToken = default);

    Task<PagedResultDto<VoidedFeeReceiptListItemDto>> GetVoidedReceiptsAsync(
        VoidedFeeReceiptQueryDto query,
        CancellationToken cancellationToken = default);

    Task<StudentFeeReceiptDto> GetVoidedReceiptForPrintAsync(
        int activityLogId,
        CancellationToken cancellationToken = default);
}
