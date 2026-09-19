using School.Application.DTOs;
using System.Threading.Channels;

namespace School.Application.Interfaces;

public interface ICampusNotificationSink
{
    ChannelReader<CampusNotificationDto> Subscribe(
        string campus,
        CancellationToken cancellationToken = default);

    ValueTask PublishAsync(
        string campus,
        CampusNotificationDto notification,
        CancellationToken cancellationToken = default);
}
