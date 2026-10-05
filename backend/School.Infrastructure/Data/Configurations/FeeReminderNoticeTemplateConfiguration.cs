using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using School.Infrastructure.Entities;

namespace School.Infrastructure.Data.Configurations;

public class FeeReminderNoticeTemplateConfiguration : IEntityTypeConfiguration<FeeReminderNoticeTemplate>
{
    public void Configure(EntityTypeBuilder<FeeReminderNoticeTemplate> entity)
    {
        entity.ToTable("tblFeeReminderNoticeTemplate", "dbo");
        entity.HasKey(e => e.Id);
        entity.Property(e => e.Code).HasMaxLength(32).IsRequired();
        entity.Property(e => e.Title).HasMaxLength(120).IsRequired();
        entity.Property(e => e.Greeting).HasMaxLength(200).IsRequired();
        entity.Property(e => e.BodyText).HasMaxLength(2000).IsRequired();
        entity.Property(e => e.ClosingText).HasMaxLength(500).IsRequired();
        entity.Property(e => e.IsActive).IsRequired().HasDefaultValue(true);

        entity.HasIndex(e => e.Code)
            .IsUnique()
            .HasDatabaseName("UQ_FeeReminderNoticeTemplate_Code");

        entity.HasData(FeeReminderNoticeTemplateCatalog.Templates);
    }
}
