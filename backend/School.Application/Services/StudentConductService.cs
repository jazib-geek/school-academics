using Microsoft.EntityFrameworkCore;
using School.Application.Common;
using School.Application.DTOs;
using School.Application.Interfaces;
using School.Infrastructure.Data;
using School.Infrastructure.Entities;

namespace School.Application.Services;

public class StudentConductService : IStudentConductService
{
    private readonly AppDbContext _context;
    private readonly ICampusNotificationService _notificationService;

    public StudentConductService(
        AppDbContext context,
        ICampusNotificationService notificationService)
    {
        _context = context;
        _notificationService = notificationService;
    }

    public async Task<IReadOnlyList<StudentConductTypeDto>> GetCatalogAsync(
        CancellationToken cancellationToken = default)
    {
        var types = await _context.StudentConductTypes
            .AsNoTracking()
            .Where(x => x.IsActive)
            .Include(x => x.Tags)
            .OrderBy(x => x.SortOrder)
            .ThenBy(x => x.Name)
            .ToListAsync(cancellationToken);

        return types.Select(t => MapType(t, activeTagsOnly: true)).ToList();
    }

    public async Task<IReadOnlyList<StudentConductTypeDto>> GetTypesAsync(
        CancellationToken cancellationToken = default)
    {
        var types = await _context.StudentConductTypes
            .AsNoTracking()
            .Include(x => x.Tags)
            .OrderBy(x => x.SortOrder)
            .ThenBy(x => x.Name)
            .ToListAsync(cancellationToken);

        return types.Select(t => MapType(t, activeTagsOnly: false)).ToList();
    }

    public async Task<StudentConductTypeDto> GetTypeAsync(int id, CancellationToken cancellationToken = default)
    {
        var type = await _context.StudentConductTypes
            .AsNoTracking()
            .Include(x => x.Tags)
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken)
            ?? throw new KeyNotFoundException("Conduct type not found.");

        return MapType(type, activeTagsOnly: false);
    }

    public async Task<StudentConductTypeDto> CreateTypeAsync(
        StudentConductTypeUpsertDto request,
        CancellationToken cancellationToken = default)
    {
        var name = NormalizeName(request.Name);
        await EnsureUniqueTypeNameAsync(name, null, cancellationToken);

        var type = new StudentConductType
        {
            Name = name,
            SortOrder = request.SortOrder,
            IsActive = request.IsActive ?? true,
            IsSystem = false,
        };
        _context.StudentConductTypes.Add(type);
        await _context.SaveChangesAsync(cancellationToken);
        return await GetTypeAsync(type.Id, cancellationToken);
    }

    public async Task<StudentConductTypeDto> UpdateTypeAsync(
        int id,
        StudentConductTypeUpsertDto request,
        CancellationToken cancellationToken = default)
    {
        var type = await _context.StudentConductTypes
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
        var type = await _context.StudentConductTypes
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken)
            ?? throw new KeyNotFoundException("Conduct type not found.");

        if (type.IsSystem)
            throw new InvalidOperationException("Default conduct types cannot be deleted.");

        var hasNotes = await _context.StudentConductNotes
            .AnyAsync(x => x.ConductTypeId == id, cancellationToken);
        if (hasNotes)
            throw new InvalidOperationException("This type has recorded notes and cannot be deleted.");

        var tags = await _context.StudentConductTags
            .Where(x => x.ConductTypeId == id)
            .ToListAsync(cancellationToken);
        _context.StudentConductTags.RemoveRange(tags);
        _context.StudentConductTypes.Remove(type);
        await _context.SaveChangesAsync(cancellationToken);
    }

    public async Task<StudentConductClassSheetDto> GetClassSheetAsync(
        DateOnly date,
        int classSectionCompositeId,
        CancellationToken cancellationToken = default)
    {
        if (classSectionCompositeId <= 0)
            throw new ArgumentException("A class is required.");

        var section = await _context.Sections
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.ID == classSectionCompositeId, cancellationToken);

        var className = section == null
            ? $"Class {classSectionCompositeId}"
            : FormatClassSectionDisplayName(section.ClassName, section.SectionName);

        var students = await _context.Students
            .AsNoTracking()
            .Where(x => x.ClassCompositeID == classSectionCompositeId && x.IsActive == true)
            .OrderBy(x => x.Reg_Id)
            .Select(x => new { x.Reg_Id, x.FullName })
            .ToListAsync(cancellationToken);

        var studentIds = students.Select(x => x.Reg_Id).ToList();
        var notes = await LoadNotesAsync(
            x => studentIds.Contains(x.StudentId) && x.NoteDate == date,
            cancellationToken);
        var notesByStudent = notes.GroupBy(x => x.StudentId).ToDictionary(g => g.Key, g => g.ToList());

        return new StudentConductClassSheetDto
        {
            ClassSectionCompositeId = classSectionCompositeId,
            ClassName = className,
            Date = date,
            Students = students.Select(s => new StudentConductClassStudentDto
            {
                StudentId = s.Reg_Id,
                StudentName = s.FullName ?? "-",
                Notes = notesByStudent.GetValueOrDefault(s.Reg_Id) ?? [],
            }).ToList(),
        };
    }

    public async Task<StudentConductNoteDto> UpsertNoteAsync(
        StudentConductNoteUpsertDto request,
        int? recordedByEmployeeId,
        string? recordedByName,
        CancellationToken cancellationToken = default)
    {
        var studentExists = await _context.Students.AsNoTracking()
            .AnyAsync(x => x.Reg_Id == request.StudentId && x.IsActive == true, cancellationToken);
        if (!studentExists)
            throw new KeyNotFoundException("Student not found.");

        var type = await _context.StudentConductTypes
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
            var validCount = await _context.StudentConductTags.AsNoTracking()
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
        var existing = await _context.StudentConductNotes
            .Include(x => x.NoteTags)
            .FirstOrDefaultAsync(
                x => x.StudentId == request.StudentId
                    && x.NoteDate == request.NoteDate
                    && x.ConductTypeId == request.ConductTypeId,
                cancellationToken);

        if (existing is null)
        {
            existing = new StudentConductNote
            {
                StudentId = request.StudentId,
                NoteDate = request.NoteDate,
                ConductTypeId = request.ConductTypeId,
                Remarks = remarks,
                RecordedByEmployeeId = recordedByEmployeeId,
                RecordedByName = recordedByName,
                CreatedAtPkt = now,
            };
            _context.StudentConductNotes.Add(existing);
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
        {
            existing.NoteTags.Add(new StudentConductNoteTag { TagId = tagId });
        }

        await _context.SaveChangesAsync(cancellationToken);

        var saved = (await LoadNotesAsync(x => x.Id == existing.Id, cancellationToken)).FirstOrDefault()
            ?? throw new InvalidOperationException("The note could not be loaded after saving.");

        if (recordedByEmployeeId is > 0)
        {
            var studentName = await _context.Students.AsNoTracking()
                .Where(x => x.Reg_Id == request.StudentId)
                .Select(x => x.FullName)
                .FirstOrDefaultAsync(cancellationToken);
            studentName = string.IsNullOrWhiteSpace(studentName) ? $"#{request.StudentId}" : studentName.Trim();
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
                    CampusNotificationTypes.StudentConduct,
                    "Student conduct recorded",
                    $"{actor} recorded {saved.ConductTypeName} for {studentName}.",
                    "/campus/student-conduct",
                    severity,
                    ["view_student_conduct"]),
                cancellationToken);
        }

        return saved;
    }

    public async Task DeleteNoteAsync(int id, CancellationToken cancellationToken = default)
    {
        var note = await _context.StudentConductNotes
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken)
            ?? throw new KeyNotFoundException("Conduct note not found.");

        _context.StudentConductNotes.Remove(note);
        await _context.SaveChangesAsync(cancellationToken);
    }

    public async Task<StudentConductHistoryDto> GetStudentHistoryAsync(
        int studentId,
        int month,
        int year,
        CancellationToken cancellationToken = default)
    {
        if (month is < 1 or > 12)
            throw new ArgumentException("Month must be between 1 and 12.");
        if (year is < 2000 or > 2100)
            throw new ArgumentException("Year is out of range.");

        var student = await _context.Students.AsNoTracking()
            .Where(x => x.Reg_Id == studentId)
            .Select(x => new { x.Reg_Id, x.FullName })
            .FirstOrDefaultAsync(cancellationToken)
            ?? throw new KeyNotFoundException("Student not found.");

        var start = new DateOnly(year, month, 1);
        var end = start.AddMonths(1);

        var notes = await LoadNotesAsync(
            x => x.StudentId == studentId && x.NoteDate >= start && x.NoteDate < end,
            cancellationToken);

        return new StudentConductHistoryDto
        {
            StudentId = student.Reg_Id,
            StudentName = student.FullName ?? "-",
            Year = year,
            Month = month,
            Notes = notes,
        };
    }

    public async Task<StudentConductDayReportDto> GetDayReportAsync(
        DateOnly date,
        CancellationToken cancellationToken = default)
    {
        var notes = await LoadNotesAsync(x => x.NoteDate == date, cancellationToken);
        var studentIds = notes.Select(x => x.StudentId).Distinct().ToList();

        var students = await _context.Students
            .AsNoTracking()
            .Where(x => studentIds.Contains(x.Reg_Id))
            .Select(x => new
            {
                x.Reg_Id,
                x.FullName,
                x.ClassCompositeID,
            })
            .ToListAsync(cancellationToken);

        var classIds = students
            .Where(x => x.ClassCompositeID.HasValue)
            .Select(x => x.ClassCompositeID!.Value)
            .Distinct()
            .ToList();

        var sections = await _context.Sections
            .AsNoTracking()
            .Where(x => classIds.Contains(x.ID))
            .Select(x => new { x.ID, x.ClassName, x.SectionName })
            .ToListAsync(cancellationToken);

        var sectionById = sections.ToDictionary(x => x.ID);
        var studentById = students.ToDictionary(x => x.Reg_Id);

        var reportNotes = notes.Select(note =>
        {
            studentById.TryGetValue(note.StudentId, out var student);
            var className = "-";
            if (student?.ClassCompositeID is int classId && sectionById.TryGetValue(classId, out var section))
                className = FormatClassSectionDisplayName(section.ClassName, section.SectionName);

            return new StudentConductReportNoteDto
            {
                Id = note.Id,
                StudentId = note.StudentId,
                StudentName = student?.FullName ?? "-",
                ClassName = className,
                NoteDate = note.NoteDate,
                ConductTypeId = note.ConductTypeId,
                ConductTypeName = note.ConductTypeName,
                Remarks = note.Remarks,
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

        var classes = reportNotes
            .GroupBy(x => x.ClassName)
            .OrderBy(g => g.Key)
            .Select(g => new StudentConductDayReportClassDto
            {
                ClassName = g.Key,
                Count = g.Count(),
                Notes = g
                    .OrderBy(x => x.StudentName)
                    .ThenBy(x => x.ConductTypeName)
                    .ToList(),
            })
            .ToList();

        return new StudentConductDayReportDto
        {
            Date = date,
            TotalCount = reportNotes.Count,
            GoodCount = goodCount,
            BadCount = badCount,
            Classes = classes,
        };
    }

    private async Task<List<StudentConductNoteDto>> LoadNotesAsync(
        System.Linq.Expressions.Expression<Func<StudentConductNote, bool>> predicate,
        CancellationToken cancellationToken)
    {
        return await _context.StudentConductNotes
            .AsNoTracking()
            .Where(predicate)
            .OrderBy(x => x.NoteDate)
            .ThenBy(x => x.ConductType.SortOrder)
            .ThenBy(x => x.Id)
            .Select(x => new StudentConductNoteDto
            {
                Id = x.Id,
                StudentId = x.StudentId,
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
                    .Select(t => new StudentConductNoteTagDto
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
        var exists = await _context.StudentConductTypes.AsNoTracking()
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

    private static StudentConductTypeDto MapType(StudentConductType type, bool activeTagsOnly)
    {
        var tags = type.Tags
            .Where(t => !activeTagsOnly || t.IsActive)
            .OrderBy(t => t.SortOrder)
            .ThenBy(t => t.Name)
            .Select(t => new StudentConductTagDto
            {
                Id = t.Id,
                Name = t.Name,
                SortOrder = t.SortOrder,
                IsSystem = t.IsSystem,
                IsGood = t.IsGood,
                IsActive = t.IsActive,
            })
            .ToList();

        return new StudentConductTypeDto
        {
            Id = type.Id,
            Name = type.Name,
            SortOrder = type.SortOrder,
            IsSystem = type.IsSystem,
            IsActive = type.IsActive,
            Tags = tags,
        };
    }

    private static string FormatClassSectionDisplayName(string? className, string? sectionName)
    {
        var cn = (className ?? string.Empty).Trim();
        var sn = (sectionName ?? string.Empty).Trim();
        if (string.IsNullOrEmpty(cn))
            return string.IsNullOrEmpty(sn) ? "-" : sn;
        if (string.IsNullOrEmpty(sn) || string.Equals(cn, sn, StringComparison.OrdinalIgnoreCase))
            return cn;
        return $"{cn} - {sn}";
    }
}
