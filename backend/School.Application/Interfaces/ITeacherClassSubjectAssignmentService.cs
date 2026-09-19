using School.Application.DTOs;

namespace School.Application.Interfaces;

public interface ITeacherClassSubjectAssignmentService
{
    Task<IReadOnlyList<EmployeeLookupDto>> GetEmployeesAsync(CancellationToken cancellationToken = default);
    Task<IReadOnlyList<TeacherClassSubjectAssignmentDto>> GetAssignmentsAsync(CancellationToken cancellationToken = default);
    Task<EmployeeMyAssignmentsDto> GetMyAssignmentsAsync(int employeeId, CancellationToken cancellationToken = default);
    Task<TeacherClassSubjectAssignmentDto> CreateAssignmentAsync(
        TeacherClassSubjectAssignmentCreateDto request,
        CancellationToken cancellationToken = default);
    Task DeleteAssignmentAsync(int id, CancellationToken cancellationToken = default);
}
