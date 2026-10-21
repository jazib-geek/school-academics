namespace School.Infrastructure.Entities;

public class ChatMessage
{
    public long Id { get; set; }

    public int SenderUserId { get; set; }

    public int RecipientUserId { get; set; }

    public string Body { get; set; } = string.Empty;

    public DateTime SentAtUtc { get; set; }

    public DateTime? ReadAtUtc { get; set; }
}
