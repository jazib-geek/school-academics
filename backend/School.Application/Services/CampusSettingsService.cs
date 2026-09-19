using Microsoft.EntityFrameworkCore;
using School.Application.DTOs;
using School.Application.Interfaces;
using School.Infrastructure.Data;
using School.Infrastructure.Entities;

namespace School.Application.Services;

public class CampusSettingsService : ICampusSettingsService
{
    private readonly AppDbContext _context;

    public CampusSettingsService(AppDbContext context) => _context = context;

    public async Task<IReadOnlyList<CampusClassDto>> GetClassesAsync(CancellationToken cancellationToken = default)
    {
        var rows = await _context.Classes.AsNoTracking()
            .OrderBy(x => x.sort_by ?? int.MaxValue)
            .ThenBy(x => x.Class_Name)
            .ToListAsync(cancellationToken);
        return rows.Select(MapClass).ToList();
    }

    public async Task<CampusClassDto> CreateClassAsync(CampusClassUpsertDto request, CancellationToken cancellationToken = default)
    {
        var name = RequireName(request.Name, "Class name");
        await EnsureClassNameAvailableAsync(name, null, cancellationToken);
        var entity = new Class
        {
            Class_Name = name,
            sort_by = request.SortBy,
            isHifz = request.IsHifz,
            IsActive = request.IsActive
        };
        _context.Classes.Add(entity);
        await _context.SaveChangesAsync(cancellationToken);
        return MapClass(entity);
    }

    public async Task<CampusClassDto> UpdateClassAsync(int id, CampusClassUpsertDto request, CancellationToken cancellationToken = default)
    {
        var entity = await _context.Classes.FirstOrDefaultAsync(x => x.Class_ID == id, cancellationToken)
            ?? throw new KeyNotFoundException("Class not found.");
        var name = RequireName(request.Name, "Class name");
        await EnsureClassNameAvailableAsync(name, id, cancellationToken);
        entity.Class_Name = name;
        entity.sort_by = request.SortBy;
        entity.isHifz = request.IsHifz;
        entity.IsActive = request.IsActive;
        await _context.SaveChangesAsync(cancellationToken);
        return MapClass(entity);
    }

    public async Task SetClassStatusAsync(int id, bool isActive, CancellationToken cancellationToken = default)
    {
        var entity = await _context.Classes.FirstOrDefaultAsync(x => x.Class_ID == id, cancellationToken)
            ?? throw new KeyNotFoundException("Class not found.");
        entity.IsActive = isActive;
        await _context.SaveChangesAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<SectionColorDto>> GetSectionColorsAsync(CancellationToken cancellationToken = default)
    {
        var rows = await _context.SectionColors.AsNoTracking()
            .OrderBy(x => x.Color)
            .ThenBy(x => x.ID)
            .ToListAsync(cancellationToken);
        return rows.Select(MapColor).ToList();
    }

    public async Task<SectionColorDto> CreateSectionColorAsync(SectionColorUpsertDto request, CancellationToken cancellationToken = default)
    {
        var name = RequireName(request.Name, "Section color");
        await EnsureColorNameAvailableAsync(name, null, cancellationToken);
        var entity = new SectionColor { Color = name, IsActive = request.IsActive };
        _context.SectionColors.Add(entity);
        await _context.SaveChangesAsync(cancellationToken);
        return MapColor(entity);
    }

    public async Task<SectionColorDto> UpdateSectionColorAsync(int id, SectionColorUpsertDto request, CancellationToken cancellationToken = default)
    {
        var entity = await _context.SectionColors.FirstOrDefaultAsync(x => x.ID == id, cancellationToken)
            ?? throw new KeyNotFoundException("Section color not found.");
        var name = RequireName(request.Name, "Section color");
        await EnsureColorNameAvailableAsync(name, id, cancellationToken);
        entity.Color = name;
        entity.IsActive = request.IsActive;
        await _context.SaveChangesAsync(cancellationToken);
        return MapColor(entity);
    }

    public async Task SetSectionColorStatusAsync(int id, bool isActive, CancellationToken cancellationToken = default)
    {
        var entity = await _context.SectionColors.FirstOrDefaultAsync(x => x.ID == id, cancellationToken)
            ?? throw new KeyNotFoundException("Section color not found.");
        entity.IsActive = isActive;
        await _context.SaveChangesAsync(cancellationToken);
    }

    public async Task DeleteSectionColorAsync(int id, CancellationToken cancellationToken = default)
    {
        var inUse = await _context.Sections.AsNoTracking().AnyAsync(x => x.SectionID == id, cancellationToken);
        if (inUse)
            throw new InvalidOperationException("This color is used by one or more sections and cannot be deleted.");

        var entity = await _context.SectionColors.FirstOrDefaultAsync(x => x.ID == id, cancellationToken)
            ?? throw new KeyNotFoundException("Section color not found.");
        _context.SectionColors.Remove(entity);
        await _context.SaveChangesAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<CampusSectionDto>> GetSectionsAsync(CancellationToken cancellationToken = default)
    {
        var sections = await _context.Sections.AsNoTracking().ToListAsync(cancellationToken);
        var classes = await _context.Classes.AsNoTracking().ToDictionaryAsync(x => x.Class_ID, cancellationToken);
        var colors = await _context.SectionColors.AsNoTracking().ToDictionaryAsync(x => x.ID, cancellationToken);
        var activeCounts = await _context.Students.AsNoTracking()
            .Where(x => x.IsActive == true && x.ClassCompositeID != null)
            .GroupBy(x => x.ClassCompositeID!.Value)
            .Select(g => new { Id = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.Id, x => x.Count, cancellationToken);

        return sections
            .OrderBy(x => x.Branch ?? "zzz")
            .ThenBy(x => x.Class_ID ?? int.MaxValue)
            .ThenBy(x => x.ClassName)
            .Select(row => MapSection(row, classes, colors, activeCounts))
            .ToList();
    }

    public async Task<CampusSectionDto> CreateSectionAsync(CampusSectionUpsertDto request, CancellationToken cancellationToken = default)
    {
        var (klass, color, display) = await ResolveSectionPartsAsync(request, cancellationToken);
        var entity = new Section
        {
            Class_ID = klass.Class_ID,
            SectionID = color.ID,
            ClassName = display,
            SectionName = display,
            Branch = CleanOptional(request.Branch),
            Section_Gender = CleanOptional(request.Gender),
            Fee = request.Fee,
            IsHifz = request.IsHifz,
            IsActive = request.IsActive
        };
        _context.Sections.Add(entity);
        await _context.SaveChangesAsync(cancellationToken);
        return (await GetSectionsAsync(cancellationToken)).First(x => x.Id == entity.ID);
    }

    public async Task<CampusSectionDto> UpdateSectionAsync(int id, CampusSectionUpsertDto request, CancellationToken cancellationToken = default)
    {
        var entity = await _context.Sections.FirstOrDefaultAsync(x => x.ID == id, cancellationToken)
            ?? throw new KeyNotFoundException("Section not found.");
        var (klass, color, display) = await ResolveSectionPartsAsync(request, cancellationToken);
        entity.Class_ID = klass.Class_ID;
        entity.SectionID = color.ID;
        entity.ClassName = display;
        entity.SectionName = display;
        entity.Branch = CleanOptional(request.Branch);
        entity.Section_Gender = CleanOptional(request.Gender);
        entity.Fee = request.Fee;
        entity.IsHifz = request.IsHifz;
        entity.IsActive = request.IsActive;
        await _context.SaveChangesAsync(cancellationToken);
        return (await GetSectionsAsync(cancellationToken)).First(x => x.Id == id);
    }

    public async Task SetSectionStatusAsync(int id, bool isActive, CancellationToken cancellationToken = default)
    {
        var entity = await _context.Sections.FirstOrDefaultAsync(x => x.ID == id, cancellationToken)
            ?? throw new KeyNotFoundException("Section not found.");
        entity.IsActive = isActive;
        await _context.SaveChangesAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<OccupationDto>> GetOccupationsAsync(CancellationToken cancellationToken = default)
    {
        var rows = await _context.Occupations.AsNoTracking()
            .OrderBy(x => x.OccupationName)
            .ThenBy(x => x.ID)
            .ToListAsync(cancellationToken);
        return rows.Select(MapOccupation).ToList();
    }

    public async Task<OccupationDto> CreateOccupationAsync(OccupationUpsertDto request, CancellationToken cancellationToken = default)
    {
        var name = RequireName(request.Name, "Occupation");
        await EnsureOccupationAvailableAsync(name, null, cancellationToken);
        var entity = new Occupation { OccupationName = name, IsActive = request.IsActive };
        _context.Occupations.Add(entity);
        await _context.SaveChangesAsync(cancellationToken);
        return MapOccupation(entity);
    }

    public async Task<OccupationDto> UpdateOccupationAsync(int id, OccupationUpsertDto request, CancellationToken cancellationToken = default)
    {
        var entity = await _context.Occupations.FirstOrDefaultAsync(x => x.ID == id, cancellationToken)
            ?? throw new KeyNotFoundException("Occupation not found.");
        var name = RequireName(request.Name, "Occupation");
        await EnsureOccupationAvailableAsync(name, id, cancellationToken);
        entity.OccupationName = name;
        entity.IsActive = request.IsActive;
        await _context.SaveChangesAsync(cancellationToken);
        return MapOccupation(entity);
    }

    public async Task SetOccupationStatusAsync(int id, bool isActive, CancellationToken cancellationToken = default)
    {
        var entity = await _context.Occupations.FirstOrDefaultAsync(x => x.ID == id, cancellationToken)
            ?? throw new KeyNotFoundException("Occupation not found.");
        entity.IsActive = isActive;
        await _context.SaveChangesAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<DegreeLookupDto>> GetDegreesAsync(CancellationToken cancellationToken = default)
    {
        var rows = await _context.DegreeParameters.AsNoTracking()
            .OrderBy(x => x.DegreeTitle)
            .ThenBy(x => x.ID)
            .ToListAsync(cancellationToken);
        return rows.Select(MapDegree).ToList();
    }

    public async Task<DegreeLookupDto> CreateDegreeAsync(DegreeLookupUpsertDto request, CancellationToken cancellationToken = default)
    {
        var name = RequireName(request.Name, "Degree");
        await EnsureDegreeAvailableAsync(name, null, cancellationToken);
        var entity = new DegreeParameter
        {
            DegreeTitle = name,
            Type = CleanOptional(request.Type),
            IsActive = request.IsActive
        };
        _context.DegreeParameters.Add(entity);
        await _context.SaveChangesAsync(cancellationToken);
        return MapDegree(entity);
    }

    public async Task<DegreeLookupDto> UpdateDegreeAsync(int id, DegreeLookupUpsertDto request, CancellationToken cancellationToken = default)
    {
        var entity = await _context.DegreeParameters.FirstOrDefaultAsync(x => x.ID == id, cancellationToken)
            ?? throw new KeyNotFoundException("Degree not found.");
        var name = RequireName(request.Name, "Degree");
        await EnsureDegreeAvailableAsync(name, id, cancellationToken);
        entity.DegreeTitle = name;
        entity.Type = CleanOptional(request.Type);
        entity.IsActive = request.IsActive;
        await _context.SaveChangesAsync(cancellationToken);
        return MapDegree(entity);
    }

    public async Task SetDegreeStatusAsync(int id, bool isActive, CancellationToken cancellationToken = default)
    {
        var entity = await _context.DegreeParameters.FirstOrDefaultAsync(x => x.ID == id, cancellationToken)
            ?? throw new KeyNotFoundException("Degree not found.");
        entity.IsActive = isActive;
        await _context.SaveChangesAsync(cancellationToken);
    }

    private async Task<(Class Klass, SectionColor Color, string Display)> ResolveSectionPartsAsync(
        CampusSectionUpsertDto request,
        CancellationToken cancellationToken)
    {
        var klass = await _context.Classes.AsNoTracking()
            .FirstOrDefaultAsync(x => x.Class_ID == request.ClassId, cancellationToken)
            ?? throw new ArgumentException("Please select a valid class.");
        var color = await _context.SectionColors.AsNoTracking()
            .FirstOrDefaultAsync(x => x.ID == request.ColorId, cancellationToken)
            ?? throw new ArgumentException("Please select a valid section color.");
        if (string.IsNullOrWhiteSpace(klass.Class_Name) || string.IsNullOrWhiteSpace(color.Color))
            throw new ArgumentException("Class and color names are required.");
        var display = $"{klass.Class_Name.Trim()}-{color.Color.Trim()}";
        return (klass, color, display);
    }

    private async Task EnsureClassNameAvailableAsync(string name, int? excludingId, CancellationToken cancellationToken)
    {
        var taken = await _context.Classes.AsNoTracking().AnyAsync(
            x => x.Class_Name == name && (!excludingId.HasValue || x.Class_ID != excludingId.Value),
            cancellationToken);
        if (taken) throw new InvalidOperationException("A class with this name already exists.");
    }

    private async Task EnsureColorNameAvailableAsync(string name, int? excludingId, CancellationToken cancellationToken)
    {
        var taken = await _context.SectionColors.AsNoTracking().AnyAsync(
            x => x.Color == name && (!excludingId.HasValue || x.ID != excludingId.Value),
            cancellationToken);
        if (taken) throw new InvalidOperationException("A section color with this name already exists.");
    }

    private async Task EnsureOccupationAvailableAsync(string name, int? excludingId, CancellationToken cancellationToken)
    {
        var taken = await _context.Occupations.AsNoTracking().AnyAsync(
            x => x.OccupationName == name && (!excludingId.HasValue || x.ID != excludingId.Value),
            cancellationToken);
        if (taken) throw new InvalidOperationException("An occupation with this name already exists.");
    }

    private async Task EnsureDegreeAvailableAsync(string name, int? excludingId, CancellationToken cancellationToken)
    {
        var taken = await _context.DegreeParameters.AsNoTracking().AnyAsync(
            x => x.DegreeTitle == name && (!excludingId.HasValue || x.ID != excludingId.Value),
            cancellationToken);
        if (taken) throw new InvalidOperationException("A degree with this name already exists.");
    }

    private static string RequireName(string? value, string label)
    {
        var name = (value ?? string.Empty).Trim();
        if (name.Length == 0) throw new ArgumentException($"{label} is required.");
        return name;
    }

    private static string? CleanOptional(string? value)
    {
        var trimmed = (value ?? string.Empty).Trim();
        return trimmed.Length == 0 ? null : trimmed;
    }

    private static CampusClassDto MapClass(Class row) => new()
    {
        Id = row.Class_ID,
        Name = row.Class_Name ?? string.Empty,
        SortBy = row.sort_by,
        IsHifz = row.isHifz == true,
        IsActive = row.IsActive != false
    };

    private static SectionColorDto MapColor(SectionColor row) => new()
    {
        Id = row.ID,
        Name = row.Color ?? string.Empty,
        IsActive = row.IsActive != false
    };

    private static OccupationDto MapOccupation(Occupation row) => new()
    {
        Id = row.ID,
        Name = row.OccupationName ?? string.Empty,
        IsActive = row.IsActive != false
    };

    private static DegreeLookupDto MapDegree(DegreeParameter row) => new()
    {
        Id = row.ID,
        Name = row.DegreeTitle ?? string.Empty,
        Type = row.Type,
        IsActive = row.IsActive != false
    };

    private static CampusSectionDto MapSection(
        Section row,
        IReadOnlyDictionary<int, Class> classes,
        IReadOnlyDictionary<int, SectionColor> colors,
        IReadOnlyDictionary<int, int> activeCounts)
    {
        classes.TryGetValue(row.Class_ID ?? -1, out var klass);
        colors.TryGetValue(row.SectionID ?? -1, out var color);
        activeCounts.TryGetValue(row.ID, out var count);
        return new CampusSectionDto
        {
            Id = row.ID,
            ClassId = row.Class_ID,
            ColorId = row.SectionID,
            ClassName = klass?.Class_Name ?? string.Empty,
            DisplayName = row.ClassName ?? row.SectionName,
            ColorName = color?.Color,
            Branch = row.Branch,
            Gender = row.Section_Gender,
            Fee = row.Fee ?? 0,
            IsHifz = row.IsHifz == true,
            IsActive = row.IsActive != false,
            ActiveStudentCount = count
        };
    }
}
