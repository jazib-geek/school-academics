using Microsoft.EntityFrameworkCore;
using School.Application.DTOs;
using School.Application.Interfaces;
using School.Infrastructure.Data;
using School.Infrastructure.Entities;

namespace School.Application.Services;

public class LocalityService : ILocalityService
{
    private readonly AppDbContext _context;

    public LocalityService(AppDbContext context) => _context = context;

    public async Task<IReadOnlyList<LocalityDto>> GetLocalitiesAsync(CancellationToken cancellationToken = default)
    {
        var rows = await _context.Localities
            .AsNoTracking()
            .OrderBy(x => x.Town)
            .ThenBy(x => x.ID)
            .ToListAsync(cancellationToken);

        return rows.Select(Map).ToList();
    }

    public async Task<LocalityDto> GetLocalityAsync(int id, CancellationToken cancellationToken = default)
    {
        var row = await _context.Localities
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.ID == id, cancellationToken)
            ?? throw new KeyNotFoundException("Locality not found.");

        return Map(row);
    }

    public async Task<LocalityDto> CreateLocalityAsync(
        LocalityUpsertDto request,
        CancellationToken cancellationToken = default)
    {
        var town = NormalizeTown(request.Town);
        await EnsureTownAvailableAsync(town, null, cancellationToken);

        var entity = new Locality
        {
            Town = town,
            IsActive = request.IsActive
        };
        _context.Localities.Add(entity);
        await _context.SaveChangesAsync(cancellationToken);
        return await GetLocalityAsync(entity.ID, cancellationToken);
    }

    public async Task<LocalityDto> UpdateLocalityAsync(
        int id,
        LocalityUpsertDto request,
        CancellationToken cancellationToken = default)
    {
        var entity = await _context.Localities
            .FirstOrDefaultAsync(x => x.ID == id, cancellationToken)
            ?? throw new KeyNotFoundException("Locality not found.");

        var town = NormalizeTown(request.Town);
        await EnsureTownAvailableAsync(town, id, cancellationToken);

        entity.Town = town;
        entity.IsActive = request.IsActive;
        await _context.SaveChangesAsync(cancellationToken);
        return await GetLocalityAsync(id, cancellationToken);
    }

    public async Task SetLocalityStatusAsync(int id, bool isActive, CancellationToken cancellationToken = default)
    {
        var entity = await _context.Localities
            .FirstOrDefaultAsync(x => x.ID == id, cancellationToken)
            ?? throw new KeyNotFoundException("Locality not found.");

        entity.IsActive = isActive;
        await _context.SaveChangesAsync(cancellationToken);
    }

    private async Task EnsureTownAvailableAsync(string town, int? excludingId, CancellationToken cancellationToken)
    {
        var taken = await _context.Localities.AsNoTracking()
            .AnyAsync(
                x => x.Town == town && (!excludingId.HasValue || x.ID != excludingId.Value),
                cancellationToken);

        if (taken)
            throw new InvalidOperationException("A locality with this name already exists.");
    }

    private static string NormalizeTown(string? town)
    {
        var value = (town ?? string.Empty).Trim();
        if (value.Length == 0)
            throw new ArgumentException("Town name is required.");
        return value;
    }

    private static LocalityDto Map(Locality row) => new()
    {
        Id = row.ID,
        Town = row.Town ?? string.Empty,
        IsActive = row.IsActive == true
    };
}
