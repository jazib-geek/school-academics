using Microsoft.EntityFrameworkCore;
using School.Application.DTOs;
using School.Application.Interfaces;
using School.Infrastructure.Data;
using System.Globalization;
namespace School.Application.Services;

public class StudentLedgerService : IStudentLedgerService
{
    private readonly AppDbContext _context;

    public StudentLedgerService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<List<StudentLedgerDto>> GetStudentLedgerAsync(int studentId)
    {
        var dbName = _context.Database.GetDbConnection().Database;
        Console.WriteLine($"Connected DB: {dbName}");

        var entries = await _context.FeeAndFundCollections
      .Where(x => x.StudentID == studentId)
      .OrderBy(x => x.Date)
      .ThenBy(x => x.ID)
      .Select(x => new
      {
          x.ID,
          x.Date,
          x.FundTypeID,
          x.Month,
          x.Year,
          FundTypeName = x.FundType != null
              ? x.FundType.FundTypeName
              : "N/A",

          Payment = x.Payment ?? 0,
          Credit = (x.Recieved ?? 0) + (x.Discount ?? 0)
      })
      .ToListAsync();

        decimal runningBalance = 0;
        var ledger = new List<StudentLedgerDto>();

        foreach (var entry in entries)
        {
            runningBalance += entry.Payment;
            runningBalance -= entry.Credit;

            string? description = entry.FundTypeName;

            // If TuitionFee (FundTypeID == 1) and Month/Year exist
            if (entry.FundTypeID.HasValue && entry.FundTypeID == 1 && entry.Month.HasValue && entry.Year.HasValue)
            {
                var date = new DateTime(entry.Year.Value, entry.Month.Value, 1);
                description = $"{entry.FundTypeName} - {date.ToString("MMMM yyyy", CultureInfo.InvariantCulture)}";
            }

            ledger.Add(new StudentLedgerDto
            {
                Id = entry.ID,
                Date = entry.Date,
                Description = description,
                Debit = entry.Payment,
                Credit = entry.Credit,
                Balance = runningBalance
            });
        }

        return ledger;
    }
}
