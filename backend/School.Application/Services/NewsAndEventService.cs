using Microsoft.EntityFrameworkCore;
using School.Application.DTOs;
using School.Application.Interfaces;
using School.Infrastructure.Data;
using School.Infrastructure.Entities;

namespace School.Application.Services;

public class NewsAndEventService : INewsAndEventService
{
    private readonly AppDbContext _context;

    public NewsAndEventService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<List<NewsAndEventDto>> GetActiveAsync(bool onlyHome = false)
    {
        var query = _context.NewsAndEvents
            .Where(x => x.IsActive == true && x.Type == "Announcement");

        if (onlyHome)
        {
            query = query.Where(x => x.ShowOnHome == true);
        }

        return await query
            .OrderByDescending(x => x.Date)
            .Select(x => new NewsAndEventDto
            {
                Id = x.ID,
                Date = x.Date,
                Title = x.Title,
                Type = x.Type,
                Description = x.Description,
                ImagePath = x.ImagePath,
                ShowOnHome = x.ShowOnHome
            })
            .ToListAsync();
    }

    public async Task<IReadOnlyList<NewsAndEventManageDto>> GetManageListAsync(CancellationToken cancellationToken = default)
    {
        return await _context.NewsAndEvents
            .AsNoTracking()
            .OrderByDescending(x => x.Date)
            .ThenByDescending(x => x.ID)
            .Select(x => Map(x))
            .ToListAsync(cancellationToken);
    }

    public async Task<NewsAndEventManageDto> GetByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        var row = await _context.NewsAndEvents.AsNoTracking()
            .FirstOrDefaultAsync(x => x.ID == id, cancellationToken)
            ?? throw new KeyNotFoundException("Announcement not found.");

        return Map(row);
    }

    public async Task<NewsAndEventManageDto> CreateAsync(
        UpsertNewsAndEventRequestDto request,
        CancellationToken cancellationToken = default)
    {
        Validate(request);

        var entity = new NewsAndEvent
        {
            Date = request.Date ?? DateTime.Today,
            Title = request.Title.Trim(),
            Type = NormalizeType(request.Type),
            Description = request.Description,
            ImagePath = NullIfWhiteSpace(request.ImagePath),
            IsActive = request.IsActive,
            ShowOnHome = request.ShowOnHome
        };

        _context.NewsAndEvents.Add(entity);
        await _context.SaveChangesAsync(cancellationToken);
        return Map(entity);
    }

    public async Task<NewsAndEventManageDto> UpdateAsync(
        int id,
        UpsertNewsAndEventRequestDto request,
        CancellationToken cancellationToken = default)
    {
        Validate(request);

        var entity = await _context.NewsAndEvents
            .FirstOrDefaultAsync(x => x.ID == id, cancellationToken)
            ?? throw new KeyNotFoundException("Announcement not found.");

        entity.Date = request.Date ?? entity.Date ?? DateTime.Today;
        entity.Title = request.Title.Trim();
        entity.Type = NormalizeType(request.Type);
        entity.Description = request.Description;
        entity.ImagePath = NullIfWhiteSpace(request.ImagePath);
        entity.IsActive = request.IsActive;
        entity.ShowOnHome = request.ShowOnHome;

        await _context.SaveChangesAsync(cancellationToken);
        return Map(entity);
    }

    public async Task SetActiveAsync(int id, bool isActive, CancellationToken cancellationToken = default)
    {
        var entity = await _context.NewsAndEvents
            .FirstOrDefaultAsync(x => x.ID == id, cancellationToken)
            ?? throw new KeyNotFoundException("Announcement not found.");

        entity.IsActive = isActive;
        await _context.SaveChangesAsync(cancellationToken);
    }

    private static void Validate(UpsertNewsAndEventRequestDto request)
    {
        if (string.IsNullOrWhiteSpace(request.Title))
            throw new ArgumentException("Title is required.");
    }

    private static string NormalizeType(string? type)
    {
        var value = string.IsNullOrWhiteSpace(type) ? "Announcement" : type.Trim();
        return value.Length > 150 ? value[..150] : value;
    }

    private static string? NullIfWhiteSpace(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static NewsAndEventManageDto Map(NewsAndEvent x) => new()
    {
        Id = x.ID,
        Date = x.Date,
        Title = x.Title,
        Type = x.Type,
        Description = x.Description,
        ImagePath = x.ImagePath,
        IsActive = x.IsActive == true,
        ShowOnHome = x.ShowOnHome == true
    };
}
