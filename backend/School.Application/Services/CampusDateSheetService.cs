using Microsoft.EntityFrameworkCore;
using School.Application.DTOs;
using School.Application.Interfaces;
using School.Infrastructure.Data;
using School.Infrastructure.Entities;

namespace School.Application.Services;

public class CampusDateSheetService : ICampusDateSheetService
{
    public const int MaxNonSundayDays = 45;

    private readonly AppDbContext _context;

    public CampusDateSheetService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<IReadOnlyList<CampusDateSheetListItemDto>> GetListAsync(
        CancellationToken cancellationToken = default)
    {
        return await _context.CampusDateSheets
            .AsNoTracking()
            .OrderByDescending(x => x.CreatedAtUtc)
            .ThenBy(x => x.Name)
            .Select(x => new CampusDateSheetListItemDto
            {
                ID = x.ID,
                Name = x.Name,
                DisplayTitle = x.DisplayTitle,
                Subtitle = x.Subtitle,
                StartDate = x.StartDate,
                EndDate = x.EndDate,
                IsActive = x.IsActive,
                DayCount = x.Days.Count,
                ClassCount = x.Classes.Count,
                EntryCount = x.Entries.Count,
                CreatedAtUtc = x.CreatedAtUtc,
            })
            .ToListAsync(cancellationToken);
    }

    public async Task<CampusDateSheetDetailDto> GetByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        var entity = await LoadHeaderAsync(id, asNoTracking: true, cancellationToken)
            ?? throw new KeyNotFoundException("Datesheet not found.");

        return await MapDetailAsync(entity, cancellationToken);
    }

    public async Task<CampusDateSheetPrintDto> GetPrintAsync(int id, CancellationToken cancellationToken = default)
    {
        var detail = await GetByIdAsync(id, cancellationToken);
        return new CampusDateSheetPrintDto
        {
            ID = detail.ID,
            Name = detail.Name,
            DisplayTitle = detail.DisplayTitle,
            Subtitle = detail.Subtitle,
            StartDate = detail.StartDate,
            EndDate = detail.EndDate,
            IsActive = detail.IsActive,
            CreatedAtUtc = detail.CreatedAtUtc,
            UpdatedAtUtc = detail.UpdatedAtUtc,
            Days = detail.Days,
            Classes = detail.Classes,
            Entries = detail.Entries,
        };
    }

    public async Task<CampusDateSheetDetailDto> CreateAsync(
        CampusDateSheetCreateDto request,
        CancellationToken cancellationToken = default)
    {
        ValidateName(request.Name);
        ValidateDateRange(request.StartDate, request.EndDate);
        var classInputs = NormalizeClassInputs(request.Classes);
        if (classInputs.Count == 0)
        {
            throw new ArgumentException("Select at least one class.");
        }

        var days = BuildDays(request.StartDate, request.EndDate);
        if (days.Count == 0)
        {
            throw new ArgumentException("The selected range has no exam days after Sundays are skipped.");
        }

        if (days.Count > MaxNonSundayDays)
        {
            throw new ArgumentException(
                $"Choose a shorter date range (up to {MaxNonSundayDays} exam days, Sundays skipped).");
        }

        await EnsureClassesExistAsync(classInputs.Select(c => c.ClassID).ToList(), cancellationToken);

        var now = DateTime.UtcNow;
        var header = new CampusDateSheet
        {
            Name = request.Name.Trim(),
            DisplayTitle = TrimOrNull(request.DisplayTitle) ?? request.Name.Trim(),
            Subtitle = TrimOrNull(request.Subtitle),
            StartDate = request.StartDate,
            EndDate = request.EndDate,
            IsActive = true,
            CreatedAtUtc = now,
        };

        foreach (var day in days)
        {
            header.Days.Add(day);
        }

        for (var i = 0; i < classInputs.Count; i++)
        {
            var input = classInputs[i];
            header.Classes.Add(new CampusDateSheetClass
            {
                ClassID = input.ClassID,
                SortOrder = i,
                MergeGroupKey = input.MergeGroupKey,
            });
        }

        _context.CampusDateSheets.Add(header);
        await _context.SaveChangesAsync(cancellationToken);

        return await GetByIdAsync(header.ID, cancellationToken);
    }

    public async Task<CampusDateSheetDetailDto> UpdateAsync(
        int id,
        CampusDateSheetUpdateDto request,
        CancellationToken cancellationToken = default)
    {
        ValidateName(request.Name);

        var header = await _context.CampusDateSheets
            .FirstOrDefaultAsync(x => x.ID == id, cancellationToken)
            ?? throw new KeyNotFoundException("Datesheet not found.");

        header.Name = request.Name.Trim();
        header.DisplayTitle = TrimOrNull(request.DisplayTitle) ?? header.Name;
        header.Subtitle = TrimOrNull(request.Subtitle);
        header.IsActive = request.IsActive;
        header.UpdatedAtUtc = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);
        return await GetByIdAsync(id, cancellationToken);
    }

    public async Task<CampusDateSheetDetailDto> ReplaceClassesAsync(
        int id,
        CampusDateSheetReplaceClassesDto request,
        CancellationToken cancellationToken = default)
    {
        var header = await LoadHeaderAsync(id, asNoTracking: false, cancellationToken)
            ?? throw new KeyNotFoundException("Datesheet not found.");

        var classInputs = NormalizeClassInputs(request.Classes);
        if (classInputs.Count == 0)
        {
            throw new ArgumentException("Select at least one class.");
        }

        await EnsureClassesExistAsync(classInputs.Select(c => c.ClassID).ToList(), cancellationToken);

        var keepClassIds = classInputs.Select(c => c.ClassID).ToHashSet();
        var orphanEntries = header.Entries.Where(e => !keepClassIds.Contains(e.ClassID)).ToList();
        if (orphanEntries.Count > 0)
        {
            _context.CampusDateSheetEntries.RemoveRange(orphanEntries);
        }

        _context.CampusDateSheetClasses.RemoveRange(header.Classes);
        header.Classes.Clear();

        for (var i = 0; i < classInputs.Count; i++)
        {
            var input = classInputs[i];
            header.Classes.Add(new CampusDateSheetClass
            {
                DateSheetID = header.ID,
                ClassID = input.ClassID,
                SortOrder = i,
                MergeGroupKey = input.MergeGroupKey,
            });
        }

        header.UpdatedAtUtc = DateTime.UtcNow;
        await _context.SaveChangesAsync(cancellationToken);
        return await GetByIdAsync(id, cancellationToken);
    }

    public async Task<CampusDateSheetDetailDto> ReplaceDaysAsync(
        int id,
        CampusDateSheetReplaceDaysDto request,
        CancellationToken cancellationToken = default)
    {
        var header = await LoadHeaderAsync(id, asNoTracking: false, cancellationToken)
            ?? throw new KeyNotFoundException("Datesheet not found.");

        var dates = NormalizeExamDates(request.ExamDates);
        if (dates.Count == 0)
        {
            throw new ArgumentException("Keep at least one exam date.");
        }

        if (dates.Count > MaxNonSundayDays)
        {
            throw new ArgumentException(
                $"A datesheet can have up to {MaxNonSundayDays} exam days.");
        }

        var keepDates = dates.ToHashSet();
        var orphanEntries = header.Entries.Where(e => !keepDates.Contains(e.ExamDate)).ToList();
        if (orphanEntries.Count > 0)
        {
            _context.CampusDateSheetEntries.RemoveRange(orphanEntries);
        }

        _context.CampusDateSheetDays.RemoveRange(header.Days);
        header.Days.Clear();

        for (var i = 0; i < dates.Count; i++)
        {
            var examDate = dates[i];
            header.Days.Add(new CampusDateSheetDay
            {
                DateSheetID = header.ID,
                ExamDate = examDate,
                DayOfWeek = (byte)examDate.DayOfWeek,
                SortOrder = i,
            });
        }

        header.StartDate = dates[0];
        header.EndDate = dates[^1];
        header.UpdatedAtUtc = DateTime.UtcNow;
        await _context.SaveChangesAsync(cancellationToken);
        return await GetByIdAsync(id, cancellationToken);
    }

    public async Task<CampusDateSheetDetailDto> ReplaceEntriesAsync(
        int id,
        CampusDateSheetReplaceEntriesDto request,
        CancellationToken cancellationToken = default)
    {
        var header = await LoadHeaderAsync(id, asNoTracking: false, cancellationToken)
            ?? throw new KeyNotFoundException("Datesheet not found.");

        var memberClassIds = header.Classes.Select(c => c.ClassID).ToHashSet();
        var examDates = header.Days.Select(d => d.ExamDate).ToHashSet();
        var inputs = request.Entries ?? [];

        ValidateEntries(inputs, memberClassIds, examDates);
        await EnsureSubjectsExistAsync(
            inputs.Where(e => e.SubjectID is > 0).Select(e => e.SubjectID!.Value).Distinct().ToList(),
            cancellationToken);

        var incomingIds = inputs.Where(e => e.ID is > 0).Select(e => e.ID!.Value).ToHashSet();
        var toRemove = header.Entries.Where(e => !incomingIds.Contains(e.ID)).ToList();
        if (toRemove.Count > 0)
        {
            _context.CampusDateSheetEntries.RemoveRange(toRemove);
        }

        var now = DateTime.UtcNow;
        var existingById = header.Entries.ToDictionary(e => e.ID);

        // Enforce uniqueness class×date among incoming payload.
        var seenKeys = new HashSet<string>(StringComparer.Ordinal);
        foreach (var input in inputs)
        {
            var key = $"{input.ClassID}:{input.ExamDate:yyyy-MM-dd}";
            if (!seenKeys.Add(key))
            {
                throw new ArgumentException("Each class can have only one entry per date.");
            }

            if (input.ID is > 0 && existingById.TryGetValue(input.ID.Value, out var existing))
            {
                existing.ClassID = input.ClassID;
                existing.ExamDate = input.ExamDate;
                existing.EntryType = input.EntryType;
                existing.SubjectID = NormalizeSubjectId(input);
                existing.DisplayText = TrimOrNull(input.DisplayText);
                existing.UpdatedAtUtc = now;
            }
            else
            {
                header.Entries.Add(new CampusDateSheetEntry
                {
                    DateSheetID = header.ID,
                    ClassID = input.ClassID,
                    ExamDate = input.ExamDate,
                    EntryType = input.EntryType,
                    SubjectID = NormalizeSubjectId(input),
                    DisplayText = TrimOrNull(input.DisplayText),
                    CreatedAtUtc = now,
                });
            }
        }

        header.UpdatedAtUtc = now;
        await _context.SaveChangesAsync(cancellationToken);
        return await GetByIdAsync(id, cancellationToken);
    }

    public async Task DeleteAsync(int id, CancellationToken cancellationToken = default)
    {
        var header = await _context.CampusDateSheets
            .FirstOrDefaultAsync(x => x.ID == id, cancellationToken)
            ?? throw new KeyNotFoundException("Datesheet not found.");

        _context.CampusDateSheets.Remove(header);
        await _context.SaveChangesAsync(cancellationToken);
    }

    private async Task<CampusDateSheet?> LoadHeaderAsync(
        int id,
        bool asNoTracking,
        CancellationToken cancellationToken)
    {
        IQueryable<CampusDateSheet> query = _context.CampusDateSheets
            .Include(x => x.Days)
            .Include(x => x.Classes)
            .Include(x => x.Entries);

        if (asNoTracking)
        {
            query = query.AsNoTracking();
        }

        return await query.FirstOrDefaultAsync(x => x.ID == id, cancellationToken);
    }

    private async Task<CampusDateSheetDetailDto> MapDetailAsync(
        CampusDateSheet entity,
        CancellationToken cancellationToken)
    {
        var classIds = entity.Classes.Select(c => c.ClassID).Distinct().ToList();
        var subjectIds = entity.Entries
            .Where(e => e.SubjectID is > 0)
            .Select(e => e.SubjectID!.Value)
            .Distinct()
            .ToList();

        var classNames = await _context.Classes
            .AsNoTracking()
            .Where(c => classIds.Contains(c.Class_ID))
            .ToDictionaryAsync(c => c.Class_ID, c => c.Class_Name ?? string.Empty, cancellationToken);

        var subjects = await _context.SubjectMasters
            .AsNoTracking()
            .Where(s => subjectIds.Contains(s.ID))
            .ToDictionaryAsync(
                s => s.ID,
                s => new { Name = s.SubjectName ?? string.Empty, Short = s.ShortName },
                cancellationToken);

        string ClassName(int classId) =>
            classNames.TryGetValue(classId, out var name) ? name : string.Empty;

        return new CampusDateSheetDetailDto
        {
            ID = entity.ID,
            Name = entity.Name,
            DisplayTitle = entity.DisplayTitle,
            Subtitle = entity.Subtitle,
            StartDate = entity.StartDate,
            EndDate = entity.EndDate,
            IsActive = entity.IsActive,
            CreatedAtUtc = entity.CreatedAtUtc,
            UpdatedAtUtc = entity.UpdatedAtUtc,
            Days = entity.Days
                .OrderBy(d => d.SortOrder)
                .ThenBy(d => d.ExamDate)
                .Select(d => new CampusDateSheetDayDto
                {
                    ID = d.ID,
                    ExamDate = d.ExamDate,
                    DayOfWeek = d.DayOfWeek,
                    DayName = DayName(d.DayOfWeek),
                    SortOrder = d.SortOrder,
                })
                .ToList(),
            Classes = entity.Classes
                .OrderBy(c => c.SortOrder)
                .ThenBy(c => c.ClassID)
                .Select(c => new CampusDateSheetClassDto
                {
                    ID = c.ID,
                    ClassID = c.ClassID,
                    ClassName = ClassName(c.ClassID),
                    SortOrder = c.SortOrder,
                    MergeGroupKey = c.MergeGroupKey,
                })
                .ToList(),
            Entries = entity.Entries
                .OrderBy(e => e.ExamDate)
                .ThenBy(e => e.ClassID)
                .Select(e =>
                {
                    string? subjectName = null;
                    string? subjectShort = null;
                    if (e.SubjectID is > 0 && subjects.TryGetValue(e.SubjectID.Value, out var sub))
                    {
                        subjectName = sub.Name;
                        subjectShort = sub.Short;
                    }

                    return new CampusDateSheetEntryDto
                    {
                        ID = e.ID,
                        ClassID = e.ClassID,
                        ClassName = ClassName(e.ClassID),
                        ExamDate = e.ExamDate,
                        EntryType = e.EntryType,
                        SubjectID = e.SubjectID,
                        SubjectName = subjectName,
                        SubjectShortName = subjectShort,
                        DisplayText = e.DisplayText,
                        CellLabel = ResolveCellLabel(e.EntryType, e.DisplayText, subjectShort, subjectName),
                    };
                })
                .ToList(),
        };
    }

    private static string ResolveCellLabel(
        byte entryType,
        string? displayText,
        string? subjectShort,
        string? subjectName)
    {
        var display = string.IsNullOrWhiteSpace(displayText) ? null : displayText.Trim();

        if (entryType == (byte)CampusDateSheetEntryType.Holiday)
        {
            return display ?? "--Holiday--";
        }

        if (entryType == (byte)CampusDateSheetEntryType.RegularClass)
        {
            return display ?? "--Regular Class--";
        }

        var subjectLabel = !string.IsNullOrWhiteSpace(subjectName)
            ? subjectName.Trim()
            : !string.IsNullOrWhiteSpace(subjectShort)
                ? subjectShort.Trim()
                : null;

        // Subject + optional extra text → "Mathematics practical"
        if (!string.IsNullOrWhiteSpace(subjectLabel) && display is not null)
        {
            return $"{subjectLabel} {display}";
        }

        if (display is not null)
        {
            return display;
        }

        return subjectLabel ?? string.Empty;
    }

    private static List<CampusDateSheetDay> BuildDays(DateOnly start, DateOnly end)
    {
        var days = new List<CampusDateSheetDay>();
        var sort = 0;
        for (var d = start; d <= end; d = d.AddDays(1))
        {
            if (d.DayOfWeek == DayOfWeek.Sunday)
            {
                continue;
            }

            days.Add(new CampusDateSheetDay
            {
                ExamDate = d,
                DayOfWeek = (byte)d.DayOfWeek,
                SortOrder = sort++,
            });
        }

        return days;
    }

    private static void ValidateName(string? name)
    {
        if (string.IsNullOrWhiteSpace(name))
        {
            throw new ArgumentException("Datesheet name is required.");
        }
    }

    private static void ValidateDateRange(DateOnly start, DateOnly end)
    {
        if (end < start)
        {
            throw new ArgumentException("End date must be on or after the start date.");
        }
    }

    private static List<DateOnly> NormalizeExamDates(IReadOnlyList<DateOnly>? dates)
    {
        if (dates is null || dates.Count == 0)
        {
            return [];
        }

        var seen = new HashSet<DateOnly>();
        var result = new List<DateOnly>();
        foreach (var date in dates)
        {
            if (date.DayOfWeek == DayOfWeek.Sunday)
            {
                throw new ArgumentException("Sundays cannot be exam dates.");
            }

            if (!seen.Add(date))
            {
                continue;
            }

            result.Add(date);
        }

        result.Sort();
        return result;
    }

    private static List<CampusDateSheetClassInputDto> NormalizeClassInputs(
        IReadOnlyList<CampusDateSheetClassInputDto>? inputs)
    {
        if (inputs is null || inputs.Count == 0)
        {
            return [];
        }

        var seen = new HashSet<int>();
        var result = new List<CampusDateSheetClassInputDto>();
        foreach (var input in inputs)
        {
            if (input.ClassID <= 0 || !seen.Add(input.ClassID))
            {
                continue;
            }

            result.Add(new CampusDateSheetClassInputDto
            {
                ClassID = input.ClassID,
                MergeGroupKey = input.MergeGroupKey is > 0 ? input.MergeGroupKey : null,
            });
        }

        return result;
    }

    private static void ValidateEntries(
        IReadOnlyList<CampusDateSheetEntryInputDto> inputs,
        HashSet<int> memberClassIds,
        HashSet<DateOnly> examDates)
    {
        foreach (var input in inputs)
        {
            if (!memberClassIds.Contains(input.ClassID))
            {
                throw new ArgumentException("Entry class is not part of this datesheet.");
            }

            if (!examDates.Contains(input.ExamDate))
            {
                throw new ArgumentException("Entry date is not part of this datesheet.");
            }

            if (input.EntryType is not (
                    (byte)CampusDateSheetEntryType.Subject
                    or (byte)CampusDateSheetEntryType.Holiday
                    or (byte)CampusDateSheetEntryType.RegularClass))
            {
                throw new ArgumentException("Invalid entry type.");
            }

            if (input.EntryType == (byte)CampusDateSheetEntryType.Subject
                && input.SubjectID is not > 0
                && string.IsNullOrWhiteSpace(input.DisplayText))
            {
                throw new ArgumentException("Subject entries need a subject or display text.");
            }
        }

        // Same subject cannot appear twice for the same class across different dates.
        var subjectKeys = new HashSet<string>(StringComparer.Ordinal);
        foreach (var input in inputs)
        {
            if (input.EntryType != (byte)CampusDateSheetEntryType.Subject || input.SubjectID is not > 0)
            {
                continue;
            }

            var key = $"{input.ClassID}:{input.SubjectID.Value}";
            if (!subjectKeys.Add(key))
            {
                throw new ArgumentException(
                    "The same subject cannot be scheduled more than once for the same class in this datesheet.");
            }
        }
    }

    private static int? NormalizeSubjectId(CampusDateSheetEntryInputDto input)
    {
        if (input.EntryType != (byte)CampusDateSheetEntryType.Subject)
        {
            return null;
        }

        return input.SubjectID is > 0 ? input.SubjectID : null;
    }

    private async Task EnsureClassesExistAsync(IReadOnlyList<int> classIds, CancellationToken cancellationToken)
    {
        if (classIds.Count == 0)
        {
            return;
        }

        var existing = await _context.Classes
            .AsNoTracking()
            .Where(c => classIds.Contains(c.Class_ID))
            .Select(c => c.Class_ID)
            .ToListAsync(cancellationToken);

        if (existing.Count != classIds.Distinct().Count())
        {
            throw new ArgumentException("One or more selected classes were not found.");
        }
    }

    private async Task EnsureSubjectsExistAsync(IReadOnlyList<int> subjectIds, CancellationToken cancellationToken)
    {
        if (subjectIds.Count == 0)
        {
            return;
        }

        var existing = await _context.SubjectMasters
            .AsNoTracking()
            .Where(s => subjectIds.Contains(s.ID))
            .Select(s => s.ID)
            .ToListAsync(cancellationToken);

        if (existing.Count != subjectIds.Count)
        {
            throw new ArgumentException("One or more subjects were not found.");
        }
    }

    private static string? TrimOrNull(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        return value.Trim();
    }

    private static string DayName(byte dayOfWeek) =>
        dayOfWeek switch
        {
            0 => "Sunday",
            1 => "Monday",
            2 => "Tuesday",
            3 => "Wednesday",
            4 => "Thursday",
            5 => "Friday",
            6 => "Saturday",
            _ => string.Empty,
        };
}
