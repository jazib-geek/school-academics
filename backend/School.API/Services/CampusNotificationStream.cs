using School.Application.DTOs;
using School.Application.Interfaces;
using System.Collections.Concurrent;
using System.Threading.Channels;

namespace School.API.Services;

public class CampusNotificationStream : ICampusNotificationSink
{
    private readonly ConcurrentDictionary<string, ConcurrentDictionary<Guid, Channel<CampusNotificationDto>>> _subscribers =
        new(StringComparer.OrdinalIgnoreCase);

    public ChannelReader<CampusNotificationDto> Subscribe(
        string campus,
        CancellationToken cancellationToken = default)
    {
        var channel = Channel.CreateUnbounded<CampusNotificationDto>(
            new UnboundedChannelOptions
            {
                SingleReader = true,
                SingleWriter = false,
            });

        var normalizedCampus = NormalizeCampus(campus);
        var subscriberId = Guid.NewGuid();
        var campusSubscribers = _subscribers.GetOrAdd(
            normalizedCampus,
            _ => new ConcurrentDictionary<Guid, Channel<CampusNotificationDto>>());

        campusSubscribers[subscriberId] = channel;

        cancellationToken.Register(() =>
        {
            if (_subscribers.TryGetValue(normalizedCampus, out var subscribers))
            {
                subscribers.TryRemove(subscriberId, out _);
                if (subscribers.IsEmpty)
                {
                    _subscribers.TryRemove(normalizedCampus, out _);
                }
            }

            channel.Writer.TryComplete();
        });

        return channel.Reader;
    }

    public ValueTask PublishAsync(
        string campus,
        CampusNotificationDto notification,
        CancellationToken cancellationToken = default)
    {
        if (!_subscribers.TryGetValue(NormalizeCampus(campus), out var subscribers))
        {
            return ValueTask.CompletedTask;
        }

        foreach (var subscriber in subscribers)
        {
            if (!subscriber.Value.Writer.TryWrite(notification))
            {
                subscribers.TryRemove(subscriber.Key, out _);
            }
        }

        return ValueTask.CompletedTask;
    }

    private static string NormalizeCampus(string campus) =>
        string.IsNullOrWhiteSpace(campus) ? "default" : campus.Trim().ToLowerInvariant();
}
