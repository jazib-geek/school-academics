using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using School.Infrastructure.Entities;

namespace School.Infrastructure.Data.Configurations;

public class EmployeeRealtimeNotificationConfiguration : IEntityTypeConfiguration<EmployeeRealtimeNotification>
{
    public void Configure(EntityTypeBuilder<EmployeeRealtimeNotification> entity)
    {
        entity.ToTable("tblEmployeeRealtimeNotification", "dbo");
        entity.HasKey(e => e.Id);

        entity.Property(e => e.EmployeeId).IsRequired();
        entity.Property(e => e.Type).HasMaxLength(64).IsRequired();
        entity.Property(e => e.Title).HasMaxLength(200).IsRequired();
        entity.Property(e => e.Message).HasMaxLength(1000).IsRequired();
        entity.Property(e => e.Severity).HasMaxLength(20).IsRequired();
        entity.Property(e => e.Link).HasMaxLength(500).IsRequired();
        entity.Property(e => e.OccurredAtPkt).HasColumnType("datetime2(3)").IsRequired();

        entity.HasIndex(e => new { e.EmployeeId, e.OccurredAtPkt });
        entity.HasIndex(e => new { e.EmployeeId, e.Type });
    }
}

public class EmployeeRealtimeNotificationReadConfiguration : IEntityTypeConfiguration<EmployeeRealtimeNotificationRead>
{
    public void Configure(EntityTypeBuilder<EmployeeRealtimeNotificationRead> entity)
    {
        entity.ToTable("tblEmployeeRealtimeNotificationRead", "dbo");
        entity.HasKey(e => new { e.NotificationId, e.EmployeeId });

        entity.Property(e => e.ReadAtPkt).HasColumnType("datetime2(3)").IsRequired();

        entity.HasOne(e => e.Notification)
            .WithMany(e => e.Reads)
            .HasForeignKey(e => e.NotificationId)
            .OnDelete(DeleteBehavior.Cascade);

        entity.HasIndex(e => e.EmployeeId);
    }
}
