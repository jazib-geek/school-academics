using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using School.Infrastructure.Academics.Entities;

namespace School.Infrastructure.Academics.Configurations;

public class AcademicUserConfiguration : IEntityTypeConfiguration<AcademicUser>
{
    public void Configure(EntityTypeBuilder<AcademicUser> builder)
    {
        builder.ToTable("AcademicLogin");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.UserName)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(x => x.Password)
            .IsRequired()
            .HasMaxLength(200);

        builder.HasIndex(x => x.UserName)
            .IsUnique();
    }
}
