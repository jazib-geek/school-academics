using Microsoft.EntityFrameworkCore;
using School.Application.Academics.DTOs;
using School.Application.Academics.Interfaces;
using School.Application.DTOs;
using School.Infrastructure.Academics.Data;
using School.Infrastructure.Academics.Entities;

namespace School.Application.Academics.Services;

public class AcademicUserService : IAcademicUserService
{
    private readonly AcademicContext _context;

    public AcademicUserService(AcademicContext context) => _context = context;

    public async Task<IReadOnlyList<PermissionGroupDto>> GetPermissionCatalogAsync(
        CancellationToken cancellationToken = default)
    {
        var permissions = await _context.Permissions
            .AsNoTracking()
            .Where(x => x.IsActive)
            .OrderBy(x => x.SortOrder)
            .ThenBy(x => x.Name)
            .Select(x => new PermissionDto
            {
                Id = x.Id,
                Code = x.Code,
                Name = x.Name,
                ModuleHead = x.ModuleHead,
                SortOrder = x.SortOrder
            })
            .ToListAsync(cancellationToken);

        return permissions
            .GroupBy(x => x.ModuleHead)
            .OrderBy(g => g.Min(x => x.SortOrder))
            .Select(g => new PermissionGroupDto
            {
                ModuleHead = g.Key,
                Permissions = g.ToList()
            })
            .ToList();
    }

    public async Task<IReadOnlyList<AcademicUserListItemDto>> GetUsersAsync(
        CancellationToken cancellationToken = default)
    {
        var users = await _context.AcademicUsers
            .AsNoTracking()
            .OrderBy(x => x.UserName)
            .ThenBy(x => x.Id)
            .ToListAsync(cancellationToken);

        var grantCounts = await _context.UserRights
            .AsNoTracking()
            .Where(x => x.HasAccess)
            .GroupBy(x => x.UserId)
            .Select(g => new { UserId = g.Key, Count = g.Count() })
            .ToListAsync(cancellationToken);

        var countByUser = grantCounts.ToDictionary(x => x.UserId, x => x.Count);

        return users.Select(u => new AcademicUserListItemDto
        {
            Id = u.Id,
            UserName = u.UserName,
            Password = u.Password,
            IsActive = u.IsActive,
            GrantedPermissionCount = countByUser.GetValueOrDefault(u.Id, 0)
        }).ToList();
    }

    public async Task<AcademicUserDto> GetUserAsync(int id, CancellationToken cancellationToken = default)
    {
        var user = await _context.AcademicUsers
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken)
            ?? throw new KeyNotFoundException("User not found.");

        var granted = await GetGrantedPermissionCodesAsync(id, cancellationToken);
        return Map(user, granted);
    }

    public async Task<AcademicUserDto> CreateUserAsync(
        AcademicUserUpsertDto request,
        CancellationToken cancellationToken = default)
    {
        var userName = NormalizeUserName(request.UserName);
        var password = (request.Password ?? string.Empty).Trim();
        if (password.Length == 0)
            throw new ArgumentException("Password is required.");

        await EnsureUserNameAvailableAsync(userName, null, cancellationToken);

        var catalog = await LoadCatalogAsync(cancellationToken);
        var grantedCodes = NormalizeGrantedCodes(request.GrantedPermissionCodes, catalog);

        var user = new AcademicUser
        {
            UserName = userName,
            Password = password,
            IsActive = request.IsActive
        };

        _context.AcademicUsers.Add(user);
        await _context.SaveChangesAsync(cancellationToken);

        await SyncUserRightsAsync(user.Id, grantedCodes, catalog, cancellationToken);
        await _context.SaveChangesAsync(cancellationToken);

        return await GetUserAsync(user.Id, cancellationToken);
    }

    public async Task<AcademicUserDto> UpdateUserAsync(
        int id,
        AcademicUserUpsertDto request,
        CancellationToken cancellationToken = default)
    {
        var user = await _context.AcademicUsers
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken)
            ?? throw new KeyNotFoundException("User not found.");

        var userName = NormalizeUserName(request.UserName);
        await EnsureUserNameAvailableAsync(userName, id, cancellationToken);

        var catalog = await LoadCatalogAsync(cancellationToken);
        var grantedCodes = NormalizeGrantedCodes(request.GrantedPermissionCodes, catalog);

        user.UserName = userName;
        user.IsActive = request.IsActive;

        var password = (request.Password ?? string.Empty).Trim();
        if (password.Length > 0)
            user.Password = password;

        await SyncUserRightsAsync(id, grantedCodes, catalog, cancellationToken);
        await _context.SaveChangesAsync(cancellationToken);

        return await GetUserAsync(id, cancellationToken);
    }

    public async Task SetUserStatusAsync(int id, bool isActive, CancellationToken cancellationToken = default)
    {
        var user = await _context.AcademicUsers
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken)
            ?? throw new KeyNotFoundException("User not found.");

        user.IsActive = isActive;
        await _context.SaveChangesAsync(cancellationToken);
    }

    public async Task ForceChangePasswordAsync(
        int id,
        ForceChangeAcademicPasswordDto request,
        CancellationToken cancellationToken = default)
    {
        var newPassword = (request.NewPassword ?? string.Empty).Trim();
        var confirmPassword = (request.ConfirmPassword ?? string.Empty).Trim();

        if (newPassword.Length == 0)
            throw new ArgumentException("New password is required.");
        if (!string.Equals(newPassword, confirmPassword, StringComparison.Ordinal))
            throw new ArgumentException("New password and confirmation do not match.");

        var user = await _context.AcademicUsers
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken)
            ?? throw new KeyNotFoundException("User not found.");

        user.Password = newPassword;
        await _context.SaveChangesAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<string>> GetGrantedPermissionCodesAsync(
        int userId,
        CancellationToken cancellationToken = default)
    {
        return await _context.UserRights
            .AsNoTracking()
            .Where(x => x.UserId == userId && x.HasAccess)
            .Select(x => x.PermissionCode)
            .Distinct()
            .ToListAsync(cancellationToken);
    }

    private async Task SyncUserRightsAsync(
        int userId,
        HashSet<string> grantedCodes,
        IReadOnlyDictionary<string, AcademicPermission> catalog,
        CancellationToken cancellationToken)
    {
        var existing = await _context.UserRights
            .Where(x => x.UserId == userId)
            .ToListAsync(cancellationToken);

        var byCode = existing
            .GroupBy(x => x.PermissionCode, StringComparer.OrdinalIgnoreCase)
            .ToDictionary(g => g.Key, g => g.First(), StringComparer.OrdinalIgnoreCase);

        foreach (var code in grantedCodes)
        {
            if (!catalog.TryGetValue(code, out var permission))
                continue;

            if (byCode.TryGetValue(code, out var row))
            {
                row.HasAccess = true;
                row.PermissionCode = permission.Code;
            }
            else
            {
                _context.UserRights.Add(new AcademicUserRight
                {
                    UserId = userId,
                    PermissionCode = permission.Code,
                    HasAccess = true
                });
            }
        }

        foreach (var row in existing)
        {
            if (!grantedCodes.Contains(row.PermissionCode))
                row.HasAccess = false;
        }
    }

    private async Task<IReadOnlyDictionary<string, AcademicPermission>> LoadCatalogAsync(
        CancellationToken cancellationToken)
    {
        var rows = await _context.Permissions
            .AsNoTracking()
            .Where(x => x.IsActive)
            .ToListAsync(cancellationToken);

        return rows.ToDictionary(x => x.Code, StringComparer.OrdinalIgnoreCase);
    }

    private async Task EnsureUserNameAvailableAsync(
        string userName,
        int? excludingUserId,
        CancellationToken cancellationToken)
    {
        var taken = await _context.AcademicUsers
            .AsNoTracking()
            .AnyAsync(
                x => x.UserName == userName && (!excludingUserId.HasValue || x.Id != excludingUserId.Value),
                cancellationToken);

        if (taken)
            throw new InvalidOperationException("A user with this username already exists.");
    }

    private static string NormalizeUserName(string? userName)
    {
        var value = (userName ?? string.Empty).Trim();
        if (value.Length == 0)
            throw new ArgumentException("Username is required.");
        return value;
    }

    private static HashSet<string> NormalizeGrantedCodes(
        IEnumerable<string>? codes,
        IReadOnlyDictionary<string, AcademicPermission> catalog)
    {
        var set = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        if (codes is null)
            return set;

        foreach (var raw in codes)
        {
            var code = (raw ?? string.Empty).Trim();
            if (code.Length == 0)
                continue;
            if (catalog.ContainsKey(code))
                set.Add(catalog[code].Code);
        }

        return set;
    }

    private static AcademicUserDto Map(AcademicUser user, IReadOnlyList<string> granted) => new()
    {
        Id = user.Id,
        UserName = user.UserName,
        IsActive = user.IsActive,
        GrantedPermissionCodes = granted
    };
}
