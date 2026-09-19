using Microsoft.EntityFrameworkCore;
using School.Application.DTOs;
using School.Application.Interfaces;
using School.Infrastructure.Data;
using School.Infrastructure.Entities;

namespace School.Application.Services;

public class CampusPayrollSettingsService : ICampusPayrollSettingsService
{
    private readonly AppDbContext _context;

    public CampusPayrollSettingsService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<CampusPayrollSettingsDto> GetAsync(CancellationToken cancellationToken = default)
    {
        var row = await EnsureRowAsync(cancellationToken);
        return new CampusPayrollSettingsDto { TeaAllowance = row.TeaAllowance };
    }

    public async Task<CampusPayrollSettingsDto> UpdateAsync(
        UpdateCampusPayrollSettingsDto request,
        CancellationToken cancellationToken = default)
    {
        if (request.TeaAllowance < 0)
            throw new ArgumentException("Tea allowance cannot be negative.");

        var row = await EnsureRowAsync(cancellationToken);
        row.TeaAllowance = Math.Round(request.TeaAllowance, 2);
        await _context.SaveChangesAsync(cancellationToken);
        return new CampusPayrollSettingsDto { TeaAllowance = row.TeaAllowance };
    }

    private async Task<CampusPayrollSettings> EnsureRowAsync(CancellationToken cancellationToken)
    {
        var row = await _context.CampusPayrollSettings
            .OrderBy(x => x.ID)
            .FirstOrDefaultAsync(cancellationToken);

        if (row != null)
            return row;

        row = new CampusPayrollSettings { TeaAllowance = 0 };
        _context.CampusPayrollSettings.Add(row);
        await _context.SaveChangesAsync(cancellationToken);
        return row;
    }
}