using Microsoft.EntityFrameworkCore;
using School.Application.DTOs;
using School.Application.Interfaces;
using School.Infrastructure.Data;
using School.Infrastructure.Entities;

namespace School.Application.Services;

public class CampusTimeTableService : ICampusTimeTableService
{
    private readonly AppDbContext _context;

    public CampusTimeTableService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<IReadOnlyList<CampusTimeTableListItemDto>> GetListAsync(CancellationToken cancellationToken = default)
    {
        var items = await _context.CampusTimeTables
            .AsNoTracking()
            .OrderByDescending(x => x.IsDefault)
            .ThenBy(x => x.Name)
            .Select(x => new CampusTimeTableListItemDto
            {
                ID = x.ID,
                Name = x.Name,
                FormatType = x.FormatType,
                FormatName = FormatName(x.FormatType),
                DisplayTitle = x.DisplayTitle,
                Subtitle = x.Subtitle,
                IsDefault = x.IsDefault,
                IsActive = x.IsActive,
                PeriodCount = x.Periods.Count,
                ClassCount = x.MemberClasses.Count,
                TeacherCount = x.MemberTeachers.Count,
                SlotCount = x.Slots.Count,
                CreatedAtUtc = x.CreatedAtUtc,
            })
            .ToListAsync(cancellationToken);

        return items;
    }

    public async Task<CampusTimeTableDetailDto> GetByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        var entity = await LoadTrackedHeaderAsync(id, asNoTracking: true, cancellationToken)
            ?? throw new KeyNotFoundException("Timetable not found.");

        return await MapDetailAsync(entity, cancellationToken);
    }

    public async Task<EmployeeMyTimetableDto> GetMyTimetableAsync(
        int employeeId,
        CancellationToken cancellationToken = default)
    {
        var exists = await _context.Employees.AsNoTracking()
            .AnyAsync(x => x.ID == employeeId && x.IsActive != false, cancellationToken);
        if (!exists)
            throw new KeyNotFoundException("Employee not found.");

        var header = await _context.CampusTimeTables
            .AsNoTracking()
            .Include(x => x.Periods)
            .Include(x => x.Slots)
            .Where(x => x.IsActive)
            .OrderByDescending(x => x.IsDefault)
            .ThenBy(x => x.Name)
            .FirstOrDefaultAsync(cancellationToken);

        if (header is null)
        {
            return new EmployeeMyTimetableDto
            {
                HasTimetable = false,
                TimetableName = string.Empty,
            };
        }

        var mySlots = header.Slots
            .Where(s => s.EmployeeID == employeeId)
            .ToList();

        if (mySlots.Count == 0)
        {
            return new EmployeeMyTimetableDto
            {
                TimetableId = header.ID,
                TimetableName = header.DisplayTitle ?? header.Name,
                Subtitle = header.Subtitle,
                HasTimetable = true,
                Slots = [],
            };
        }

        var sectionIds = mySlots.Select(s => s.SectionID).Distinct().ToList();
        var subjectIds = mySlots.Select(s => s.SubjectID).Distinct().ToList();

        var classNames = await _context.Sections.AsNoTracking()
            .Where(s => sectionIds.Contains(s.ID))
            .Select(s => new { s.ID, s.ClassName, s.SectionName })
            .ToDictionaryAsync(s => s.ID, cancellationToken);

        var subjects = await _context.SubjectMasters.AsNoTracking()
            .Where(s => subjectIds.Contains(s.ID))
            .Select(s => new { s.ID, s.SubjectName, s.ShortName })
            .ToDictionaryAsync(s => s.ID, cancellationToken);

        var periodByNumber = header.Periods.ToDictionary(p => p.PeriodNumber);

        static string FormatClass(string? className, string? sectionName)
        {
            var c = (className ?? string.Empty).Trim();
            var s = (sectionName ?? string.Empty).Trim();
            if (c.Length == 0) return s.Length == 0 ? "Class" : s;
            if (s.Length == 0 || string.Equals(c, s, StringComparison.OrdinalIgnoreCase)) return c;
            return $"{c} - {s}";
        }

        static string? FormatTime(TimeSpan? t) =>
            t.HasValue ? DateTime.Today.Add(t.Value).ToString("HH:mm") : null;

        var slots = mySlots
            .OrderBy(s => s.PeriodNumber)
            .ThenBy(s => s.SectionID)
            .Select(s =>
            {
                periodByNumber.TryGetValue(s.PeriodNumber, out var period);
                classNames.TryGetValue(s.SectionID, out var section);
                subjects.TryGetValue(s.SubjectID, out var subject);
                return new EmployeeMyTimetableSlotDto
                {
                    PeriodNumber = s.PeriodNumber,
                    PeriodLabel = !string.IsNullOrWhiteSpace(period?.Label)
                        ? period!.Label!.Trim()
                        : $"Period {s.PeriodNumber}",
                    StartTime = FormatTime(period?.StartTime),
                    EndTime = FormatTime(period?.EndTime),
                    SectionId = s.SectionID,
                    ClassName = section is null
                        ? $"Class {s.SectionID}"
                        : FormatClass(section.ClassName, section.SectionName),
                    SubjectId = s.SubjectID,
                    SubjectName = subject?.SubjectName ?? $"Subject {s.SubjectID}",
                    SubjectShortName = subject?.ShortName,
                };
            })
            .ToList();

        return new EmployeeMyTimetableDto
        {
            TimetableId = header.ID,
            TimetableName = header.DisplayTitle ?? header.Name,
            Subtitle = header.Subtitle,
            HasTimetable = true,
            Slots = slots,
        };
    }

    public async Task<CampusTimeTablePrintDto> GetPrintAsync(int id, CancellationToken cancellationToken = default)
    {
        var detail = await GetByIdAsync(id, cancellationToken);
        var periodNumbers = detail.Periods.Select(p => p.PeriodNumber).ToHashSet();

        var freeByTeacher = new Dictionary<string, IReadOnlyList<int>>();
        if (detail.FormatType == (byte)CampusTimeTableFormat.TeacherWiseWithFree)
        {
            foreach (var teacher in detail.Teachers)
            {
                var assigned = detail.Slots
                    .Where(s => s.EmployeeID == teacher.EmployeeID && s.DayOfWeek == 0)
                    .Select(s => s.PeriodNumber)
                    .ToHashSet();

                freeByTeacher[teacher.EmployeeID.ToString()] = periodNumbers
                    .Where(p => !assigned.Contains(p))
                    .OrderBy(p => p)
                    .ToList();
            }
        }

        return new CampusTimeTablePrintDto
        {
            ID = detail.ID,
            Name = detail.Name,
            FormatType = detail.FormatType,
            FormatName = detail.FormatName,
            DisplayTitle = detail.DisplayTitle,
            Subtitle = detail.Subtitle,
            Periods = detail.Periods,
            Classes = detail.Classes,
            Teachers = detail.Teachers,
            Slots = detail.Slots,
            FreePeriodsByTeacher = freeByTeacher,
        };
    }

    public async Task<IReadOnlyList<CampusTimeTableAllocationCandidateDto>> GetAllocationCandidatesAsync(
        int id,
        CancellationToken cancellationToken = default)
    {
        var header = await _context.CampusTimeTables
            .AsNoTracking()
            .AsSplitQuery()
            .Include(x => x.MemberClasses)
            .Include(x => x.MemberTeachers)
            .FirstOrDefaultAsync(x => x.ID == id, cancellationToken)
            ?? throw new KeyNotFoundException("Timetable not found.");

        return await QueryAllocationCandidatesAsync(
            header.MemberClasses.Select(x => x.SectionID).ToHashSet(),
            header.MemberTeachers.Select(x => x.EmployeeID).ToHashSet(),
            cancellationToken);
    }

    public async Task<CampusTimeTableDetailDto> CreateAsync(
        CampusTimeTableCreateDto request,
        CancellationToken cancellationToken = default)
    {
        ValidateFormat(request.FormatType);
        ValidateName(request.Name);
        ValidatePeriods(request.Periods);

        var sectionIds = NormalizeIds(request.SectionIDs);
        var employeeIds = NormalizeIds(request.EmployeeIDs);

        if (request.FormatType == (byte)CampusTimeTableFormat.ClassWise && sectionIds.Count == 0)
        {
            throw new ArgumentException("Select at least one class for a class-wise timetable.");
        }

        if (request.FormatType is (byte)CampusTimeTableFormat.TeacherWiseWithFree
                or (byte)CampusTimeTableFormat.TeacherWiseFull
            && employeeIds.Count == 0)
        {
            throw new ArgumentException("Select at least one teacher for a teacher-wise timetable.");
        }

        await EnsureSectionsExistAsync(sectionIds, cancellationToken);
        await EnsureEmployeesExistAsync(employeeIds, cancellationToken);

        if (request.IsDefault)
        {
            await ClearDefaultsForFormatInDatabaseAsync(request.FormatType, cancellationToken);
        }

        var now = DateTime.UtcNow;
        var header = new CampusTimeTable
        {
            Name = request.Name.Trim(),
            FormatType = request.FormatType,
            DisplayTitle = TrimOrNull(request.DisplayTitle),
            Subtitle = TrimOrNull(request.Subtitle),
            IsDefault = request.IsDefault,
            IsActive = true,
            CreatedAtUtc = now,
        };

        AddPeriods(header, request.Periods);
        AddMemberClasses(header, sectionIds);
        AddMemberTeachers(header, employeeIds);

        _context.CampusTimeTables.Add(header);
        await _context.SaveChangesAsync(cancellationToken);

        if (request.SeedFromAllocation)
        {
            await SeedSlotsInternalAsync(header.ID, cancellationToken);
        }

        return await GetByIdAsync(header.ID, cancellationToken);
    }

    public async Task<CampusTimeTableDetailDto> UpdateAsync(
        int id,
        CampusTimeTableUpdateDto request,
        CancellationToken cancellationToken = default)
    {
        ValidateName(request.Name);

        var header = await _context.CampusTimeTables
            .FirstOrDefaultAsync(x => x.ID == id, cancellationToken)
            ?? throw new KeyNotFoundException("Timetable not found.");

        header.Name = request.Name.Trim();
        header.DisplayTitle = TrimOrNull(request.DisplayTitle);
        header.Subtitle = TrimOrNull(request.Subtitle);
        header.IsActive = request.IsActive;
        header.UpdatedAtUtc = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);
        return await GetByIdAsync(id, cancellationToken);
    }

    public async Task SetDefaultAsync(int id, CancellationToken cancellationToken = default)
    {
        var header = await _context.CampusTimeTables
            .FirstOrDefaultAsync(x => x.ID == id, cancellationToken)
            ?? throw new KeyNotFoundException("Timetable not found.");

        if (!header.IsActive)
        {
            throw new InvalidOperationException("Cannot set an inactive timetable as default.");
        }

        // Persist clears first for this format only (one default per FormatType).
        await ClearDefaultsForFormatInDatabaseAsync(header.FormatType, cancellationToken);

        await _context.Entry(header).ReloadAsync(cancellationToken);
        if (!header.IsActive)
        {
            throw new InvalidOperationException("Cannot set an inactive timetable as default.");
        }

        header.IsDefault = true;
        header.UpdatedAtUtc = DateTime.UtcNow;
        await _context.SaveChangesAsync(cancellationToken);
    }

    public async Task ClearDefaultAsync(int id, CancellationToken cancellationToken = default)
    {
        var header = await _context.CampusTimeTables
            .FirstOrDefaultAsync(x => x.ID == id, cancellationToken)
            ?? throw new KeyNotFoundException("Timetable not found.");

        if (!header.IsDefault)
        {
            return;
        }

        header.IsDefault = false;
        header.UpdatedAtUtc = DateTime.UtcNow;
        await _context.SaveChangesAsync(cancellationToken);
    }

    public async Task<CampusTimeTableDetailDto> ReplacePeriodsAsync(
        int id,
        CampusTimeTableReplacePeriodsDto request,
        CancellationToken cancellationToken = default)
    {
        ValidatePeriods(request.Periods);

        var header = await _context.CampusTimeTables
            .AsSplitQuery()
            .Include(x => x.Periods)
            .Include(x => x.Slots)
            .FirstOrDefaultAsync(x => x.ID == id, cancellationToken)
            ?? throw new KeyNotFoundException("Timetable not found.");

        var newPeriodNumbers = request.Periods.Select(p => p.PeriodNumber).ToHashSet();
        var breakPeriodNumbers = request.Periods.Where(p => p.IsBreak).Select(p => p.PeriodNumber).ToHashSet();
        var orphanSlots = header.Slots
            .Where(s => !newPeriodNumbers.Contains(s.PeriodNumber) || breakPeriodNumbers.Contains(s.PeriodNumber))
            .ToList();
        if (orphanSlots.Count > 0)
        {
            _context.CampusTimeTableSlots.RemoveRange(orphanSlots);
        }

        _context.CampusTimeTablePeriods.RemoveRange(header.Periods);
        header.Periods.Clear();
        AddPeriods(header, request.Periods);
        header.UpdatedAtUtc = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);
        return await GetByIdAsync(id, cancellationToken);
    }

    public async Task<CampusTimeTableDetailDto> ReplaceMembersAsync(
        int id,
        CampusTimeTableReplaceMembersDto request,
        CancellationToken cancellationToken = default)
    {
        var header = await _context.CampusTimeTables
            .AsSplitQuery()
            .Include(x => x.MemberClasses)
            .Include(x => x.MemberTeachers)
            .Include(x => x.Slots)
            .FirstOrDefaultAsync(x => x.ID == id, cancellationToken)
            ?? throw new KeyNotFoundException("Timetable not found.");

        var sectionIds = NormalizeIds(request.SectionIDs);
        var employeeIds = NormalizeIds(request.EmployeeIDs);

        if (header.FormatType == (byte)CampusTimeTableFormat.ClassWise && sectionIds.Count == 0)
        {
            throw new ArgumentException("Select at least one class for a class-wise timetable.");
        }

        if (header.FormatType is (byte)CampusTimeTableFormat.TeacherWiseWithFree
                or (byte)CampusTimeTableFormat.TeacherWiseFull
            && employeeIds.Count == 0)
        {
            throw new ArgumentException("Select at least one teacher for a teacher-wise timetable.");
        }

        await EnsureSectionsExistAsync(sectionIds, cancellationToken);
        await EnsureEmployeesExistAsync(employeeIds, cancellationToken);

        _context.CampusTimeTableMemberClasses.RemoveRange(header.MemberClasses);
        _context.CampusTimeTableMemberTeachers.RemoveRange(header.MemberTeachers);
        header.MemberClasses.Clear();
        header.MemberTeachers.Clear();
        AddMemberClasses(header, sectionIds);
        AddMemberTeachers(header, employeeIds);

        // Drop slots that reference removed members when those membership lists are the scope.
        if (sectionIds.Count > 0)
        {
            var removeClassSlots = header.Slots.Where(s => !sectionIds.Contains(s.SectionID)).ToList();
            if (removeClassSlots.Count > 0)
            {
                _context.CampusTimeTableSlots.RemoveRange(removeClassSlots);
            }
        }

        if (employeeIds.Count > 0)
        {
            var removeTeacherSlots = header.Slots.Where(s => !employeeIds.Contains(s.EmployeeID)).ToList();
            if (removeTeacherSlots.Count > 0)
            {
                _context.CampusTimeTableSlots.RemoveRange(removeTeacherSlots);
            }
        }

        header.UpdatedAtUtc = DateTime.UtcNow;
        await _context.SaveChangesAsync(cancellationToken);
        return await GetByIdAsync(id, cancellationToken);
    }

    public async Task<CampusTimeTableDetailDto> ReplaceSlotsAsync(
        int id,
        CampusTimeTableReplaceSlotsDto request,
        CancellationToken cancellationToken = default)
    {
        var header = await _context.CampusTimeTables
            .AsSplitQuery()
            .Include(x => x.Periods)
            .Include(x => x.Slots)
            .FirstOrDefaultAsync(x => x.ID == id, cancellationToken)
            ?? throw new KeyNotFoundException("Timetable not found.");

        var periodNumbers = header.Periods.Select(p => p.PeriodNumber).ToHashSet();
        var breakPeriodNumbers = header.Periods.Where(p => p.IsBreak).Select(p => p.PeriodNumber).ToHashSet();
        if (periodNumbers.Count == 0)
        {
            throw new InvalidOperationException("Define periods before saving slots.");
        }

        var inputs = request.Slots ?? [];
        foreach (var slot in inputs)
        {
            if (slot.SectionID <= 0 || slot.SubjectID <= 0 || slot.EmployeeID <= 0)
            {
                throw new ArgumentException("Each slot requires class, subject, and teacher.");
            }

            if (!periodNumbers.Contains(slot.PeriodNumber))
            {
                throw new ArgumentException($"Period {slot.PeriodNumber} is not defined on this timetable.");
            }

            if (breakPeriodNumbers.Contains(slot.PeriodNumber))
            {
                throw new ArgumentException("Assignments cannot be placed in a break period.");
            }

            if (slot.DayOfWeek > 7)
            {
                throw new ArgumentException("DayOfWeek must be 0 (daily) or 1–7.");
            }
        }

        var sectionIdList = inputs.Select(x => x.SectionID).Distinct().ToList();
        var employeeIdList = inputs.Select(x => x.EmployeeID).Distinct().ToList();
        var subjectIdList = inputs.Select(x => x.SubjectID).Distinct().ToList();

        await EnsureSectionsExistAsync(sectionIdList, cancellationToken);
        await EnsureEmployeesExistAsync(employeeIdList, cancellationToken);
        await EnsureSubjectsExistAsync(subjectIdList, cancellationToken);

        var classNames = await _context.Sections
            .AsNoTracking()
            .Where(x => sectionIdList.Contains(x.ID))
            .ToDictionaryAsync(
                x => x.ID,
                x => FormatClassName(x.ClassName, x.SectionName),
                cancellationToken);

        var teacherNames = await _context.Employees
            .AsNoTracking()
            .Where(x => employeeIdList.Contains(x.ID))
            .ToDictionaryAsync(
                x => x.ID,
                x => x.EmployeeName ?? $"Teacher {x.ID}",
                cancellationToken);

        var subjectNames = await _context.SubjectMasters
            .AsNoTracking()
            .Where(x => subjectIdList.Contains(x.ID))
            .ToDictionaryAsync(
                x => x.ID,
                x => !string.IsNullOrWhiteSpace(x.ShortName) ? x.ShortName! : (x.SubjectName ?? $"Subject {x.ID}"),
                cancellationToken);

        AssertNoSlotClashes(inputs, classNames, teacherNames, subjectNames);

        var keepIds = inputs.Where(x => x.ID is > 0).Select(x => x.ID!.Value).ToHashSet();
        var toRemove = header.Slots.Where(s => !keepIds.Contains(s.ID)).ToList();
        if (toRemove.Count > 0)
        {
            _context.CampusTimeTableSlots.RemoveRange(toRemove);
        }

        var now = DateTime.UtcNow;
        var byId = header.Slots.ToDictionary(s => s.ID);

        foreach (var input in inputs)
        {
            if (input.ID is > 0 && byId.TryGetValue(input.ID.Value, out var existing))
            {
                existing.SectionID = input.SectionID;
                existing.SubjectID = input.SubjectID;
                existing.EmployeeID = input.EmployeeID;
                existing.PeriodNumber = input.PeriodNumber;
                existing.DayOfWeek = input.DayOfWeek;
                existing.LineIndex = NormalizeLineIndex(input.LineIndex);
                existing.UpdatedAtUtc = now;
            }
            else
            {
                header.Slots.Add(new CampusTimeTableSlot
                {
                    TimeTableID = id,
                    SectionID = input.SectionID,
                    SubjectID = input.SubjectID,
                    EmployeeID = input.EmployeeID,
                    PeriodNumber = input.PeriodNumber,
                    DayOfWeek = input.DayOfWeek,
                    LineIndex = NormalizeLineIndex(input.LineIndex),
                    CreatedAtUtc = now,
                });
            }
        }

        header.UpdatedAtUtc = now;

        try
        {
            await _context.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException ex) when (IsUniqueViolation(ex))
        {
            throw new InvalidOperationException(
                "A class or teacher is already booked for the same period. " +
                "Each class and each teacher may only have one slot per period.",
                ex);
        }

        return await GetByIdAsync(id, cancellationToken);
    }

    public async Task<CampusTimeTableDetailDto> SeedFromAllocationAsync(int id, CancellationToken cancellationToken = default)
    {
        await SeedSlotsInternalAsync(id, cancellationToken);
        return await GetByIdAsync(id, cancellationToken);
    }

    public async Task DeleteAsync(int id, CancellationToken cancellationToken = default)
    {
        var header = await _context.CampusTimeTables
            .FirstOrDefaultAsync(x => x.ID == id, cancellationToken)
            ?? throw new KeyNotFoundException("Timetable not found.");

        _context.CampusTimeTables.Remove(header);
        await _context.SaveChangesAsync(cancellationToken);
    }

    private async Task SeedSlotsInternalAsync(int timeTableId, CancellationToken cancellationToken)
    {
        var header = await _context.CampusTimeTables
            .AsSplitQuery()
            .Include(x => x.Periods)
            .Include(x => x.MemberClasses)
            .Include(x => x.MemberTeachers)
            .Include(x => x.Slots)
            .FirstOrDefaultAsync(x => x.ID == timeTableId, cancellationToken)
            ?? throw new KeyNotFoundException("Timetable not found.");

        if (header.Periods.Count == 0)
        {
            throw new InvalidOperationException("Define periods before seeding slots.");
        }

        var candidates = await QueryAllocationCandidatesAsync(
            header.MemberClasses.Select(x => x.SectionID).ToHashSet(),
            header.MemberTeachers.Select(x => x.EmployeeID).ToHashSet(),
            cancellationToken);
        if (candidates.Count == 0)
        {
            return;
        }

        var periods = header.Periods.OrderBy(p => p.SortOrder).ThenBy(p => p.PeriodNumber).ToList();
        var occupiedClass = header.Slots
            .Select(s => (s.SectionID, s.PeriodNumber, s.DayOfWeek))
            .ToHashSet();
        var occupiedTeacher = header.Slots
            .Select(s => (s.EmployeeID, s.PeriodNumber, s.DayOfWeek))
            .ToHashSet();

        // Prefer placing unused allocation rows into the first free period for that class (day=0).
        var usedCandidateKeys = header.Slots
            .Select(s => (s.SectionID, s.SubjectID, s.EmployeeID))
            .ToHashSet();
        var classSubjectOwners = header.Slots
            .GroupBy(s => (s.SectionID, s.SubjectID, s.DayOfWeek))
            .ToDictionary(g => g.Key, g => g.First().EmployeeID);

        var now = DateTime.UtcNow;
        foreach (var candidate in candidates)
        {
            var key = (candidate.SectionID, candidate.SubjectID, candidate.EmployeeID);
            if (usedCandidateKeys.Contains(key))
            {
                continue;
            }

            var classSubjectKey = (candidate.SectionID, candidate.SubjectID, (byte)0);
            if (classSubjectOwners.TryGetValue(classSubjectKey, out var ownerId) && ownerId != candidate.EmployeeID)
            {
                // Class+subject already owned by another teacher on this timetable.
                continue;
            }

            CampusTimeTablePeriod? freePeriod = null;
            foreach (var period in periods)
            {
                if (period.IsBreak)
                {
                    continue;
                }

                if (occupiedClass.Contains((candidate.SectionID, period.PeriodNumber, 0)))
                {
                    continue;
                }

                if (occupiedTeacher.Contains((candidate.EmployeeID, period.PeriodNumber, 0)))
                {
                    continue;
                }

                freePeriod = period;
                break;
            }

            if (freePeriod is null)
            {
                continue;
            }

            header.Slots.Add(new CampusTimeTableSlot
            {
                TimeTableID = timeTableId,
                SectionID = candidate.SectionID,
                SubjectID = candidate.SubjectID,
                EmployeeID = candidate.EmployeeID,
                PeriodNumber = freePeriod.PeriodNumber,
                DayOfWeek = 0,
                CreatedAtUtc = now,
            });

            occupiedClass.Add((candidate.SectionID, freePeriod.PeriodNumber, 0));
            occupiedTeacher.Add((candidate.EmployeeID, freePeriod.PeriodNumber, 0));
            usedCandidateKeys.Add(key);
            classSubjectOwners.TryAdd(classSubjectKey, candidate.EmployeeID);
        }

        // Ensure member lists include seeded classes/teachers (useful for teacher formats seeded by class membership).
        var existingSections = header.MemberClasses.Select(x => x.SectionID).ToHashSet();
        var existingTeachers = header.MemberTeachers.Select(x => x.EmployeeID).ToHashSet();
        var sortClass = existingSections.Count;
        var sortTeacher = existingTeachers.Count;

        foreach (var slot in header.Slots)
        {
            if (existingSections.Add(slot.SectionID))
            {
                header.MemberClasses.Add(new CampusTimeTableMemberClass
                {
                    TimeTableID = timeTableId,
                    SectionID = slot.SectionID,
                    SortOrder = sortClass++,
                });
            }

            if (existingTeachers.Add(slot.EmployeeID))
            {
                header.MemberTeachers.Add(new CampusTimeTableMemberTeacher
                {
                    TimeTableID = timeTableId,
                    EmployeeID = slot.EmployeeID,
                    SortOrder = sortTeacher++,
                });
            }
        }

        header.UpdatedAtUtc = now;
        await _context.SaveChangesAsync(cancellationToken);
    }

    /// <summary>
    /// Clears defaults for one format immediately in SQL so UX_CampusTimeTable_Default
    /// (unique on FormatType where IsDefault=1) never sees two defaults of the same type.
    /// </summary>
    private async Task ClearDefaultsForFormatInDatabaseAsync(byte formatType, CancellationToken cancellationToken)
    {
        await _context.CampusTimeTables
            .Where(x => x.IsDefault && x.FormatType == formatType)
            .ExecuteUpdateAsync(
                setters => setters
                    .SetProperty(x => x.IsDefault, false)
                    .SetProperty(x => x.UpdatedAtUtc, DateTime.UtcNow),
                cancellationToken);

        foreach (var entry in _context.ChangeTracker.Entries<CampusTimeTable>())
        {
            if (entry.Entity.IsDefault && entry.Entity.FormatType == formatType)
            {
                entry.Entity.IsDefault = false;
            }
        }
    }

    private async Task<IReadOnlyList<CampusTimeTableAllocationCandidateDto>> QueryAllocationCandidatesAsync(
        IReadOnlyCollection<int> sectionIds,
        IReadOnlyCollection<int> teacherIds,
        CancellationToken cancellationToken)
    {
        var query = _context.EmployeeClasses
            .AsNoTracking()
            .Where(x =>
                x.EmpID != null &&
                x.ClassID != null &&
                x.SubjectID != null &&
                x.Employee != null &&
                x.Employee.IsActive != false);

        if (sectionIds.Count > 0 && teacherIds.Count > 0)
        {
            query = query.Where(x => sectionIds.Contains(x.ClassID!.Value) || teacherIds.Contains(x.EmpID!.Value));
        }
        else if (sectionIds.Count > 0)
        {
            query = query.Where(x => sectionIds.Contains(x.ClassID!.Value));
        }
        else if (teacherIds.Count > 0)
        {
            query = query.Where(x => teacherIds.Contains(x.EmpID!.Value));
        }

        var rows = await query
            .OrderBy(x => x.Section != null ? x.Section.ClassName : null)
            .ThenBy(x => x.Subject != null ? x.Subject.SubjectName : null)
            .ThenBy(x => x.Employee != null ? x.Employee.EmployeeName : null)
            .Select(x => new
            {
                EmployeeID = x.EmpID!.Value,
                EmployeeName = x.Employee != null ? x.Employee.EmployeeName ?? string.Empty : string.Empty,
                Gender = x.Employee != null ? x.Employee.Gender : null,
                SectionID = x.ClassID!.Value,
                ClassName = x.Section != null ? x.Section.ClassName : null,
                SectionName = x.Section != null ? x.Section.SectionName : null,
                SubjectID = x.SubjectID!.Value,
                SubjectName = x.Subject != null ? x.Subject.SubjectName ?? string.Empty : string.Empty,
                SubjectShortName = x.Subject != null ? x.Subject.ShortName : null,
            })
            .ToListAsync(cancellationToken);

        return rows
            .Select(x => new CampusTimeTableAllocationCandidateDto
            {
                EmployeeID = x.EmployeeID,
                EmployeeName = x.EmployeeName,
                Gender = x.Gender,
                SectionID = x.SectionID,
                ClassName = FormatClassName(x.ClassName, x.SectionName),
                SubjectID = x.SubjectID,
                SubjectName = x.SubjectName,
                SubjectShortName = x.SubjectShortName,
            })
            .ToList();
    }

    private async Task<CampusTimeTable?> LoadTrackedHeaderAsync(int id, bool asNoTracking, CancellationToken cancellationToken)
    {
        IQueryable<CampusTimeTable> query = _context.CampusTimeTables;
        if (asNoTracking)
        {
            query = query.AsNoTracking();
        }

        return await query
            .AsSplitQuery()
            .Include(x => x.Periods)
            .Include(x => x.MemberClasses)
            .Include(x => x.MemberTeachers)
            .Include(x => x.Slots)
            .FirstOrDefaultAsync(x => x.ID == id, cancellationToken);
    }

    private async Task<CampusTimeTableDetailDto> MapDetailAsync(CampusTimeTable entity, CancellationToken cancellationToken)
    {
        var sectionIds = entity.MemberClasses.Select(c => c.SectionID)
            .Concat(entity.Slots.Select(s => s.SectionID))
            .Distinct()
            .ToList();
        var employeeIds = entity.MemberTeachers.Select(t => t.EmployeeID)
            .Concat(entity.Slots.Select(s => s.EmployeeID))
            .Distinct()
            .ToList();
        var subjectIds = entity.Slots.Select(s => s.SubjectID).Distinct().ToList();

        var classNames = sectionIds.Count == 0
            ? []
            : (await _context.Sections
                .AsNoTracking()
                .Where(s => sectionIds.Contains(s.ID))
                .Select(s => new { s.ID, s.ClassName, s.SectionName })
                .ToListAsync(cancellationToken))
                .ToDictionary(s => s.ID);
        var employees = employeeIds.Count == 0
            ? []
            : (await _context.Employees
                .AsNoTracking()
                .Where(e => employeeIds.Contains(e.ID))
                .Select(e => new { e.ID, e.EmployeeName, e.Gender })
                .ToListAsync(cancellationToken))
                .ToDictionary(e => e.ID);
        var subjects = subjectIds.Count == 0
            ? []
            : (await _context.SubjectMasters
                .AsNoTracking()
                .Where(s => subjectIds.Contains(s.ID))
                .Select(s => new { s.ID, s.SubjectName, s.ShortName })
                .ToListAsync(cancellationToken))
                .ToDictionary(s => s.ID);

        string ClassLabel(int sectionId) =>
            classNames.TryGetValue(sectionId, out var section)
                ? FormatClassName(section.ClassName, section.SectionName)
                : string.Empty;

        string TeacherName(int employeeId) =>
            employees.TryGetValue(employeeId, out var employee)
                ? employee.EmployeeName ?? string.Empty
                : string.Empty;

        string? TeacherGender(int employeeId) =>
            employees.TryGetValue(employeeId, out var employee) ? employee.Gender : null;

        return new CampusTimeTableDetailDto
        {
            ID = entity.ID,
            Name = entity.Name,
            FormatType = entity.FormatType,
            FormatName = FormatName(entity.FormatType),
            DisplayTitle = entity.DisplayTitle,
            Subtitle = entity.Subtitle,
            IsDefault = entity.IsDefault,
            IsActive = entity.IsActive,
            CreatedAtUtc = entity.CreatedAtUtc,
            UpdatedAtUtc = entity.UpdatedAtUtc,
            Periods = entity.Periods
                .OrderBy(p => p.SortOrder)
                .ThenBy(p => p.PeriodNumber)
                .Select(p => new CampusTimeTablePeriodDto
                {
                    ID = p.ID,
                    PeriodNumber = p.PeriodNumber,
                    Label = p.Label ?? $"Period {p.PeriodNumber}",
                    StartTime = FormatTime(p.StartTime),
                    EndTime = FormatTime(p.EndTime),
                    SortOrder = p.SortOrder,
                    IsBreak = p.IsBreak,
                })
                .ToList(),
            Classes = entity.MemberClasses
                .OrderBy(c => c.SortOrder)
                .ThenBy(c => ClassLabel(c.SectionID))
                .Select(c => new CampusTimeTableMemberClassDto
                {
                    ID = c.ID,
                    SectionID = c.SectionID,
                    ClassName = ClassLabel(c.SectionID),
                    SortOrder = c.SortOrder,
                })
                .ToList(),
            Teachers = entity.MemberTeachers
                .OrderBy(t => t.SortOrder)
                .ThenBy(t => TeacherName(t.EmployeeID))
                .Select(t => new CampusTimeTableMemberTeacherDto
                {
                    ID = t.ID,
                    EmployeeID = t.EmployeeID,
                    EmployeeName = TeacherName(t.EmployeeID),
                    Gender = TeacherGender(t.EmployeeID),
                    SortOrder = t.SortOrder,
                })
                .ToList(),
            Slots = entity.Slots
                .OrderBy(s => s.DayOfWeek)
                .ThenBy(s => s.PeriodNumber)
                .ThenBy(s => ClassLabel(s.SectionID))
                .ThenBy(s => s.LineIndex)
                .Select(s =>
                {
                    subjects.TryGetValue(s.SubjectID, out var subject);
                    return new CampusTimeTableSlotDto
                    {
                        ID = s.ID,
                        SectionID = s.SectionID,
                        ClassName = ClassLabel(s.SectionID),
                        SubjectID = s.SubjectID,
                        SubjectName = subject?.SubjectName ?? string.Empty,
                        SubjectShortName = subject?.ShortName,
                        EmployeeID = s.EmployeeID,
                        EmployeeName = TeacherName(s.EmployeeID),
                        Gender = TeacherGender(s.EmployeeID),
                        PeriodNumber = s.PeriodNumber,
                        DayOfWeek = s.DayOfWeek,
                        LineIndex = s.LineIndex,
                    };
                })
                .ToList(),
        };
    }

    private static void AddPeriods(CampusTimeTable header, IReadOnlyList<CampusTimeTablePeriodInputDto> periods)
    {
        foreach (var period in periods.OrderBy(p => p.SortOrder).ThenBy(p => p.PeriodNumber))
        {
            header.Periods.Add(new CampusTimeTablePeriod
            {
                PeriodNumber = period.PeriodNumber,
                Label = string.IsNullOrWhiteSpace(period.Label)
                    ? (period.IsBreak ? "Break" : $"Period {period.PeriodNumber}")
                    : period.Label.Trim(),
                StartTime = ParseTime(period.StartTime),
                EndTime = ParseTime(period.EndTime),
                SortOrder = period.SortOrder > 0 ? period.SortOrder : period.PeriodNumber,
                IsBreak = period.IsBreak,
            });
        }
    }

    private static void AddMemberClasses(CampusTimeTable header, IReadOnlyList<int> sectionIds)
    {
        for (var i = 0; i < sectionIds.Count; i++)
        {
            header.MemberClasses.Add(new CampusTimeTableMemberClass
            {
                SectionID = sectionIds[i],
                SortOrder = i,
            });
        }
    }

    private static void AddMemberTeachers(CampusTimeTable header, IReadOnlyList<int> employeeIds)
    {
        for (var i = 0; i < employeeIds.Count; i++)
        {
            header.MemberTeachers.Add(new CampusTimeTableMemberTeacher
            {
                EmployeeID = employeeIds[i],
                SortOrder = i,
            });
        }
    }

    private async Task EnsureSectionsExistAsync(IReadOnlyList<int> sectionIds, CancellationToken cancellationToken)
    {
        if (sectionIds.Count == 0)
        {
            return;
        }

        var existing = await _context.Sections
            .AsNoTracking()
            .Where(x => sectionIds.Contains(x.ID))
            .Select(x => x.ID)
            .ToListAsync(cancellationToken);

        if (existing.Count != sectionIds.Count)
        {
            throw new ArgumentException("One or more selected classes were not found.");
        }
    }

    private async Task EnsureEmployeesExistAsync(IReadOnlyList<int> employeeIds, CancellationToken cancellationToken)
    {
        if (employeeIds.Count == 0)
        {
            return;
        }

        var employees = await _context.Employees
            .AsNoTracking()
            .Where(x => employeeIds.Contains(x.ID))
            .Select(x => new { x.ID, x.EmployeeName, x.IsActive })
            .ToListAsync(cancellationToken);

        var byId = employees.ToDictionary(x => x.ID);
        var inactiveNames = new List<string>();
        var hasMissing = false;

        foreach (var id in employeeIds.Distinct())
        {
            if (!byId.TryGetValue(id, out var employee))
            {
                hasMissing = true;
                continue;
            }

            if (employee.IsActive == false)
            {
                inactiveNames.Add(
                    string.IsNullOrWhiteSpace(employee.EmployeeName)
                        ? $"Teacher #{id}"
                        : employee.EmployeeName.Trim());
            }
        }

        if (inactiveNames.Count == 0 && !hasMissing)
        {
            return;
        }

        if (inactiveNames.Count > 0)
        {
            var names = string.Join(", ", inactiveNames.Distinct(StringComparer.OrdinalIgnoreCase));
            throw new ArgumentException(
                $"These teachers are marked inactive and cannot be on the timetable: {names}. Edit those cells and choose an active teacher.");
        }

        throw new ArgumentException(
            "Some cells still use teachers who are no longer on staff. Open those cells and pick a teacher again.");
    }

    private async Task EnsureSubjectsExistAsync(IReadOnlyList<int> subjectIds, CancellationToken cancellationToken)
    {
        if (subjectIds.Count == 0)
        {
            return;
        }

        var existing = await _context.SubjectMasters
            .AsNoTracking()
            .Where(x => subjectIds.Contains(x.ID))
            .Select(x => x.ID)
            .ToListAsync(cancellationToken);

        if (existing.Count != subjectIds.Count)
        {
            throw new ArgumentException("One or more selected subjects were not found.");
        }
    }

    private static byte NormalizeLineIndex(byte lineIndex) => lineIndex is 1 ? (byte)1 : (byte)0;

    private static void AssertNoSlotClashes(
        IReadOnlyList<CampusTimeTableSlotInputDto> inputs,
        IReadOnlyDictionary<int, string> classNames,
        IReadOnlyDictionary<int, string> teacherNames,
        IReadOnlyDictionary<int, string> subjectNames)
    {
        var teacherKeys = new Dictionary<(int EmployeeID, int PeriodNumber, byte DayOfWeek), CampusTimeTableSlotInputDto>();
        var classSubjectOwners = new Dictionary<(int SectionID, int SubjectID, byte DayOfWeek), CampusTimeTableSlotInputDto>();

        static string DaySuffix(byte dayOfWeek) =>
            dayOfWeek == 0 ? string.Empty : $" (weekday {dayOfWeek})";

        foreach (var group in inputs.GroupBy(s => (s.SectionID, s.PeriodNumber, s.DayOfWeek)))
        {
            var lines = group.ToList();
            if (lines.Count > 2)
            {
                var className = classNames.GetValueOrDefault(group.Key.SectionID, $"Class {group.Key.SectionID}");
                throw new InvalidOperationException(
                    $"Class \"{className}\" has more than two groups in Period {group.Key.PeriodNumber}{DaySuffix(group.Key.DayOfWeek)}.");
            }

            var indices = lines.Select(s => NormalizeLineIndex(s.LineIndex)).ToList();
            if (indices.Distinct().Count() != lines.Count)
            {
                var className = classNames.GetValueOrDefault(group.Key.SectionID, $"Class {group.Key.SectionID}");
                throw new InvalidOperationException(
                    $"Class \"{className}\" has duplicate groups in Period {group.Key.PeriodNumber}{DaySuffix(group.Key.DayOfWeek)}.");
            }

            if (lines.Count == 2 && (!indices.Contains((byte)0) || !indices.Contains((byte)1)))
            {
                var className = classNames.GetValueOrDefault(group.Key.SectionID, $"Class {group.Key.SectionID}");
                throw new InvalidOperationException(
                    $"Class \"{className}\" split period in Period {group.Key.PeriodNumber}{DaySuffix(group.Key.DayOfWeek)} must include a primary and a second group.");
            }

            if (lines.Count == 1 && indices[0] == 1)
            {
                var className = classNames.GetValueOrDefault(group.Key.SectionID, $"Class {group.Key.SectionID}");
                throw new InvalidOperationException(
                    $"Class \"{className}\" second group in Period {group.Key.PeriodNumber}{DaySuffix(group.Key.DayOfWeek)} requires a primary group.");
            }

            if (lines.Select(l => l.SubjectID).Distinct().Count() != lines.Count)
            {
                var className = classNames.GetValueOrDefault(group.Key.SectionID, $"Class {group.Key.SectionID}");
                throw new InvalidOperationException(
                    $"Class \"{className}\" cannot use the same subject twice in Period {group.Key.PeriodNumber}{DaySuffix(group.Key.DayOfWeek)}.");
            }

            if (lines.Select(l => l.EmployeeID).Distinct().Count() != lines.Count)
            {
                var className = classNames.GetValueOrDefault(group.Key.SectionID, $"Class {group.Key.SectionID}");
                throw new InvalidOperationException(
                    $"Class \"{className}\" cannot use the same teacher twice in Period {group.Key.PeriodNumber}{DaySuffix(group.Key.DayOfWeek)}.");
            }
        }

        foreach (var slot in inputs)
        {
            if (slot.LineIndex > 1)
            {
                throw new InvalidOperationException("Only two groups per class period are allowed.");
            }

            var teacherKey = (slot.EmployeeID, slot.PeriodNumber, slot.DayOfWeek);
            if (!teacherKeys.TryAdd(teacherKey, slot))
            {
                var other = teacherKeys[teacherKey];
                var teacherName = teacherNames.GetValueOrDefault(slot.EmployeeID, $"Teacher {slot.EmployeeID}");
                var otherClass = classNames.GetValueOrDefault(other.SectionID, $"Class {other.SectionID}");
                var thisClass = classNames.GetValueOrDefault(slot.SectionID, $"Class {slot.SectionID}");
                throw new InvalidOperationException(
                    $"Teacher \"{teacherName}\" is already booked in Period {slot.PeriodNumber}{DaySuffix(slot.DayOfWeek)} " +
                    $"for \"{otherClass}\" and cannot also be assigned to \"{thisClass}\" in the same period.");
            }

            var classSubjectKey = (slot.SectionID, slot.SubjectID, slot.DayOfWeek);
            if (classSubjectOwners.TryGetValue(classSubjectKey, out var existingOwner))
            {
                if (existingOwner.EmployeeID != slot.EmployeeID)
                {
                    var className = classNames.GetValueOrDefault(slot.SectionID, $"Class {slot.SectionID}");
                    var subjectName = subjectNames.GetValueOrDefault(slot.SubjectID, $"Subject {slot.SubjectID}");
                    var ownerName = teacherNames.GetValueOrDefault(existingOwner.EmployeeID, $"Teacher {existingOwner.EmployeeID}");
                    throw new InvalidOperationException(
                        $"\"{subjectName}\" for \"{className}\" is already assigned to {ownerName} " +
                        $"(Period {existingOwner.PeriodNumber}{DaySuffix(existingOwner.DayOfWeek)}). " +
                        "A class subject can only have one teacher on this timetable.");
                }
            }
            else
            {
                classSubjectOwners[classSubjectKey] = slot;
            }
        }
    }

    private static void ValidateFormat(byte formatType)
    {
        if (formatType is not (
            (byte)CampusTimeTableFormat.ClassWise or
            (byte)CampusTimeTableFormat.TeacherWiseWithFree or
            (byte)CampusTimeTableFormat.TeacherWiseFull))
        {
            throw new ArgumentException("FormatType must be 1 (class-wise), 2 (teacher-wise with Free), or 3 (teacher-wise full).");
        }
    }

    private static void ValidateName(string? name)
    {
        if (string.IsNullOrWhiteSpace(name))
        {
            throw new ArgumentException("Name is required.");
        }
    }

    private static void ValidatePeriods(IReadOnlyList<CampusTimeTablePeriodInputDto>? periods)
    {
        if (periods is null || periods.Count == 0)
        {
            throw new ArgumentException("At least one period is required.");
        }

        var breakCount = periods.Count(p => p.IsBreak);
        if (breakCount > 1)
        {
            throw new ArgumentException("Only one break period is allowed per timetable.");
        }

        var seen = new HashSet<int>();
        foreach (var period in periods)
        {
            if (period.PeriodNumber < 1)
            {
                throw new ArgumentException("PeriodNumber must be >= 1.");
            }

            if (!seen.Add(period.PeriodNumber))
            {
                throw new ArgumentException($"Duplicate PeriodNumber {period.PeriodNumber}.");
            }

            var start = ParseTime(period.StartTime);
            var end = ParseTime(period.EndTime);
            if (start.HasValue && end.HasValue && end <= start)
            {
                throw new ArgumentException($"Period {period.PeriodNumber}: EndTime must be after StartTime.");
            }
        }
    }

    private static List<int> NormalizeIds(IReadOnlyList<int>? ids)
    {
        if (ids is null || ids.Count == 0)
        {
            return [];
        }

        return ids.Where(x => x > 0).Distinct().ToList();
    }

    private static string? TrimOrNull(string? value)
    {
        var trimmed = value?.Trim();
        return string.IsNullOrWhiteSpace(trimmed) ? null : trimmed;
    }

    private static TimeSpan? ParseTime(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        if (TimeSpan.TryParse(value.Trim(), out var ts))
        {
            return ts;
        }

        if (DateTime.TryParse(value.Trim(), out var dt))
        {
            return dt.TimeOfDay;
        }

        throw new ArgumentException($"Invalid time value '{value}'. Use HH:mm or HH:mm:ss.");
    }

    private static string? FormatTime(TimeSpan? value)
    {
        if (!value.HasValue)
        {
            return null;
        }

        var t = value.Value;
        return t.Seconds == 0
            ? $"{(int)t.TotalHours:D2}:{t.Minutes:D2}"
            : $"{(int)t.TotalHours:D2}:{t.Minutes:D2}:{t.Seconds:D2}";
    }

    private static string FormatName(byte formatType) => formatType switch
    {
        (byte)CampusTimeTableFormat.ClassWise => "Class-wise",
        (byte)CampusTimeTableFormat.TeacherWiseWithFree => "Teacher-wise (with Free)",
        (byte)CampusTimeTableFormat.TeacherWiseFull => "Teacher-wise (full)",
        _ => "Unknown",
    };

    private static string FormatClassName(string? className, string? sectionName)
    {
        var normalizedClassName = className?.Trim();
        var normalizedSectionName = sectionName?.Trim();

        if (string.IsNullOrWhiteSpace(normalizedSectionName))
        {
            return normalizedClassName ?? string.Empty;
        }

        if (string.IsNullOrWhiteSpace(normalizedClassName))
        {
            return normalizedSectionName;
        }

        if (string.Equals(normalizedClassName, normalizedSectionName, StringComparison.OrdinalIgnoreCase))
        {
            return normalizedClassName;
        }

        return $"{normalizedClassName} - {normalizedSectionName}";
    }

    private static bool IsUniqueViolation(DbUpdateException ex)
    {
        var message = ex.InnerException?.Message ?? ex.Message;
        return message.Contains("UNIQUE", StringComparison.OrdinalIgnoreCase)
            || message.Contains("duplicate", StringComparison.OrdinalIgnoreCase)
            || message.Contains("UX_CampusTimeTableSlot", StringComparison.OrdinalIgnoreCase);
    }
}
