using Microsoft.EntityFrameworkCore;
using School.Application.Common;
using School.Application.DTOs;
using School.Application.Interfaces;
using School.Infrastructure.Data;
using School.Infrastructure.Entities;

namespace School.Application.Services;

public class AbsentFollowupService : IAbsentFollowupService
{
    private readonly AppDbContext _context;

    public AbsentFollowupService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<IReadOnlyList<AbsentFollowupReasonDto>> GetReasonsAsync(
        CancellationToken cancellationToken = default)
    {
        return await _context.AbsentFollowupReasons.AsNoTracking()
            .Where(r => r.IsActive)
            .OrderBy(r => r.SortOrder)
            .ThenBy(r => r.Name)
            .Select(r => new AbsentFollowupReasonDto
            {
                Id = r.Id,
                Name = r.Name,
                SortOrder = r.SortOrder,
            })
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<AbsentFollowupRowDto>> GetByDateAsync(
        DateOnly date,
        CancellationToken cancellationToken = default)
    {
        if (date == default)
            throw new ArgumentException("Date is required.");

        var day = date.ToDateTime(TimeOnly.MinValue);

        var absentStudentIds = await _context.Attendances.AsNoTracking()
            .Where(a =>
                a.StudentID != null &&
                a.Date.HasValue &&
                a.Date.Value.Date == day.Date &&
                a.Status != null &&
                a.Status.ToUpper() == StudentAttendanceStatuses.Absent)
            .Select(a => a.StudentID!.Value)
            .Distinct()
            .ToListAsync(cancellationToken);

        if (absentStudentIds.Count == 0)
            return [];

        var followups = await _context.AbsentStudentFollowups.AsNoTracking()
            .Where(f => f.AttendanceDate == date && absentStudentIds.Contains(f.StudentId))
            .Select(f => new
            {
                f.Id,
                f.StudentId,
                f.ReasonId,
                ReasonName = f.Reason != null ? f.Reason.Name : null,
                f.Description,
            })
            .ToDictionaryAsync(f => f.StudentId, cancellationToken);

        var students = await (
            from s in _context.Students.AsNoTracking()
            where absentStudentIds.Contains(s.Reg_Id) && s.IsActive == true
            join sec in _context.Sections.AsNoTracking()
                on s.ClassCompositeID equals sec.ID into secJ
            from sec in secJ.DefaultIfEmpty()
            select new
            {
                s.Reg_Id,
                s.FullName,
                FatherName = s.Family != null ? s.Family.FatherName : null,
                FatherMobile = s.Family != null ? s.Family.FatherMobileNo : null,
                MotherPhone = s.Family != null ? s.Family.MotherPhoneNo : null,
                SectionClassName = sec != null ? sec.ClassName : null,
                SectionSectionName = sec != null ? sec.SectionName : null,
            }).ToListAsync(cancellationToken);

        return students
            .Select(s =>
            {
                followups.TryGetValue(s.Reg_Id, out var followup);
                return new AbsentFollowupRowDto
                {
                    StudentId = s.Reg_Id,
                    FullName = string.IsNullOrWhiteSpace(s.FullName) ? "-" : s.FullName.Trim(),
                    FatherName = string.IsNullOrWhiteSpace(s.FatherName) ? null : s.FatherName.Trim(),
                    ClassName = FormatClassSectionDisplayName(s.SectionClassName, s.SectionSectionName),
                    FatherMobile = string.IsNullOrWhiteSpace(s.FatherMobile) ? null : s.FatherMobile.Trim(),
                    MotherPhone = string.IsNullOrWhiteSpace(s.MotherPhone) ? null : s.MotherPhone.Trim(),
                    FollowupId = followup?.Id,
                    ReasonId = followup?.ReasonId,
                    ReasonName = followup?.ReasonName,
                    Description = followup?.Description,
                };
            })
            .OrderBy(r => r.ClassName)
            .ThenBy(r => r.FullName)
            .ToList();
    }

    public async Task<AbsentFollowupSaveResultDto> UpsertAsync(
        AbsentFollowupUpsertDto request,
        string? updatedByName,
        CancellationToken cancellationToken = default)
    {
        if (request.Date == default)
            throw new ArgumentException("Date is required.");

        if (request.StudentId <= 0)
            throw new ArgumentException("Student is required.");

        var description = string.IsNullOrWhiteSpace(request.Description)
            ? null
            : request.Description.Trim();

        if (description is { Length: > 1000 })
            throw new ArgumentException("Follow-up must be 1000 characters or fewer.");

        string? reasonName = null;
        if (request.ReasonId is int reasonId)
        {
            if (reasonId <= 0)
                throw new ArgumentException("Reason is invalid.");

            var reason = await _context.AbsentFollowupReasons.AsNoTracking()
                .FirstOrDefaultAsync(r => r.Id == reasonId && r.IsActive, cancellationToken);
            if (reason is null)
                throw new ArgumentException("Reason is not available.");

            reasonName = reason.Name;
        }

        var studentExists = await _context.Students.AsNoTracking()
            .AnyAsync(s => s.Reg_Id == request.StudentId && s.IsActive == true, cancellationToken);
        if (!studentExists)
            throw new KeyNotFoundException("Student not found.");

        var day = request.Date.ToDateTime(TimeOnly.MinValue);
        var isAbsent = await _context.Attendances.AsNoTracking()
            .AnyAsync(
                a =>
                    a.StudentID == request.StudentId &&
                    a.Date.HasValue &&
                    a.Date.Value.Date == day.Date &&
                    a.Status != null &&
                    a.Status.ToUpper() == StudentAttendanceStatuses.Absent,
                cancellationToken);
        if (!isAbsent)
            throw new InvalidOperationException("This student is not marked absent on the selected date.");

        var existing = await _context.AbsentStudentFollowups
            .FirstOrDefaultAsync(
                f => f.StudentId == request.StudentId && f.AttendanceDate == request.Date,
                cancellationToken);

        var now = PakistanTime.Now;
        var byName = string.IsNullOrWhiteSpace(updatedByName) ? null : updatedByName.Trim();
        if (byName is { Length: > 150 })
            byName = byName[..150];

        if (existing is null)
        {
            existing = new AbsentStudentFollowup
            {
                StudentId = request.StudentId,
                AttendanceDate = request.Date,
                ReasonId = request.ReasonId,
                Description = description,
                UpdatedAtPkt = now,
                UpdatedByName = byName,
            };
            _context.AbsentStudentFollowups.Add(existing);
        }
        else
        {
            existing.ReasonId = request.ReasonId;
            existing.Description = description;
            existing.UpdatedAtPkt = now;
            existing.UpdatedByName = byName;
        }

        await _context.SaveChangesAsync(cancellationToken);

        return new AbsentFollowupSaveResultDto
        {
            FollowupId = existing.Id,
            StudentId = existing.StudentId,
            Date = existing.AttendanceDate,
            ReasonId = existing.ReasonId,
            ReasonName = reasonName,
            Description = existing.Description,
        };
    }

    private static string FormatClassSectionDisplayName(string? className, string? sectionName)
    {
        var cn = (className ?? string.Empty).Trim();
        var sn = (sectionName ?? string.Empty).Trim();

        if (string.IsNullOrEmpty(cn))
            return string.IsNullOrEmpty(sn) ? "-" : sn;

        if (string.IsNullOrEmpty(sn))
            return cn;

        if (string.Equals(cn, sn, StringComparison.OrdinalIgnoreCase))
            return cn;

        return $"{cn} - {sn}";
    }
}
