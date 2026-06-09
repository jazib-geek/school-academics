using School.Infrastructure.Entities;

namespace School.Infrastructure.Repositories;

public interface IEmployeeAttendanceRepository
{
    Task<IReadOnlyList<Employee>> GetActiveEmployeesOrderedAsync(CancellationToken cancellationToken = default);

    Task<IReadOnlyList<EmployeeAttendance>> GetAttendanceRowsForMonthAsync(
        int year,
        int month,
        CancellationToken cancellationToken = default);
}
