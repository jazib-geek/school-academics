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
          x.RcptID,
          x.ManualRcptNo,
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

            string? feeMonth = null;
            if (entry.Month.HasValue && entry.Year.HasValue && entry.Month is >= 1 and <= 12)
            {
                var date = new DateTime(entry.Year.Value, entry.Month.Value, 1);
                feeMonth = date.ToString("MMMM yyyy", CultureInfo.InvariantCulture);
            }

            string? description = entry.FundTypeName;
            if (entry.FundTypeID.HasValue && entry.FundTypeID == 1 && feeMonth != null)
            {
                description = $"{entry.FundTypeName} - {feeMonth}";
            }

            string? receiptNo = null;
            if (!string.IsNullOrWhiteSpace(entry.ManualRcptNo))
                receiptNo = entry.ManualRcptNo.Trim();
            else if (entry.RcptID.HasValue && entry.RcptID.Value > 0)
                receiptNo = entry.RcptID.Value.ToString(CultureInfo.InvariantCulture);

            ledger.Add(new StudentLedgerDto
            {
                Id = entry.ID,
                Date = entry.Date,
                Description = description,
                FundTypeName = entry.FundTypeName,
                FeeMonth = feeMonth,
                ReceiptNo = receiptNo,
                Debit = entry.Payment,
                Credit = entry.Credit,
                Balance = runningBalance
            });
        }

        return ledger;
    }
}
