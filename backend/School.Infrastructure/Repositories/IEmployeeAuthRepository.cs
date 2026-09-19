namespace School.Infrastructure.Repositories;

public interface IEmployeeAuthRepository
{
    Task<EmployeeLoginRecord?> GetActiveEmployeeByCredentialsAsync(string thumbId, string password);

    Task<EmployeeLoginRecord?> GetActiveEmployeeByIdAsync(int employeeId, CancellationToken cancellationToken = default);

    Task<bool> IsActiveEmployeeWithDesignationAsync(int employeeId, int designationId, CancellationToken cancellationToken = default);

    Task ChangePasswordAsync(int employeeId, string currentPassword, string newPassword, CancellationToken cancellationToken = default);
}
