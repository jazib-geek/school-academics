using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using School.Infrastructure.Academics.Entities;

namespace School.Infrastructure.Academics.Configurations;

public class AcademicSubjectConfiguration : IEntityTypeConfiguration<AcademicSubject>
{
    public void Configure(EntityTypeBuilder<AcademicSubject> builder)
    {
        builder.ToTable("Subject");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.SubjectName)
            .IsRequired()
            .HasMaxLength(150);

        builder.HasIndex(x => x.SubjectName)
            .IsUnique();
    }
}
