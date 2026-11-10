using Microsoft.EntityFrameworkCore;
using School.Application.Common;
using School.Application.DTOs;
using School.Application.Interfaces;
using School.Infrastructure.Data;
using School.Infrastructure.Entities;

namespace School.Application.Services;

public class DisciplineService : IDisciplineService
{
    private readonly AppDbContext _context;
    private readonly ICampusNotificationService _notificationService;

    public DisciplineService(AppDbContext context, ICampusNotificationService notificationService)
    {
        _context = context;
        _notificationService = notificationService;
    }

    public Task<DisciplineDayDto> GetMyDayAsync(int employeeId, DateOnly date, CancellationToken cancellationToken = default)
    {
        if (date > PakistanTime.Today || date.Year < 2000)
            throw new ArgumentException("That day is not available.");
        return LoadEmployeeDayAsync(employeeId, date, cancellationToken);
    }

    public async Task<DisciplineDayDto> SaveRoundAsync(
        int employeeId,
        DisciplineRoundSaveDto request,
        CancellationToken cancellationToken = default)
    {
        EnsureToday(request.Date);
        await EnsureInchargeAsync(employeeId, cancellationToken);
        await EnsureOpenAsync(employeeId, request.Date, cancellationToken);

        var status = (request.Status ?? string.Empty).Trim();
        if (!DisciplineCatalog.Statuses.Contains(status))
            throw new ArgumentException("Choose clear, an issue, or skipped.");

        var roundExists = await _context.DisciplineRounds.AsNoTracking()
            .AnyAsync(x => x.Id == request.RoundId && x.IsActive, cancellationToken);
        if (!roundExists)
            throw new ArgumentException("That round is not available.");

        var note = string.IsNullOrWhiteSpace(request.Note) ? null : request.Note.Trim();
        if (note is { Length: > 300 })
            throw new ArgumentException("The note must be 300 characters or fewer.");

        var row = await _context.DisciplineDayRounds.FirstOrDefaultAsync(
            x => x.EmployeeId == employeeId && x.RoundDate == request.Date && x.RoundId == request.RoundId,
            cancellationToken);

        if (row == null)
        {
            row = new DisciplineDayRound
            {
                EmployeeId = employeeId,
                RoundDate = request.Date,
                RoundId = request.RoundId,
            };
            _context.DisciplineDayRounds.Add(row);
        }

        row.Status = status;
        row.Note = note;
        row.UpdatedAtPkt = PakistanTime.Now;
        await _context.SaveChangesAsync(cancellationToken);
        return await LoadEmployeeDayAsync(employeeId, request.Date, cancellationToken);
    }

    public async Task<DisciplineDayDto> SaveFindingAsync(
        int employeeId,
        string employeeName,
        DisciplineFindingSaveDto request,
        CancellationToken cancellationToken = default)
    {
        EnsureToday(request.Date);
        await EnsureInchargeAsync(employeeId, cancellationToken);
        await EnsureOpenAsync(employeeId, request.Date, cancellationToken);

        var kind = (request.Kind ?? string.Empty).Trim();
        if (!DisciplineCatalog.Kinds.Contains(kind))
            throw new ArgumentException("Choose a concern, praise, or something worth noting.");

        var place = (request.Place ?? string.Empty).Trim();
        var happened = (request.WhatHappened ?? string.Empty).Trim();
        var done = string.IsNullOrWhiteSpace(request.WhatWasDone) ? null : request.WhatWasDone.Trim();
        if (place.Length == 0)
            throw new ArgumentException("Say where this was.");
        if (place.Length > 80)
            throw new ArgumentException("Place must be 80 characters or fewer.");
        if (happened.Length == 0)
            throw new ArgumentException("Say what you found.");
        if (happened.Length > 500)
            throw new ArgumentException("What happened must be 500 characters or fewer.");
        if (done is { Length: > 500 })
            throw new ArgumentException("What you did must be 500 characters or fewer.");

        if (request.RoundId is > 0)
        {
            var roundExists = await _context.DisciplineRounds.AsNoTracking()
                .AnyAsync(x => x.Id == request.RoundId && x.IsActive, cancellationToken);
            if (!roundExists)
                throw new ArgumentException("That round is not available.");
        }
        else
        {
            request.RoundId = null;
        }

        var studentIds = (request.StudentIds ?? [])
            .Where(id => id > 0)
            .Distinct()
            .ToList();
        if (studentIds.Count > 0)
        {
            var found = await _context.Students.AsNoTracking()
                .CountAsync(x => studentIds.Contains(x.Reg_Id) && x.IsActive == true, cancellationToken);
            if (found != studentIds.Count)
                throw new ArgumentException("One or more students could not be found.");
        }

        var previousStudentIds = new List<int>();
        var wasConcern = false;
        DisciplineFinding finding;
        if (request.Id is > 0)
        {
            finding = await _context.DisciplineFindings
                .Include(x => x.Students)
                .FirstOrDefaultAsync(x => x.Id == request.Id, cancellationToken)
                ?? throw new KeyNotFoundException("Finding not found.");
            if (finding.EmployeeId != employeeId || finding.FindingDate != request.Date)
                throw new KeyNotFoundException("Finding not found.");

            previousStudentIds = finding.Students.Select(x => x.StudentId).ToList();
            wasConcern = finding.Kind == DisciplineCatalog.KindConcern;
            finding.UpdatedAtPkt = PakistanTime.Now;
            finding.Students.Clear();
        }
        else
        {
            finding = new DisciplineFinding
            {
                EmployeeId = employeeId,
                FindingDate = request.Date,
                CreatedAtPkt = PakistanTime.Now,
            };
            _context.DisciplineFindings.Add(finding);
        }

        finding.RoundId = request.RoundId;
        finding.Kind = kind;
        finding.Place = place;
        finding.WhatHappened = happened;
        finding.WhatWasDone = done;
        foreach (var studentId in studentIds)
            finding.Students.Add(new DisciplineFindingStudent { StudentId = studentId });

        await _context.SaveChangesAsync(cancellationToken);

        var affected = previousStudentIds.Concat(studentIds).Distinct().ToList();
        if (wasConcern || kind == DisciplineCatalog.KindConcern)
            await SyncConcernNotesAsync(request.Date, affected, employeeId, CleanName(employeeName), cancellationToken);

        if (kind == DisciplineCatalog.KindConcern && studentIds.Count > 0)
        {
            await _notificationService.PublishAsync(
                CampusNotificationFactory.Create(
                    CampusNotificationTypes.StudentConduct,
                    "Discipline concern recorded",
                    $"{CleanName(employeeName)} recorded a discipline concern.",
                    "/campus/discipline",
                    CampusNotificationSeverities.Warning,
                    ["view_discipline", "view_student_conduct"]),
                cancellationToken);
        }

        return await LoadEmployeeDayAsync(employeeId, request.Date, cancellationToken);
    }

    public async Task<DisciplineDayDto> DeleteFindingAsync(
        int employeeId,
        string employeeName,
        int findingId,
        CancellationToken cancellationToken = default)
    {
        await EnsureInchargeAsync(employeeId, cancellationToken);
        var finding = await _context.DisciplineFindings
            .Include(x => x.Students)
            .FirstOrDefaultAsync(x => x.Id == findingId && x.EmployeeId == employeeId, cancellationToken)
            ?? throw new KeyNotFoundException("Finding not found.");

        EnsureToday(finding.FindingDate);
        await EnsureOpenAsync(employeeId, finding.FindingDate, cancellationToken);

        var date = finding.FindingDate;
        var studentIds = finding.Students.Select(x => x.StudentId).ToList();
        var wasConcern = finding.Kind == DisciplineCatalog.KindConcern;
        _context.DisciplineFindings.Remove(finding);
        await _context.SaveChangesAsync(cancellationToken);

        if (wasConcern)
            await SyncConcernNotesAsync(date, studentIds, employeeId, CleanName(employeeName), cancellationToken);

        return await LoadEmployeeDayAsync(employeeId, date, cancellationToken);
    }

    public async Task<DisciplineDayDto> SubmitDayReportAsync(
        int employeeId,
        string employeeName,
        DisciplineDayReportSaveDto request,
        CancellationToken cancellationToken = default)
    {
        EnsureToday(request.Date);
        await EnsureInchargeAsync(employeeId, cancellationToken);

        var existing = await _context.DisciplineDayReports.AsNoTracking()
            .AnyAsync(x => x.EmployeeId == employeeId && x.ReportDate == request.Date, cancellationToken);
        if (existing)
            throw new InvalidOperationException("Today's report is already submitted.");

        var what = (request.WhatWasDone ?? string.Empty).Trim();
        var extra = string.IsNullOrWhiteSpace(request.AnythingElse) ? null : request.AnythingElse.Trim();
        if (what.Length == 0)
            throw new ArgumentException("Say what you did to keep discipline today.");
        if (what.Length > 1000)
            throw new ArgumentException("What you did must be 1000 characters or fewer.");
        if (extra is { Length: > 1000 })
            throw new ArgumentException("Anything else must be 1000 characters or fewer.");

        var roundIds = await _context.DisciplineRounds.AsNoTracking()
            .Where(x => x.IsActive)
            .Select(x => x.Id)
            .ToListAsync(cancellationToken);
        var marked = await _context.DisciplineDayRounds.AsNoTracking()
            .Where(x => x.EmployeeId == employeeId && x.RoundDate == request.Date)
            .Select(x => x.RoundId)
            .ToListAsync(cancellationToken);
        if (roundIds.Any(id => !marked.Contains(id)))
            throw new ArgumentException("Mark every round before you close the day.");

        _context.DisciplineDayReports.Add(new DisciplineDayReport
        {
            EmployeeId = employeeId,
            ReportDate = request.Date,
            WhatWasDone = what,
            AnythingElse = extra,
            SubmittedAtPkt = PakistanTime.Now,
        });
        await _context.SaveChangesAsync(cancellationToken);

        await _notificationService.PublishAsync(
            CampusNotificationFactory.Create(
                CampusNotificationTypes.DisciplineDayReport,
                "Discipline day report",
                $"{CleanName(employeeName)} submitted today's discipline report.",
                "/campus/discipline",
                CampusNotificationSeverities.Info,
                ["view_discipline"]),
            cancellationToken);

        return await LoadEmployeeDayAsync(employeeId, request.Date, cancellationToken);
    }

    public async Task<DisciplineCampusDayDto> GetCampusDayAsync(DateOnly date, CancellationToken cancellationToken = default)
    {
        if (date.Year is < 2000 or > 2100)
            throw new ArgumentException("Date is out of range.");

        var incharges = await _context.Employees.AsNoTracking()
            .Where(x => x.IsActive == true && x.IsDisciplineIncharge)
            .OrderBy(x => x.EmployeeName)
            .Select(x => new { x.ID, x.EmployeeName })
            .ToListAsync(cancellationToken);

        var rounds = await ActiveRoundsAsync(cancellationToken);
        var employeeIds = incharges.Select(x => x.ID).ToList();

        var dayRounds = await _context.DisciplineDayRounds.AsNoTracking()
            .Where(x => x.RoundDate == date && employeeIds.Contains(x.EmployeeId))
            .ToListAsync(cancellationToken);
        var findings = await _context.DisciplineFindings.AsNoTracking()
            .Include(x => x.Students)
            .Where(x => x.FindingDate == date && employeeIds.Contains(x.EmployeeId))
            .OrderBy(x => x.CreatedAtPkt)
            .ToListAsync(cancellationToken);
        var reports = await _context.DisciplineDayReports.AsNoTracking()
            .Where(x => x.ReportDate == date && employeeIds.Contains(x.EmployeeId))
            .ToListAsync(cancellationToken);

        var studentLabels = await LoadStudentLabelsAsync(
            findings.SelectMany(x => x.Students.Select(s => s.StudentId)).Distinct().ToList(),
            cancellationToken);

        return new DisciplineCampusDayDto
        {
            Date = date,
            Incharges = incharges.Select(person =>
            {
                var report = reports.FirstOrDefault(x => x.EmployeeId == person.ID);
                return new DisciplineCampusInchargeDto
                {
                    EmployeeId = person.ID,
                    EmployeeName = string.IsNullOrWhiteSpace(person.EmployeeName) ? "Staff" : person.EmployeeName.Trim(),
                    Submitted = report != null,
                    Rounds = MapRounds(rounds, dayRounds.Where(x => x.EmployeeId == person.ID)),
                    Findings = findings
                        .Where(x => x.EmployeeId == person.ID)
                        .Select(x => MapFinding(x, studentLabels))
                        .ToList(),
                    Report = report == null ? null : MapReport(report),
                };
            }).ToList(),
        };
    }

    private async Task<DisciplineDayDto> LoadEmployeeDayAsync(
        int employeeId,
        DateOnly date,
        CancellationToken cancellationToken)
    {
        await EnsureInchargeAsync(employeeId, cancellationToken);
        var rounds = await ActiveRoundsAsync(cancellationToken);
        var dayRounds = await _context.DisciplineDayRounds.AsNoTracking()
            .Where(x => x.EmployeeId == employeeId && x.RoundDate == date)
            .ToListAsync(cancellationToken);
        var findings = await _context.DisciplineFindings.AsNoTracking()
            .Include(x => x.Students)
            .Where(x => x.EmployeeId == employeeId && x.FindingDate == date)
            .OrderBy(x => x.CreatedAtPkt)
            .ToListAsync(cancellationToken);
        var report = await _context.DisciplineDayReports.AsNoTracking()
            .FirstOrDefaultAsync(x => x.EmployeeId == employeeId && x.ReportDate == date, cancellationToken);
        var studentLabels = await LoadStudentLabelsAsync(
            findings.SelectMany(x => x.Students.Select(s => s.StudentId)).Distinct().ToList(),
            cancellationToken);

        return new DisciplineDayDto
        {
            Date = date,
            Submitted = report != null,
            Rounds = MapRounds(rounds, dayRounds),
            Findings = findings.Select(x => MapFinding(x, studentLabels)).ToList(),
            Report = report == null ? null : MapReport(report),
        };
    }

    private async Task SyncConcernNotesAsync(
        DateOnly date,
        IReadOnlyCollection<int> studentIds,
        int employeeId,
        string employeeName,
        CancellationToken cancellationToken)
    {
        var ids = studentIds.Where(id => id > 0).Distinct().ToList();
        if (ids.Count == 0)
            return;

        var now = PakistanTime.Now;
        var findings = await _context.DisciplineFindings
            .Include(x => x.Students)
            .Where(x => x.FindingDate == date
                && x.Kind == DisciplineCatalog.KindConcern
                && x.Students.Any(s => ids.Contains(s.StudentId)))
            .ToListAsync(cancellationToken);

        var notes = await _context.StudentConductNotes
            .Where(x => ids.Contains(x.StudentId)
                && x.NoteDate == date
                && x.ConductTypeId == StudentConductCatalog.DisciplineId)
            .ToListAsync(cancellationToken);

        foreach (var studentId in ids)
        {
            var studentFindings = findings
                .Where(x => x.Students.Any(s => s.StudentId == studentId))
                .OrderBy(x => x.CreatedAtPkt)
                .ThenBy(x => x.Id)
                .ToList();
            var note = notes.FirstOrDefault(x => x.StudentId == studentId);

            if (studentFindings.Count == 0)
            {
                if (note != null)
                    _context.StudentConductNotes.Remove(note);
                continue;
            }

            var remarks = BuildRemarks(studentFindings);
            if (note == null)
            {
                note = new StudentConductNote
                {
                    StudentId = studentId,
                    NoteDate = date,
                    ConductTypeId = StudentConductCatalog.DisciplineId,
                    Remarks = remarks,
                    RecordedByEmployeeId = employeeId,
                    RecordedByName = employeeName,
                    CreatedAtPkt = now,
                };
                _context.StudentConductNotes.Add(note);
                notes.Add(note);
            }
            else
            {
                note.Remarks = remarks;
                note.RecordedByEmployeeId = employeeId;
                note.RecordedByName = employeeName;
                note.UpdatedAtPkt = now;
            }
        }

        await _context.SaveChangesAsync(cancellationToken);

        foreach (var finding in findings)
        {
            foreach (var link in finding.Students.Where(s => ids.Contains(s.StudentId)))
            {
                var note = notes.FirstOrDefault(x => x.StudentId == link.StudentId);
                link.ConductNoteId = note != null && _context.Entry(note).State != EntityState.Deleted
                    ? note.Id
                    : null;
            }
        }

        await _context.SaveChangesAsync(cancellationToken);
    }

    private static string BuildRemarks(IEnumerable<DisciplineFinding> findings)
    {
        var parts = findings.Select(finding =>
        {
            var text = $"{finding.Place.Trim()}: {finding.WhatHappened.Trim()}";
            if (!string.IsNullOrWhiteSpace(finding.WhatWasDone))
                text += $" Action: {finding.WhatWasDone.Trim()}";
            return text;
        });
        var joined = string.Join(" | ", parts);
        return joined.Length <= 500 ? joined : joined[..497] + "...";
    }

    private async Task<List<DisciplineRound>> ActiveRoundsAsync(CancellationToken cancellationToken) =>
        await _context.DisciplineRounds.AsNoTracking()
            .Where(x => x.IsActive)
            .OrderBy(x => x.SortOrder)
            .ThenBy(x => x.Name)
            .ToListAsync(cancellationToken);

    private static List<DisciplineRoundDto> MapRounds(
        IEnumerable<DisciplineRound> rounds,
        IEnumerable<DisciplineDayRound> marked) 
    {
        var byRound = marked.ToDictionary(x => x.RoundId);
        return rounds.Select(round =>
        {
            byRound.TryGetValue(round.Id, out var row);
            return new DisciplineRoundDto
            {
                Id = round.Id,
                Name = round.Name,
                Status = row?.Status,
                Note = row?.Note,
            };
        }).ToList();
    }

    private static DisciplineFindingDto MapFinding(
        DisciplineFinding finding,
        IReadOnlyDictionary<int, (string Name, string ClassName)> students) => new()
    {
        Id = finding.Id,
        RoundId = finding.RoundId,
        Kind = finding.Kind,
        Place = finding.Place,
        WhatHappened = finding.WhatHappened,
        WhatWasDone = finding.WhatWasDone,
        Students = finding.Students
            .OrderBy(x => x.StudentId)
            .Select(link =>
            {
                students.TryGetValue(link.StudentId, out var label);
                return new DisciplineFindingStudentDto
                {
                    StudentId = link.StudentId,
                    StudentName = string.IsNullOrWhiteSpace(label.Name) ? "Student" : label.Name,
                    ClassName = string.IsNullOrWhiteSpace(label.ClassName) ? "" : label.ClassName,
                };
            })
            .ToList(),
    };

    private static DisciplineDayReportDto MapReport(DisciplineDayReport report) => new()
    {
        WhatWasDone = report.WhatWasDone,
        AnythingElse = report.AnythingElse,
        SubmittedAtPkt = report.SubmittedAtPkt,
    };

    private async Task<Dictionary<int, (string Name, string ClassName)>> LoadStudentLabelsAsync(
        List<int> studentIds,
        CancellationToken cancellationToken)
    {
        if (studentIds.Count == 0)
            return [];

        var students = await _context.Students.AsNoTracking()
            .Where(x => studentIds.Contains(x.Reg_Id))
            .Select(x => new { x.Reg_Id, x.FullName, x.ClassCompositeID })
            .ToListAsync(cancellationToken);

        var classIds = students
            .Where(x => x.ClassCompositeID.HasValue)
            .Select(x => x.ClassCompositeID!.Value)
            .Distinct()
            .ToList();
        var sections = await _context.Sections.AsNoTracking()
            .Where(x => classIds.Contains(x.ID))
            .Select(x => new { x.ID, x.ClassName, x.SectionName })
            .ToListAsync(cancellationToken);
        var sectionById = sections.ToDictionary(x => x.ID);

        return students.ToDictionary(
            x => x.Reg_Id,
            x =>
            {
                var className = "";
                if (x.ClassCompositeID is int classId && sectionById.TryGetValue(classId, out var section))
                    className = FormatClass(section.ClassName, section.SectionName);
                return (string.IsNullOrWhiteSpace(x.FullName) ? "Student" : x.FullName.Trim(), className);
            });
    }

    private static string FormatClass(string? className, string? sectionName)
    {
        var cn = (className ?? string.Empty).Trim();
        var sn = (sectionName ?? string.Empty).Trim();
        if (string.IsNullOrEmpty(cn))
            return sn;
        if (string.IsNullOrEmpty(sn) || string.Equals(cn, sn, StringComparison.OrdinalIgnoreCase))
            return cn;
        return $"{cn} - {sn}";
    }

    private async Task EnsureInchargeAsync(int employeeId, CancellationToken cancellationToken)
    {
        var ok = await _context.Employees.AsNoTracking()
            .AnyAsync(x => x.ID == employeeId && x.IsActive == true && x.IsDisciplineIncharge, cancellationToken);
        if (!ok)
            throw new UnauthorizedAccessException("Discipline is not assigned to you.");
    }

    private async Task EnsureOpenAsync(int employeeId, DateOnly date, CancellationToken cancellationToken)
    {
        var closed = await _context.DisciplineDayReports.AsNoTracking()
            .AnyAsync(x => x.EmployeeId == employeeId && x.ReportDate == date, cancellationToken);
        if (closed)
            throw new InvalidOperationException("Today's report is already submitted.");
    }

    private static void EnsureToday(DateOnly date)
    {
        if (date != PakistanTime.Today)
            throw new ArgumentException("Discipline is recorded for today only.");
    }

    private static string CleanName(string? name) =>
        string.IsNullOrWhiteSpace(name) ? "Staff" : name.Trim();
}
