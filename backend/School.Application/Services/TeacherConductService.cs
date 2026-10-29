using System.Linq.Expressions;
using Microsoft.EntityFrameworkCore;
using School.Application.Common;
using School.Application.DTOs;
using School.Application.Interfaces;
using School.Infrastructure.Data;
using School.Infrastructure.Entities;

namespace School.Application.Services;

public class TeacherConductService : ITeacherConductService
{
    private readonly AppDbContext _context;
    private readonly ICampusNotificationService _notificationService;

    public TeacherConductService(
        AppDbContext context,
        ICampusNotificationService notificationService)
    {
        _context = context;
        _notificationService = notificationService;
    }

    public async Task<IReadOnlyList<TeacherConductTypeDto>> GetCatalogAsync(
        CancellationToken cancellationToken = default)
    {
        var types = await _context.TeacherConductTypes
            .AsNoTracking()
            .Where(x => x.IsActive)
            .Include(x => x.Tags)
            .OrderBy(x => x.SortOrder)
            .ThenBy(x => x.Name)
            .ToListAsync(cancellationToken);

        return types.Select(t => MapType(t, activeTagsOnly: true)).ToList();
    }

    public async Task<IReadOnlyList<TeacherConductTypeDto>> GetTypesAsync(
        CancellationToken cancellationToken = default)
    {
        var types = await _context.TeacherConductTypes
            .AsNoTracking()
            .Include(x => x.Tags)
            .OrderBy(x => x.SortOrder)
            .ThenBy(x => x.Name)
            .ToListAsync(cancellationToken);

        return types.Select(t => MapType(t, activeTagsOnly: false)).ToList();
    }

    public async Task<TeacherConductTypeDto> GetTypeAsync(int id, CancellationToken cancellationToken = default)
    {
        var type = await _context.TeacherConductTypes
            .AsNoTracking()
            .Include(x => x.Tags)
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken)
            ?? throw new KeyNotFoundException("Conduct type not found.");

        return MapType(type, activeTagsOnly: false);
    }

    public async Task<TeacherConductTypeDto> CreateTypeAsync(
        TeacherConductTypeUpsertDto request,
        CancellationToken cancellationToken = default)
    {
        var name = NormalizeName(request.Name);
        await EnsureUniqueTypeNameAsync(name, null, cancellationToken);

        var type = new TeacherConductType
        {
            Name = name,
            SortOrder = request.SortOrder,
            IsActive = request.IsActive ?? true,
            IsSystem = false,
        };
        _context.TeacherConductTypes.Add(type);
        await _context.SaveChangesAsync(cancellationToken);
        return await GetTypeAsync(type.Id, cancellationToken);
    }

    public async Task<TeacherConductTypeDto> UpdateTypeAsync(
        int id,
        TeacherConductTypeUpsertDto request,
        CancellationToken cancellationToken = default)
    {
        var type = await _context.TeacherConductTypes
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken)
            ?? throw new KeyNotFoundException("Conduct type not found.");

        if (type.IsSystem)
            throw new InvalidOperationException("Default conduct types cannot be changed.");

        var name = NormalizeName(request.Name);
        await EnsureUniqueTypeNameAsync(name, id, cancellationToken);

        type.Name = name;
        type.SortOrder = request.SortOrder;
        type.IsActive = request.IsActive ?? true;
        await _context.SaveChangesAsync(cancellationToken);
        return await GetTypeAsync(id, cancellationToken);
    }

    public async Task DeleteTypeAsync(int id, CancellationToken cancellationToken = default)
    {
        var type = await _context.TeacherConductTypes
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken)
            ?? throw new KeyNotFoundException("Conduct type not found.");

        if (type.IsSystem)
            throw new InvalidOperationException("Default conduct types cannot be deleted.");

        var hasNotes = await _context.TeacherConductNotes
            .AnyAsync(x => x.ConductTypeId == id, cancellationToken);
        if (hasNotes)
            throw new InvalidOperationException("This type has recorded notes and cannot be deleted.");

        var tags = await _context.TeacherConductTags
            .Where(x => x.ConductTypeId == id)
            .ToListAsync(cancellationToken);
        _context.TeacherConductTags.RemoveRange(tags);
        _context.TeacherConductTypes.Remove(type);
        await _context.SaveChangesAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<TeacherConductEmployeeLookupDto>> SearchEmployeesAsync(
        string search,
        CancellationToken cancellationToken = default)
    {
        var term = (search ?? string.Empty).Trim();
        if (term.Length < 2)
            return [];

        var pattern = $"%{term}%";
        return await _context.Employees
            .AsNoTracking()
            .Where(x => x.IsActive != false && x.EmployeeName != null && EF.Functions.Like(x.EmployeeName, pattern))
            .OrderBy(x => x.EmployeeName)
            .Take(20)
            .Select(x => new TeacherConductEmployeeLookupDto
            {
                Id = x.ID,
                EmployeeName = x.EmployeeName ?? "-",
                DesignationName = x.Designation != null ? x.Designation.DesignationName : null,
            })
            .ToListAsync(cancellationToken);
    }

    public async Task<TeacherConductNoteDto> UpsertNoteAsync(
        TeacherConductNoteUpsertDto request,
        int? recordedByEmployeeId,
        string? recordedByName,
        CancellationToken cancellationToken = default)
    {
        var employeeExists = await _context.Employees.AsNoTracking()
            .AnyAsync(x => x.ID == request.SubjectEmployeeId && x.IsActive != false, cancellationToken);
        if (!employeeExists)
            throw new KeyNotFoundException("Employee not found.");

        var type = await _context.TeacherConductTypes
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == request.ConductTypeId && x.IsActive, cancellationToken)
            ?? throw new ArgumentException("Conduct type is not available.");

        var tagIds = (request.TagIds ?? [])
            .Where(id => id > 0)
            .Distinct()
            .ToList();

        if (tagIds.Count > 1)
            throw new ArgumentException("Choose one item. Add extra detail in the note.");

        if (tagIds.Count > 0)
        {
            var validCount = await _context.TeacherConductTags.AsNoTracking()
                .CountAsync(
                    x => tagIds.Contains(x.Id) && x.ConductTypeId == type.Id && x.IsActive,
                    cancellationToken);
            if (validCount != tagIds.Count)
                throw new ArgumentException("One or more selected items do not belong to this type.");
        }

        var remarks = string.IsNullOrWhiteSpace(request.Remarks) ? null : request.Remarks.Trim();
        if (remarks is { Length: > 500 })
            throw new ArgumentException("Notes must be 500 characters or fewer.");

        var now = PakistanTime.Now;
        var existing = await _context.TeacherConductNotes
            .Include(x => x.NoteTags)
            .FirstOrDefaultAsync(
                x => x.SubjectEmployeeId == request.SubjectEmployeeId
                    && x.NoteDate == request.NoteDate
                    && x.ConductTypeId == request.ConductTypeId,
                cancellationToken);

        if (existing is null)
        {
            existing = new TeacherConductNote
            {
                SubjectEmployeeId = request.SubjectEmployeeId,
                NoteDate = request.NoteDate,
                ConductTypeId = request.ConductTypeId,
                Remarks = remarks,
                RecordedByEmployeeId = recordedByEmployeeId,
                RecordedByName = recordedByName,
                CreatedAtPkt = now,
            };
            _context.TeacherConductNotes.Add(existing);
        }
        else
        {
            existing.Remarks = remarks;
            existing.RecordedByEmployeeId = recordedByEmployeeId;
            existing.RecordedByName = recordedByName;
            existing.UpdatedAtPkt = now;
            existing.NoteTags.Clear();
        }

        foreach (var tagId in tagIds)
            existing.NoteTags.Add(new TeacherConductNoteTag { TagId = tagId });

        await _context.SaveChangesAsync(cancellationToken);

        var saved = (await LoadNotesAsync(x => x.Id == existing.Id, cancellationToken)).FirstOrDefault()
            ?? throw new InvalidOperationException("The note could not be loaded after saving.");

        if (recordedByEmployeeId is > 0)
        {
            var employeeName = await _context.Employees.AsNoTracking()
                .Where(x => x.ID == request.SubjectEmployeeId)
                .Select(x => x.EmployeeName)
                .FirstOrDefaultAsync(cancellationToken);
            var subjectName = string.IsNullOrWhiteSpace(employeeName) ? "a teacher" : employeeName.Trim();
            var actor = string.IsNullOrWhiteSpace(recordedByName) ? "Staff" : recordedByName.Trim();

            var hasGood = saved.Tags.Any(t => t.IsGood);
            var hasBad = saved.Tags.Any(t => !t.IsGood);
            var severity = hasGood && !hasBad
                ? CampusNotificationSeverities.Success
                : hasBad && !hasGood
                    ? CampusNotificationSeverities.Warning
                    : CampusNotificationSeverities.Info;

            await _notificationService.PublishAsync(
                CampusNotificationFactory.Create(
                    CampusNotificationTypes.TeacherConduct,
                    "Teacher conduct recorded",
                    $"{actor} recorded {saved.ConductTypeName} for {subjectName}.",
                    "/campus/teacher-conduct",
                    severity,
                    ["view_teacher_conduct"]),
                cancellationToken);
        }

        return saved;
    }

    public async Task DeleteNoteAsync(int id, CancellationToken cancellationToken = default)
    {
        var note = await _context.TeacherConductNotes
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken)
            ?? throw new KeyNotFoundException("Conduct note not found.");

        _context.TeacherConductNotes.Remove(note);
        await _context.SaveChangesAsync(cancellationToken);
    }

    public async Task<TeacherConductHistoryDto> GetEmployeeHistoryAsync(
        int subjectEmployeeId,
        int month,
        int year,
        CancellationToken cancellationToken = default)
    {
        if (month is < 1 or > 12)
            throw new ArgumentException("Month must be between 1 and 12.");
        if (year is < 2000 or > 2100)
            throw new ArgumentException("Year is out of range.");

        var employee = await _context.Employees.AsNoTracking()
            .Where(x => x.ID == subjectEmployeeId)
            .Select(x => new
            {
                x.ID,
                x.EmployeeName,
                DesignationName = x.Designation != null ? x.Designation.DesignationName : null,
            })
            .FirstOrDefaultAsync(cancellationToken)
            ?? throw new KeyNotFoundException("Employee not found.");

        var start = new DateOnly(year, month, 1);
        var end = start.AddMonths(1);

        var notes = await LoadNotesAsync(
            x => x.SubjectEmployeeId == subjectEmployeeId && x.NoteDate >= start && x.NoteDate < end,
            cancellationToken);

        return new TeacherConductHistoryDto
        {
            SubjectEmployeeId = employee.ID,
            EmployeeName = employee.EmployeeName ?? "-",
            DesignationName = employee.DesignationName,
            Year = year,
            Month = month,
            Notes = notes,
        };
    }

    public async Task<TeacherConductDayReportDto> GetDayReportAsync(
        DateOnly date,
        DateOnly? dateTo = null,
        int? subjectEmployeeId = null,
        int? recordedByEmployeeId = null,
        CancellationToken cancellationToken = default)
    {
        var endDate = dateTo ?? date;
        if (endDate < date)
            throw new ArgumentException("End date must be on or after the start date.");

        var notes = await LoadNotesAsync(
            x => x.NoteDate >= date
                && x.NoteDate <= endDate
                && (!subjectEmployeeId.HasValue || x.SubjectEmployeeId == subjectEmployeeId.Value)
                && (!recordedByEmployeeId.HasValue || x.RecordedByEmployeeId == recordedByEmployeeId.Value),
            cancellationToken);
        var employeeIds = notes.Select(x => x.SubjectEmployeeId).Distinct().ToList();

        var employees = await _context.Employees
            .AsNoTracking()
            .Where(x => employeeIds.Contains(x.ID))
            .Select(x => new
            {
                x.ID,
                x.EmployeeName,
                DesignationName = x.Designation != null ? x.Designation.DesignationName : null,
            })
            .ToListAsync(cancellationToken);

        var employeeById = employees.ToDictionary(x => x.ID);

        var reportNotes = notes.Select(note =>
        {
            employeeById.TryGetValue(note.SubjectEmployeeId, out var employee);
            return new TeacherConductReportNoteDto
            {
                Id = note.Id,
                SubjectEmployeeId = note.SubjectEmployeeId,
                EmployeeName = employee?.EmployeeName ?? "-",
                DesignationName = employee?.DesignationName,
                NoteDate = note.NoteDate,
                ConductTypeId = note.ConductTypeId,
                ConductTypeName = note.ConductTypeName,
                Remarks = note.Remarks,
                RecordedByEmployeeId = note.RecordedByEmployeeId,
                RecordedByName = note.RecordedByName,
                Tags = note.Tags,
            };
        }).ToList();

        var goodCount = 0;
        var badCount = 0;
        foreach (var note in reportNotes)
        {
            var hasGood = note.Tags.Any(t => t.IsGood);
            var hasBad = note.Tags.Any(t => !t.IsGood);
            if (hasGood) goodCount++;
            if (hasBad) badCount++;
        }

        var teachers = reportNotes
            .GroupBy(x => x.SubjectEmployeeId)
            .OrderBy(g => g.First().EmployeeName)
            .Select(g => new TeacherConductDayReportGroupDto
            {
                SubjectEmployeeId = g.Key,
                EmployeeName = g.First().EmployeeName,
                DesignationName = g.First().DesignationName,
                Count = g.Count(),
                Notes = g
                    .OrderBy(x => x.NoteDate)
                    .ThenBy(x => x.ConductTypeName)
                    .ToList(),
            })
            .ToList();

        return new TeacherConductDayReportDto
        {
            Date = date,
            DateTo = endDate,
            TotalCount = reportNotes.Count,
            GoodCount = goodCount,
            BadCount = badCount,
            Teachers = teachers,
        };
    }

    private async Task<List<TeacherConductNoteDto>> LoadNotesAsync(
        Expression<Func<TeacherConductNote, bool>> predicate,
        CancellationToken cancellationToken)
    {
        return await _context.TeacherConductNotes
            .AsNoTracking()
            .Where(predicate)
            .OrderBy(x => x.NoteDate)
            .ThenBy(x => x.ConductType.SortOrder)
            .ThenBy(x => x.Id)
            .Select(x => new TeacherConductNoteDto
            {
                Id = x.Id,
                SubjectEmployeeId = x.SubjectEmployeeId,
                NoteDate = x.NoteDate,
                ConductTypeId = x.ConductTypeId,
                ConductTypeName = x.ConductType.Name,
                Remarks = x.Remarks,
                RecordedByEmployeeId = x.RecordedByEmployeeId,
                RecordedByName = x.RecordedByName,
                CreatedAtPkt = x.CreatedAtPkt,
                UpdatedAtPkt = x.UpdatedAtPkt,
                Tags = x.NoteTags
                    .OrderBy(t => t.Tag.SortOrder)
                    .ThenBy(t => t.Tag.Name)
                    .Select(t => new TeacherConductNoteTagDto
                    {
                        Id = t.TagId,
                        Name = t.Tag.Name,
                        IsGood = t.Tag.IsGood,
                    })
                    .ToList(),
            })
            .ToListAsync(cancellationToken);
    }

    private async Task EnsureUniqueTypeNameAsync(string name, int? excludeId, CancellationToken cancellationToken)
    {
        var exists = await _context.TeacherConductTypes.AsNoTracking()
            .AnyAsync(x => x.Name == name && x.Id != excludeId, cancellationToken);
        if (exists)
            throw new InvalidOperationException("A conduct type with this name already exists.");
    }

    private static string NormalizeName(string? name)
    {
        var trimmed = (name ?? string.Empty).Trim();
        if (trimmed.Length == 0)
            throw new ArgumentException("Name is required.");
        return trimmed;
    }

    private static TeacherConductTypeDto MapType(TeacherConductType type, bool activeTagsOnly)
    {
        var tags = type.Tags
            .Where(t => !activeTagsOnly || t.IsActive)
            .OrderBy(t => t.SortOrder)
            .ThenBy(t => t.Name)
            .Select(t => new TeacherConductTagDto
            {
                Id = t.Id,
                Name = t.Name,
                SortOrder = t.SortOrder,
                IsSystem = t.IsSystem,
                IsGood = t.IsGood,
                IsActive = t.IsActive,
            })
            .ToList();

        return new TeacherConductTypeDto
        {
            Id = type.Id,
            Name = type.Name,
            SortOrder = type.SortOrder,
            IsSystem = type.IsSystem,
            IsActive = type.IsActive,
            Tags = tags,
        };
    }

}
