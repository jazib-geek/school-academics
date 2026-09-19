using Microsoft.EntityFrameworkCore;
using School.Application.Common;
using School.Application.DTOs;
using School.Application.Interfaces;
using School.Infrastructure.Data;
using School.Infrastructure.Entities;

namespace School.Application.Services;

public class ParentConductService : IParentConductService
{
    private readonly AppDbContext _context;

    public ParentConductService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<ParentConductInboxDto> GetInboxAsync(
        int familyDbId,
        int familyId,
        CancellationToken cancellationToken = default)
    {
        var students = await GetActiveFamilyStudentsAsync(familyId, cancellationToken);
        if (students.Count == 0)
        {
            return new ParentConductInboxDto();
        }

        var studentIds = students.Select(s => s.StudentId).ToList();
        var acknowledgedNoteIds = await _context.StudentConductParentAcks
            .AsNoTracking()
            .Where(a => a.FamilyDbId == familyDbId)
            .Select(a => a.NoteId)
            .ToListAsync(cancellationToken);

        var ackSet = acknowledgedNoteIds.ToHashSet();

        var notes = await _context.StudentConductNotes
            .AsNoTracking()
            .Where(n => studentIds.Contains(n.StudentId))
            .OrderByDescending(n => n.NoteDate)
            .ThenByDescending(n => n.Id)
            .Select(n => new
            {
                n.Id,
                n.StudentId,
                n.NoteDate,
                ConductTypeName = n.ConductType.Name,
                n.Remarks,
                Tags = n.NoteTags
                    .OrderBy(t => t.Tag.SortOrder)
                    .Select(t => new StudentConductNoteTagDto
                    {
                        Id = t.TagId,
                        Name = t.Tag.Name,
                        IsGood = t.Tag.IsGood,
                    })
                    .ToList(),
            })
            .ToListAsync(cancellationToken);

        var unreadByStudent = notes
            .Where(n => !ackSet.Contains(n.Id))
            .GroupBy(n => n.StudentId)
            .ToDictionary(g => g.Key, g => g.ToList());

        var resultStudents = new List<ParentConductInboxStudentDto>();
        var totalUnread = 0;

        foreach (var student in students)
        {
            unreadByStudent.TryGetValue(student.StudentId, out var unreadNotes);
            unreadNotes ??= [];
            totalUnread += unreadNotes.Count;

            ParentConductInboxLatestDto? latest = null;
            var first = unreadNotes.FirstOrDefault();
            if (first != null)
            {
                latest = new ParentConductInboxLatestDto
                {
                    NoteId = first.Id,
                    NoteDate = first.NoteDate,
                    Polarity = ConductPolarityHelper.FromTags(first.Tags),
                    ConductTypeName = first.ConductTypeName,
                    ItemLabels = first.Tags.Select(t => t.Name).Where(n => !string.IsNullOrWhiteSpace(n)).ToList()!,
                    Remarks = first.Remarks,
                };
            }

            resultStudents.Add(new ParentConductInboxStudentDto
            {
                StudentId = student.StudentId,
                StudentName = student.StudentName,
                UnreadCount = unreadNotes.Count,
                Latest = latest,
            });
        }

        return new ParentConductInboxDto
        {
            TotalUnread = totalUnread,
            ShouldPrompt = totalUnread > 0,
            Students = resultStudents,
        };
    }

    public async Task<ParentConductMonthReportDto> GetMonthReportAsync(
        int familyDbId,
        int familyId,
        int studentId,
        int month,
        int year,
        CancellationToken cancellationToken = default)
    {
        if (month is < 1 or > 12)
            throw new ArgumentException("Month must be between 1 and 12.");
        if (year is < 2000 or > 2100)
            throw new ArgumentException("Year is out of range.");

        var student = await EnsureFamilyStudentAsync(familyId, studentId, cancellationToken);

        var start = new DateOnly(year, month, 1);
        var end = start.AddMonths(1);

        var rawNotes = await _context.StudentConductNotes
            .AsNoTracking()
            .Where(n => n.StudentId == studentId && n.NoteDate >= start && n.NoteDate < end)
            .OrderByDescending(n => n.NoteDate)
            .ThenBy(n => n.ConductType.SortOrder)
            .ThenBy(n => n.Id)
            .Select(n => new
            {
                n.Id,
                n.NoteDate,
                n.ConductTypeId,
                ConductTypeName = n.ConductType.Name,
                n.Remarks,
                n.RecordedByName,
                n.CreatedAtPkt,
                Tags = n.NoteTags
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

        var noteIds = rawNotes.Select(n => n.Id).ToList();
        var ackIds = noteIds.Count == 0
            ? new HashSet<int>()
            : (await _context.StudentConductParentAcks
                .AsNoTracking()
                .Where(a => a.FamilyDbId == familyDbId && noteIds.Contains(a.NoteId))
                .Select(a => a.NoteId)
                .ToListAsync(cancellationToken))
              .ToHashSet();

        var notes = rawNotes.Select(n =>
        {
            var tags = n.Tags;
            var polarity = ConductPolarityHelper.FromTags(tags);
            return new ParentConductNoteDto
            {
                Id = n.Id,
                NoteDate = n.NoteDate,
                Weekday = ConductPolarityHelper.WeekdayShort(n.NoteDate),
                Polarity = polarity,
                ConductTypeId = n.ConductTypeId,
                ConductTypeName = n.ConductTypeName,
                Tags = tags,
                Remarks = n.Remarks,
                RecordedByName = n.RecordedByName,
                IsAcknowledged = ackIds.Contains(n.Id),
                CreatedAtPkt = n.CreatedAtPkt,
            };
        }).ToList();

        var summary = new ParentConductMonthSummaryDto
        {
            Good = notes.Count(n => n.Polarity == ConductPolarities.Good),
            Bad = notes.Count(n => n.Polarity == ConductPolarities.Bad),
            Mixed = notes.Count(n => n.Polarity == ConductPolarities.Mixed),
            Total = notes.Count,
            Unread = notes.Count(n => !n.IsAcknowledged),
        };

        var calendarDays = notes
            .GroupBy(n => n.NoteDate)
            .OrderBy(g => g.Key)
            .Select(g => new ParentConductCalendarDayDto
            {
                Date = g.Key,
                Polarity = ConductPolarityHelper.CombineDay(g.Select(x => x.Polarity)),
            })
            .ToList();

        return new ParentConductMonthReportDto
        {
            StudentId = student.StudentId,
            StudentName = student.StudentName,
            ClassName = student.ClassName,
            FamilyId = familyId,
            Year = year,
            Month = month,
            Summary = summary,
            Notes = notes,
            CalendarDays = calendarDays,
        };
    }

    public async Task AcknowledgeAsync(
        int familyDbId,
        int familyId,
        ParentConductAcknowledgeRequestDto request,
        CancellationToken cancellationToken = default)
    {
        var noteIds = (request.NoteIds ?? [])
            .Where(id => id > 0)
            .Distinct()
            .ToList();

        if (noteIds.Count == 0)
            throw new ArgumentException("At least one note id is required.");

        var studentIds = await _context.Students
            .AsNoTracking()
            .Where(s => s.Family_Code == familyId && s.IsActive == true)
            .Select(s => s.Reg_Id)
            .ToListAsync(cancellationToken);

        var validNoteIds = await _context.StudentConductNotes
            .AsNoTracking()
            .Where(n => noteIds.Contains(n.Id) && studentIds.Contains(n.StudentId))
            .Select(n => n.Id)
            .ToListAsync(cancellationToken);

        if (validNoteIds.Count == 0)
            throw new KeyNotFoundException("No matching conduct notes found for this family.");

        var alreadyAcked = await _context.StudentConductParentAcks
            .AsNoTracking()
            .Where(a => a.FamilyDbId == familyDbId && validNoteIds.Contains(a.NoteId))
            .Select(a => a.NoteId)
            .ToListAsync(cancellationToken);

        var alreadySet = alreadyAcked.ToHashSet();
        var now = PakistanTime.Now;
        var toAdd = validNoteIds
            .Where(id => !alreadySet.Contains(id))
            .Select(id => new StudentConductParentAck
            {
                FamilyDbId = familyDbId,
                NoteId = id,
                AcknowledgedAtPkt = now,
            })
            .ToList();

        if (toAdd.Count > 0)
        {
            _context.StudentConductParentAcks.AddRange(toAdd);
            await _context.SaveChangesAsync(cancellationToken);
        }
    }

    private async Task<List<FamilyStudentRow>> GetActiveFamilyStudentsAsync(
        int familyId,
        CancellationToken cancellationToken)
    {
        return await _context.Students
            .AsNoTracking()
            .Where(s => s.Family_Code == familyId && s.IsActive == true)
            .OrderBy(s => s.FullName)
            .Select(s => new FamilyStudentRow(
                s.Reg_Id,
                s.FullName ?? "-",
                s.Section != null ? s.Section.ClassName : null))
            .ToListAsync(cancellationToken);
    }

    private async Task<FamilyStudentRow> EnsureFamilyStudentAsync(
        int familyId,
        int studentId,
        CancellationToken cancellationToken)
    {
        var student = await _context.Students
            .AsNoTracking()
            .Where(s => s.Reg_Id == studentId && s.Family_Code == familyId && s.IsActive == true)
            .Select(s => new FamilyStudentRow(
                s.Reg_Id,
                s.FullName ?? "-",
                s.Section != null ? s.Section.ClassName : null))
            .FirstOrDefaultAsync(cancellationToken);

        if (student is null)
            throw new UnauthorizedAccessException("This student is not part of your family.");

        return student;
    }

    private sealed record FamilyStudentRow(int StudentId, string StudentName, string? ClassName);
}
