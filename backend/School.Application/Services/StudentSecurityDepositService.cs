using Microsoft.EntityFrameworkCore;
using School.Application.Common;
using School.Application.DTOs;
using School.Application.Interfaces;
using School.Infrastructure.Data;
using School.Infrastructure.Entities;
using System.Data;
using System.Globalization;

namespace School.Application.Services;

public class StudentSecurityDepositService : IStudentSecurityDepositService
{
    private readonly AppDbContext _context;
    private readonly IAccountVoucherService _voucherService;
    private readonly ISystemAccountResolver _systemAccounts;

    public StudentSecurityDepositService(
        AppDbContext context,
        IAccountVoucherService voucherService,
        ISystemAccountResolver systemAccounts)
    {
        _context = context;
        _voucherService = voucherService;
        _systemAccounts = systemAccounts;
    }

    public async Task RecordDepositsFromReceiveAsync(
        IReadOnlyList<FeeAndFundCollection> receiveRows,
        string? entryUser,
        CancellationToken cancellationToken = default)
    {
        var securityRows = receiveRows
            .Where(x => x.FundTypeID == CampusFundTypes.SecurityDeposit && (x.Recieved ?? 0) > 0)
            .ToList();
        if (securityRows.Count == 0)
            return;

        var now = PakistanTime.Now;
        var user = TruncateUser(entryUser);
        foreach (var row in securityRows)
        {
            if (row.StudentID is not int studentId || studentId <= 0)
                continue;

            var amount = row.Recieved ?? 0;
            if (amount <= 0)
                continue;

            var exists = await _context.StudentSecurityDepositEvents
                .AnyAsync(
                    x => x.FeeLedgerRowId == row.ID
                         && x.EventType == StudentSecurityDepositEventTypes.Deposit,
                    cancellationToken);
            if (exists)
                continue;

            _context.StudentSecurityDepositEvents.Add(new StudentSecurityDepositEvent
            {
                StudentId = studentId,
                EventType = StudentSecurityDepositEventTypes.Deposit,
                Amount = amount,
                EventDatePkt = row.Date ?? now,
                SessionYear = row.Year ?? now.Year,
                FeeLedgerRowId = row.ID,
                ReceiptId = row.RcptID,
                EntryUser = user,
                CreatedAtPkt = now
            });
        }

        await _context.SaveChangesAsync(cancellationToken);
    }

    public async Task ReverseDepositsForRemovedLedgerRowsAsync(
        IReadOnlyList<FeeAndFundCollection> removedRows,
        string? entryUser,
        string? notes,
        CancellationToken cancellationToken = default)
    {
        var securityRows = removedRows
            .Where(x => x.FundTypeID == CampusFundTypes.SecurityDeposit && (x.Recieved ?? 0) > 0)
            .ToList();
        if (securityRows.Count == 0)
            return;

        var now = PakistanTime.Now;
        var user = TruncateUser(entryUser);
        foreach (var row in securityRows)
        {
            if (row.StudentID is not int studentId || studentId <= 0)
                continue;

            var deposit = await _context.StudentSecurityDepositEvents
                .Where(x => x.FeeLedgerRowId == row.ID
                            && x.EventType == StudentSecurityDepositEventTypes.Deposit)
                .OrderByDescending(x => x.Id)
                .FirstOrDefaultAsync(cancellationToken);

            var amount = deposit?.Amount ?? (row.Recieved ?? 0);
            if (amount <= 0)
                continue;

            _context.StudentSecurityDepositEvents.Add(new StudentSecurityDepositEvent
            {
                StudentId = studentId,
                EventType = StudentSecurityDepositEventTypes.DepositReversal,
                Amount = amount,
                EventDatePkt = now,
                SessionYear = row.Year ?? now.Year,
                FeeLedgerRowId = row.ID,
                ReceiptId = row.RcptID,
                EntryUser = user,
                Notes = notes,
                CreatedAtPkt = now
            });
        }

        await _context.SaveChangesAsync(cancellationToken);
    }

    public async Task AdjustDepositAfterReceiptEditAsync(
        int feeLedgerRowId,
        int studentId,
        decimal oldAmount,
        decimal newAmount,
        DateTime eventDate,
        int sessionYear,
        int? receiptId,
        string? entryUser,
        CancellationToken cancellationToken = default)
    {
        if (oldAmount == newAmount)
            return;

        var now = PakistanTime.Now;
        var user = TruncateUser(entryUser);
        if (newAmount < oldAmount)
        {
            _context.StudentSecurityDepositEvents.Add(new StudentSecurityDepositEvent
            {
                StudentId = studentId,
                EventType = StudentSecurityDepositEventTypes.DepositReversal,
                Amount = oldAmount - newAmount,
                EventDatePkt = eventDate,
                SessionYear = sessionYear,
                FeeLedgerRowId = feeLedgerRowId,
                ReceiptId = receiptId,
                EntryUser = user,
                Notes = "Receipt amount adjusted",
                CreatedAtPkt = now
            });
        }
        else
        {
            _context.StudentSecurityDepositEvents.Add(new StudentSecurityDepositEvent
            {
                StudentId = studentId,
                EventType = StudentSecurityDepositEventTypes.Deposit,
                Amount = newAmount - oldAmount,
                EventDatePkt = eventDate,
                SessionYear = sessionYear,
                FeeLedgerRowId = feeLedgerRowId,
                ReceiptId = receiptId,
                EntryUser = user,
                Notes = "Receipt amount adjusted",
                CreatedAtPkt = now
            });
        }

        await _context.SaveChangesAsync(cancellationToken);
    }

    public async Task<StudentSecurityDepositSummaryDto> GetSummaryAsync(
        int studentId,
        CancellationToken cancellationToken = default)
    {
        var student = await _context.Students
            .AsNoTracking()
            .Where(x => x.Reg_Id == studentId)
            .Select(x => new { x.Reg_Id, x.FullName })
            .FirstOrDefaultAsync(cancellationToken)
            ?? throw new KeyNotFoundException("Student not found.");

        var events = await _context.StudentSecurityDepositEvents
            .AsNoTracking()
            .Where(x => x.StudentId == studentId)
            .OrderByDescending(x => x.EventDatePkt)
            .ThenByDescending(x => x.Id)
            .ToListAsync(cancellationToken);

        var held = ComputeHeld(events);
        var netDeposited = ComputeNetDeposited(events);
        var totalRefunded = events
            .Where(x => x.EventType == StudentSecurityDepositEventTypes.Refund)
            .Sum(x => x.Amount);
        var hasRefundHistory = totalRefunded > 0;

        var ledgerReceived = await _context.FeeAndFundCollections
            .AsNoTracking()
            .Where(x => (x.VoidAmount ?? 0) == 0
                        && x.StudentID == studentId
                        && x.FundTypeID == CampusFundTypes.SecurityDeposit
                        && (x.Recieved ?? 0) > 0)
            .SumAsync(x => x.Recieved ?? 0, cancellationToken);

        return new StudentSecurityDepositSummaryDto
        {
            StudentId = studentId,
            StudentName = student.FullName ?? $"Student {studentId}",
            HeldAmount = held,
            NetDeposited = netDeposited,
            TotalRefunded = totalRefunded,
            HasRefundHistory = hasRefundHistory,
            CanGenerateSecurityCharge = !hasRefundHistory,
            LedgerReceivedCurrentSession = ledgerReceived,
            Events = events.Select(MapEvent).ToList()
        };
    }

    public async Task EnsureCanGenerateSecurityChargeAsync(
        int studentId,
        CancellationToken cancellationToken = default)
    {
        var hasRefund = await _context.StudentSecurityDepositEvents
            .AsNoTracking()
            .AnyAsync(
                x => x.StudentId == studentId
                     && x.EventType == StudentSecurityDepositEventTypes.Refund,
                cancellationToken);

        if (hasRefund)
        {
            throw new InvalidOperationException(
                "Security deposit cannot be generated because a refund was already recorded for this student.");
        }
    }

    public async Task<RefundStudentSecurityDepositResultDto> RefundAsync(
        int studentId,
        RefundStudentSecurityDepositRequestDto request,
        int? userId,
        CancellationToken cancellationToken = default)
    {
        if (request.Amount <= 0)
            throw new ArgumentException("Refund amount must be greater than zero.");

        var student = await _context.Students
            .AsNoTracking()
            .Where(x => x.Reg_Id == studentId)
            .Select(x => new { x.Reg_Id, x.FullName })
            .FirstOrDefaultAsync(cancellationToken)
            ?? throw new KeyNotFoundException("Student not found.");

        var pakistanToday = PakistanTime.Today.ToDateTime(TimeOnly.MinValue);
        var date = request.Date == default
            ? pakistanToday
            : new DateTime(request.Date.Year, request.Date.Month, request.Date.Day);
        if (date > pakistanToday)
            date = pakistanToday;

        var amount = Math.Floor(request.Amount);
        var user = TruncateUser(await ResolveEntryUserAsync(userId, cancellationToken));

        await using var transaction = await _context.Database.BeginTransactionAsync(
            IsolationLevel.Serializable,
            cancellationToken);

        var events = await _context.StudentSecurityDepositEvents
            .Where(x => x.StudentId == studentId)
            .ToListAsync(cancellationToken);

        var held = ComputeHeld(events);
        if (amount > held)
            throw new InvalidOperationException("Refund amount cannot exceed the held security deposit.");

        string? voucherNo = null;
        if (request.PostToAccounts)
        {
            await _systemAccounts.EnsureSystemAccountsAsync(cancellationToken);
            var accountId = await _systemAccounts.GetSecurityDepositRefundsAccountIdAsync(cancellationToken)
                ?? throw new InvalidOperationException(
                    "Security deposit refund account is not set up. Contact your administrator.");

            var name = student.FullName ?? $"Student {studentId}";
            var narration = string.IsNullOrWhiteSpace(request.Notes)
                ? $"Security deposit refund — {name} #{studentId}"
                : request.Notes.Trim();

            var voucher = await _voucherService.SaveCashPaymentAsync(
                new SaveVoucherRequestDto
                {
                    Date = date,
                    Lines =
                    [
                        new VoucherLineInputDto
                        {
                            AccountId = accountId,
                            Amount = amount,
                            Narration = narration
                        }
                    ]
                },
                user,
                cancellationToken);

            voucherNo = voucher.VoucherNo;
        }

        var sessionYear = date.Year;
        var depositEvent = new StudentSecurityDepositEvent
        {
            StudentId = studentId,
            EventType = StudentSecurityDepositEventTypes.Refund,
            Amount = amount,
            EventDatePkt = date,
            SessionYear = sessionYear,
            VoucherNo = voucherNo,
            EntryUser = user,
            Notes = request.Notes,
            CreatedAtPkt = PakistanTime.Now
        };
        _context.StudentSecurityDepositEvents.Add(depositEvent);
        await _context.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        return new RefundStudentSecurityDepositResultDto
        {
            RefundedAmount = amount,
            HeldAfter = held - amount,
            VoucherNo = voucherNo,
            EventId = depositEvent.Id
        };
    }

    private static decimal ComputeHeld(IEnumerable<StudentSecurityDepositEvent> events)
    {
        decimal held = 0;
        foreach (var e in events)
        {
            switch (e.EventType)
            {
                case StudentSecurityDepositEventTypes.Deposit:
                    held += e.Amount;
                    break;
                case StudentSecurityDepositEventTypes.Refund:
                case StudentSecurityDepositEventTypes.DepositReversal:
                    held -= e.Amount;
                    break;
            }
        }

        return Math.Max(0, held);
    }

    private static decimal ComputeNetDeposited(IEnumerable<StudentSecurityDepositEvent> events)
    {
        decimal net = 0;
        foreach (var e in events)
        {
            switch (e.EventType)
            {
                case StudentSecurityDepositEventTypes.Deposit:
                    net += e.Amount;
                    break;
                case StudentSecurityDepositEventTypes.DepositReversal:
                    net -= e.Amount;
                    break;
            }
        }

        return Math.Max(0, net);
    }

    private static StudentSecurityDepositEventDto MapEvent(StudentSecurityDepositEvent e) => new()
    {
        Id = e.Id,
        EventType = e.EventType,
        Amount = e.Amount,
        EventDate = e.EventDatePkt,
        SessionYear = e.SessionYear,
        ReceiptId = e.ReceiptId,
        VoucherNo = e.VoucherNo,
        EntryUser = e.EntryUser,
        Notes = e.Notes
    };

    private async Task<string?> ResolveEntryUserAsync(int? userId, CancellationToken cancellationToken)
    {
        if (!userId.HasValue)
            return null;

        var username = await _context.Users
            .AsNoTracking()
            .Where(x => x.ID == userId.Value)
            .Select(x => x.Username)
            .FirstOrDefaultAsync(cancellationToken);

        if (!string.IsNullOrWhiteSpace(username))
            return username.Trim();

        return userId.Value.ToString(CultureInfo.InvariantCulture);
    }

    private static string? TruncateUser(string? entryUser)
    {
        if (string.IsNullOrWhiteSpace(entryUser))
            return null;
        var user = entryUser.Trim();
        return user.Length > 50 ? user[..50] : user;
    }
}
