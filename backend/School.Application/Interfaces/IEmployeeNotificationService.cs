using School.Application.DTOs;

namespace School.Application.Interfaces;

public interface IEmployeeNotificationService
{
    Task PublishForEmployeeAsync(int employeeId, EmployeeNotificationDto notification, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<EmployeeNotificationDto>> GetRecentForEmployeeAsync(int employeeId, int take = 200, CancellationToken cancellationToken = default);

    Task MarkAllReadAsync(int employeeId, CancellationToken cancellationToken = default);
}
