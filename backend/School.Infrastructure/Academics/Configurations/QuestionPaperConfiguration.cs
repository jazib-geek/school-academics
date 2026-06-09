using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using School.Infrastructure.Academics.Entities;

namespace School.Infrastructure.Academics.Configurations;

public class QuestionPaperConfiguration : IEntityTypeConfiguration<QuestionPaper>
{
    public void Configure(EntityTypeBuilder<QuestionPaper> builder)
    {
        builder.ToTable("QuestionPaper");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.PaperName)
            .IsRequired()
            .HasMaxLength(200);

        builder.Property(x => x.SchoolName).HasMaxLength(250);
        builder.Property(x => x.SchoolLogoUrl).HasMaxLength(500);
        builder.Property(x => x.SessionLabel).HasMaxLength(100);
        builder.Property(x => x.ExamType).HasMaxLength(50);
        builder.Property(x => x.HeaderNote).HasMaxLength(1200);
        builder.Property(x => x.Instructions).HasMaxLength(2000);
        builder.Property(x => x.FooterNote).HasMaxLength(1200);
        builder.Property(x => x.SubQuestionNumberingStyle).HasMaxLength(20);
        builder.Property(x => x.WrapQuestionMarksInParentheses).HasDefaultValue(false);
        builder.Property(x => x.SectionMetaJson);

        builder.Property(x => x.CreatedOn)
            .HasColumnType("datetime")
            .HasDefaultValueSql("getdate()");

        builder.HasOne(x => x.Class)
            .WithMany(x => x.QuestionPapers)
            .HasForeignKey(x => x.ClassId)
            .OnDelete(DeleteBehavior.NoAction)
            .HasConstraintName("FK_QuestionPaper_Class");

        builder.HasOne(x => x.Subject)
            .WithMany(x => x.QuestionPapers)
            .HasForeignKey(x => x.SubjectId)
            .OnDelete(DeleteBehavior.NoAction)
            .HasConstraintName("FK_QuestionPaper_Subject");

        builder.HasOne(x => x.ExamTitle)
            .WithMany(x => x.QuestionPapers)
            .HasForeignKey(x => x.ExamTitleId)
            .OnDelete(DeleteBehavior.NoAction)
            .HasConstraintName("FK_QuestionPaper_ExamTitle");
    }
}
