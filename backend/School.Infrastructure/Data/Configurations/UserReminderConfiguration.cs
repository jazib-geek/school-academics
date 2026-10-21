using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using School.Infrastructure.Entities;

namespace School.Infrastructure.Data.Configurations;

public class UserReminderConfiguration : IEntityTypeConfiguration<UserReminder>
{
    public void Configure(EntityTypeBuilder<UserReminder> entity)
    {
        entity.ToTable("tblUserReminder", "dbo");
        entity.HasKey(e => e.Id);

        entity.Property(e => e.Kind).HasMaxLength(20).IsRequired();
        entity.Property(e => e.Title).HasMaxLength(200).IsRequired();
        entity.Property(e => e.Body).HasMaxLength(4000);
        entity.Property(e => e.Color).HasMaxLength(20);
        entity.Property(e => e.Status).HasMaxLength(20).IsRequired();
        entity.Property(e => e.RemindAtUtc).HasColumnType("datetime2(0)");
        entity.Property(e => e.SnoozedUntilUtc).HasColumnType("datetime2(0)");
        entity.Property(e => e.CompletedAtUtc).HasColumnType("datetime2(0)");
        entity.Property(e => e.CreatedAtUtc).HasColumnType("datetime2(0)");
        entity.Property(e => e.UpdatedAtUtc).HasColumnType("datetime2(0)");

        entity.HasIndex(e => new { e.OwnerUserId, e.Status, e.RemindAtUtc })
            .HasDatabaseName("IX_UserReminder_Owner_Status_RemindAt");
        entity.HasIndex(e => e.CreatedByUserId)
            .HasDatabaseName("IX_UserReminder_CreatedBy");
    }
}

public class ChatMessageConfiguration : IEntityTypeConfiguration<ChatMessage>
{
    public void Configure(EntityTypeBuilder<ChatMessage> entity)
    {
        entity.ToTable("tblChatMessage", "dbo");
        entity.HasKey(e => e.Id);

        entity.Property(e => e.Body).HasMaxLength(1000).IsRequired();
        entity.Property(e => e.SentAtUtc).HasColumnType("datetime2(3)");
        entity.Property(e => e.ReadAtUtc).HasColumnType("datetime2(3)");

        entity.HasIndex(e => new { e.RecipientUserId, e.ReadAtUtc })
            .HasDatabaseName("IX_ChatMessage_Recipient_Read");
        entity.HasIndex(e => new { e.SenderUserId, e.RecipientUserId, e.SentAtUtc })
            .HasDatabaseName("IX_ChatMessage_Sender_Recipient_Sent");
        entity.HasIndex(e => e.SentAtUtc)
            .HasDatabaseName("IX_ChatMessage_SentAt");
    }
}
