using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using School.Infrastructure.Entities;

namespace School.Infrastructure.Data.Configurations;

public class ClassDiaryConfiguration : IEntityTypeConfiguration<ClassDiary>
{
    public void Configure(EntityTypeBuilder<ClassDiary> entity)
    {
        entity.ToTable("tblClassDiary");
        entity.HasKey(e => e.ID);

        entity.Property(e => e.Date).HasColumnType("date");
        entity.Property(e => e.Description).HasColumnType("nvarchar(max)");
        entity.Property(e => e.ImgURL).HasColumnType("nvarchar(max)");

        entity.HasOne(e => e.Class)
            .WithMany()
            .HasForeignKey(e => e.ClassID)
            .HasPrincipalKey(c => c.Class_ID);
    }
}
