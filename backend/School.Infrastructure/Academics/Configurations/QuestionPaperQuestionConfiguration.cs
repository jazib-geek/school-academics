using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using School.Infrastructure.Academics.Entities;

namespace School.Infrastructure.Academics.Configurations;

public class QuestionPaperQuestionConfiguration : IEntityTypeConfiguration<QuestionPaperQuestion>
{
    public void Configure(EntityTypeBuilder<QuestionPaperQuestion> builder)
    {
        builder.ToTable("QuestionPaperQuestions");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.Section)
            .HasMaxLength(50);

        builder.HasIndex(x => new { x.QuestionPaperId, x.QuestionId })
            .IsUnique()
            .HasDatabaseName("UQ_Paper_Question");

        builder.HasIndex(x => new { x.QuestionPaperId, x.QuestionOrder })
            .IsUnique()
            .HasDatabaseName("UQ_Paper_QuestionOrder");

        builder.HasOne(x => x.QuestionPaper)
            .WithMany(x => x.Questions)
            .HasForeignKey(x => x.QuestionPaperId)
            .OnDelete(DeleteBehavior.Cascade)
            .HasConstraintName("FK_QPQ_Paper");

        builder.HasOne(x => x.Question)
            .WithMany(x => x.QuestionPaperQuestions)
            .HasForeignKey(x => x.QuestionId)
            .OnDelete(DeleteBehavior.NoAction)
            .HasConstraintName("FK_QPQ_Question");
    }
}
