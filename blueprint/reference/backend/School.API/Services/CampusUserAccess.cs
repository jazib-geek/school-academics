using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using School.Application.Common;
using School.Infrastructure.Data;

namespace School.API.Services;

public static class CampusUserAccess
{
    /// <summary>Campus staff user id from the JWT; false for employee-portal tokens.</summary>
    public static bool TryGetCampusUserId(ClaimsPrincipal user, out int userId)
    {
        userId = 0;
        var isEmployee = string.Equals(
            user.FindFirst(AuthSourceClaims.ClaimType)?.Value,
            AuthSourceClaims.Employee,
            StringComparison.OrdinalIgnoreCase);
        if (isEmployee)
            return false;

        return int.TryParse(user.FindFirst("FamilyDbId")?.Value, out userId) && userId > 0;
    }

    public static async Task<bool> HasPermissionAsync(
        AppDbContext context,
        int userId,
        string permissionCode,
        CancellationToken cancellationToken)
    {
        var user = await context.Users.AsNoTracking()
            .FirstOrDefaultAsync(x => x.ID == userId, cancellationToken);

        if (user is null || user.IsActive != true)
            return false;

        if (user.IsSuperAdmin)
            return true;

        var username = user.Username ?? string.Empty;
        return await context.UserRights.AsNoTracking()
            .AnyAsync(
                x => x.UserName == username && x.ModuleCode == permissionCode && x.HasAccess == true,
                cancellationToken);
    }
}
