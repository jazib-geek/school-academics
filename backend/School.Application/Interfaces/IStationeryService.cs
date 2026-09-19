using School.Application.DTOs;

namespace School.Application.Interfaces;

public interface IStationeryService
{
    Task<IReadOnlyList<StationeryItemDto>> GetItemsAsync(CancellationToken cancellationToken = default);
    Task<StationeryItemDto> GetItemAsync(int id, CancellationToken cancellationToken = default);
    Task<StationeryItemDto> CreateItemAsync(StationeryItemUpsertDto request, CancellationToken cancellationToken = default);
    Task<StationeryItemDto> UpdateItemAsync(int id, StationeryItemUpsertDto request, CancellationToken cancellationToken = default);
    Task SetItemStatusAsync(int id, bool isActive, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<StationeryPurchaseDto>> GetPurchasesAsync(
        DateTime? from,
        DateTime? to,
        CancellationToken cancellationToken = default);
    Task<StationeryPurchaseDto> GetPurchaseAsync(int id, CancellationToken cancellationToken = default);
    Task<StationeryPurchaseDto> CreatePurchaseAsync(
        StationeryPurchaseCreateDto request,
        string? entryUser,
        int? userId,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<StationeryHandoverDto>> GetHandoversAsync(
        DateTime? from,
        DateTime? to,
        int? employeeId,
        CancellationToken cancellationToken = default);
    Task<StationeryHandoverDto> GetHandoverAsync(int id, CancellationToken cancellationToken = default);
    Task<StationeryHandoverDto> CreateHandoverAsync(
        StationeryHandoverCreateDto request,
        string? entryUser,
        int? userId,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<StationeryStockDto>> GetStockAsync(CancellationToken cancellationToken = default);

    Task<StationeryExpenseReportDto> GetExpenseReportAsync(
        DateTime from,
        DateTime to,
        CancellationToken cancellationToken = default);

    Task<StationeryItemReportDto> GetItemReportAsync(
        int itemId,
        DateTime from,
        DateTime to,
        CancellationToken cancellationToken = default);
}
