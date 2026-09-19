using Microsoft.EntityFrameworkCore;
using School.Infrastructure.Academics.Entities;

namespace School.Infrastructure.Academics.Data;

public class AcademicContext : DbContext
{
    public AcademicContext(DbContextOptions<AcademicContext> options) : base(options)
    {
    }

    public DbSet<AcademicClass> Classes => Set<AcademicClass>();
    public DbSet<AcademicSubject> Subjects => Set<AcademicSubject>();
    public DbSet<Chapter> Chapters => Set<Chapter>();
    public DbSet<QuestionCatalog> QuestionsCatalog => Set<QuestionCatalog>();
    public DbSet<ExamTitle> ExamTitles => Set<ExamTitle>();
    public DbSet<QuestionPaper> QuestionPapers => Set<QuestionPaper>();
    public DbSet<QuestionPaperQuestion> QuestionPaperQuestions => Set<QuestionPaperQuestion>();
    public DbSet<AcademicUser> AcademicUsers => Set<AcademicUser>();
    public DbSet<AcademicPermission> Permissions => Set<AcademicPermission>();
    public DbSet<AcademicUserRight> UserRights => Set<AcademicUserRight>();
    public DbSet<InstituteSetting> InstituteSettings => Set<InstituteSetting>();


    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Keep academics DDL on dbo even when the SQL login default schema is not dbo.
        modelBuilder.HasDefaultSchema("dbo");

        modelBuilder.ApplyConfigurationsFromAssembly(
            typeof(AcademicContext).Assembly,
            t => t.Namespace == "School.Infrastructure.Academics.Configurations");
    }
}
