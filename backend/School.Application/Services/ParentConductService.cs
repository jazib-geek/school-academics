using Microsoft.EntityFrameworkCore;
using School.Application.Common;
using School.Application.DTOs;
using School.Application.Interfaces;
using School.Infrastructure.Data;

namespace School.Application.Services;

/// <summary>Family portal conduct reads/acks use <c>StudentConductNote.ParentAcknowledgedAtPkt</c> (tblStudentConductParentAck is deprecated).</summary>
public class ParentConductService : IParentConductService
{
    private readonly AppDbContext _context;

    public ParentConductService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<ParentConductInboxDto> GetInboxAsync(
        int familyId,
        CancellationToken cancellationToken = default)
    {
        var students = await GetActiveFamilyStudentsAsync(familyId, cancellationToken);
        if (students.Count == 0)
        {
            return new ParentConductInboxDto();
        }

        var studentIds = students.Select(s => s.StudentId).ToList();

        var notes = await _context.StudentConductNotes
            .AsNoTracking()
            .Where(n => studentIds.Contains(n.StudentId) && n.ParentAcknowledgedAtPkt == null)
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

    public async Task<ParentConductUnreadCountDto> GetUnreadCountAsync(
        int familyId,
        int studentId,
        CancellationToken cancellationToken = default)
    {
        await EnsureFamilyStudentAsync(familyId, studentId, cancellationToken);

        var unreadNoteIds = await _context.StudentConductNotes
            .AsNoTracking()
            .Where(n => n.StudentId == studentId && n.ParentAcknowledgedAtPkt == null)
            .OrderByDescending(n => n.NoteDate)
            .ThenByDescending(n => n.Id)
            .Select(n => n.Id)
            .ToListAsync(cancellationToken);

        return new ParentConductUnreadCountDto
        {
            StudentId = studentId,
            UnreadCount = unreadNoteIds.Count,
            UnreadNoteIds = unreadNoteIds,
        };
    }

    public async Task<ParentConductMonthReportDto> GetMonthReportAsync(
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
                n.ParentAcknowledgedAtPkt,
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
                IsAcknowledged = n.ParentAcknowledgedAtPkt != null,
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

        var studentIds = await GetActiveFamilyStudentIdsAsync(familyId, cancellationToken);

        var matchingCount = await _context.StudentConductNotes
            .AsNoTracking()
            .CountAsync(
                n => noteIds.Contains(n.Id) && studentIds.Contains(n.StudentId),
                cancellationToken);

        if (matchingCount == 0)
            throw new KeyNotFoundException("No matching conduct notes found for this family.");

        var now = PakistanTime.Now;
        await _context.StudentConductNotes
            .Where(n => noteIds.Contains(n.Id) && studentIds.Contains(n.StudentId) && n.ParentAcknowledgedAtPkt == null)
            .ExecuteUpdateAsync(
                s => s.SetProperty(n => n.ParentAcknowledgedAtPkt, now),
                cancellationToken);
    }

    public async Task<ParentConductAcknowledgeAllResultDto> AcknowledgeAllForStudentAsync(
        int familyId,
        int studentId,
        CancellationToken cancellationToken = default)
    {
        await EnsureFamilyStudentAsync(familyId, studentId, cancellationToken);

        var now = PakistanTime.Now;
        var acknowledgedCount = await _context.StudentConductNotes
            .Where(n => n.StudentId == studentId && n.ParentAcknowledgedAtPkt == null)
            .ExecuteUpdateAsync(
                s => s.SetProperty(n => n.ParentAcknowledgedAtPkt, now),
                cancellationToken);

        return new ParentConductAcknowledgeAllResultDto
        {
            AcknowledgedCount = acknowledgedCount,
        };
    }

    private async Task<List<int>> GetActiveFamilyStudentIdsAsync(
        int familyId,
        CancellationToken cancellationToken)
    {
        return await _context.Students
            .AsNoTracking()
            .Where(s => s.Family_Code == familyId && s.IsActive == true)
            .Select(s => s.Reg_Id)
            .ToListAsync(cancellationToken);
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
