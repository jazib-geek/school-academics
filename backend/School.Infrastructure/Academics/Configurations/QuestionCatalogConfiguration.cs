using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using School.Infrastructure.Academics.Entities;

namespace School.Infrastructure.Academics.Configurations;

public class QuestionCatalogConfiguration : IEntityTypeConfiguration<QuestionCatalog>
{
    public void Configure(EntityTypeBuilder<QuestionCatalog> builder)
    {
        builder.ToTable("QuestionsCatalog");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.Type)
            .IsRequired()
            .HasMaxLength(10);

        builder.Property(x => x.Category)
            .IsRequired()
            .HasMaxLength(20);

        builder.Property(x => x.DescriptionText)
            .IsRequired();

        builder.Property(x => x.StemImage).HasColumnType("varchar(max)");

        builder.Property(x => x.McqOpt1).HasColumnName("mcq_opt_1").HasMaxLength(300);
        builder.Property(x => x.McqOpt2).HasColumnName("mcq_opt_2").HasMaxLength(300);
        builder.Property(x => x.McqOpt3).HasColumnName("mcq_opt_3").HasMaxLength(300);
        builder.Property(x => x.McqOpt4).HasColumnName("mcq_opt_4").HasMaxLength(300);

        builder.HasOne(x => x.Chapter)
            .WithMany(x => x.Questions)
            .HasForeignKey(x => x.ChapterId)
            .OnDelete(DeleteBehavior.Cascade)
            .HasConstraintName("FK_Questions_Chapter");
    }
}
