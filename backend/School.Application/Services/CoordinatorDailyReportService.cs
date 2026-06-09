using School.Application.Common;
using School.Application.DTOs;
using School.Application.Interfaces;
using School.Infrastructure.Entities;
using School.Infrastructure.Repositories;

namespace School.Application.Services;

public class CoordinatorDailyReportService : ICoordinatorDailyReportService
{
    private readonly ICoordinatorDailyReportRepository _repository;
    private readonly IAttendanceService _attendanceService;

    public CoordinatorDailyReportService(
        ICoordinatorDailyReportRepository repository,
        IAttendanceService attendanceService)
    {
        _repository = repository;
        _attendanceService = attendanceService;
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

        return new CoordinatorDailyReportCampusMonitorDto
        {
            ReportDate = reportDate,
            ClassAttendanceSummaries = summaries,
            CoordinatorReports = reports
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
                PresentCount = g.Count(x => x.Status == "P"),
                TotalCount = g.Count()
            })
            .OrderBy(x => x.ClassName)
            .ToList();
    }
}
