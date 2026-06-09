using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using School.Infrastructure.Academics.Entities;

namespace School.Infrastructure.Academics.Configurations;

public class InstituteSettingConfiguration : IEntityTypeConfiguration<InstituteSetting>
{
    public void Configure(EntityTypeBuilder<InstituteSetting> builder)
    {
        builder.ToTable("InstituteSettings");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.InstituteName).HasMaxLength(500);
        builder.Property(x => x.InstituteAddress).HasMaxLength(500);
        builder.Property(x => x.InstituteContact).HasMaxLength(500);
        builder.Property(x => x.InstituteEmail).HasMaxLength(500);
        builder.Property(x => x.InstituteLogo).HasColumnType("varchar(max)");
    }
}
