using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using School.Infrastructure.Academics.Entities;

namespace School.Infrastructure.Academics.Configurations;

public class AcademicUserRightConfiguration : IEntityTypeConfiguration<AcademicUserRight>
{
    public void Configure(EntityTypeBuilder<AcademicUserRight> builder)
    {
        builder.ToTable("tblUserRights", "dbo");
        builder.HasKey(e => e.Id);

        builder.Property(e => e.PermissionCode)
            .HasMaxLength(100)
            .IsRequired();

        builder.Property(e => e.HasAccess)
            .IsRequired()
            .HasDefaultValue(false);

        builder.HasIndex(e => new { e.UserId, e.PermissionCode })
            .IsUnique();

        builder.HasOne(e => e.User)
            .WithMany()
            .HasForeignKey(e => e.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
