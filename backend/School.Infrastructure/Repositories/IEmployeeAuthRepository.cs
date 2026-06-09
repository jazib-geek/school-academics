namespace School.Infrastructure.Repositories;

public interface IEmployeeAuthRepository
{
    Task<EmployeeLoginRecord?> GetActiveEmployeeByCredentialsAsync(int employeeId, string password);

    Task<bool> IsActiveEmployeeWithDesignationAsync(int employeeId, int designationId, CancellationToken cancellationToken = default);
}
