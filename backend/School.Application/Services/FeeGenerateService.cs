using System.Globalization;
using Microsoft.EntityFrameworkCore;
using School.Application.Common;
using School.Application.DTOs;
using School.Application.Interfaces;
using School.Infrastructure.Data;
using School.Infrastructure.Entities;

namespace School.Application.Services;

public class FeeGenerateService : IFeeGenerateService
{
    private const int TuitionFundTypeId = 1;
    private const int SpCommandTimeoutSeconds = 180;

    private readonly AppDbContext _context;
    private readonly IActivityLogService _activityLogService;

    public FeeGenerateService(AppDbContext context, IActivityLogService activityLogService)
    {
        _context = context;
        _activityLogService = activityLogService;
    }

    public async Task GenerateForAllAsync(
        GenerateFeeAllRequestDto request,
        int? userId = null,
        CancellationToken cancellationToken = default)
    {
        ValidateMonthYear(request.Month, request.Year);

        var previousTimeout = _context.Database.GetCommandTimeout();
        _context.Database.SetCommandTimeout(SpCommandTimeoutSeconds);
        try
        {
            var session = request.Year.ToString(CultureInfo.InvariantCulture);
            await _context.Database.ExecuteSqlRawAsync(
                "EXEC SPstudentfee {0}, {1}, {2}",
                [request.Month, request.Year, session],
                cancellationToken);
        }
        finally
        {
            _context.Database.SetCommandTimeout(previousTimeout);
        }

        var periodLabel = FormatMonthYear(request.Month, request.Year);
        await _activityLogService.WriteAsync(
            ActivityLogTypes.FeeGenerateAll,
            null,
            null,
            $"All students · {periodLabel}",
            userId,
            new
            {
                source = "fee-generate-all",
                month = request.Month,
                year = request.Year,
                period = periodLabel
            },
            cancellationToken);
        await _context.SaveChangesAsync(cancellationToken);
    }

    public async Task GenerateForStudentAsync(
        GenerateFeeStudentRequestDto request,
        int? userId = null,
        CancellationToken cancellationToken = default)
    {
        ValidateMonthYear(request.Month, request.Year);

        if (request.StudentId <= 0)
            throw new ArgumentException("Student is required.");

        var student = await _context.Students
            .FirstOrDefaultAsync(x => x.Reg_Id == request.StudentId, cancellationToken)
            ?? throw new KeyNotFoundException("Student not found.");

        decimal amount;
        if (request.Amount == -1)
        {
            amount = student.TutionFee ?? 0;
        }
        else
        {
            amount = request.Amount;
        }

        if (amount < 0)
            throw new ArgumentException("Fee amount cannot be negative.");

        var periodTotals = await GetTuitionPeriodTotalsAsync(
            student.Reg_Id,
            request.Month,
            request.Year,
            cancellationToken);
        if (amount < periodTotals.Received)
        {
            throw new ArgumentException(
                $"Tuition for {FormatMonthYear(request.Month, request.Year)} already has payments recorded ({periodTotals.Received:N0}). " +
                "The charge cannot be less than that. Void the receipt first if you need to lower it.");
        }

        var typeName = await _context.FundTypes
            .AsNoTracking()
            .Where(x => x.ID == TuitionFundTypeId)
            .Select(x => x.FundTypeName)
            .FirstOrDefaultAsync(cancellationToken);

        typeName ??= "Tuition Fee";

        var now = PakistanTime.Now;
        await UpsertTuitionAsync(
            student.Reg_Id,
            student.ClassCompositeID ?? 0,
            student.BranchID ?? 1,
            request.Month,
            request.Year,
            amount,
            typeName,
            now,
            cancellationToken);

        var periodLabel = FormatMonthYear(request.Month, request.Year);
        await _activityLogService.WriteAsync(
            ActivityLogTypes.FeeGenerateSingle,
            ActivityLogEntityTypes.Student,
            student.Reg_Id,
            student.FullName,
            userId,
            new
            {
                source = "fee-generate-single",
                month = request.Month,
                year = request.Year,
                period = periodLabel,
                amount,
                usedStoredTuition = request.Amount == -1
            },
            cancellationToken);
        await _context.SaveChangesAsync(cancellationToken);
    }

    public async Task<FeeGenerateStudentPeriodDto> GetStudentPeriodAsync(
        int studentId,
        int month,
        int year,
        CancellationToken cancellationToken = default)
    {
        ValidateMonthYear(month, year);

        if (studentId <= 0)
            throw new ArgumentException("Student is required.");

        var exists = await _context.Students
            .AsNoTracking()
            .AnyAsync(x => x.Reg_Id == studentId, cancellationToken);
        if (!exists)
            throw new KeyNotFoundException("Student not found.");

        var totals = await GetTuitionPeriodTotalsAsync(studentId, month, year, cancellationToken);
        return new FeeGenerateStudentPeriodDto
        {
            Generated = totals.Generated,
            Received = totals.Received
        };
    }

    private async Task<(decimal Generated, decimal Received)> GetTuitionPeriodTotalsAsync(
        int studentId,
        int month,
        int year,
        CancellationToken cancellationToken)
    {
        var aggregates = await _context.FeeAndFundCollections
            .AsNoTracking()
            .Where(x => (x.VoidAmount ?? 0) == 0)
            .Where(x =>
                x.StudentID == studentId
                && x.FundTypeID == TuitionFundTypeId
                && x.Month == month
                && x.Year == year)
            .GroupBy(_ => 1)
            .Select(g => new
            {
                Generated = g.Sum(x => x.Payment ?? 0),
                Received = g.Sum(x => x.Recieved ?? 0)
            })
            .FirstOrDefaultAsync(cancellationToken);

        return aggregates is null
            ? (0, 0)
            : (aggregates.Generated, aggregates.Received);
    }

    private async Task UpsertTuitionAsync(
        int studentId,
        int classCompositeId,
        int branchId,
        int month,
        int year,
        decimal amount,
        string typeName,
        DateTime now,
        CancellationToken cancellationToken)
    {
        // Match the month's tuition charge row (Payment may be 0). Exclude receive rows (Recieved > 0).
        var existing = await _context.FeeAndFundCollections
            .FirstOrDefaultAsync(
                x => x.StudentID == studentId
                     && x.FundTypeID == TuitionFundTypeId
                     && x.Month == month
                     && x.Year == year
                     && (x.Recieved ?? 0) == 0
                     && (x.Discount ?? 0) == 0,
                cancellationToken);

        if (existing is null)
        {
            _context.FeeAndFundCollections.Add(new FeeAndFundCollection
            {
                StudentID = studentId,
                ClassID = classCompositeId,
                FundTypeID = TuitionFundTypeId,
                Type = typeName,
                Month = month,
                Year = year,
                Date = now.Date,
                Payment = amount,
                Recieved = 0,
                Discount = 0,
                VoidAmount = 0,
                BranchID = branchId,
                SessionYear = year.ToString(CultureInfo.InvariantCulture)
            });
        }
        else
        {
            existing.Payment = amount;
            existing.Type = typeName;
            existing.ClassID = classCompositeId;
        }
    }

    private static void ValidateMonthYear(int month, int year)
    {
        if (month is < 1 or > 12)
            throw new ArgumentException("Month must be between 1 and 12.");
        if (year < 2000 || year > 2100)
            throw new ArgumentException("Year is invalid.");
    }

    private static string FormatMonthYear(int month, int year)
    {
        var monthName = CultureInfo.InvariantCulture.DateTimeFormat.GetMonthName(month);
        return $"{monthName} {year}";
    }
}
