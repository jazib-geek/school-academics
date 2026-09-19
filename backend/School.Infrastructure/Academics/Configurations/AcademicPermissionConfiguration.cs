using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using School.Infrastructure.Academics.Data;
using School.Infrastructure.Academics.Entities;

namespace School.Infrastructure.Academics.Configurations;

public class AcademicPermissionConfiguration : IEntityTypeConfiguration<AcademicPermission>
{
    public void Configure(EntityTypeBuilder<AcademicPermission> builder)
    {
        builder.ToTable("tblPermission", "dbo");
        builder.HasKey(e => e.Id);
        builder.Property(e => e.Code).HasMaxLength(100).IsRequired();
        builder.Property(e => e.Name).HasMaxLength(200).IsRequired();
        builder.Property(e => e.ModuleHead).HasMaxLength(200).IsRequired();
        builder.Property(e => e.SortOrder).IsRequired();
        builder.Property(e => e.IsActive).HasDefaultValue(true);
        builder.HasIndex(e => e.Code).IsUnique();

        builder.HasData(AcademicPermissionCatalog.All);
    }
}
