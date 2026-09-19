using Microsoft.EntityFrameworkCore;
using School.Application.Common;
using School.Application.DTOs;
using School.Application.Interfaces;
using School.Infrastructure.Data;
using School.Infrastructure.Entities;

namespace School.Application.Services;

public class TeacherClassSubjectAssignmentService : ITeacherClassSubjectAssignmentService
{
    private readonly AppDbContext _context;

    public TeacherClassSubjectAssignmentService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<IReadOnlyList<EmployeeLookupDto>> GetEmployeesAsync(CancellationToken cancellationToken = default)
    {
        var rows = await _context.Employees
            .AsNoTracking()
            .Where(x => x.IsActive != false && x.EmployeeName != null && x.EmployeeName != "")
            .OrderBy(x => x.EmployeeName)
            .Select(x => new
            {
                x.ID,
                EmployeeName = x.EmployeeName!,
                x.Gender,
                DesignationName = x.Designation != null ? x.Designation.DesignationName : null,
            })
            .ToListAsync(cancellationToken);

        return rows
            .Where(x => !EmployeeDesignations.IsAdminName(x.DesignationName))
            .Select(x => new EmployeeLookupDto
            {
                ID = x.ID,
                EmployeeName = x.EmployeeName,
                Gender = x.Gender,
            })
            .ToList();
    }

    public async Task<IReadOnlyList<TeacherClassSubjectAssignmentDto>> GetAssignmentsAsync(CancellationToken cancellationToken = default)
    {
        var rows = await _context.EmployeeClasses
            .AsNoTracking()
            .Where(x => x.EmpID != null && x.ClassID != null && x.SubjectID != null)
            .Select(x => new
            {
                x.ID,
                EmployeeID = x.EmpID!.Value,
                EmployeeName = x.Employee != null ? x.Employee.EmployeeName : null,
                Gender = x.Employee != null ? x.Employee.Gender : null,
                ClassID = x.ClassID!.Value,
                SectionClassName = x.Section != null ? x.Section.ClassName : null,
                SectionName = x.Section != null ? x.Section.SectionName : null,
                SubjectID = x.SubjectID!.Value,
                SubjectName = x.Subject != null ? x.Subject.SubjectName : null,
            })
            .ToListAsync(cancellationToken);

        return rows
            .Select(x => new TeacherClassSubjectAssignmentDto
            {
                ID = x.ID,
                EmployeeID = x.EmployeeID,
                EmployeeName = x.EmployeeName ?? string.Empty,
                Gender = x.Gender,
                ClassID = x.ClassID,
                ClassName = FormatClassName(x.SectionClassName, x.SectionName),
                SubjectID = x.SubjectID,
                SubjectName = x.SubjectName ?? string.Empty,
            })
            .OrderBy(x => x.EmployeeName)
            .ThenBy(x => x.ClassName)
            .ThenBy(x => x.SubjectName)
            .ToList();
    }

    public async Task<EmployeeMyAssignmentsDto> GetMyAssignmentsAsync(
        int employeeId,
        CancellationToken cancellationToken = default)
    {
        var employee = await _context.Employees.AsNoTracking()
            .FirstOrDefaultAsync(x => x.ID == employeeId && x.IsActive != false, cancellationToken)
            ?? throw new KeyNotFoundException("Employee not found.");

        var rows = await _context.EmployeeClasses
            .AsNoTracking()
            .Where(x =>
                x.EmpID == employeeId &&
                x.ClassID != null &&
                x.SubjectID != null)
            .Select(x => new
            {
                ClassID = x.ClassID!.Value,
                SectionClassName = x.Section != null ? x.Section.ClassName : null,
                SectionName = x.Section != null ? x.Section.SectionName : null,
                SubjectID = x.SubjectID!.Value,
                SubjectName = x.Subject != null ? x.Subject.SubjectName : null,
            })
            .ToListAsync(cancellationToken);

        var classes = rows
            .GroupBy(x => new { x.ClassID, ClassName = FormatClassName(x.SectionClassName, x.SectionName) })
            .OrderBy(g => g.Key.ClassName)
            .Select(g => new EmployeeMyAssignmentClassDto
            {
                ClassId = g.Key.ClassID,
                ClassName = g.Key.ClassName,
                Subjects = g
                    .GroupBy(x => new { x.SubjectID, Name = x.SubjectName ?? string.Empty })
                    .OrderBy(s => s.Key.Name)
                    .Select(s => new EmployeeMyAssignmentSubjectDto
                    {
                        SubjectId = s.Key.SubjectID,
                        SubjectName = s.Key.Name,
                    })
                    .ToList(),
            })
            .ToList();

        return new EmployeeMyAssignmentsDto
        {
            EmployeeId = employee.ID,
            EmployeeName = employee.EmployeeName ?? string.Empty,
            ClassCount = classes.Count,
            SubjectCount = classes.Sum(c => c.Subjects.Count),
            Classes = classes,
        };
    }

    public async Task<TeacherClassSubjectAssignmentDto> CreateAssignmentAsync(
        TeacherClassSubjectAssignmentCreateDto request,
        CancellationToken cancellationToken = default)
    {
        if (request.EmployeeID <= 0)
        {
            throw new ArgumentException("Teacher is required.", nameof(request));
        }

        if (request.ClassID <= 0)
        {
            throw new ArgumentException("Class is required.", nameof(request));
        }

        if (request.SubjectID <= 0)
        {
            throw new ArgumentException("Subject is required.", nameof(request));
        }

        var employee = await _context.Employees
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.ID == request.EmployeeID && x.IsActive != false, cancellationToken)
            ?? throw new ArgumentException("Selected teacher was not found.", nameof(request));

        var section = await _context.Sections
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.ID == request.ClassID, cancellationToken)
            ?? throw new ArgumentException("Selected class was not found.", nameof(request));

        var subject = await _context.SubjectMasters
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.ID == request.SubjectID, cancellationToken)
            ?? throw new ArgumentException("Selected subject was not found.", nameof(request));

        var existingAssignment = await _context.EmployeeClasses
            .AsNoTracking()
            .Include(x => x.Employee)
            .FirstOrDefaultAsync(
                x => x.ClassID == request.ClassID &&
                     x.SubjectID == request.SubjectID,
                cancellationToken);

        if (existingAssignment?.EmpID == request.EmployeeID)
        {
            throw new InvalidOperationException("This teacher, class, and subject assignment already exists.");
        }

        if (existingAssignment is not null)
        {
            var assignedTeacher = existingAssignment.Employee?.EmployeeName;
            var message = string.IsNullOrWhiteSpace(assignedTeacher)
                ? "This subject is already assigned to another teacher for the selected class."
                : $"This subject is already assigned to {assignedTeacher} for the selected class.";

            throw new InvalidOperationException(message);
        }

        var assignment = new EmployeeClass
        {
            EmpID = request.EmployeeID,
            ClassID = request.ClassID,
            SubjectID = request.SubjectID,
        };

        _context.EmployeeClasses.Add(assignment);
        await _context.SaveChangesAsync(cancellationToken);

        return new TeacherClassSubjectAssignmentDto
        {
            ID = assignment.ID,
            EmployeeID = request.EmployeeID,
            EmployeeName = employee.EmployeeName ?? string.Empty,
            Gender = employee.Gender,
            ClassID = request.ClassID,
            ClassName = FormatClassName(section.ClassName, section.SectionName),
            SubjectID = request.SubjectID,
            SubjectName = subject.SubjectName ?? string.Empty,
        };
    }

    public async Task DeleteAssignmentAsync(int id, CancellationToken cancellationToken = default)
    {
        var assignment = await _context.EmployeeClasses
            .FirstOrDefaultAsync(x => x.ID == id, cancellationToken)
            ?? throw new KeyNotFoundException("Assignment not found.");

        _context.EmployeeClasses.Remove(assignment);
        await _context.SaveChangesAsync(cancellationToken);
    }

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
}
