using System.Collections.Concurrent;
using System.Threading.Channels;
using School.Application.DTOs;
using School.Application.Interfaces;

namespace School.API.Services;

public class CampusChatStream : ICampusChatSink
{
    // campus -> userId -> connectionId -> channel
    private readonly ConcurrentDictionary<string, ConcurrentDictionary<int, ConcurrentDictionary<Guid, Channel<CampusChatEventDto>>>> _campuses =
        new(StringComparer.OrdinalIgnoreCase);

    private readonly object _presenceLock = new();

    public ChannelReader<CampusChatEventDto> Subscribe(
        string campus,
        int userId,
        CancellationToken cancellationToken = default)
    {
        var channel = Channel.CreateUnbounded<CampusChatEventDto>(
            new UnboundedChannelOptions
            {
                SingleReader = true,
                SingleWriter = false,
            });

        var campusKey = NormalizeCampus(campus);
        var users = _campuses.GetOrAdd(campusKey, _ => new ConcurrentDictionary<int, ConcurrentDictionary<Guid, Channel<CampusChatEventDto>>>());
        var connectionId = Guid.NewGuid();
        bool cameOnline;

        lock (_presenceLock)
        {
            var connections = users.GetOrAdd(userId, _ => new ConcurrentDictionary<Guid, Channel<CampusChatEventDto>>());
            cameOnline = connections.IsEmpty;
            connections[connectionId] = channel;
        }

        if (cameOnline)
            BroadcastPresence(campusKey, userId, true);

        cancellationToken.Register(() =>
        {
            bool wentOffline = false;
            lock (_presenceLock)
            {
                if (users.TryGetValue(userId, out var connections))
                {
                    connections.TryRemove(connectionId, out _);
                    if (connections.IsEmpty)
                    {
                        users.TryRemove(userId, out _);
                        wentOffline = true;
                    }
                }
            }

            channel.Writer.TryComplete();

            if (wentOffline)
                BroadcastPresence(campusKey, userId, false);
        });

        return channel.Reader;
    }

    public void Publish(string campus, int userId, CampusChatEventDto evt)
    {
        if (!_campuses.TryGetValue(NormalizeCampus(campus), out var users))
            return;

        if (users.TryGetValue(userId, out var connections))
            WriteAll(connections, evt);
    }

    public void Broadcast(string campus, CampusChatEventDto evt, int? exceptUserId = null)
    {
        if (!_campuses.TryGetValue(NormalizeCampus(campus), out var users))
            return;

        foreach (var user in users)
        {
            if (exceptUserId.HasValue && user.Key == exceptUserId.Value)
                continue;
            WriteAll(user.Value, evt);
        }
    }

    public IReadOnlyCollection<int> GetOnlineUserIds(string campus)
    {
        if (!_campuses.TryGetValue(NormalizeCampus(campus), out var users))
            return Array.Empty<int>();

        return users.Where(x => !x.Value.IsEmpty).Select(x => x.Key).ToList();
    }

    private void BroadcastPresence(string campusKey, int userId, bool isOnline) =>
        Broadcast(
            campusKey,
            new CampusChatEventDto
            {
                Type = "presence",
                Data = new ChatPresenceEventDto { UserId = userId, IsOnline = isOnline },
            },
            userId);

    private static void WriteAll(
        ConcurrentDictionary<Guid, Channel<CampusChatEventDto>> connections,
        CampusChatEventDto evt)
    {
        foreach (var connection in connections)
        {
            if (!connection.Value.Writer.TryWrite(evt))
                connections.TryRemove(connection.Key, out _);
        }
    }

    private static string NormalizeCampus(string campus) =>
        string.IsNullOrWhiteSpace(campus) ? "default" : campus.Trim().ToLowerInvariant();
}
