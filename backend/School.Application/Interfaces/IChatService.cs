using School.Application.DTOs;

namespace School.Application.Interfaces;

public interface IChatService
{
    Task<List<ChatUserDto>> GetUsersAsync(
        int userId,
        IReadOnlyCollection<int> onlineUserIds,
        CancellationToken cancellationToken = default);

    Task<List<ChatMessageDto>> GetConversationAsync(
        int userId,
        int otherUserId,
        long? afterId,
        CancellationToken cancellationToken = default);

    Task<ChatMessageDto> SendAsync(
        string campus,
        int userId,
        SendChatMessageRequestDto request,
        CancellationToken cancellationToken = default);

    Task<ChatReadEventDto?> MarkReadAsync(int userId, int otherUserId, CancellationToken cancellationToken = default);

    Task<int> GetUnreadCountAsync(int userId, CancellationToken cancellationToken = default);
}
