using System.ComponentModel.DataAnnotations;

namespace School.Application.DTOs;

public class StationeryItemDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string Unit { get; set; } = "pcs";
    public bool IsActive { get; set; }
}

public class StationeryItemUpsertDto
{
    [Required, StringLength(120)]
    public string Name { get; set; } = string.Empty;

    [Required, StringLength(50)]
    public string Category { get; set; } = string.Empty;

    [StringLength(20)]
    public string Unit { get; set; } = "pcs";

    public bool IsActive { get; set; } = true;
}

public class StationeryItemStatusUpdateDto
{
    public bool IsActive { get; set; }
}

public class StationeryPurchaseLineInputDto
{
    [Range(1, int.MaxValue)]
    public int ItemId { get; set; }

    [Range(0.01, double.MaxValue)]
    public decimal Quantity { get; set; }

    [Range(0.01, double.MaxValue)]
    public decimal UnitPrice { get; set; }
}

public class StationeryPurchaseCreateDto
{
    [Required]
    public DateTime PurchaseDate { get; set; }

    [StringLength(500)]
    public string? Notes { get; set; }

    [Required, MinLength(1)]
    public List<StationeryPurchaseLineInputDto> Lines { get; set; } = [];

    public bool PostToAccounts { get; set; }

    [StringLength(50)]
    public string? ExpenseAccountId { get; set; }
}

public class StationeryPurchaseLineDto
{
    public int Id { get; set; }
    public int ItemId { get; set; }
    public string ItemName { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string Unit { get; set; } = string.Empty;
    public decimal Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal LineTotal { get; set; }
}

public class StationeryPurchaseDto
{
    public int Id { get; set; }
    public DateTime PurchaseDate { get; set; }
    public string? Notes { get; set; }
    public decimal TotalAmount { get; set; }
    public bool PostedToAccounts { get; set; }
    public string? VoucherNo { get; set; }
    public string? ExpenseAccountId { get; set; }
    public string? EntryUser { get; set; }
    public List<StationeryPurchaseLineDto> Lines { get; set; } = [];
}

public class StationeryHandoverLineInputDto
{
    [Range(1, int.MaxValue)]
    public int ItemId { get; set; }

    [Range(0.01, double.MaxValue)]
    public decimal Quantity { get; set; }
}

public class StationeryHandoverCreateDto
{
    [Required]
    public DateTime HandoverDate { get; set; }

    [Range(1, int.MaxValue)]
    public int EmployeeId { get; set; }

    [StringLength(500)]
    public string? Notes { get; set; }

    [Required, MinLength(1)]
    public List<StationeryHandoverLineInputDto> Lines { get; set; } = [];
}

public class StationeryHandoverLineDto
{
    public int Id { get; set; }
    public int ItemId { get; set; }
    public string ItemName { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string Unit { get; set; } = string.Empty;
    public decimal Quantity { get; set; }
}

public class StationeryHandoverDto
{
    public int Id { get; set; }
    public DateTime HandoverDate { get; set; }
    public int EmployeeId { get; set; }
    public string EmployeeName { get; set; } = string.Empty;
    public string? Notes { get; set; }
    public string? EntryUser { get; set; }
    public List<StationeryHandoverLineDto> Lines { get; set; } = [];
}

public class StationeryStockDto
{
    public int ItemId { get; set; }
    public string ItemName { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string Unit { get; set; } = string.Empty;
    public bool IsActive { get; set; }
    public decimal PurchasedQty { get; set; }
    public decimal HandedOverQty { get; set; }
    public decimal OnHandQty { get; set; }
}

public class StationeryExpenseReportDto
{
    public DateTime From { get; set; }
    public DateTime To { get; set; }
    public decimal PeriodTotalSpent { get; set; }
    public decimal PeriodTotalHandedOverQty { get; set; }
    public decimal PeriodEstimatedConsumptionValue { get; set; }
    public List<StationeryPurchaseDto> Purchases { get; set; } = [];
    public List<StationerySpendByItemDto> SpendByItem { get; set; } = [];
    public List<StationeryStockLastingDto> StockLasting { get; set; } = [];
}

public class StationerySpendByItemDto
{
    public int ItemId { get; set; }
    public string ItemName { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string Unit { get; set; } = string.Empty;
    public decimal QtyBought { get; set; }
    public decimal AmountSpent { get; set; }
    public decimal QtyHandedOver { get; set; }
    public decimal OnHandQty { get; set; }
    public decimal? AvgUnitPrice { get; set; }
    public decimal EstimatedConsumptionValue { get; set; }
}

public class StationeryStockLastingDto
{
    public int ItemId { get; set; }
    public string ItemName { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string Unit { get; set; } = string.Empty;
    public decimal OnHandQty { get; set; }
    public DateTime? LastPurchaseDate { get; set; }
    public decimal? LastPurchaseQty { get; set; }
    public decimal? LastPurchaseAmount { get; set; }
    public int? DaysSinceLastPurchase { get; set; }
    public int? PreviousCycleDays { get; set; }
    public string? StockNote { get; set; }
}

public class StationeryItemReportDto
{
    public DateTime From { get; set; }
    public DateTime To { get; set; }
    public StationeryItemDto Item { get; set; } = new();
    public decimal LifetimePurchasedQty { get; set; }
    public decimal LifetimeHandedOverQty { get; set; }
    public decimal LifetimeSpent { get; set; }
    public decimal CurrentOnHandQty { get; set; }
    public decimal OpeningOnHandQty { get; set; }
    public decimal PeriodPurchasedQty { get; set; }
    public decimal PeriodSpent { get; set; }
    public decimal PeriodHandedOverQty { get; set; }
    public decimal ClosingOnHandQty { get; set; }
    public DateTime? LastPurchaseDate { get; set; }
    public decimal? LastPurchaseQty { get; set; }
    public decimal? LastPurchaseAmount { get; set; }
    public int? DaysSinceLastPurchase { get; set; }
    public int? PreviousCycleDays { get; set; }
    public List<StationeryItemMovementDto> Movements { get; set; } = [];
    public List<StationeryItemPurchaseHistoryDto> Purchases { get; set; } = [];
    public List<StationeryItemConsumptionByEmployeeDto> ConsumptionByEmployee { get; set; } = [];
}

public class StationeryItemMovementDto
{
    public DateTime Date { get; set; }
    public string MovementType { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public decimal QtyIn { get; set; }
    public decimal QtyOut { get; set; }
    public decimal? UnitPrice { get; set; }
    public decimal? Amount { get; set; }
    public decimal RunningOnHand { get; set; }
    public int ReferenceId { get; set; }
}

public class StationeryItemPurchaseHistoryDto
{
    public int PurchaseId { get; set; }
    public DateTime PurchaseDate { get; set; }
    public decimal Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal LineTotal { get; set; }
    public bool PostedToAccounts { get; set; }
    public string? VoucherNo { get; set; }
    public string? Notes { get; set; }
}

public class StationeryItemConsumptionByEmployeeDto
{
    public int EmployeeId { get; set; }
    public string EmployeeName { get; set; } = string.Empty;
    public decimal Quantity { get; set; }
    public int HandoverCount { get; set; }
}
