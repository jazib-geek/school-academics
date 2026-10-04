using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using School.Application.Interfaces;
using School.Infrastructure.Data;

namespace School.Application.Services;

public class AcademicHeadAccessService : IAcademicHeadAccessService
{
    private readonly AppDbContext _context;

    public AcademicHeadAccessService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<AcademicHeadAccessResult> EnsureAcademicHeadAsync(
        ClaimsPrincipal user,
        CancellationToken cancellationToken = default)
    {
        var claim = user.FindFirst("FamilyDbId")?.Value;
        if (string.IsNullOrWhiteSpace(claim) || !int.TryParse(claim, out var employeeId))
        {
            return new AcademicHeadAccessResult(false, 0, "Invalid employee token.", 401);
        }

        var isHead = await _context.Employees.AsNoTracking()
            .AnyAsync(e => e.ID == employeeId && e.IsActive == true && e.IsAcademicHead, cancellationToken);

        if (!isHead)
        {
            return new AcademicHeadAccessResult(false, 0, "Academic oversight access only.", 403);
        }

        return new AcademicHeadAccessResult(true, employeeId, null, 200);
    }
}
