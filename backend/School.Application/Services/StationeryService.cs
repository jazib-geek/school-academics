using Microsoft.EntityFrameworkCore;
using School.Application.Common;
using School.Application.DTOs;
using School.Application.Interfaces;
using School.Infrastructure.Data;
using School.Infrastructure.Entities;
using System.Globalization;
using System.Text;

namespace School.Application.Services;

public class StationeryService : IStationeryService
{
    private readonly AppDbContext _context;
    private readonly IAccountVoucherService _voucherService;
    private readonly IActivityLogService _activityLog;

    public StationeryService(
        AppDbContext context,
        IAccountVoucherService voucherService,
        IActivityLogService activityLog)
    {
        _context = context;
        _voucherService = voucherService;
        _activityLog = activityLog;
    }

    public async Task<IReadOnlyList<StationeryItemDto>> GetItemsAsync(CancellationToken cancellationToken = default)
    {
        var rows = await _context.StationeryItems
            .AsNoTracking()
            .OrderBy(x => x.Category)
            .ThenBy(x => x.Name)
            .ThenBy(x => x.ID)
            .ToListAsync(cancellationToken);

        return rows.Select(MapItem).ToList();
    }

    public async Task<StationeryItemDto> GetItemAsync(int id, CancellationToken cancellationToken = default)
    {
        var row = await _context.StationeryItems
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.ID == id, cancellationToken)
            ?? throw new KeyNotFoundException("Item not found.");

        return MapItem(row);
    }

    public async Task<StationeryItemDto> CreateItemAsync(
        StationeryItemUpsertDto request,
        CancellationToken cancellationToken = default)
    {
        var name = NormalizeName(request.Name);
        var category = NormalizeCategory(request.Category);
        var unit = NormalizeUnit(request.Unit);
        await EnsureItemNameAvailableAsync(name, null, cancellationToken);

        var entity = new StationeryItem
        {
            Name = name,
            Category = category,
            Unit = unit,
            UnitPrice = NormalizeUnitPrice(request.UnitPrice),
            IsActive = request.IsActive
        };
        _context.StationeryItems.Add(entity);
        await _context.SaveChangesAsync(cancellationToken);
        return await GetItemAsync(entity.ID, cancellationToken);
    }

    public async Task<StationeryItemDto> UpdateItemAsync(
        int id,
        StationeryItemUpsertDto request,
        CancellationToken cancellationToken = default)
    {
        var entity = await _context.StationeryItems
            .FirstOrDefaultAsync(x => x.ID == id, cancellationToken)
            ?? throw new KeyNotFoundException("Item not found.");

        var name = NormalizeName(request.Name);
        var category = NormalizeCategory(request.Category);
        var unit = NormalizeUnit(request.Unit);
        await EnsureItemNameAvailableAsync(name, id, cancellationToken);

        entity.Name = name;
        entity.Category = category;
        entity.Unit = unit;
        entity.UnitPrice = NormalizeUnitPrice(request.UnitPrice);
        entity.IsActive = request.IsActive;
        await _context.SaveChangesAsync(cancellationToken);
        return await GetItemAsync(id, cancellationToken);
    }

    public async Task SetItemStatusAsync(int id, bool isActive, CancellationToken cancellationToken = default)
    {
        var entity = await _context.StationeryItems
            .FirstOrDefaultAsync(x => x.ID == id, cancellationToken)
            ?? throw new KeyNotFoundException("Item not found.");

        entity.IsActive = isActive;
        await _context.SaveChangesAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<StationeryPurchaseDto>> GetPurchasesAsync(
        DateTime? from,
        DateTime? to,
        CancellationToken cancellationToken = default)
    {
        var query = _context.StationeryPurchases
            .AsNoTracking()
            .Include(x => x.Lines)
            .ThenInclude(x => x.Item)
            .AsQueryable();

        if (from.HasValue)
            query = query.Where(x => x.PurchaseDate >= from.Value.Date);
        if (to.HasValue)
            query = query.Where(x => x.PurchaseDate <= to.Value.Date);

        var rows = await query
            .OrderByDescending(x => x.PurchaseDate)
            .ThenByDescending(x => x.ID)
            .ToListAsync(cancellationToken);

        return rows.Select(MapPurchase).ToList();
    }

    public async Task<StationeryPurchaseDto> GetPurchaseAsync(int id, CancellationToken cancellationToken = default)
    {
        var row = await _context.StationeryPurchases
            .AsNoTracking()
            .Include(x => x.Lines)
            .ThenInclude(x => x.Item)
            .FirstOrDefaultAsync(x => x.ID == id, cancellationToken)
            ?? throw new KeyNotFoundException("Purchase not found.");

        return MapPurchase(row);
    }

    public async Task<StationeryPurchaseDto> CreatePurchaseAsync(
        StationeryPurchaseCreateDto request,
        string? entryUser,
        int? userId,
        CancellationToken cancellationToken = default)
    {
        if (request.Lines is null || request.Lines.Count == 0)
            throw new ArgumentException("Add at least one item to the purchase.");

        var itemIds = request.Lines.Select(x => x.ItemId).Distinct().ToList();
        var items = await _context.StationeryItems
            .AsNoTracking()
            .Where(x => itemIds.Contains(x.ID))
            .ToDictionaryAsync(x => x.ID, cancellationToken);

        if (items.Count != itemIds.Count)
            throw new KeyNotFoundException("One or more items were not found.");

        foreach (var line in request.Lines)
        {
            if (line.Quantity <= 0)
                throw new ArgumentException("Quantity must be greater than zero.");
            if (line.UnitPrice <= 0)
                throw new ArgumentException("Unit price must be greater than zero.");
            if (!items.TryGetValue(line.ItemId, out var item) || !item.IsActive)
                throw new InvalidOperationException($"Item '{items.GetValueOrDefault(line.ItemId)?.Name ?? line.ItemId.ToString()}' is not available.");
        }

        var purchaseDate = request.PurchaseDate.Date;
        var lineEntities = request.Lines.Select(line =>
        {
            var lineTotal = Math.Round(line.Quantity * line.UnitPrice, 2, MidpointRounding.AwayFromZero);
            return new StationeryPurchaseLine
            {
                ItemID = line.ItemId,
                Quantity = line.Quantity,
                UnitPrice = line.UnitPrice,
                LineTotal = lineTotal
            };
        }).ToList();

        var totalAmount = lineEntities.Sum(x => x.LineTotal);
        var user = Truncate(entryUser, 50);

        await using var tx = await _context.Database.BeginTransactionAsync(cancellationToken);

        var purchase = new StationeryPurchase
        {
            PurchaseDate = purchaseDate,
            Notes = string.IsNullOrWhiteSpace(request.Notes) ? null : request.Notes.Trim(),
            TotalAmount = totalAmount,
            PostedToAccounts = false,
            EntryUser = user,
            CreatedAtPkt = PakistanTime.Now,
            Lines = lineEntities
        };
        _context.StationeryPurchases.Add(purchase);
        await _context.SaveChangesAsync(cancellationToken);

        if (request.PostToAccounts)
        {
            var cleaningLines = request.Lines
                .Where(line => IsCleaningCategory(items[line.ItemId].Category))
                .ToList();
            var otherLines = request.Lines
                .Where(line => !IsCleaningCategory(items[line.ItemId].Category))
                .ToList();
            var cleaningTotal = cleaningLines.Sum(line =>
                Math.Round(line.Quantity * line.UnitPrice, 2, MidpointRounding.AwayFromZero));
            var otherTotal = otherLines.Sum(line =>
                Math.Round(line.Quantity * line.UnitPrice, 2, MidpointRounding.AwayFromZero));

            var voucherLines = new List<VoucherLineInputDto>();
            string? cleanlinessAccountId = null;
            if (cleaningTotal > 0)
            {
                cleanlinessAccountId = await FindAccountIdByTitleAsync(
                    SystemAccountTitles.CleanlinessExpenses,
                    cancellationToken);
                if (string.IsNullOrWhiteSpace(cleanlinessAccountId))
                    throw new InvalidOperationException(
                        "Cleanliness expenses account is not set up. Contact your administrator.");

                voucherLines.Add(new VoucherLineInputDto
                {
                    AccountId = cleanlinessAccountId,
                    Amount = cleaningTotal,
                    Narration = BuildPurchaseNarration(cleaningLines, items, cleaningTotal, "Cleaning purchase")
                });
            }

            if (otherTotal > 0)
            {
                if (string.IsNullOrWhiteSpace(request.ExpenseAccountId))
                    throw new ArgumentException("Choose an expense account to record this payment in Accounts.");

                voucherLines.Add(new VoucherLineInputDto
                {
                    AccountId = request.ExpenseAccountId.Trim(),
                    Amount = otherTotal,
                    Narration = BuildPurchaseNarration(otherLines, items, otherTotal, "Stationery purchase")
                });
            }

            var voucher = await _voucherService.SaveCashPaymentAsync(
                new SaveVoucherRequestDto
                {
                    Date = purchaseDate,
                    Lines = voucherLines
                },
                user,
                cancellationToken);

            purchase.PostedToAccounts = true;
            purchase.VoucherNo = voucher.VoucherNo;
            purchase.ExpenseAccountId = otherTotal > 0
                ? request.ExpenseAccountId!.Trim()
                : cleanlinessAccountId;
            await _context.SaveChangesAsync(cancellationToken);
        }

        await _activityLog.WriteAsync(
            ActivityLogTypes.StationeryPurchase,
            ActivityLogEntityTypes.StationeryPurchase,
            purchase.ID,
            $"Stationery purchase #{purchase.ID}",
            userId,
            new
            {
                purchase.PurchaseDate,
                purchase.TotalAmount,
                purchase.PostedToAccounts,
                purchase.VoucherNo,
                LineCount = purchase.Lines.Count
            },
            cancellationToken);
        await _context.SaveChangesAsync(cancellationToken);
        await tx.CommitAsync(cancellationToken);

        return await GetPurchaseAsync(purchase.ID, cancellationToken);
    }

    public async Task<IReadOnlyList<StationeryHandoverDto>> GetHandoversAsync(
        DateTime? from,
        DateTime? to,
        int? employeeId,
        CancellationToken cancellationToken = default)
    {
        var query = _context.StationeryHandovers
            .AsNoTracking()
            .Include(x => x.Employee)
            .Include(x => x.Lines)
            .ThenInclude(x => x.Item)
            .AsQueryable();

        if (from.HasValue)
            query = query.Where(x => x.HandoverDate >= from.Value.Date);
        if (to.HasValue)
            query = query.Where(x => x.HandoverDate <= to.Value.Date);
        if (employeeId.HasValue && employeeId.Value > 0)
            query = query.Where(x => x.EmployeeID == employeeId.Value);

        var rows = await query
            .OrderByDescending(x => x.HandoverDate)
            .ThenByDescending(x => x.ID)
            .ToListAsync(cancellationToken);

        return rows.Select(MapHandover).ToList();
    }

    public async Task<StationeryHandoverDto> GetHandoverAsync(int id, CancellationToken cancellationToken = default)
    {
        var row = await _context.StationeryHandovers
            .AsNoTracking()
            .Include(x => x.Employee)
            .Include(x => x.Lines)
            .ThenInclude(x => x.Item)
            .FirstOrDefaultAsync(x => x.ID == id, cancellationToken)
            ?? throw new KeyNotFoundException("Handover not found.");

        return MapHandover(row);
    }

    public async Task<StationeryHandoverDto> CreateHandoverAsync(
        StationeryHandoverCreateDto request,
        string? entryUser,
        int? userId,
        CancellationToken cancellationToken = default)
    {
        if (request.Lines is null || request.Lines.Count == 0)
            throw new ArgumentException("Add at least one item to the handover.");

        var employee = await _context.Employees
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.ID == request.EmployeeId, cancellationToken)
            ?? throw new KeyNotFoundException("Employee not found.");

        if (employee.IsActive != true)
            throw new InvalidOperationException("Choose an active employee for the handover.");

        var itemIds = request.Lines.Select(x => x.ItemId).Distinct().ToList();
        var items = await _context.StationeryItems
            .AsNoTracking()
            .Where(x => itemIds.Contains(x.ID))
            .ToDictionaryAsync(x => x.ID, cancellationToken);

        if (items.Count != itemIds.Count)
            throw new KeyNotFoundException("One or more items were not found.");

        foreach (var line in request.Lines)
        {
            if (line.Quantity <= 0)
                throw new ArgumentException("Quantity must be greater than zero.");
            if (!items.TryGetValue(line.ItemId, out var item) || !item.IsActive)
                throw new InvalidOperationException($"Item '{items.GetValueOrDefault(line.ItemId)?.Name ?? line.ItemId.ToString()}' is not available.");
        }

        var handover = new StationeryHandover
        {
            HandoverDate = request.HandoverDate.Date,
            EmployeeID = request.EmployeeId,
            Notes = string.IsNullOrWhiteSpace(request.Notes) ? null : request.Notes.Trim(),
            EntryUser = Truncate(entryUser, 50),
            CreatedAtPkt = PakistanTime.Now,
            Lines = request.Lines.Select(line => new StationeryHandoverLine
            {
                ItemID = line.ItemId,
                Quantity = line.Quantity
            }).ToList()
        };

        _context.StationeryHandovers.Add(handover);
        await _context.SaveChangesAsync(cancellationToken);

        await _activityLog.WriteAsync(
            ActivityLogTypes.StationeryHandover,
            ActivityLogEntityTypes.StationeryHandover,
            handover.ID,
            $"Stationery handover #{handover.ID} to {employee.EmployeeName}",
            userId,
            new
            {
                handover.HandoverDate,
                handover.EmployeeID,
                EmployeeName = employee.EmployeeName,
                LineCount = handover.Lines.Count
            },
            cancellationToken);
        await _context.SaveChangesAsync(cancellationToken);

        return await GetHandoverAsync(handover.ID, cancellationToken);
    }

    public async Task<IReadOnlyList<StationeryStockDto>> GetStockAsync(CancellationToken cancellationToken = default)
    {
        var items = await _context.StationeryItems
            .AsNoTracking()
            .OrderBy(x => x.Category)
            .ThenBy(x => x.Name)
            .ToListAsync(cancellationToken);

        var purchased = await _context.StationeryPurchaseLines
            .AsNoTracking()
            .GroupBy(x => x.ItemID)
            .Select(g => new { ItemId = g.Key, Qty = g.Sum(x => x.Quantity) })
            .ToDictionaryAsync(x => x.ItemId, x => x.Qty, cancellationToken);

        var handed = await _context.StationeryHandoverLines
            .AsNoTracking()
            .GroupBy(x => x.ItemID)
            .Select(g => new { ItemId = g.Key, Qty = g.Sum(x => x.Quantity) })
            .ToDictionaryAsync(x => x.ItemId, x => x.Qty, cancellationToken);

        return items.Select(item =>
        {
            purchased.TryGetValue(item.ID, out var bought);
            handed.TryGetValue(item.ID, out var outQty);
            return new StationeryStockDto
            {
                ItemId = item.ID,
                ItemName = item.Name,
                Category = item.Category,
                Unit = item.Unit,
                IsActive = item.IsActive,
                PurchasedQty = bought,
                HandedOverQty = outQty,
                OnHandQty = bought - outQty
            };
        }).ToList();
    }

    public async Task<StationeryExpenseReportDto> GetExpenseReportAsync(
        DateTime from,
        DateTime to,
        CancellationToken cancellationToken = default)
    {
        var fromDate = from.Date;
        var toDate = to.Date;
        if (toDate < fromDate)
            throw new ArgumentException("End date must be on or after the start date.");

        var purchases = await GetPurchasesAsync(fromDate, toDate, cancellationToken);

        var spendByItem = purchases
            .SelectMany(p => p.Lines)
            .GroupBy(l => new { l.ItemId, l.ItemName, l.Category })
            .Select(g => new StationerySpendByItemDto
            {
                ItemId = g.Key.ItemId,
                ItemName = g.Key.ItemName,
                Category = g.Key.Category,
                QtyBought = g.Sum(x => x.Quantity),
                AmountSpent = g.Sum(x => x.LineTotal),
                QtyHandedOver = 0
            })
            .OrderBy(x => x.Category)
            .ThenBy(x => x.ItemName)
            .ToList();

        var handoverQtyInRange = await _context.StationeryHandoverLines
            .AsNoTracking()
            .Where(x => x.Handover.HandoverDate >= fromDate && x.Handover.HandoverDate <= toDate)
            .GroupBy(x => x.ItemID)
            .Select(g => new { ItemId = g.Key, Qty = g.Sum(x => x.Quantity) })
            .ToDictionaryAsync(x => x.ItemId, x => x.Qty, cancellationToken);

        foreach (var row in spendByItem)
        {
            if (handoverQtyInRange.TryGetValue(row.ItemId, out var qty))
                row.QtyHandedOver = qty;
        }

        // Include items that were only handed over (no purchase in range).
        var spendIds = spendByItem.Select(x => x.ItemId).ToHashSet();
        var missingHandoverIds = handoverQtyInRange.Keys.Where(id => !spendIds.Contains(id)).ToList();
        if (missingHandoverIds.Count > 0)
        {
            var missingItems = await _context.StationeryItems
                .AsNoTracking()
                .Where(x => missingHandoverIds.Contains(x.ID))
                .ToListAsync(cancellationToken);

            foreach (var item in missingItems)
            {
                spendByItem.Add(new StationerySpendByItemDto
                {
                    ItemId = item.ID,
                    ItemName = item.Name,
                    Category = item.Category,
                    QtyBought = 0,
                    AmountSpent = 0,
                    QtyHandedOver = handoverQtyInRange[item.ID]
                });
            }

            spendByItem = spendByItem
                .OrderBy(x => x.Category)
                .ThenBy(x => x.ItemName)
                .ToList();
        }

        var stock = await GetStockAsync(cancellationToken);
        var stockById = stock.ToDictionary(x => x.ItemId);
        var lifetimeAvgUnitPrice = await _context.StationeryPurchaseLines
            .AsNoTracking()
            .GroupBy(x => x.ItemID)
            .Select(g => new
            {
                ItemId = g.Key,
                Qty = g.Sum(x => x.Quantity),
                Amount = g.Sum(x => x.LineTotal)
            })
            .ToDictionaryAsync(
                x => x.ItemId,
                x => x.Qty > 0 ? x.Amount / x.Qty : (decimal?)null,
                cancellationToken);

        foreach (var row in spendByItem)
        {
            if (stockById.TryGetValue(row.ItemId, out var stockRow))
            {
                row.Unit = stockRow.Unit;
                row.OnHandQty = stockRow.OnHandQty;
            }

            row.AvgUnitPrice = row.QtyBought > 0
                ? row.AmountSpent / row.QtyBought
                : lifetimeAvgUnitPrice.GetValueOrDefault(row.ItemId);

            var unitPrice = row.AvgUnitPrice ?? 0m;
            row.EstimatedConsumptionValue = row.QtyHandedOver > 0 && unitPrice > 0
                ? row.QtyHandedOver * unitPrice
                : 0m;
        }

        var periodTotalHandedOver = spendByItem.Sum(x => x.QtyHandedOver);
        var periodEstimatedConsumption = spendByItem.Sum(x => x.EstimatedConsumptionValue);
        var allPurchaseLines = await _context.StationeryPurchaseLines
            .AsNoTracking()
            .Include(x => x.Purchase)
            .Include(x => x.Item)
            .OrderByDescending(x => x.Purchase.PurchaseDate)
            .ThenByDescending(x => x.Purchase.ID)
            .ToListAsync(cancellationToken);

            var today = PakistanTime.Today;
            var lasting = stock.Select(s =>
            {
                var itemPurchases = allPurchaseLines
                    .Where(x => x.ItemID == s.ItemId)
                    .GroupBy(x => new { x.Purchase.PurchaseDate, x.Purchase.ID })
                    .Select(g => new
                    {
                        PurchaseDate = DateOnly.FromDateTime(g.Key.PurchaseDate),
                        Qty = g.Sum(x => x.Quantity),
                        Amount = g.Sum(x => x.LineTotal)
                    })
                    .OrderByDescending(x => x.PurchaseDate)
                    .ToList();

                var last = itemPurchases.FirstOrDefault();
                var previous = itemPurchases.Skip(1).FirstOrDefault();
                int? previousCycleDays = null;
                if (last is not null && previous is not null)
                    previousCycleDays = last.PurchaseDate.DayNumber - previous.PurchaseDate.DayNumber;
                else if (last is not null)
                    previousCycleDays = today.DayNumber - last.PurchaseDate.DayNumber;

                return new StationeryStockLastingDto
                {
                    ItemId = s.ItemId,
                    ItemName = s.ItemName,
                    Category = s.Category,
                    Unit = s.Unit,
                    OnHandQty = s.OnHandQty,
                    LastPurchaseDate = last is null ? null : last.PurchaseDate.ToDateTime(TimeOnly.MinValue),
                    LastPurchaseQty = last?.Qty,
                    LastPurchaseAmount = last?.Amount,
                    DaysSinceLastPurchase = last is null ? null : today.DayNumber - last.PurchaseDate.DayNumber,
                    PreviousCycleDays = previousCycleDays,
                    StockNote = s.OnHandQty <= 0 && last is not null ? "Stock depleted" : null
                };
            })
        .Where(x => x.LastPurchaseDate.HasValue || x.OnHandQty != 0)
        .OrderBy(x => x.Category)
        .ThenBy(x => x.ItemName)
        .ToList();

        return new StationeryExpenseReportDto
        {
            From = fromDate,
            To = toDate,
            PeriodTotalSpent = purchases.Sum(x => x.TotalAmount),
            PeriodTotalHandedOverQty = periodTotalHandedOver,
            PeriodEstimatedConsumptionValue = periodEstimatedConsumption,
            Purchases = purchases.ToList(),
            SpendByItem = spendByItem,
            StockLasting = lasting
        };
    }

    public async Task<StationeryItemReportDto> GetItemReportAsync(
        int itemId,
        DateTime from,
        DateTime to,
        CancellationToken cancellationToken = default)
    {
        var fromDate = from.Date;
        var toDate = to.Date;
        if (toDate < fromDate)
            throw new ArgumentException("End date must be on or after the start date.");

        var item = await _context.StationeryItems
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.ID == itemId, cancellationToken)
            ?? throw new KeyNotFoundException("Item not found.");

        var purchaseLines = await _context.StationeryPurchaseLines
            .AsNoTracking()
            .Include(x => x.Purchase)
            .Where(x => x.ItemID == itemId)
            .ToListAsync(cancellationToken);

        var handoverLines = await _context.StationeryHandoverLines
            .AsNoTracking()
            .Include(x => x.Handover)
            .ThenInclude(x => x.Employee)
            .Where(x => x.ItemID == itemId)
            .ToListAsync(cancellationToken);

        var lifetimePurchasedQty = purchaseLines.Sum(x => x.Quantity);
        var lifetimeSpent = purchaseLines.Sum(x => x.LineTotal);
        var lifetimeHandedOverQty = handoverLines.Sum(x => x.Quantity);
        var currentOnHand = lifetimePurchasedQty - lifetimeHandedOverQty;

        var openingPurchased = purchaseLines
            .Where(x => x.Purchase.PurchaseDate < fromDate)
            .Sum(x => x.Quantity);
        var openingHanded = handoverLines
            .Where(x => x.Handover.HandoverDate < fromDate)
            .Sum(x => x.Quantity);
        var openingOnHand = openingPurchased - openingHanded;

        var periodPurchases = purchaseLines
            .Where(x => x.Purchase.PurchaseDate >= fromDate && x.Purchase.PurchaseDate <= toDate)
            .OrderBy(x => x.Purchase.PurchaseDate)
            .ThenBy(x => x.Purchase.ID)
            .ToList();

        var periodHandovers = handoverLines
            .Where(x => x.Handover.HandoverDate >= fromDate && x.Handover.HandoverDate <= toDate)
            .OrderBy(x => x.Handover.HandoverDate)
            .ThenBy(x => x.Handover.ID)
            .ToList();

        var periodPurchasedQty = periodPurchases.Sum(x => x.Quantity);
        var periodSpent = periodPurchases.Sum(x => x.LineTotal);
        var periodHandedOverQty = periodHandovers.Sum(x => x.Quantity);
        var closingOnHand = openingOnHand + periodPurchasedQty - periodHandedOverQty;

        var movementEvents = periodPurchases
            .Select(x => new
            {
                Date = x.Purchase.PurchaseDate.Date,
                SortKey = 0,
                ReferenceId = x.Purchase.ID,
                MovementType = "Purchase",
                Description = string.IsNullOrWhiteSpace(x.Purchase.Notes)
                    ? (x.Purchase.PostedToAccounts
                        ? $"Purchase{(string.IsNullOrWhiteSpace(x.Purchase.VoucherNo) ? string.Empty : $" · {x.Purchase.VoucherNo}")}"
                        : "Purchase")
                    : x.Purchase.Notes.Trim(),
                QtyIn = x.Quantity,
                QtyOut = 0m,
                UnitPrice = (decimal?)x.UnitPrice,
                Amount = (decimal?)x.LineTotal
            })
            .Concat(periodHandovers.Select(x => new
            {
                Date = x.Handover.HandoverDate.Date,
                SortKey = 1,
                ReferenceId = x.Handover.ID,
                MovementType = "Handover",
                Description = $"Given to {x.Handover.Employee?.EmployeeName ?? "staff"}"
                    + (string.IsNullOrWhiteSpace(x.Handover.Notes) ? string.Empty : $" · {x.Handover.Notes.Trim()}"),
                QtyIn = 0m,
                QtyOut = x.Quantity,
                UnitPrice = (decimal?)null,
                Amount = (decimal?)null
            }))
            .OrderBy(x => x.Date)
            .ThenBy(x => x.SortKey)
            .ThenBy(x => x.ReferenceId)
            .ToList();

        var running = openingOnHand;
        var movements = new List<StationeryItemMovementDto>();
        foreach (var evt in movementEvents)
        {
            running += evt.QtyIn - evt.QtyOut;
            movements.Add(new StationeryItemMovementDto
            {
                Date = evt.Date,
                MovementType = evt.MovementType,
                Description = evt.Description,
                QtyIn = evt.QtyIn,
                QtyOut = evt.QtyOut,
                UnitPrice = evt.UnitPrice,
                Amount = evt.Amount,
                RunningOnHand = running,
                ReferenceId = evt.ReferenceId
            });
        }

        var purchasesHistory = periodPurchases.Select(x => new StationeryItemPurchaseHistoryDto
        {
            PurchaseId = x.Purchase.ID,
            PurchaseDate = x.Purchase.PurchaseDate,
            Quantity = x.Quantity,
            UnitPrice = x.UnitPrice,
            LineTotal = x.LineTotal,
            PostedToAccounts = x.Purchase.PostedToAccounts,
            VoucherNo = x.Purchase.VoucherNo,
            Notes = x.Purchase.Notes
        }).ToList();

        var consumptionByEmployee = periodHandovers
            .GroupBy(x => new
            {
                x.Handover.EmployeeID,
                Name = x.Handover.Employee?.EmployeeName ?? "Unknown"
            })
            .Select(g => new StationeryItemConsumptionByEmployeeDto
            {
                EmployeeId = g.Key.EmployeeID,
                EmployeeName = g.Key.Name,
                Quantity = g.Sum(x => x.Quantity),
                HandoverCount = g.Select(x => x.Handover.ID).Distinct().Count()
            })
            .OrderByDescending(x => x.Quantity)
            .ThenBy(x => x.EmployeeName)
            .ToList();

        var purchaseDates = purchaseLines
            .GroupBy(x => new { x.Purchase.PurchaseDate, x.Purchase.ID })
            .Select(g => new
            {
                PurchaseDate = DateOnly.FromDateTime(g.Key.PurchaseDate),
                Qty = g.Sum(x => x.Quantity),
                Amount = g.Sum(x => x.LineTotal)
            })
            .OrderByDescending(x => x.PurchaseDate)
            .ToList();

        var last = purchaseDates.FirstOrDefault();
        var previous = purchaseDates.Skip(1).FirstOrDefault();
        var today = PakistanTime.Today;
        int? previousCycleDays = null;
        if (last is not null && previous is not null)
            previousCycleDays = last.PurchaseDate.DayNumber - previous.PurchaseDate.DayNumber;
        else if (last is not null)
            previousCycleDays = today.DayNumber - last.PurchaseDate.DayNumber;

        return new StationeryItemReportDto
        {
            From = fromDate,
            To = toDate,
            Item = MapItem(item),
            LifetimePurchasedQty = lifetimePurchasedQty,
            LifetimeHandedOverQty = lifetimeHandedOverQty,
            LifetimeSpent = lifetimeSpent,
            CurrentOnHandQty = currentOnHand,
            OpeningOnHandQty = openingOnHand,
            PeriodPurchasedQty = periodPurchasedQty,
            PeriodSpent = periodSpent,
            PeriodHandedOverQty = periodHandedOverQty,
            ClosingOnHandQty = closingOnHand,
            LastPurchaseDate = last is null ? null : last.PurchaseDate.ToDateTime(TimeOnly.MinValue),
            LastPurchaseQty = last?.Qty,
            LastPurchaseAmount = last?.Amount,
            DaysSinceLastPurchase = last is null ? null : today.DayNumber - last.PurchaseDate.DayNumber,
            PreviousCycleDays = previousCycleDays,
            Movements = movements,
            Purchases = purchasesHistory,
            ConsumptionByEmployee = consumptionByEmployee
        };
    }

    public async Task<IReadOnlyList<StationeryBudgetListItemDto>> GetBudgetsAsync(
        int? year,
        int? month,
        CancellationToken cancellationToken = default)
    {
        var query = _context.StationeryBudgets.AsNoTracking().AsQueryable();
        if (year.HasValue)
            query = query.Where(x => x.Year == year.Value);
        if (month.HasValue)
            query = query.Where(x => x.Month == month.Value);

        var rows = await query
            .OrderByDescending(x => x.Year)
            .ThenByDescending(x => x.Month)
            .ThenBy(x => x.Period)
            .ToListAsync(cancellationToken);

        if (rows.Count == 0)
            return [];

        var actuals = await LoadPurchaseActualsAsync(rows, cancellationToken);
        return rows.Select(row =>
        {
            var window = BudgetWindow(row.Year, row.Month, row.Period);
            var actual = actuals
                .Where(x => x.Date >= window.From && x.Date <= window.To)
                .Sum(x => x.Amount);
            return MapBudgetListItem(row, window, actual);
        }).ToList();
    }

    public async Task<StationeryBudgetDetailDto> GetBudgetAsync(int id, CancellationToken cancellationToken = default)
    {
        var row = await _context.StationeryBudgets
            .AsNoTracking()
            .Include(x => x.Lines)
            .ThenInclude(x => x.Item)
            .FirstOrDefaultAsync(x => x.ID == id, cancellationToken)
            ?? throw new KeyNotFoundException("Budget not found.");

        var actuals = await LoadPurchaseActualsAsync([row], cancellationToken);
        return MapBudgetDetail(row, actuals);
    }

    public async Task<StationeryBudgetDetailDto> CreateBudgetAsync(
        StationeryBudgetUpsertDto request,
        string? entryUser,
        CancellationToken cancellationToken = default)
    {
        var year = request.Year;
        var month = request.Month;
        var period = NormalizePeriod(request.Period);
        ValidateBudgetMonth(year, month);
        await EnsureBudgetPeriodAvailableAsync(year, month, period, null, cancellationToken);
        var lineEntities = await BuildBudgetLinesAsync(request.Lines, cancellationToken);

        var entity = new StationeryBudget
        {
            Year = year,
            Month = month,
            Period = period,
            Notes = string.IsNullOrWhiteSpace(request.Notes) ? null : request.Notes.Trim(),
            TotalAmount = lineEntities.Sum(x => x.LineTotal),
            EntryUser = Truncate(entryUser, 50),
            CreatedAtPkt = PakistanTime.Now,
            Lines = lineEntities
        };
        _context.StationeryBudgets.Add(entity);
        await _context.SaveChangesAsync(cancellationToken);
        return await GetBudgetAsync(entity.ID, cancellationToken);
    }

    public async Task<StationeryBudgetDetailDto> UpdateBudgetAsync(
        int id,
        StationeryBudgetUpsertDto request,
        CancellationToken cancellationToken = default)
    {
        var entity = await _context.StationeryBudgets
            .Include(x => x.Lines)
            .FirstOrDefaultAsync(x => x.ID == id, cancellationToken)
            ?? throw new KeyNotFoundException("Budget not found.");

        var savedWindow = BudgetWindow(entity.Year, entity.Month, entity.Period);
        if (PakistanTime.TodayStart.Date > savedWindow.To.Date)
            throw new InvalidOperationException("This budget period has ended, so it can no longer be changed.");

        var year = request.Year;
        var month = request.Month;
        var period = NormalizePeriod(request.Period);
        ValidateBudgetMonth(year, month);
        await EnsureBudgetPeriodAvailableAsync(year, month, period, id, cancellationToken);
        var lineEntities = await BuildBudgetLinesAsync(request.Lines, cancellationToken);

        entity.Year = year;
        entity.Month = month;
        entity.Period = period;
        entity.Notes = string.IsNullOrWhiteSpace(request.Notes) ? null : request.Notes.Trim();
        entity.TotalAmount = lineEntities.Sum(x => x.LineTotal);
        _context.StationeryBudgetLines.RemoveRange(entity.Lines);
        entity.Lines.Clear();
        foreach (var line in lineEntities)
            entity.Lines.Add(line);

        await _context.SaveChangesAsync(cancellationToken);
        return await GetBudgetAsync(id, cancellationToken);
    }

    private async Task<List<StationeryBudgetLine>> BuildBudgetLinesAsync(
        IReadOnlyList<StationeryBudgetLineInputDto> lines,
        CancellationToken cancellationToken)
    {
        if (lines is null || lines.Count == 0)
            throw new ArgumentException("Add at least one item with quantity and price.");

        var itemIds = lines.Select(x => x.ItemId).ToList();
        if (itemIds.Distinct().Count() != itemIds.Count)
            throw new ArgumentException("Each item can only be added once.");

        var items = await _context.StationeryItems
            .AsNoTracking()
            .Where(x => itemIds.Contains(x.ID))
            .ToDictionaryAsync(x => x.ID, cancellationToken);

        if (items.Count != itemIds.Count)
            throw new KeyNotFoundException("One or more items were not found.");

        foreach (var line in lines)
        {
            if (line.Quantity <= 0)
                throw new ArgumentException("Quantity must be greater than zero.");
            if (line.UnitPrice <= 0)
                throw new ArgumentException("Unit price must be greater than zero.");
            if (!items.TryGetValue(line.ItemId, out var item) || !item.IsActive)
                throw new InvalidOperationException($"Item '{items.GetValueOrDefault(line.ItemId)?.Name ?? line.ItemId.ToString()}' is not available.");
        }

        return lines.Select(line =>
        {
            var lineTotal = Math.Round(line.Quantity * line.UnitPrice, 2, MidpointRounding.AwayFromZero);
            return new StationeryBudgetLine
            {
                ItemID = line.ItemId,
                Quantity = line.Quantity,
                UnitPrice = line.UnitPrice,
                LineTotal = lineTotal
            };
        }).ToList();
    }

    private async Task EnsureBudgetPeriodAvailableAsync(
        int year,
        int month,
        string period,
        int? excludingId,
        CancellationToken cancellationToken)
    {
        var rows = await _context.StationeryBudgets
            .AsNoTracking()
            .Where(x => x.Year == year && x.Month == month && (!excludingId.HasValue || x.ID != excludingId.Value))
            .Select(x => x.Period)
            .ToListAsync(cancellationToken);

        var blocked = rows.Any(existing =>
            existing == BudgetPeriodMonth
            || period == BudgetPeriodMonth
            || existing == period);

        if (blocked)
            throw new InvalidOperationException("A budget already covers these dates.");
    }

    private async Task<List<PurchaseActualRow>> LoadPurchaseActualsAsync(
        IReadOnlyList<StationeryBudget> budgets,
        CancellationToken cancellationToken)
    {
        var windows = budgets.Select(x => BudgetWindow(x.Year, x.Month, x.Period)).ToList();
        var min = windows.Min(x => x.From);
        var max = windows.Max(x => x.To);
        return await _context.StationeryPurchaseLines
            .AsNoTracking()
            .Where(x => x.Purchase.PurchaseDate >= min && x.Purchase.PurchaseDate <= max)
            .Select(x => new PurchaseActualRow(
                x.Purchase.PurchaseDate,
                x.ItemID,
                x.Item.Name,
                x.Item.Category,
                x.Item.Unit,
                x.Quantity,
                x.LineTotal))
            .ToListAsync(cancellationToken);
    }

    private static StationeryBudgetDetailDto MapBudgetDetail(
        StationeryBudget row,
        IReadOnlyList<PurchaseActualRow> actuals)
    {
        var window = BudgetWindow(row.Year, row.Month, row.Period);
        var inWindow = actuals
            .Where(x => x.Date >= window.From && x.Date <= window.To)
            .ToList();
        var purchased = inWindow
            .GroupBy(x => x.ItemId)
            .ToDictionary(
                g => g.Key,
                g => (
                    Qty: g.Sum(x => x.Qty),
                    Amount: g.Sum(x => x.Amount),
                    Name: g.First().Name,
                    Category: g.First().Category,
                    Unit: g.First().Unit));

        var lines = new List<StationeryBudgetCompareLineDto>();
        var budgetItemIds = new HashSet<int>();
        foreach (var line in row.Lines.OrderBy(x => x.Item?.Category).ThenBy(x => x.Item?.Name).ThenBy(x => x.ID))
        {
            budgetItemIds.Add(line.ItemID);
            purchased.TryGetValue(line.ItemID, out var spent);
            lines.Add(new StationeryBudgetCompareLineDto
            {
                ItemId = line.ItemID,
                ItemName = line.Item?.Name ?? string.Empty,
                Category = line.Item?.Category ?? string.Empty,
                Unit = line.Item?.Unit ?? string.Empty,
                EstimatedQty = line.Quantity,
                UnitPrice = line.UnitPrice,
                EstimatedAmount = line.LineTotal,
                PurchasedQty = spent.Qty,
                PurchasedAmount = spent.Amount,
                OnBudget = true
            });
        }

        foreach (var extra in purchased
            .Where(x => !budgetItemIds.Contains(x.Key))
            .OrderBy(x => x.Value.Category)
            .ThenBy(x => x.Value.Name))
        {
            lines.Add(new StationeryBudgetCompareLineDto
            {
                ItemId = extra.Key,
                ItemName = extra.Value.Name,
                Category = extra.Value.Category,
                Unit = extra.Value.Unit,
                PurchasedQty = extra.Value.Qty,
                PurchasedAmount = extra.Value.Amount,
                OnBudget = false
            });
        }

        var actualTotal = inWindow.Sum(x => x.Amount);
        return new StationeryBudgetDetailDto
        {
            Id = row.ID,
            Year = row.Year,
            Month = row.Month,
            Period = row.Period,
            PeriodLabel = BudgetPeriodLabel(row.Year, row.Month, row.Period),
            From = window.From,
            To = window.To,
            Notes = row.Notes,
            EntryUser = row.EntryUser,
            EstimatedTotal = row.TotalAmount,
            ActualTotal = actualTotal,
            Difference = row.TotalAmount - actualTotal,
            Lines = lines
        };
    }

    private static StationeryBudgetListItemDto MapBudgetListItem(
        StationeryBudget row,
        (DateTime From, DateTime To) window,
        decimal actual) => new()
    {
        Id = row.ID,
        Year = row.Year,
        Month = row.Month,
        Period = row.Period,
        PeriodLabel = BudgetPeriodLabel(row.Year, row.Month, row.Period),
        From = window.From,
        To = window.To,
        EstimatedTotal = row.TotalAmount,
        ActualTotal = actual,
        Difference = row.TotalAmount - actual,
        Notes = row.Notes,
        EntryUser = row.EntryUser
    };

    private static void ValidateBudgetMonth(int year, int month)
    {
        if (month < 1 || month > 12 || year < 2000 || year > 2100)
            throw new ArgumentException("Choose a valid month.");
    }

    private static (DateTime From, DateTime To) BudgetWindow(int year, int month, string period)
    {
        var start = new DateTime(year, month, 1);
        var end = start.AddMonths(1).AddDays(-1);
        if (period == BudgetPeriodFirstHalf)
            return (start, new DateTime(year, month, 15));
        if (period == BudgetPeriodSecondHalf)
            return (new DateTime(year, month, 16), end);
        return (start, end);
    }

    private static string BudgetPeriodLabel(int year, int month, string period)
    {
        var name = new DateTime(year, month, 1).ToString("MMMM yyyy", CultureInfo.InvariantCulture);
        var half = period switch
        {
            BudgetPeriodFirstHalf => "1–15",
            BudgetPeriodSecondHalf => "16–end",
            _ => "Full month"
        };
        return $"{name} · {half}";
    }

    private static string NormalizePeriod(string? period)
    {
        var value = (period ?? string.Empty).Trim();
        if (value.Equals(BudgetPeriodMonth, StringComparison.OrdinalIgnoreCase))
            return BudgetPeriodMonth;
        if (value.Equals(BudgetPeriodFirstHalf, StringComparison.OrdinalIgnoreCase))
            return BudgetPeriodFirstHalf;
        if (value.Equals(BudgetPeriodSecondHalf, StringComparison.OrdinalIgnoreCase))
            return BudgetPeriodSecondHalf;
        throw new ArgumentException("Choose a full month or a 15-day period.");
    }

    private async Task<string?> FindAccountIdByTitleAsync(string title, CancellationToken cancellationToken)
    {
        var rows = await _context.Accounts
            .AsNoTracking()
            .Where(x => x.AccountTitle != null && x.AccountID != null)
            .Select(x => new { x.AccountID, x.AccountTitle })
            .ToListAsync(cancellationToken);

        return rows.FirstOrDefault(x =>
            string.Equals(x.AccountTitle!.Trim(), title, StringComparison.OrdinalIgnoreCase))?.AccountID;
    }

    private sealed record PurchaseActualRow(
        DateTime Date,
        int ItemId,
        string Name,
        string Category,
        string Unit,
        decimal Qty,
        decimal Amount);

    private const string BudgetPeriodMonth = "Month";
    private const string BudgetPeriodFirstHalf = "FirstHalf";
    private const string BudgetPeriodSecondHalf = "SecondHalf";

    private async Task EnsureItemNameAvailableAsync(string name, int? excludingId, CancellationToken cancellationToken)
    {
        var taken = await _context.StationeryItems.AsNoTracking()
            .AnyAsync(
                x => x.Name == name && (!excludingId.HasValue || x.ID != excludingId.Value),
                cancellationToken);

        if (taken)
            throw new InvalidOperationException("An item with this name already exists.");
    }

    private static string BuildPurchaseNarration(
        IReadOnlyList<StationeryPurchaseLineInputDto> lines,
        IReadOnlyDictionary<int, StationeryItem> items,
        decimal totalAmount,
        string prefix = "Stationery purchase")
    {
        var sb = new StringBuilder(prefix);
        sb.Append(": ");
        for (var i = 0; i < lines.Count; i++)
        {
            var line = lines[i];
            var name = items.TryGetValue(line.ItemId, out var item) ? item.Name : $"Item {line.ItemId}";
            var part = $"{name} {FormatQty(line.Quantity)}×{FormatMoney(line.UnitPrice)}";
            if (i > 0)
                sb.Append(", ");
            sb.Append(part);
        }

        sb.Append(" (total ");
        sb.Append(FormatMoney(totalAmount));
        sb.Append(')');

        var text = sb.ToString();
        if (text.Length <= 500)
            return text;

        const string suffix = "…)";
        var keep = 500 - suffix.Length;
        return text[..Math.Max(0, keep)].TrimEnd(',', ' ') + suffix;
    }

    private static string FormatQty(decimal value) =>
        value % 1m == 0
            ? ((int)value).ToString(CultureInfo.InvariantCulture)
            : value.ToString("0.##", CultureInfo.InvariantCulture);

    private static string FormatMoney(decimal value) =>
        value.ToString("0.##", CultureInfo.InvariantCulture);

    private static string NormalizeName(string? name)
    {
        var value = (name ?? string.Empty).Trim();
        if (value.Length == 0)
            throw new ArgumentException("Item name is required.");
        return value;
    }

    private static string NormalizeCategory(string? category)
    {
        var value = (category ?? string.Empty).Trim();
        if (value.Length == 0)
            throw new ArgumentException("Category is required.");
        return value;
    }

    private static string NormalizeUnit(string? unit)
    {
        var value = string.IsNullOrWhiteSpace(unit) ? "pcs" : unit.Trim();
        return value;
    }

    private static decimal NormalizeUnitPrice(decimal unitPrice)
    {
        if (unitPrice < 0)
            throw new ArgumentException("Unit price cannot be negative.");
        return Math.Round(unitPrice, 2, MidpointRounding.AwayFromZero);
    }

    private static bool IsCleaningCategory(string? category) =>
        string.Equals(category?.Trim(), "Cleaning", StringComparison.OrdinalIgnoreCase);

    private static string? Truncate(string? value, int max)
    {
        if (string.IsNullOrWhiteSpace(value))
            return null;
        var trimmed = value.Trim();
        return trimmed.Length <= max ? trimmed : trimmed[..max];
    }

    private static StationeryItemDto MapItem(StationeryItem row) => new()
    {
        Id = row.ID,
        Name = row.Name,
        Category = row.Category,
        Unit = row.Unit,
        UnitPrice = row.UnitPrice,
        IsActive = row.IsActive
    };

    private static StationeryPurchaseDto MapPurchase(StationeryPurchase row) => new()
    {
        Id = row.ID,
        PurchaseDate = row.PurchaseDate,
        Notes = row.Notes,
        TotalAmount = row.TotalAmount,
        PostedToAccounts = row.PostedToAccounts,
        VoucherNo = row.VoucherNo,
        ExpenseAccountId = row.ExpenseAccountId,
        EntryUser = row.EntryUser,
        Lines = row.Lines
            .OrderBy(x => x.ID)
            .Select(line => new StationeryPurchaseLineDto
            {
                Id = line.ID,
                ItemId = line.ItemID,
                ItemName = line.Item?.Name ?? string.Empty,
                Category = line.Item?.Category ?? string.Empty,
                Unit = line.Item?.Unit ?? string.Empty,
                Quantity = line.Quantity,
                UnitPrice = line.UnitPrice,
                LineTotal = line.LineTotal
            })
            .ToList()
    };

    private static StationeryHandoverDto MapHandover(StationeryHandover row) => new()
    {
        Id = row.ID,
        HandoverDate = row.HandoverDate,
        EmployeeId = row.EmployeeID,
        EmployeeName = row.Employee?.EmployeeName ?? string.Empty,
        Notes = row.Notes,
        EntryUser = row.EntryUser,
        Lines = row.Lines
            .OrderBy(x => x.ID)
            .Select(line => new StationeryHandoverLineDto
            {
                Id = line.ID,
                ItemId = line.ItemID,
                ItemName = line.Item?.Name ?? string.Empty,
                Category = line.Item?.Category ?? string.Empty,
                Unit = line.Item?.Unit ?? string.Empty,
                Quantity = line.Quantity
            })
            .ToList()
    };
}
