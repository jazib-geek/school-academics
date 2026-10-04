using System.Threading.Channels;
using School.Application.DTOs;

namespace School.Application.Interfaces;

public interface IEmployeeNotificationSink
{
    ChannelReader<EmployeeNotificationDto> Subscribe(string campus, int employeeId, CancellationToken cancellationToken = default);

    ValueTask PublishAsync(string campus, int employeeId, EmployeeNotificationDto notification, CancellationToken cancellationToken = default);
}
