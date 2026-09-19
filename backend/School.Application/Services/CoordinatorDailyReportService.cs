using Microsoft.EntityFrameworkCore;
using School.Application.Common;
using School.Application.DTOs;
using School.Application.Interfaces;
using School.Infrastructure.Data;
using School.Infrastructure.Entities;
using School.Infrastructure.Repositories;

namespace School.Application.Services;

public class CoordinatorDailyReportService : ICoordinatorDailyReportService
{
    private readonly ICoordinatorDailyReportRepository _repository;
    private readonly IAttendanceService _attendanceService;
    private readonly AppDbContext _context;

    public CoordinatorDailyReportService(
        ICoordinatorDailyReportRepository repository,
        IAttendanceService attendanceService,
        AppDbContext context)
    {
        _repository = repository;
        _attendanceService = attendanceService;
        _context = context;
    }

    public async Task<CoordinatorDailyReportDto?> GetReportAsync(
        int coordinatorEmployeeId,
        DateOnly reportDate,
        CancellationToken cancellationToken = default)
    {
        var entity = await _repository.GetByCoordinatorAndDateAsync(
            coordinatorEmployeeId,
            reportDate,
            asNoTracking: true,
            includeChildren: true,
            cancellationToken);

        return entity == null ? null : MapToDto(entity);
    }

    public async Task<CoordinatorHeadOfficeDayBundleDto> GetHeadOfficeDayBundleAsync(
        int coordinatorEmployeeId,
        DateOnly reportDate,
        CancellationToken cancellationToken = default)
    {
        var report = await GetReportAsync(coordinatorEmployeeId, reportDate, cancellationToken);
        var summaries = await BuildClassAttendanceSummariesAsync(reportDate, cancellationToken);

        return new CoordinatorHeadOfficeDayBundleDto
        {
            Report = report,
            ClassAttendanceSummaries = summaries
        };
    }

    public async Task<CoordinatorDailyReportCampusMonitorDto> GetCampusDailyReportingMonitorAsync(
        DateOnly reportDate,
        CancellationToken cancellationToken = default)
    {
        var summaries = await BuildClassAttendanceSummariesAsync(reportDate, cancellationToken);
        var entities = await _repository.GetAllForReportDateAsync(reportDate, cancellationToken);
        var reports = entities.Select(MapToDto).ToList();
        var checkIns = await BuildCoordinatorCheckInsAsync(reportDate, cancellationToken);
        var absentTeachers = await BuildAbsentTeachersMonitorAsync(reportDate, reports, cancellationToken);

        return new CoordinatorDailyReportCampusMonitorDto
        {
            ReportDate = reportDate,
            ClassAttendanceSummaries = summaries,
            CoordinatorReports = reports,
            CoordinatorCheckIns = checkIns,
            AbsentTeachers = absentTeachers,
        };
    }

    public async Task<CoordinatorDailyReportDto> UpsertArrivalAsync(
        int coordinatorEmployeeId,
        DateOnly reportDate,
        TimeOnly? arrivalTimeLocal,
        CancellationToken cancellationToken = default)
    {
        var report = await _repository.GetOrCreateTrackedAsync(coordinatorEmployeeId, reportDate, cancellationToken);
        var utc = DateTime.UtcNow;
        report.ArrivalTime = arrivalTimeLocal;
        report.ArrivalRecordedAtUtc = utc;
        report.UpdatedAtUtc = utc;
        await _repository.SaveChangesAsync(cancellationToken);

        return await ReloadDtoAsync(coordinatorEmployeeId, reportDate, cancellationToken)
               ?? throw new InvalidOperationException("Report not found after save.");
    }

    public async Task<CoordinatorDailyReportDto> UpsertAssemblyAsync(
        int coordinatorEmployeeId,
        DateOnly reportDate,
        CoordinatorAssemblyUpsertDto dto,
        CancellationToken cancellationToken = default)
    {
        var report = await _repository.GetOrCreateTrackedAsync(coordinatorEmployeeId, reportDate, cancellationToken);
        var utc = DateTime.UtcNow;
        report.AssemblyConductedPerPolicy = dto.AssemblyConductedPerPolicy;
        report.MoralLessonTopic = dto.MoralLessonTopic;
        report.UniformCheckNotes = dto.UniformCheckNotes;
        report.CampusCleanlinessNotes = dto.CampusCleanlinessNotes;
        report.TeachersInClassesNotes = dto.TeachersInClassesNotes;
        report.UpdatedAtUtc = utc;
        await _repository.SaveChangesAsync(cancellationToken);

        return await ReloadDtoAsync(coordinatorEmployeeId, reportDate, cancellationToken)
               ?? throw new InvalidOperationException("Report not found after save.");
    }

    public async Task<CoordinatorDailyReportDto> ReplaceModDutiesAsync(
        int coordinatorEmployeeId,
        DateOnly reportDate,
        IReadOnlyList<CoordinatorModDutyInputDto> duties,
        CancellationToken cancellationToken = default)
    {
        foreach (var d in duties)
        {
            if (!CoordinatorModDutyScopes.IsValid(d.DutyScope))
            {
                throw new ArgumentException($"Invalid duty scope: {d.DutyScope}", nameof(duties));
            }

            if (d.OnDutyEmployeeId <= 0)
            {
                throw new ArgumentException("OnDutyEmployeeId must be a positive employee ID.", nameof(duties));
            }
        }

        var report = await _repository.GetOrCreateTrackedAsync(coordinatorEmployeeId, reportDate, cancellationToken);
        var utc = DateTime.UtcNow;
        report.ModDuties.Clear();
        foreach (var d in duties)
        {
            report.ModDuties.Add(new CoordinatorModDuty
            {
                DutyScope = d.DutyScope,
                DutyScopeOtherLabel = d.DutyScopeOtherLabel,
                OnDutyEmployeeId = d.OnDutyEmployeeId,
                Notes = d.Notes,
                CreatedAtUtc = utc
            });
        }

        report.UpdatedAtUtc = utc;
        await _repository.SaveChangesAsync(cancellationToken);

        return await ReloadDtoAsync(coordinatorEmployeeId, reportDate, cancellationToken)
               ?? throw new InvalidOperationException("Report not found after save.");
    }

    public async Task<CoordinatorDailyReportDto> ReplaceAbsentTeachersAsync(
        int coordinatorEmployeeId,
        DateOnly reportDate,
        IReadOnlyList<CoordinatorAbsentTeacherInputDto> rows,
        CancellationToken cancellationToken = default)
    {
        foreach (var r in rows)
        {
            if (r.EmployeeId <= 0)
            {
                throw new ArgumentException("EmployeeId must be positive.", nameof(rows));
            }
        }

        var report = await _repository.GetOrCreateTrackedAsync(coordinatorEmployeeId, reportDate, cancellationToken);
        var utc = DateTime.UtcNow;
        report.AbsentTeachers.Clear();
        foreach (var r in rows)
        {
            report.AbsentTeachers.Add(new CoordinatorDailyAbsentTeacher
            {
                EmployeeId = r.EmployeeId,
                Notes = r.Notes,
                CreatedAtUtc = utc
            });
        }

        report.UpdatedAtUtc = utc;
        await _repository.SaveChangesAsync(cancellationToken);

        return await ReloadDtoAsync(coordinatorEmployeeId, reportDate, cancellationToken)
               ?? throw new InvalidOperationException("Report not found after save.");
    }

    public async Task<CoordinatorDailyReportDto> ReplaceWorkingReportLinesAsync(
        int coordinatorEmployeeId,
        DateOnly reportDate,
        IReadOnlyList<CoordinatorWorkingReportLineInputDto> lines,
        CancellationToken cancellationToken = default)
    {
        foreach (var line in lines)
        {
            if (string.IsNullOrWhiteSpace(line.ActivityDescription))
            {
                throw new ArgumentException("Each line must have ActivityDescription.", nameof(lines));
            }
        }

        var report = await _repository.GetOrCreateTrackedAsync(coordinatorEmployeeId, reportDate, cancellationToken);
        var utc = DateTime.UtcNow;
        report.WorkingReportLines.Clear();
        foreach (var line in lines)
        {
            report.WorkingReportLines.Add(new CoordinatorWorkingReportLine
            {
                LineOrder = line.LineOrder,
                ActivityDescription = line.ActivityDescription.Trim(),
                CreatedAtUtc = utc
            });
        }

        report.UpdatedAtUtc = utc;
        await _repository.SaveChangesAsync(cancellationToken);

        return await ReloadDtoAsync(coordinatorEmployeeId, reportDate, cancellationToken)
               ?? throw new InvalidOperationException("Report not found after save.");
    }

    private async Task<CoordinatorDailyReportDto?> ReloadDtoAsync(
        int coordinatorEmployeeId,
        DateOnly reportDate,
        CancellationToken cancellationToken)
    {
        var entity = await _repository.GetByCoordinatorAndDateAsync(
            coordinatorEmployeeId,
            reportDate,
            asNoTracking: true,
            includeChildren: true,
            cancellationToken);

        return entity == null ? null : MapToDto(entity);
    }

    private static CoordinatorDailyReportDto MapToDto(CoordinatorDailyReport r)
    {
        return new CoordinatorDailyReportDto
        {
            Id = r.Id,
            CoordinatorEmployeeId = r.CoordinatorEmployeeId,
            CoordinatorEmployeeName = r.Coordinator?.EmployeeName,
            ReportDate = r.ReportDate,
            ArrivalTime = r.ArrivalTime,
            ArrivalRecordedAtUtc = r.ArrivalRecordedAtUtc,
            AssemblyConductedPerPolicy = r.AssemblyConductedPerPolicy,
            MoralLessonTopic = r.MoralLessonTopic,
            UniformCheckNotes = r.UniformCheckNotes,
            CampusCleanlinessNotes = r.CampusCleanlinessNotes,
            TeachersInClassesNotes = r.TeachersInClassesNotes,
            CreatedAtUtc = r.CreatedAtUtc,
            UpdatedAtUtc = r.UpdatedAtUtc,
            ModDuties = r.ModDuties
                .OrderBy(x => x.Id)
                .Select(m => new CoordinatorModDutyDto
                {
                    Id = m.Id,
                    DutyScope = m.DutyScope,
                    DutyScopeOtherLabel = m.DutyScopeOtherLabel,
                    OnDutyEmployeeId = m.OnDutyEmployeeId,
                    OnDutyEmployeeName = m.OnDutyEmployee?.EmployeeName,
                    Notes = m.Notes
                })
                .ToList(),
            AbsentTeachers = r.AbsentTeachers
                .OrderBy(x => x.Id)
                .Select(a => new CoordinatorAbsentTeacherDto
                {
                    Id = a.Id,
                    EmployeeId = a.EmployeeId,
                    EmployeeName = a.Employee?.EmployeeName,
                    Notes = a.Notes
                })
                .ToList(),
            WorkingReportLines = r.WorkingReportLines
                .OrderBy(x => x.LineOrder)
                .ThenBy(x => x.Id)
                .Select(w => new CoordinatorWorkingReportLineDto
                {
                    Id = w.Id,
                    LineOrder = w.LineOrder,
                    ActivityDescription = w.ActivityDescription
                })
                .ToList()
        };
    }

    private async Task<IReadOnlyList<CoordinatorClassAttendanceSummaryDto>> BuildClassAttendanceSummariesAsync(
        DateOnly reportDate,
        CancellationToken cancellationToken)
    {
        var date = reportDate.ToDateTime(TimeOnly.MinValue);
        var report = await _attendanceService.GetAttendanceReportAsync(date, date, null, null);

        return report.Items
            .GroupBy(i => i.ClassSectionCompositeId)
            .Select(g => new CoordinatorClassAttendanceSummaryDto
            {
                ClassSectionCompositeId = g.Key,
                ClassName = g.Select(x => x.ClassName).FirstOrDefault() ?? string.Empty,
                PresentCount = g.Count(x =>
                    x.Status == StudentAttendanceStatuses.Present ||
                    x.Status == StudentAttendanceStatuses.Late),
                TotalCount = g.Count()
            })
            .OrderBy(x => x.ClassName)
            .ToList();
    }

    private async Task<IReadOnlyList<CoordinatorCiFromAttendanceDto>> BuildCoordinatorCheckInsAsync(
        DateOnly reportDate,
        CancellationToken cancellationToken)
    {
        var targetDate = reportDate.ToDateTime(TimeOnly.MinValue);
        var dayEnd = targetDate.AddDays(1);

        var coordinators = await (
            from employee in _context.Employees.AsNoTracking()
            where employee.IsActive == true &&
                  employee.DesignationID == EmployeeDesignations.Coordinator
            orderby employee.EmployeeName
            select new { employee.ID, employee.EmployeeName })
            .ToListAsync(cancellationToken);

        if (coordinators.Count == 0)
            return Array.Empty<CoordinatorCiFromAttendanceDto>();

        var coordinatorIds = coordinators.Select(c => c.ID).ToList();

        var punches = await _context.EmployeeAttendances
            .AsNoTracking()
            .Where(a =>
                a.EmpID != null &&
                coordinatorIds.Contains(a.EmpID.Value) &&
                a.Date.HasValue &&
                a.Date.Value >= targetDate &&
                a.Date.Value < dayEnd)
            .Select(a => new { EmpId = a.EmpID!.Value, a.Time })
            .ToListAsync(cancellationToken);

        var timeByEmp = punches
            .GroupBy(p => p.EmpId)
            .ToDictionary(g => g.Key, g => g.Select(x => x.Time).FirstOrDefault(t => !string.IsNullOrWhiteSpace(t)));

        return coordinators
            .Select(c => new CoordinatorCiFromAttendanceDto
            {
                EmployeeId = c.ID,
                EmployeeName = c.EmployeeName?.Trim() ?? string.Empty,
                CheckInTime = timeByEmp.TryGetValue(c.ID, out var time) ? NormalizeCheckInTime(time) : null,
            })
            .ToList();
    }

    private async Task<IReadOnlyList<CampusAbsentTeacherMonitorDto>> BuildAbsentTeachersMonitorAsync(
        DateOnly reportDate,
        IReadOnlyList<CoordinatorDailyReportDto> reports,
        CancellationToken cancellationToken)
    {
        var targetDate = reportDate.ToDateTime(TimeOnly.MinValue);
        var dayEnd = targetDate.AddDays(1);

        var presentEmpIds = await _context.EmployeeAttendances
            .AsNoTracking()
            .Where(a =>
                a.EmpID != null &&
                a.Date.HasValue &&
                a.Date.Value >= targetDate &&
                a.Date.Value < dayEnd)
            .Select(a => a.EmpID!.Value)
            .Distinct()
            .ToListAsync(cancellationToken);

        var presentSet = presentEmpIds.ToHashSet();

        var detected = await (
            from employee in _context.Employees.AsNoTracking()
            join designation in _context.Designations.AsNoTracking()
                on employee.DesignationID equals designation.ID into designationJoin
            from designation in designationJoin.DefaultIfEmpty()
            where employee.IsActive == true &&
                  employee.DesignationID != EmployeeDesignations.Coordinator &&
                  designation != null &&
                  designation.DesignationName != null &&
                  designation.DesignationName.Contains("Teacher")
            orderby employee.EmployeeName
            select new { employee.ID, employee.EmployeeName })
            .ToListAsync(cancellationToken);

        var map = new Dictionary<int, CampusAbsentTeacherMonitorDto>();

        foreach (var row in detected.Where(e => !presentSet.Contains(e.ID)))
        {
            map[row.ID] = new CampusAbsentTeacherMonitorDto
            {
                EmployeeId = row.ID,
                EmployeeName = row.EmployeeName?.Trim() ?? $"ID {row.ID}",
                LoggedBy = new[] { "Attendance" },
                Notes = Array.Empty<string>(),
            };
        }

        foreach (var report in reports)
        {
            var coord = report.CoordinatorEmployeeName?.Trim();
            if (string.IsNullOrWhiteSpace(coord))
                coord = $"ID {report.CoordinatorEmployeeId}";

            foreach (var absent in report.AbsentTeachers)
            {
                if (!map.TryGetValue(absent.EmployeeId, out var entry))
                {
                    entry = new CampusAbsentTeacherMonitorDto
                    {
                        EmployeeId = absent.EmployeeId,
                        EmployeeName = absent.EmployeeName?.Trim() ?? $"ID {absent.EmployeeId}",
                        LoggedBy = Array.Empty<string>(),
                        Notes = Array.Empty<string>(),
                    };
                    map[absent.EmployeeId] = entry;
                }

                var loggedBy = entry.LoggedBy.ToList();
                if (!loggedBy.Contains(coord, StringComparer.OrdinalIgnoreCase))
                    loggedBy.Add(coord);
                entry.LoggedBy = loggedBy;

                if (!string.IsNullOrWhiteSpace(absent.Notes))
                {
                    var notes = entry.Notes.ToList();
                    var note = absent.Notes.Trim();
                    if (!notes.Contains(note, StringComparer.OrdinalIgnoreCase))
                        notes.Add(note);
                    entry.Notes = notes;
                }

                if (string.IsNullOrWhiteSpace(entry.EmployeeName) || entry.EmployeeName.StartsWith("ID ", StringComparison.Ordinal))
                {
                    var name = absent.EmployeeName?.Trim();
                    if (!string.IsNullOrWhiteSpace(name))
                        entry.EmployeeName = name;
                }
            }
        }

        return map.Values
            .OrderBy(x => x.EmployeeName, StringComparer.OrdinalIgnoreCase)
            .ToList();
    }

    private static string? NormalizeCheckInTime(string? time)
    {
        if (string.IsNullOrWhiteSpace(time))
            return null;
        var trimmed = time.Trim();
        return trimmed.Length >= 5 ? trimmed[..5] : trimmed;
    }
}
