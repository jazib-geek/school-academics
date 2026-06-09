namespace School.Infrastructure.Repositories;

public interface ICoordinatorStaffReadRepository
{
    Task<IReadOnlyList<(int Id, string? EmployeeName)>> GetActiveEmployeesAsync(CancellationToken cancellationToken = default);
}
