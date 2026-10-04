using System.Collections.Concurrent;
using System.Threading.Channels;
using School.Application.DTOs;
using School.Application.Interfaces;

namespace School.API.Services;

public class EmployeeNotificationStream : IEmployeeNotificationSink
{
    private readonly ConcurrentDictionary<string, ConcurrentDictionary<Guid, Channel<EmployeeNotificationDto>>> _subscribers =
        new(StringComparer.OrdinalIgnoreCase);

    public ChannelReader<EmployeeNotificationDto> Subscribe(
        string campus,
        int employeeId,
        CancellationToken cancellationToken = default)
    {
        var channel = Channel.CreateUnbounded<EmployeeNotificationDto>(
            new UnboundedChannelOptions
            {
                SingleReader = true,
                SingleWriter = false,
            });

        var key = BuildKey(campus, employeeId);
        var subscriberId = Guid.NewGuid();
        var group = _subscribers.GetOrAdd(key, _ => new ConcurrentDictionary<Guid, Channel<EmployeeNotificationDto>>());
        group[subscriberId] = channel;

        cancellationToken.Register(() =>
        {
            if (_subscribers.TryGetValue(key, out var subscribers))
            {
                subscribers.TryRemove(subscriberId, out _);
                if (subscribers.IsEmpty)
                {
                    _subscribers.TryRemove(key, out _);
                }
            }

            channel.Writer.TryComplete();
        });

        return channel.Reader;
    }

    public ValueTask PublishAsync(
        string campus,
        int employeeId,
        EmployeeNotificationDto notification,
        CancellationToken cancellationToken = default)
    {
        var key = BuildKey(campus, employeeId);
        if (!_subscribers.TryGetValue(key, out var subscribers))
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

    private static string BuildKey(string campus, int employeeId) =>
        $"{NormalizeCampus(campus)}:{employeeId}";

    private static string NormalizeCampus(string campus) =>
        string.IsNullOrWhiteSpace(campus) ? "default" : campus.Trim().ToLowerInvariant();
}
