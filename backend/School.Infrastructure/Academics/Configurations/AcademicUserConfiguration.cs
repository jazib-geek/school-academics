using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using School.Infrastructure.Academics.Entities;

namespace School.Infrastructure.Academics.Configurations;

public class AcademicUserConfiguration : IEntityTypeConfiguration<AcademicUser>
{
    public void Configure(EntityTypeBuilder<AcademicUser> builder)
    {
        builder.ToTable("AcademicLogin", "dbo");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.UserName)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(x => x.Password)
            .IsRequired()
            .HasMaxLength(200);

        builder.Property(x => x.IsActive)
            .IsRequired()
            .HasDefaultValue(true);

        builder.HasIndex(x => x.UserName)
            .IsUnique();
    }
}
