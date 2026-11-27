using School.Infrastructure.Data;
using School.Infrastructure.Entities;

namespace School.Infrastructure.Repositories;

/// <summary>The same student -> composite section -> class join used by the diary API.</summary>
public static class ClassDiaryAudience
{
    public static IQueryable<Student> ActiveStudentsForClass(AppDbContext db, int classId) =>
        from student in db.Students
        join section in db.Sections on student.ClassCompositeID equals section.ID
        where student.IsActive == true && section.Class_ID == classId
        select student;
}
