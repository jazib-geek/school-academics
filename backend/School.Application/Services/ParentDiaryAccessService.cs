using Microsoft.EntityFrameworkCore;
using School.Infrastructure.Data;

namespace School.Application.Services;

public class ParentDiaryAccessService(AppDbContext db)
{
    public Task<bool> CanReadAsync(int familyDbId, int familyId, int studentId, CancellationToken ct) =>
        db.StudentFamilyDetails.AnyAsync(f => f.ID == familyDbId && f.FamilyID == familyId
            && f.IsActive != false && db.Students.Any(s => s.Reg_Id == studentId
                && s.Family_Code == familyId && s.IsActive == true), ct);
}
