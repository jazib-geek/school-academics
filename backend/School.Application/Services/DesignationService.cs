using Microsoft.EntityFrameworkCore;
using School.Application.DTOs;
using School.Application.Interfaces;
using School.Infrastructure.Data;
using School.Infrastructure.Entities;
using System.Globalization;

namespace School.Application.Services;

public class DesignationService : IDesignationService
{
    private static readonly DateTime LegacyTimeDate = new(2020, 1, 1);
    private readonly AppDbContext _context;

    public DesignationService(AppDbContext context) => _context = context;

    public async Task<IReadOnlyList<DesignationDto>> GetDesignationsAsync(CancellationToken cancellationToken = default)
    {
        var rows = await _context.Designations
            .AsNoTracking()
            .OrderBy(x => x.DesignationName)
            .ThenBy(x => x.ID)
            .ToListAsync(cancellationToken);

        var ids = rows.Select(x => x.ID).ToList();
        var employeeCounts = await _context.Employees
            .AsNoTracking()
            .Where(x => x.DesignationID.HasValue && ids.Contains(x.DesignationID.Value))
            .GroupBy(x => x.DesignationID!.Value)
            .Select(x => new { DesignationId = x.Key, Count = x.Count() })
            .ToDictionaryAsync(x => x.DesignationId, x => x.Count, cancellationToken);

        return rows.Select(x => Map(x, employeeCounts.GetValueOrDefault(x.ID))).ToList();
    }

    public async Task<DesignationDto> GetDesignationAsync(int id, CancellationToken cancellationToken = default)
    {
        var designation = await _context.Designations
            .AsNoTracking()
            .Where(x => x.ID == id)
            .FirstOrDefaultAsync(cancellationToken)
            ?? throw new KeyNotFoundException("Designation not found.");

        var employeeCount = await _context.Employees.AsNoTracking()
            .CountAsync(x => x.DesignationID == id, cancellationToken);

        return Map(designation, employeeCount);
    }

    public async Task<DesignationDto> CreateDesignationAsync(
        DesignationUpsertDto request,
        CancellationToken cancellationToken = default)
    {
        await ValidateRequestAsync(request, null, cancellationToken);

        var designation = new Designation();
        Apply(request, designation);
        _context.Designations.Add(designation);
        await _context.SaveChangesAsync(cancellationToken);

        return await GetDesignationAsync(designation.ID, cancellationToken);
    }

    public async Task<DesignationDto> UpdateDesignationAsync(
        int id,
        DesignationUpsertDto request,
        CancellationToken cancellationToken = default)
    {
        var designation = await _context.Designations
            .FirstOrDefaultAsync(x => x.ID == id, cancellationToken)
            ?? throw new KeyNotFoundException("Designation not found.");

        await ValidateRequestAsync(request, id, cancellationToken);
        Apply(request, designation);
        await _context.SaveChangesAsync(cancellationToken);

        return await GetDesignationAsync(id, cancellationToken);
    }

    public async Task SetDesignationStatusAsync(
        int id,
        bool isActive,
        CancellationToken cancellationToken = default)
    {
        var designation = await _context.Designations
            .FirstOrDefaultAsync(x => x.ID == id, cancellationToken)
            ?? throw new KeyNotFoundException("Designation not found.");

        designation.IsActive = isActive;
        await _context.SaveChangesAsync(cancellationToken);
    }

    public async Task DeleteDesignationAsync(int id, CancellationToken cancellationToken = default)
    {
        var designation = await _context.Designations
            .Include(x => x.Employees)
            .FirstOrDefaultAsync(x => x.ID == id, cancellationToken)
            ?? throw new KeyNotFoundException("Designation not found.");

        if (designation.Employees.Count > 0)
        {
            throw new InvalidOperationException("Designation is assigned to employees and cannot be deleted.");
        }

        _context.Designations.Remove(designation);
        await _context.SaveChangesAsync(cancellationToken);
    }

    private async Task ValidateRequestAsync(
        DesignationUpsertDto request,
        int? designationId,
        CancellationToken cancellationToken)
    {
        request.Name = (request.Name ?? string.Empty).Trim();
        request.MustCheckinTime = Clean(request.MustCheckinTime);
        request.LeavingTime = Clean(request.LeavingTime);

        if (request.Name.Length == 0)
            throw new ArgumentException("Designation name is required.");

        if (request.MustCheckinMinutesDifference is < 0 or > 1440)
            throw new ArgumentException("Check-in minutes difference must be between 0 and 1440.");

        if (!TryParseTime(request.MustCheckinTime, out _) && request.MustCheckinTime != null)
            throw new ArgumentException("Check-in time must use HH:mm format.");

        if (!TryParseTime(request.LeavingTime, out _) && request.LeavingTime != null)
            throw new ArgumentException("Checkout time must use HH:mm format.");

        var exists = await _context.Designations.AsNoTracking()
            .AnyAsync(x =>
                x.ID != designationId &&
                x.DesignationName != null &&
                x.DesignationName == request.Name,
                cancellationToken);

        if (exists)
            throw new InvalidOperationException("A designation with this name already exists.");
    }

    private static void Apply(DesignationUpsertDto source, Designation target)
    {
        target.DesignationName = source.Name.Trim();
        target.MustCheckinMinutesDifference = source.MustCheckinMinutesDifference;
        target.IsActive = source.IsActive ?? true;
        target.MustCheckinTime = ToLegacyDateTime(source.MustCheckinTime);
        target.LeavingTime = ToLegacyDateTime(source.LeavingTime);
    }

    private static DateTime? ToLegacyDateTime(string? value) =>
        TryParseTime(value, out var time) ? LegacyTimeDate.Add(time) : null;

    private static bool TryParseTime(string? value, out TimeSpan time)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            time = default;
            return false;
        }

        return TimeSpan.TryParseExact(value.Trim(), "hh\\:mm", CultureInfo.InvariantCulture, out time);
    }

    private static string? FormatTimeInput(DateTime? value) =>
        value.HasValue ? value.Value.ToString("HH:mm", CultureInfo.InvariantCulture) : null;

    private static DesignationDto Map(Designation designation, int employeeCount) => new()
    {
        ID = designation.ID,
        Name = designation.DesignationName ?? string.Empty,
        MustCheckinMinutesDifference = designation.MustCheckinMinutesDifference,
        IsActive = designation.IsActive != false,
        MustCheckinTime = FormatTimeInput(designation.MustCheckinTime),
        LeavingTime = FormatTimeInput(designation.LeavingTime),
        EmployeeCount = employeeCount,
    };

    private static string? Clean(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
