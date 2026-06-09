using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using School.Infrastructure.Entities;

namespace School.Infrastructure.Data.Configurations;

public class ClassConfiguration : IEntityTypeConfiguration<Class>
{
    public void Configure(EntityTypeBuilder<Class> entity)
    {
        entity.ToTable("tblClass");
        entity.HasKey(e => e.Class_ID);

        entity.Property(e => e.Class_Name)
            .HasMaxLength(50)
            .IsUnicode(false);
    }
}
