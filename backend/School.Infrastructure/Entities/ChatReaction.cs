namespace School.Infrastructure.Entities;

public class ChatReaction
{
    public long Id { get; set; }

    public long MessageId { get; set; }

    public int UserId { get; set; }

    public string Emoji { get; set; } = string.Empty;

    public DateTime CreatedAtUtc { get; set; }
}
