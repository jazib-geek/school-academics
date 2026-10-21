using System.Threading.Channels;
using School.Application.DTOs;

namespace School.Application.Interfaces;

public interface ICampusChatSink
{
    ChannelReader<CampusChatEventDto> Subscribe(string campus, int userId, CancellationToken cancellationToken = default);

    void Publish(string campus, int userId, CampusChatEventDto evt);

    void Broadcast(string campus, CampusChatEventDto evt, int? exceptUserId = null);

    IReadOnlyCollection<int> GetOnlineUserIds(string campus);
}
