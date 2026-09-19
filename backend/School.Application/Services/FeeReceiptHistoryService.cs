using System.Globalization;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using School.Application.Common;
using School.Application.DTOs;
using School.Application.Interfaces;
using School.Infrastructure.Data;
using School.Infrastructure.Entities;
using System.Data;

namespace School.Application.Services;

public class FeeReceiptHistoryService : IFeeReceiptHistoryService
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true,
        DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull
    };

    private readonly AppDbContext _context;
    private readonly TenantContext _tenantContext;
    private readonly IActivityLogService _activityLogService;

    public FeeReceiptHistoryService(
        AppDbContext context,
        TenantContext tenantContext,
        IActivityLogService activityLogService)
    {
        _context = context;
        _tenantContext = tenantContext;
        _activityLogService = activityLogService;
    }

    public async Task<IReadOnlyList<FeeReceiptHistoryItemDto>> SearchAsync(
        FeeReceiptHistoryQueryDto query,
        CancellationToken cancellationToken = default)
    {
        var studentName = (query.StudentName ?? string.Empty).Trim();
        var hasName = studentName.Length >= 2;
        var hasDateRange = query.DateFrom.HasValue && query.DateTo.HasValue;

        if (!hasName && !hasDateRange)
            throw new ArgumentException("Provide a date range, or a student name (at least 2 characters).");

        if (hasDateRange && query.DateFrom!.Value.Date > query.DateTo!.Value.Date)
            throw new ArgumentException("From date cannot be after to date.");

        var rowsQuery = _context.FeeAndFundCollections
            .AsNoTracking()
            .Where(x => x.RcptID != null && (x.Recieved ?? 0) > 0);

        if (hasDateRange)
        {
            var from = query.DateFrom!.Value.Date;
            var toExclusive = query.DateTo!.Value.Date.AddDays(1);
            rowsQuery = rowsQuery.Where(x => x.Date != null && x.Date >= from && x.Date < toExclusive);
        }

        if (hasName)
        {
            var like = $"%{studentName}%";
            rowsQuery = rowsQuery.Where(x =>
                x.StudentID != null
                && _context.Students.Any(s =>
                    s.Reg_Id == x.StudentID
                    && s.FullName != null
                    && EF.Functions.Like(s.FullName, like)));
        }

        var grouped = await rowsQuery
            .GroupBy(x => x.RcptID!.Value)
            .Select(g => new
            {
                ReceiptId = g.Key,
                TransactionId = g.Max(x => x.TransactionID ?? 0),
                StudentId = g.Max(x => x.StudentID ?? 0),
                Date = g.Max(x => x.Date),
                Time = g.Max(x => x.Time),
                ReceivedBy = g.Max(x => x.ReceivedBy),
                ManualRcptNo = g.Max(x => x.ManualRcptNo),
                TotalReceived = g.Sum(x => x.Recieved ?? 0),
                LineCount = g.Count()
            })
            .OrderByDescending(x => x.Date)
            .ThenByDescending(x => x.ReceiptId)
            .Take(500)
            .ToListAsync(cancellationToken);

        if (grouped.Count == 0)
            return [];

        var studentIds = grouped.Select(x => x.StudentId).Where(id => id > 0).Distinct().ToList();
        var students = await _context.Students
            .AsNoTracking()
            .Include(x => x.Section)
            .Where(x => studentIds.Contains(x.Reg_Id))
            .Select(x => new
            {
                x.Reg_Id,
                x.FullName,
                x.Family_Code,
                ClassName = x.Section != null ? x.Section.ClassName : null,
                SectionName = x.Section != null ? x.Section.SectionName : null
            })
            .ToDictionaryAsync(x => x.Reg_Id, cancellationToken);

        var active = grouped.Select(item =>
        {
            students.TryGetValue(item.StudentId, out var student);
            return new FeeReceiptHistoryItemDto
            {
                ReceiptId = item.ReceiptId,
                TransactionId = item.TransactionId,
                StudentId = item.StudentId,
                StudentName = student?.FullName ?? $"Student {item.StudentId}",
                ClassName = FormatClassName(student?.ClassName, student?.SectionName),
                FamilyCode = student?.Family_Code,
                Date = item.Date,
                Time = item.Time,
                ReceivedBy = item.ReceivedBy,
                ManualRcptNo = item.ManualRcptNo,
                TotalReceived = item.TotalReceived,
                LineCount = item.LineCount,
                IsVoided = false
            };
        }).ToList();

        if (!hasDateRange || active.Count == 0)
            return active;

        // Fill RcptId gaps in the loaded set with void tombstones from ActivityLog.
        var receiptIds = active.Select(x => x.ReceiptId).Distinct().OrderBy(x => x).ToList();
        var minId = receiptIds[0];
        var maxId = receiptIds[^1];
        if (maxId <= minId)
            return active;

        var present = receiptIds.ToHashSet();
        var gapIds = Enumerable.Range(minId, maxId - minId + 1)
            .Where(id => !present.Contains(id))
            .ToList();
        if (gapIds.Count == 0)
            return active;

        var voidLogs = await _context.ActivityLogs
            .AsNoTracking()
            .Where(x =>
                x.ActivityType == ActivityLogTypes.FeeReceiptVoid
                && x.EntityType == ActivityLogEntityTypes.FeeReceipt
                && x.EntityId != null
                && gapIds.Contains(x.EntityId.Value))
            .OrderByDescending(x => x.OccurredAtPkt)
            .ThenByDescending(x => x.ID)
            .ToListAsync(cancellationToken);

        var voidByReceipt = new Dictionary<int, ActivityLog>();
        foreach (var log in voidLogs)
        {
            var rcptId = log.EntityId!.Value;
            if (!voidByReceipt.ContainsKey(rcptId))
                voidByReceipt[rcptId] = log;
        }

        foreach (var (rcptId, log) in voidByReceipt)
        {
            var snapshot = TryReadVoidSnapshot(log.DetailsJson);
            active.Add(new FeeReceiptHistoryItemDto
            {
                ReceiptId = rcptId,
                TransactionId = snapshot?.Receipt?.TransactionId ?? 0,
                StudentId = snapshot?.Receipt?.StudentId ?? 0,
                StudentName = snapshot?.Receipt?.StudentName ?? log.EntityLabel ?? $"Receipt {rcptId}",
                ClassName = snapshot?.Receipt?.ClassName ?? "—",
                FamilyCode = snapshot?.Receipt?.FamilyCode,
                Date = snapshot?.Receipt?.Date,
                Time = snapshot?.Receipt?.Time,
                ReceivedBy = snapshot?.Receipt?.ReceivedBy,
                ManualRcptNo = snapshot?.Receipt?.ManualRcptNo,
                TotalReceived = snapshot?.Receipt?.TotalReceived
                    ?? snapshot?.Receipt?.Lines?.Sum(l => l.Amount)
                    ?? 0,
                LineCount = snapshot?.Receipt?.Lines?.Count ?? 0,
                IsVoided = true,
                VoidActivityLogId = log.ID
            });
        }

        return active
            .OrderByDescending(x => x.Date)
            .ThenByDescending(x => x.ReceiptId)
            .ToList();
    }

    public async Task<StudentFeeReceiptDto> GetReceiptForReprintAsync(
        int receiptId,
        CancellationToken cancellationToken = default)
    {
        if (receiptId <= 0)
            throw new ArgumentException("Receipt number is required.");

        var lines = await _context.FeeAndFundCollections
            .AsNoTracking()
            .Where(x => x.RcptID == receiptId && (x.Recieved ?? 0) > 0)
            .OrderBy(x => x.ID)
            .ToListAsync(cancellationToken);

        if (lines.Count == 0)
            throw new KeyNotFoundException("Receipt not found.");

        return await BuildReceiptDtoAsync(receiptId, lines, cancellationToken);
    }

    public async Task VoidReceiptAsync(
        int receiptId,
        VoidFeeReceiptRequestDto request,
        int? userId,
        CancellationToken cancellationToken = default)
    {
        if (receiptId <= 0)
            throw new ArgumentException("Receipt number is required.");

        await using var transaction = await _context.Database.BeginTransactionAsync(
            IsolationLevel.Serializable,
            cancellationToken);

        var lines = await _context.FeeAndFundCollections
            .Where(x => x.RcptID == receiptId && (x.Recieved ?? 0) > 0)
            .OrderBy(x => x.ID)
            .ToListAsync(cancellationToken);

        if (lines.Count == 0)
            throw new KeyNotFoundException("Receipt not found.");

        // Snapshot before delete (tracked entities are fine for read of current values).
        var receipt = await BuildReceiptDtoAsync(receiptId, lines, cancellationToken);
        var deletedRowIds = lines.Select(x => x.ID).ToList();

        _context.FeeAndFundCollections.RemoveRange(lines);

        var reason = string.IsNullOrWhiteSpace(request.Reason) ? null : request.Reason.Trim();
        await _activityLogService.WriteAsync(
            ActivityLogTypes.FeeReceiptVoid,
            ActivityLogEntityTypes.FeeReceipt,
            receiptId,
            $"{receipt.StudentName} · Receipt #{receiptId}",
            userId,
            new
            {
                source = "fee-receipt-void",
                reason,
                receipt,
                deletedRowIds
            },
            cancellationToken);

        await _context.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
    }

    public async Task EditReceiptAsync(
        int receiptId,
        EditFeeReceiptRequestDto request,
        int? userId,
        CancellationToken cancellationToken = default)
    {
        if (receiptId <= 0)
            throw new ArgumentException("Receipt number is required.");

        await using var transaction = await _context.Database.BeginTransactionAsync(
            IsolationLevel.Serializable,
            cancellationToken);

        var lines = await _context.FeeAndFundCollections
            .Where(x => x.RcptID == receiptId && (x.Recieved ?? 0) > 0)
            .OrderBy(x => x.ID)
            .ToListAsync(cancellationToken);

        if (lines.Count == 0)
            throw new KeyNotFoundException("Receipt not found.");

        var requestedLineIds = (request.Lines ?? [])
            .Select(x => x.Id)
            .Where(id => id > 0)
            .Distinct()
            .ToList();

        if (requestedLineIds.Count > 0)
        {
            var existingIds = lines.Select(x => x.ID).ToHashSet();
            if (requestedLineIds.Count != existingIds.Count
                || requestedLineIds.Any(id => !existingIds.Contains(id)))
            {
                throw new InvalidOperationException(
                    "Only the receipt date and amounts can be changed. Void this receipt if you need other changes.");
            }
        }

        var before = new
        {
            date = lines[0].Date,
            lines = lines.Select(x => new
            {
                id = x.ID,
                fundTypeId = x.FundTypeID,
                month = x.Month,
                year = x.Year,
                amount = x.Recieved ?? 0
            }).ToList()
        };

        var changes = new List<object>();
        var pakistanToday = PakistanTime.Today.ToDateTime(TimeOnly.MinValue);

        if (request.Date.HasValue)
        {
            var newDate = new DateTime(
                request.Date.Value.Year,
                request.Date.Value.Month,
                request.Date.Value.Day);
            if (newDate > pakistanToday)
                newDate = pakistanToday;

            var oldDate = lines[0].Date?.Date;
            if (oldDate != newDate.Date)
            {
                foreach (var line in lines)
                    line.Date = newDate;
                changes.Add(new { field = "date", old = oldDate, @new = newDate.Date });
            }
        }

        if (request.Lines is { Count: > 0 })
        {
            var amountById = request.Lines.ToDictionary(x => x.Id, x => Math.Floor(x.Amount));
            var studentId = lines.Select(x => x.StudentID ?? 0).FirstOrDefault(id => id > 0);

            foreach (var line in lines)
            {
                if (!amountById.TryGetValue(line.ID, out var newAmount))
                    continue;

                if (newAmount <= 0)
                    throw new InvalidOperationException("Received amount must be greater than zero.");

                var oldAmount = line.Recieved ?? 0;
                if (newAmount == oldAmount)
                    continue;

                var due = await GetLineDueCeilingAsync(
                    studentId,
                    line.FundTypeID ?? 0,
                    line.Month ?? 0,
                    line.Year ?? 0,
                    line.ID,
                    cancellationToken);

                if (newAmount > due)
                {
                    throw new InvalidOperationException(
                        "Amount cannot be greater than the remaining balance for that fee.");
                }

                line.Recieved = newAmount;
                changes.Add(new
                {
                    field = "lineAmount",
                    lineId = line.ID,
                    old = oldAmount,
                    @new = newAmount
                });
            }
        }

        if (changes.Count == 0)
            throw new InvalidOperationException("No changes to save.");

        var after = new
        {
            date = lines[0].Date,
            lines = lines.Select(x => new
            {
                id = x.ID,
                fundTypeId = x.FundTypeID,
                month = x.Month,
                year = x.Year,
                amount = x.Recieved ?? 0
            }).ToList()
        };

        var studentName = await _context.Students
            .AsNoTracking()
            .Where(x => x.Reg_Id == (lines[0].StudentID ?? 0))
            .Select(x => x.FullName)
            .FirstOrDefaultAsync(cancellationToken);

        await _activityLogService.WriteAsync(
            ActivityLogTypes.FeeReceiptEdit,
            ActivityLogEntityTypes.FeeReceipt,
            receiptId,
            $"{studentName ?? $"Student {lines[0].StudentID}"} · Receipt #{receiptId}",
            userId,
            new
            {
                source = "fee-receipt-edit",
                receiptId,
                changes,
                before,
                after
            },
            cancellationToken);

        await _context.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
    }

    public async Task<PagedResultDto<VoidedFeeReceiptListItemDto>> GetVoidedReceiptsAsync(
        VoidedFeeReceiptQueryDto query,
        CancellationToken cancellationToken = default)
    {
        var pageNumber = query.PageNumber < 1 ? 1 : query.PageNumber;
        var pageSize = query.PageSize switch
        {
            < 1 => 25,
            > 100 => 100,
            _ => query.PageSize
        };

        var logsQuery = _context.ActivityLogs
            .AsNoTracking()
            .Where(x => x.ActivityType == ActivityLogTypes.FeeReceiptVoid);

        if (query.ReceiptId is int rcptId and > 0)
            logsQuery = logsQuery.Where(x => x.EntityId == rcptId);

        if (query.DateFrom is DateOnly dateFrom)
        {
            var from = dateFrom.ToDateTime(TimeOnly.MinValue);
            logsQuery = logsQuery.Where(x => x.OccurredAtPkt >= from);
        }

        if (query.DateTo is DateOnly dateTo)
        {
            var toExclusive = dateTo.AddDays(1).ToDateTime(TimeOnly.MinValue);
            logsQuery = logsQuery.Where(x => x.OccurredAtPkt < toExclusive);
        }

        var studentName = (query.StudentName ?? string.Empty).Trim();
        if (studentName.Length >= 2)
        {
            var lower = studentName.ToLowerInvariant();
            logsQuery = logsQuery.Where(x =>
                x.EntityLabel != null && x.EntityLabel.ToLower().Contains(lower));
        }

        var totalCount = await logsQuery.CountAsync(cancellationToken);
        var logs = await logsQuery
            .OrderByDescending(x => x.OccurredAtPkt)
            .ThenByDescending(x => x.ID)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        var items = logs.Select(log =>
        {
            var snapshot = TryReadVoidSnapshot(log.DetailsJson);
            var receipt = snapshot?.Receipt;
            return new VoidedFeeReceiptListItemDto
            {
                ActivityLogId = log.ID,
                ReceiptId = receipt?.ReceiptId ?? log.EntityId ?? 0,
                StudentId = receipt?.StudentId ?? 0,
                StudentName = receipt?.StudentName ?? log.EntityLabel ?? "—",
                ClassName = receipt?.ClassName ?? "—",
                ReceiptDate = receipt?.Date,
                TotalReceived = receipt?.TotalReceived
                    ?? receipt?.Lines?.Sum(l => l.Amount)
                    ?? 0,
                VoidedBy = log.UserName,
                VoidedAtPkt = log.OccurredAtPkt,
                Reason = snapshot?.Reason
            };
        }).ToList();

        return new PagedResultDto<VoidedFeeReceiptListItemDto>
        {
            Items = items,
            TotalCount = totalCount,
            PageNumber = pageNumber,
            PageSize = pageSize,
            TotalPages = totalCount == 0 ? 0 : (int)Math.Ceiling(totalCount / (double)pageSize)
        };
    }

    public async Task<StudentFeeReceiptDto> GetVoidedReceiptForPrintAsync(
        int activityLogId,
        CancellationToken cancellationToken = default)
    {
        if (activityLogId <= 0)
            throw new ArgumentException("Void record is required.");

        var log = await _context.ActivityLogs
            .AsNoTracking()
            .FirstOrDefaultAsync(
                x => x.ID == activityLogId && x.ActivityType == ActivityLogTypes.FeeReceiptVoid,
                cancellationToken)
            ?? throw new KeyNotFoundException("Voided receipt not found.");

        var snapshot = TryReadVoidSnapshot(log.DetailsJson)
            ?? throw new KeyNotFoundException("Voided receipt details are missing.");

        if (snapshot.Receipt is null)
            throw new KeyNotFoundException("Voided receipt details are missing.");

        return snapshot.Receipt;
    }

    private async Task<StudentFeeReceiptDto> BuildReceiptDtoAsync(
        int receiptId,
        List<FeeAndFundCollection> lines,
        CancellationToken cancellationToken)
    {
        var studentId = lines.Select(x => x.StudentID ?? 0).FirstOrDefault(id => id > 0);
        if (studentId <= 0)
            throw new KeyNotFoundException("Student for this receipt was not found.");

        var student = await _context.Students
            .AsNoTracking()
            .Include(x => x.Section)
            .Where(x => x.Reg_Id == studentId)
            .Select(x => new
            {
                x.Reg_Id,
                x.FullName,
                x.Family_Code,
                x.Fee,
                x.FeeConcession,
                ClassName = x.Section != null ? x.Section.ClassName : null,
                SectionName = x.Section != null ? x.Section.SectionName : null
            })
            .FirstOrDefaultAsync(cancellationToken)
            ?? throw new KeyNotFoundException("Student for this receipt was not found.");

        var fundTypeIds = lines.Select(x => x.FundTypeID ?? 0).Where(id => id > 0).Distinct().ToList();
        var fundTypeNames = await _context.FundTypes
            .AsNoTracking()
            .Where(x => fundTypeIds.Contains(x.ID))
            .ToDictionaryAsync(x => x.ID, x => x.FundTypeName, cancellationToken);

        var ledgerRows = await _context.FeeAndFundCollections
            .AsNoTracking()
            .Where(x => x.StudentID == studentId)
            .Select(x => new
            {
                Id = x.ID,
                FundTypeId = x.FundTypeID ?? 0,
                Month = x.Month ?? 0,
                Year = x.Year ?? 0,
                Payment = x.Payment ?? 0,
                Credit = (x.Recieved ?? 0) + (x.Discount ?? 0),
                RcptId = x.RcptID
            })
            .ToListAsync(cancellationToken);

        var receiptLineIds = lines.Select(x => x.ID).ToHashSet();
        var first = lines[0];

        var receipt = new StudentFeeReceiptDto
        {
            TransactionId = first.TransactionID ?? 0,
            ReceiptId = receiptId,
            StudentId = studentId,
            FamilyCode = student.Family_Code,
            StudentName = student.FullName ?? $"Student {studentId}",
            ClassName = FormatClassName(student.ClassName, student.SectionName),
            Date = first.Date ?? DateTime.Today,
            Time = first.Time ?? string.Empty,
            ReceivedBy = first.ReceivedBy ?? string.Empty,
            Campus = _tenantContext.Campus,
            ManualRcptNo = first.ManualRcptNo
        };

        foreach (var row in lines)
        {
            var fundTypeId = row.FundTypeID ?? 0;
            var month = row.Month ?? 0;
            var year = row.Year ?? 0;
            var amount = row.Recieved ?? 0;
            var isMonthlyFee = month > 0;
            var keyRows = ledgerRows.Where(x => x.FundTypeId == fundTypeId && x.Month == month && x.Year == year).ToList();
            var generated = keyRows.Sum(x => x.Payment);
            var previousReceived = keyRows
                .Where(x => !receiptLineIds.Contains(x.Id))
                .Sum(x => x.Credit);

            receipt.Lines.Add(new StudentFeeReceiptLineDto
            {
                Id = row.ID,
                FundTypeId = fundTypeId,
                Description = FormatReceiptDescription(
                    fundTypeId,
                    month,
                    year,
                    ResolveFundTypeName(fundTypeId, fundTypeNames)),
                Month = month,
                Year = year,
                ActualAmount = isMonthlyFee ? (student.Fee ?? 0) : generated,
                Concession = isMonthlyFee ? (student.FeeConcession ?? 0) : 0,
                PreviousReceived = previousReceived,
                Amount = amount
            });
        }

        receipt.TotalReceived = receipt.Lines.Sum(x => x.Amount);
        receipt.TotalRemaining = Math.Max(
            0,
            ledgerRows
                .GroupBy(x => new { x.FundTypeId, x.Month, x.Year })
                .Sum(g =>
                {
                    var payment = g.Sum(x => x.Payment);
                    var credit = g
                        .Where(x => x.RcptId == null || x.RcptId <= receiptId)
                        .Sum(x => x.Credit);
                    return Math.Max(0, payment - credit);
                }));

        return receipt;
    }

    /// <summary>
    /// Max allowed received for this credit line = other credits excluded + this line's current amount + unpaid generated.
    /// Equivalent to: generated - (other credits) = due if this line were zero, then new amount must be ≤ that.
    /// </summary>
    private async Task<decimal> GetLineDueCeilingAsync(
        int studentId,
        int fundTypeId,
        int month,
        int year,
        int excludeLineId,
        CancellationToken cancellationToken)
    {
        var rows = await _context.FeeAndFundCollections
            .AsNoTracking()
            .Where(x =>
                x.StudentID == studentId
                && x.FundTypeID == fundTypeId
                && x.Month == month
                && x.Year == year)
            .Select(x => new
            {
                x.ID,
                Payment = x.Payment ?? 0,
                Credit = (x.Recieved ?? 0) + (x.Discount ?? 0)
            })
            .ToListAsync(cancellationToken);

        var generated = rows.Sum(x => x.Payment);
        var otherCredits = rows.Where(x => x.ID != excludeLineId).Sum(x => x.Credit);
        return Math.Max(0, generated - otherCredits);
    }

    private static VoidSnapshot? TryReadVoidSnapshot(string? detailsJson)
    {
        if (string.IsNullOrWhiteSpace(detailsJson))
            return null;

        try
        {
            return JsonSerializer.Deserialize<VoidSnapshot>(detailsJson, JsonOptions);
        }
        catch (JsonException)
        {
            return null;
        }
    }

    private static string FormatClassName(string? className, string? sectionName)
    {
        var parts = new[] { className, sectionName }
            .Where(x => !string.IsNullOrWhiteSpace(x))
            .Select(x => x!.Trim())
            .Distinct(StringComparer.OrdinalIgnoreCase);
        var name = string.Join("-", parts).Trim();
        return string.IsNullOrWhiteSpace(name) ? "-" : name;
    }

    private static string FormatReceiptDescription(int fundTypeId, int month, int year, string fundTypeName)
    {
        if (fundTypeId == 1 && month is >= 1 and <= 12 && year > 0)
            return $"{new DateTime(year, month, 1).ToString("MMMM yyyy", CultureInfo.InvariantCulture)} Fee";

        return year > 0 ? $"{fundTypeName} {year}" : fundTypeName;
    }

    private static string ResolveFundTypeName(int fundTypeId, Dictionary<int, string?> names)
    {
        return names.TryGetValue(fundTypeId, out var name) && !string.IsNullOrWhiteSpace(name)
            ? name.Trim()
            : fundTypeId == 1 ? "Tuition Fee" : $"Fund {fundTypeId}";
    }

    private sealed class VoidSnapshot
    {
        public string? Source { get; set; }
        public string? Reason { get; set; }
        public StudentFeeReceiptDto? Receipt { get; set; }
        public List<int>? DeletedRowIds { get; set; }
    }
}
