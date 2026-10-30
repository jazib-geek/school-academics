namespace School.Application.DTOs;

public class CampusChatEventDto
{
    public string Type { get; set; } = string.Empty;

    public object? Data { get; set; }
}

public class ChatUserDto
{
    public int UserId { get; set; }

    public string Username { get; set; } = string.Empty;

    public bool IsOnline { get; set; }

    public int UnreadCount { get; set; }

    public string? LastMessage { get; set; }

    public DateTime? LastAtUtc { get; set; }

    public bool LastFromMe { get; set; }
}

public class ChatMessageDto
{
    public long Id { get; set; }

    public int SenderUserId { get; set; }

    public int RecipientUserId { get; set; }

    public string Body { get; set; } = string.Empty;

    public DateTime SentAtUtc { get; set; }

    public DateTime? ReadAtUtc { get; set; }

    public List<ChatReactionDto> Reactions { get; set; } = [];
}

public class ChatReactionDto
{
    public int UserId { get; set; }

    public string Emoji { get; set; } = string.Empty;
}

public class ReactToChatMessageRequestDto
{
    public string? Emoji { get; set; }
}

public class ChatReactionEventDto
{
    public long MessageId { get; set; }

    public int SenderUserId { get; set; }

    public int RecipientUserId { get; set; }

    public int ActorUserId { get; set; }

    /// <summary>Set when a reaction was added or changed. Null when it was removed.</summary>
    public string? Emoji { get; set; }

    public string? MessagePreview { get; set; }

    public List<ChatReactionDto> Reactions { get; set; } = [];
}

public class SendChatMessageRequestDto
{
    public int RecipientUserId { get; set; }

    public string? Body { get; set; }
}

public class ChatReadEventDto
{
    public int ReaderUserId { get; set; }

    public long UpToId { get; set; }

    public DateTime ReadAtUtc { get; set; }
}

public class ChatPresenceEventDto
{
    public int UserId { get; set; }

    public bool IsOnline { get; set; }
}
