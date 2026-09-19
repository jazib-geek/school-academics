using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using School.Infrastructure.Entities;

namespace School.Infrastructure.Data.Configurations;

public class CampusRealtimeNotificationConfiguration : IEntityTypeConfiguration<CampusRealtimeNotification>
{
    public void Configure(EntityTypeBuilder<CampusRealtimeNotification> entity)
    {
        entity.ToTable("tblCampusRealtimeNotification", "dbo");
        entity.HasKey(e => e.Id);

        entity.Property(e => e.Type).HasMaxLength(64).IsRequired();
        entity.Property(e => e.Title).HasMaxLength(200).IsRequired();
        entity.Property(e => e.Message).HasMaxLength(1000).IsRequired();
        entity.Property(e => e.Severity).HasMaxLength(20).IsRequired();
        entity.Property(e => e.Link).HasMaxLength(500).IsRequired();
        entity.Property(e => e.OccurredAtPkt).HasColumnType("datetime2(3)").IsRequired();
        entity.Property(e => e.ActorUserKey).HasMaxLength(200);
        entity.Property(e => e.ExcludeUserKeysJson).HasColumnType("nvarchar(max)");

        entity.HasIndex(e => e.OccurredAtPkt);
        entity.HasIndex(e => new { e.OccurredAtPkt, e.Type });
    }
}

public class CampusRealtimeNotificationReadConfiguration : IEntityTypeConfiguration<CampusRealtimeNotificationRead>
{
    public void Configure(EntityTypeBuilder<CampusRealtimeNotificationRead> entity)
    {
        entity.ToTable("tblCampusRealtimeNotificationRead", "dbo");
        entity.HasKey(e => new { e.NotificationId, e.UserId });

        entity.Property(e => e.ReadAtPkt).HasColumnType("datetime2(3)").IsRequired();

        entity.HasOne(e => e.Notification)
            .WithMany(e => e.Reads)
            .HasForeignKey(e => e.NotificationId)
            .OnDelete(DeleteBehavior.Cascade);

        entity.HasIndex(e => e.UserId);
    }
}
