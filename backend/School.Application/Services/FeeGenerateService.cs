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

    public FeeGenerateService(AppDbContext context)
    {
        _context = context;
    }

    public async Task GenerateForAllAsync(
        GenerateFeeAllRequestDto request,
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
    }

    public async Task GenerateForStudentAsync(
        GenerateFeeStudentRequestDto request,
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

        await _context.SaveChangesAsync(cancellationToken);
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
}
