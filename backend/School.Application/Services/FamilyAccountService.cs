using Microsoft.EntityFrameworkCore;
using School.Application.DTOs;
using School.Application.Interfaces;
using School.Infrastructure.Data;

namespace School.Application.Services;

public class FamilyAccountService : IFamilyAccountService
{
    private readonly AppDbContext _context;

    public FamilyAccountService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<IReadOnlyList<FamilyAccountDto>> GetActiveFamilyAccountsAsync(
        CancellationToken cancellationToken = default)
    {
        var activeFamilyCodes = await _context.Students
            .AsNoTracking()
            .Where(s => s.IsActive == true && s.Family_Code != null)
            .GroupBy(s => s.Family_Code!.Value)
            .Select(g => new { FamilyId = g.Key, Count = g.Count() })
            .ToListAsync(cancellationToken);

        if (activeFamilyCodes.Count == 0)
            return [];

        var countMap = activeFamilyCodes.ToDictionary(x => x.FamilyId, x => x.Count);
        var familyIds = countMap.Keys.ToList();

        var families = await _context.StudentFamilyDetails
            .AsNoTracking()
            .Where(f => f.FamilyID != null && familyIds.Contains(f.FamilyID.Value))
            .OrderBy(f => f.FamilyID)
            .ToListAsync(cancellationToken);

        return families
            .Select(f =>
            {
                var familyId = f.FamilyID!.Value;
                countMap.TryGetValue(familyId, out var count);
                return new FamilyAccountDto
                {
                    Id = f.ID,
                    FamilyId = familyId,
                    FatherName = f.FatherName,
                    FatherContact = f.FatherMobileNo,
                    Password = f.Password,
                    ActiveStudentCount = count
                };
            })
            .ToList();
    }

    public async Task ChangePasswordAsync(
        int familyId,
        ChangeFamilyAccountPasswordDto request,
        CancellationToken cancellationToken = default)
    {
        var password = (request.Password ?? string.Empty).Trim();
        if (string.IsNullOrWhiteSpace(password))
            throw new ArgumentException("Password is required.");

        if (password.Length > 50)
            throw new ArgumentException("Password is too long.");

        var family = await _context.StudentFamilyDetails
            .FirstOrDefaultAsync(f => f.FamilyID == familyId, cancellationToken)
            ?? throw new KeyNotFoundException("Family account not found.");

        var hasActiveStudent = await _context.Students
            .AsNoTracking()
            .AnyAsync(s => s.Family_Code == familyId && s.IsActive == true, cancellationToken);

        if (!hasActiveStudent)
            throw new InvalidOperationException("This family has no active students.");

        family.Password = password;
        await _context.SaveChangesAsync(cancellationToken);
    }
}
