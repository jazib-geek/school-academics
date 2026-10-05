using Microsoft.EntityFrameworkCore;
using School.Application.DTOs;
using School.Application.Interfaces;
using School.Infrastructure.Data;

namespace School.Application.Services;

public class FeeReminderNoticeService : IFeeReminderNoticeService
{
    private readonly AppDbContext _context;

    public FeeReminderNoticeService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<List<FeeReminderNoticeTemplateDto>> GetTemplatesAsync()
    {
        return await _context.FeeReminderNoticeTemplates
            .AsNoTracking()
            .Where(x => x.IsActive)
            .OrderBy(x => x.SortOrder)
            .Select(x => new FeeReminderNoticeTemplateDto
            {
                Id = x.Id,
                Code = x.Code,
                Title = x.Title,
                Greeting = x.Greeting,
                BodyText = x.BodyText,
                ClosingText = x.ClosingText,
                DayOfMonth = x.DayOfMonth,
                SortOrder = x.SortOrder,
            })
            .ToListAsync();
    }

    public async Task<FeeReminderNoticeTemplateDto?> UpdateTemplateAsync(string code, FeeReminderNoticeTemplateUpdateDto dto)
    {
        var normalized = (code ?? string.Empty).Trim();
        if (string.IsNullOrEmpty(normalized))
            return null;

        var entity = await _context.FeeReminderNoticeTemplates
            .FirstOrDefaultAsync(x => x.Code == normalized && x.IsActive);
        if (entity is null)
            return null;

        entity.Title = (dto.Title ?? string.Empty).Trim();
        entity.Greeting = (dto.Greeting ?? string.Empty).Trim();
        entity.BodyText = (dto.BodyText ?? string.Empty).Trim();
        entity.ClosingText = (dto.ClosingText ?? string.Empty).Trim();
        entity.DayOfMonth = dto.DayOfMonth;

        await _context.SaveChangesAsync();

        return new FeeReminderNoticeTemplateDto
        {
            Id = entity.Id,
            Code = entity.Code,
            Title = entity.Title,
            Greeting = entity.Greeting,
            BodyText = entity.BodyText,
            ClosingText = entity.ClosingText,
            DayOfMonth = entity.DayOfMonth,
            SortOrder = entity.SortOrder,
        };
    }

    public async Task<FeeReminderClassBalancesDto> GetClassBalancesAsync(string className)
    {
        var filter = (className ?? string.Empty).Trim();
        if (string.IsNullOrEmpty(filter))
        {
            return new FeeReminderClassBalancesDto { ClassName = filter, Items = [] };
        }

        var students = await _context.Students
            .AsNoTracking()
            .Where(x => x.IsActive == true && x.Section != null && x.Section.ClassName == filter)
            .OrderBy(x => x.FullName)
            .Select(x => new
            {
                x.Reg_Id,
                StudentName = x.FullName ?? "N/A",
                ClassName = x.Section != null ? x.Section.ClassName : null,
            })
            .ToListAsync();

        if (students.Count == 0)
        {
            return new FeeReminderClassBalancesDto { ClassName = filter, Items = [] };
        }

        var studentIds = students.Select(x => x.Reg_Id).ToList();

        var ledgerRows = await _context.FeeAndFundCollections
            .AsNoTracking()
            .Where(x => (x.VoidAmount ?? 0) == 0)
            .Where(x => x.StudentID != null && studentIds.Contains(x.StudentID.Value))
            .Where(x => x.FundTypeID != null)
            .GroupBy(x => new { StudentId = x.StudentID!.Value, FundTypeId = x.FundTypeID!.Value })
            .Select(g => new
            {
                g.Key.StudentId,
                g.Key.FundTypeId,
                Net = g.Sum(x => (x.Payment ?? 0) - ((x.Recieved ?? 0) + (x.Discount ?? 0))),
            })
            .ToListAsync();

        var byStudent = ledgerRows
            .GroupBy(x => x.StudentId)
            .ToDictionary(g => g.Key, g => g.ToList());

        var items = students.Select(student =>
        {
            byStudent.TryGetValue(student.Reg_Id, out var funds);
            funds ??= [];

            decimal tuition = 0;
            decimal fundsTotal = 0;
            foreach (var row in funds)
            {
                if (row.FundTypeId == 1)
                    tuition += row.Net;
                else if (row.FundTypeId > 1)
                    fundsTotal += row.Net;
            }

            return new FeeReminderClassBalanceItemDto
            {
                StudentId = student.Reg_Id,
                StudentName = student.StudentName,
                ClassName = student.ClassName,
                TuitionBalance = tuition,
                FundsBalance = fundsTotal,
            };
        })
        .Where(x => x.TuitionBalance != 0 || x.FundsBalance != 0)
        .ToList();

        return new FeeReminderClassBalancesDto
        {
            ClassName = filter,
            Items = items,
        };
    }
}
