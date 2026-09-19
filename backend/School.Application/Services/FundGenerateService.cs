using System.Globalization;
using Microsoft.EntityFrameworkCore;
using School.Application.Common;
using School.Application.DTOs;
using School.Application.Interfaces;
using School.Infrastructure.Data;
using School.Infrastructure.Entities;

namespace School.Application.Services;

public class FundGenerateService : IFundGenerateService
{
    private static readonly int[] AnnualFundTypeIds = [2, 3, 4, 5];

    private readonly AppDbContext _context;

    public FundGenerateService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<StudentFundAmountsDto> GetStudentFundsAsync(
        int studentId,
        CancellationToken cancellationToken = default)
    {
        if (studentId <= 0)
            throw new ArgumentException("Student is required.");

        var exists = await _context.Students
            .AsNoTracking()
            .AnyAsync(x => x.Reg_Id == studentId, cancellationToken);

        if (!exists)
            throw new KeyNotFoundException("Student not found.");

        var typeNames = await _context.FundTypes
            .AsNoTracking()
            .Where(x => AnnualFundTypeIds.Contains(x.ID))
            .OrderBy(x => x.ID)
            .Select(x => new { x.ID, Name = x.FundTypeName ?? $"Fund {x.ID}" })
            .ToListAsync(cancellationToken);

        var rows = await _context.FeeAndFundCollections
            .AsNoTracking()
            .Where(x => x.StudentID == studentId
                        && x.FundTypeID != null
                        && AnnualFundTypeIds.Contains(x.FundTypeID.Value)
                        && x.Payment > 0)
            .ToListAsync(cancellationToken);

        var amounts = typeNames.Select(t =>
        {
            var row = rows.FirstOrDefault(r => r.FundTypeID == t.ID);
            return new FundAmountItemDto
            {
                FundTypeId = t.ID,
                Name = t.Name,
                Amount = row?.Payment ?? 0
            };
        }).ToList();

        return new StudentFundAmountsDto
        {
            StudentId = studentId,
            Amounts = amounts
        };
    }

    public async Task GenerateForStudentAsync(
        GenerateFundStudentRequestDto request,
        CancellationToken cancellationToken = default)
    {
        if (request.StudentId <= 0)
            throw new ArgumentException("Student is required.");

        var student = await _context.Students
            .FirstOrDefaultAsync(x => x.Reg_Id == request.StudentId, cancellationToken)
            ?? throw new KeyNotFoundException("Student not found.");

        var items = (request.Amounts ?? [])
            .Where(x => AnnualFundTypeIds.Contains(x.FundTypeId))
            .ToList();

        if (items.Count == 0)
            throw new ArgumentException("Enter at least one fund amount.");

        var typeNames = await LoadTypeNamesAsync(cancellationToken);
        var now = PakistanTime.Now;
        var year = now.Year;

        foreach (var item in items)
        {
            if (item.Amount < 0)
                throw new ArgumentException("Fund amounts cannot be negative.");

            typeNames.TryGetValue(item.FundTypeId, out var typeName);
            typeName ??= $"Fund {item.FundTypeId}";

            await UpsertAnnualFundAsync(
                student.Reg_Id,
                student.ClassCompositeID ?? 0,
                student.BranchID ?? 1,
                item.FundTypeId,
                item.Amount,
                typeName,
                year,
                now,
                cancellationToken);
        }

        await _context.SaveChangesAsync(cancellationToken);
    }

    public async Task GenerateBulkAsync(
        GenerateFundBulkRequestDto request,
        CancellationToken cancellationToken = default)
    {
        if (!AnnualFundTypeIds.Contains(request.FundTypeId))
            throw new ArgumentException("Select a valid fund type.");

        if (request.Amount < 0)
            throw new ArgumentException("Amount cannot be negative.");

        var typeName = await _context.FundTypes
            .AsNoTracking()
            .Where(x => x.ID == request.FundTypeId)
            .Select(x => x.FundTypeName)
            .FirstOrDefaultAsync(cancellationToken);

        typeName ??= $"Fund {request.FundTypeId}";

        var query = _context.Students.Where(x => x.IsActive == true);
        if (request.ClassCompositeId is > 0)
        {
            query = query.Where(x => x.ClassCompositeID == request.ClassCompositeId.Value);
        }

        var students = await query
            .Select(x => new
            {
                x.Reg_Id,
                ClassId = x.ClassCompositeID ?? 0,
                BranchId = x.BranchID ?? 1
            })
            .ToListAsync(cancellationToken);

        if (students.Count == 0)
            throw new ArgumentException("No active students found for this selection.");

        var now = PakistanTime.Now;
        var year = now.Year;

        foreach (var student in students)
        {
            await UpsertAnnualFundAsync(
                student.Reg_Id,
                student.ClassId,
                student.BranchId,
                request.FundTypeId,
                request.Amount,
                typeName,
                year,
                now,
                cancellationToken);
        }

        await _context.SaveChangesAsync(cancellationToken);
    }

    private async Task<Dictionary<int, string>> LoadTypeNamesAsync(CancellationToken cancellationToken)
    {
        return await _context.FundTypes
            .AsNoTracking()
            .Where(x => AnnualFundTypeIds.Contains(x.ID))
            .ToDictionaryAsync(
                x => x.ID,
                x => x.FundTypeName ?? $"Fund {x.ID}",
                cancellationToken);
    }

    private async Task UpsertAnnualFundAsync(
        int studentId,
        int classCompositeId,
        int branchId,
        int fundTypeId,
        decimal amount,
        string typeName,
        int year,
        DateTime now,
        CancellationToken cancellationToken)
    {
        // Legacy: match Payment > 0 OR (Payment + Recieved == 0)
        var existing = await _context.FeeAndFundCollections
            .FirstOrDefaultAsync(
                x => x.StudentID == studentId
                     && x.FundTypeID == fundTypeId
                     && (x.Payment > 0 || (x.Payment ?? 0) + (x.Recieved ?? 0) == 0),
                cancellationToken);

        if (existing is null)
        {
            _context.FeeAndFundCollections.Add(new FeeAndFundCollection
            {
                StudentID = studentId,
                ClassID = classCompositeId,
                FundTypeID = fundTypeId,
                Type = typeName,
                Month = 0,
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
            existing.Date = now.Date;
            existing.Month = 0;
            existing.Year = year;
        }
    }
}
