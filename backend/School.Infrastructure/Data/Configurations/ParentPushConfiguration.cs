using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using School.Infrastructure.Entities;

namespace School.Infrastructure.Data.Configurations;

public class ParentPushDeviceConfiguration : IEntityTypeConfiguration<ParentPushDevice>
{
    public void Configure(EntityTypeBuilder<ParentPushDevice> e)
    {
        e.ToTable("ParentPushDevice");
        e.HasKey(x => x.Id);
        e.HasIndex(x => x.InstallationId).IsUnique();
        e.HasIndex(x => x.TokenHash).IsUnique();
        e.Property(x => x.Token).HasMaxLength(4096);
        e.Property(x => x.TokenHash).HasMaxLength(64).IsUnicode(false);
        e.HasIndex(x => new { x.IsActive, x.FamilyDbId });
    }
}

public class ParentAnnouncementPushConfiguration : IEntityTypeConfiguration<ParentAnnouncementPush>
{
    public void Configure(EntityTypeBuilder<ParentAnnouncementPush> e)
    {
        e.ToTable("ParentAnnouncementPush", t => t.HasCheckConstraint("CK_ParentPush_Audience",
            "([AnnouncementId] IS NOT NULL AND [DiaryClassId] IS NULL AND [DiaryDate] IS NULL) OR " +
            "([AnnouncementId] IS NULL AND [DiaryClassId] IS NOT NULL AND [DiaryDate] IS NOT NULL)"));
        e.HasKey(x => x.Id);
        e.Property(x => x.Title).HasMaxLength(150);
        e.HasIndex(x => x.AnnouncementId).IsUnique();
        e.HasIndex(x => new { x.DiaryClassId, x.DiaryDate }).IsUnique()
            .HasFilter("[DiaryClassId] IS NOT NULL AND [DiaryDate] IS NOT NULL");
        e.HasOne(x => x.Announcement).WithMany().HasForeignKey(x => x.AnnouncementId).OnDelete(DeleteBehavior.Restrict);
    }
}

public class ParentPushDeliveryConfiguration : IEntityTypeConfiguration<ParentPushDelivery>
{
    public void Configure(EntityTypeBuilder<ParentPushDelivery> e)
    {
        e.ToTable("ParentPushDelivery");
        e.HasKey(x => x.Id);
        e.Property(x => x.Outcome).HasMaxLength(32);
        e.HasIndex(x => new { x.PushId, x.DeviceId }).IsUnique();
        e.HasIndex(x => new { x.CompletedAtUtc, x.NextAttemptUtc });
        e.HasOne(x => x.Push).WithMany(x => x.Deliveries).HasForeignKey(x => x.PushId).OnDelete(DeleteBehavior.Cascade);
        e.HasOne(x => x.Device).WithMany().HasForeignKey(x => x.DeviceId).OnDelete(DeleteBehavior.Restrict);
    }
}
