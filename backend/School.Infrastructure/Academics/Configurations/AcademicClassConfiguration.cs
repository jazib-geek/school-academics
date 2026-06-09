using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using School.Infrastructure.Academics.Entities;

namespace School.Infrastructure.Academics.Configurations;

public class AcademicClassConfiguration : IEntityTypeConfiguration<AcademicClass>
{
    public void Configure(EntityTypeBuilder<AcademicClass> builder)
    {
        builder.ToTable("Class");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.ClassName)
            .IsRequired()
            .HasMaxLength(100);

        builder.HasIndex(x => x.ClassName)
            .IsUnique();
    }
}
