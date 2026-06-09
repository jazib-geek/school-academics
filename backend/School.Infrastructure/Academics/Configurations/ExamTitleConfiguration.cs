using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using School.Infrastructure.Academics.Entities;

namespace School.Infrastructure.Academics.Configurations;

public class ExamTitleConfiguration : IEntityTypeConfiguration<ExamTitle>
{
    public void Configure(EntityTypeBuilder<ExamTitle> builder)
    {
        builder.ToTable("ExamTitle");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.Title)
            .IsRequired()
            .HasMaxLength(250);

        builder.Property(x => x.ExamType).HasMaxLength(50);

        builder.Property(x => x.CreatedOn)
            .HasColumnType("datetime")
            .HasDefaultValueSql("getdate()");

        builder.HasIndex(x => x.Title)
            .IsUnique()
            .HasDatabaseName("UX_ExamTitle_Title");
    }
}
