using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using School.Infrastructure.Entities;

namespace School.Infrastructure.Data.Configurations;

public class PermissionConfiguration : IEntityTypeConfiguration<Permission>
{
    public void Configure(EntityTypeBuilder<Permission> builder)
    {
        builder.ToTable("tblPermission", "dbo");
        builder.HasKey(e => e.Id);
        builder.Property(e => e.Code).HasMaxLength(100).IsRequired();
        builder.Property(e => e.Name).HasMaxLength(200).IsRequired();
        builder.Property(e => e.ModuleHead).HasMaxLength(200).IsRequired();
        builder.Property(e => e.SortOrder).IsRequired();
        builder.Property(e => e.IsActive).HasDefaultValue(true);
        builder.HasIndex(e => e.Code).IsUnique();

        builder.HasData(PermissionCatalog.All);
    }
}
