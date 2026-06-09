using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using School.Infrastructure.Academics.Entities;

namespace School.Infrastructure.Academics.Configurations;

public class ChapterConfiguration : IEntityTypeConfiguration<Chapter>
{
    public void Configure(EntityTypeBuilder<Chapter> builder)
    {
        builder.ToTable("Chapters");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.ChapterName)
            .IsRequired()
            .HasMaxLength(200);

        builder.HasIndex(x => new { x.ClassId, x.SubjectId, x.ChapterNo })
            .IsUnique();

        builder.HasOne(x => x.Class)
            .WithMany(x => x.Chapters)
            .HasForeignKey(x => x.ClassId)
            .OnDelete(DeleteBehavior.Cascade)
            .HasConstraintName("FK_Chapters_Class");

        builder.HasOne(x => x.Subject)
            .WithMany(x => x.Chapters)
            .HasForeignKey(x => x.SubjectId)
            .OnDelete(DeleteBehavior.Cascade)
            .HasConstraintName("FK_Chapters_Subject");
    }
}
