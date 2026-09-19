using Microsoft.EntityFrameworkCore;
using School.Application.DTOs;
using School.Application.Interfaces;
using School.Infrastructure.Data;
using School.Infrastructure.Entities;

namespace School.Application.Services;

public class CampusUserService : ICampusUserService
{
    private readonly AppDbContext _context;

    public CampusUserService(AppDbContext context) => _context = context;

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

    public async Task<IReadOnlyList<CampusUserListItemDto>> GetUsersAsync(
        CancellationToken cancellationToken = default)
    {
        var users = await _context.Users
            .AsNoTracking()
            .OrderBy(x => x.Username)
            .ThenBy(x => x.ID)
            .ToListAsync(cancellationToken);

        var grantCounts = await _context.UserRights
            .AsNoTracking()
            .Where(x => x.UserName != null && x.HasAccess == true)
            .GroupBy(x => x.UserName!)
            .Select(g => new { UserName = g.Key, Count = g.Count() })
            .ToListAsync(cancellationToken);

        var countByUser = grantCounts.ToDictionary(
            x => x.UserName,
            x => x.Count,
            StringComparer.OrdinalIgnoreCase);

        return users.Select(u => new CampusUserListItemDto
        {
            Id = u.ID,
            Username = u.Username ?? string.Empty,
            Password = u.Password ?? string.Empty,
            RoleId = u.RoleID,
            IsActive = u.IsActive == true,
            IsSuperAdmin = u.IsSuperAdmin,
            GrantedPermissionCount = string.IsNullOrWhiteSpace(u.Username)
                ? 0
                : countByUser.GetValueOrDefault(u.Username, 0)
        }).ToList();
    }

    public async Task<CampusUserDto> GetUserAsync(int id, CancellationToken cancellationToken = default)
    {
        var user = await _context.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.ID == id, cancellationToken)
            ?? throw new KeyNotFoundException("User not found.");

        var granted = Array.Empty<string>();
        if (!string.IsNullOrWhiteSpace(user.Username))
        {
            granted = await _context.UserRights
                .AsNoTracking()
                .Where(x => x.UserName == user.Username && x.HasAccess == true && x.ModuleCode != null)
                .Select(x => x.ModuleCode!)
                .Distinct()
                .ToArrayAsync(cancellationToken);
        }

        return Map(user, granted);
    }

    public async Task<CampusUserDto> CreateUserAsync(
        CampusUserUpsertDto request,
        int actorUserId,
        CancellationToken cancellationToken = default)
    {
        var actorIsSuperAdmin = await IsActorSuperAdminAsync(actorUserId, cancellationToken);
        EnsureCanAssignSuperAdmin(actorIsSuperAdmin, requestedIsSuperAdmin: request.IsSuperAdmin, existingIsSuperAdmin: false);

        var username = NormalizeUsername(request.Username);
        var password = (request.Password ?? string.Empty).Trim();
        if (password.Length == 0)
            throw new ArgumentException("Password is required.");

        await EnsureUsernameAvailableAsync(username, null, cancellationToken);

        var catalog = await LoadCatalogAsync(cancellationToken);
        var grantedCodes = NormalizeGrantedCodes(request.GrantedPermissionCodes, catalog);

        var user = new User
        {
            Username = username,
            Password = password,
            IsActive = request.IsActive,
            IsSuperAdmin = actorIsSuperAdmin && request.IsSuperAdmin
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync(cancellationToken);

        await SyncUserRightsAsync(username, grantedCodes, catalog, cancellationToken);
        await _context.SaveChangesAsync(cancellationToken);

        return await GetUserAsync(user.ID, cancellationToken);
    }

    public async Task<CampusUserDto> UpdateUserAsync(
        int id,
        CampusUserUpsertDto request,
        int actorUserId,
        CancellationToken cancellationToken = default)
    {
        var user = await _context.Users
            .FirstOrDefaultAsync(x => x.ID == id, cancellationToken)
            ?? throw new KeyNotFoundException("User not found.");

        var actorIsSuperAdmin = await IsActorSuperAdminAsync(actorUserId, cancellationToken);
        EnsureCanAssignSuperAdmin(actorIsSuperAdmin, request.IsSuperAdmin, user.IsSuperAdmin);

        var username = NormalizeUsername(request.Username);
        await EnsureUsernameAvailableAsync(username, id, cancellationToken);

        var catalog = await LoadCatalogAsync(cancellationToken);
        var grantedCodes = NormalizeGrantedCodes(request.GrantedPermissionCodes, catalog);
        var previousUsername = user.Username?.Trim() ?? string.Empty;

        user.Username = username;
        user.IsActive = request.IsActive;
        user.IsSuperAdmin = actorIsSuperAdmin ? request.IsSuperAdmin : user.IsSuperAdmin;

        var password = (request.Password ?? string.Empty).Trim();
        if (password.Length > 0)
            user.Password = password;

        // If username changed, move existing rights rows to the new username first.
        if (!string.Equals(previousUsername, username, StringComparison.OrdinalIgnoreCase)
            && previousUsername.Length > 0)
        {
            var oldRights = await _context.UserRights
                .Where(x => x.UserName == previousUsername)
                .ToListAsync(cancellationToken);

            foreach (var right in oldRights)
                right.UserName = username;
        }

        await SyncUserRightsAsync(username, grantedCodes, catalog, cancellationToken);
        await _context.SaveChangesAsync(cancellationToken);

        return await GetUserAsync(id, cancellationToken);
    }

    public async Task SetUserStatusAsync(int id, bool isActive, CancellationToken cancellationToken = default)
    {
        var user = await _context.Users
            .FirstOrDefaultAsync(x => x.ID == id, cancellationToken)
            ?? throw new KeyNotFoundException("User not found.");

        user.IsActive = isActive;
        await _context.SaveChangesAsync(cancellationToken);
    }

    public async Task ForceChangePasswordAsync(
        int id,
        ForceChangeCampusPasswordDto request,
        CancellationToken cancellationToken = default)
    {
        var newPassword = (request.NewPassword ?? string.Empty).Trim();
        var confirmPassword = (request.ConfirmPassword ?? string.Empty).Trim();

        if (newPassword.Length == 0)
            throw new ArgumentException("New password is required.");
        if (!string.Equals(newPassword, confirmPassword, StringComparison.Ordinal))
            throw new ArgumentException("New password and confirmation do not match.");

        var user = await _context.Users
            .FirstOrDefaultAsync(x => x.ID == id, cancellationToken)
            ?? throw new KeyNotFoundException("User not found.");

        user.Password = newPassword;
        await _context.SaveChangesAsync(cancellationToken);
    }

    /// <summary>
    /// Sync rights without deleting rows: checked → HasAccess true (insert if missing);
    /// unchecked + existing row → HasAccess false; unchecked + no row → leave absent.
    /// </summary>
    private async Task SyncUserRightsAsync(
        string username,
        HashSet<string> grantedCodes,
        IReadOnlyDictionary<string, Permission> catalog,
        CancellationToken cancellationToken)
    {
        var existing = await _context.UserRights
            .Where(x => x.UserName == username)
            .ToListAsync(cancellationToken);

        var byCode = existing
            .Where(x => !string.IsNullOrWhiteSpace(x.ModuleCode))
            .GroupBy(x => x.ModuleCode!, StringComparer.OrdinalIgnoreCase)
            .ToDictionary(g => g.Key, g => g.First(), StringComparer.OrdinalIgnoreCase);

        foreach (var code in grantedCodes)
        {
            if (!catalog.TryGetValue(code, out var permission))
                continue;

            if (byCode.TryGetValue(code, out var row))
            {
                row.HasAccess = true;
                row.ModuleName = permission.Name;
                row.ModuleHead = permission.ModuleHead;
            }
            else
            {
                _context.UserRights.Add(new UserRight
                {
                    UserName = username,
                    ModuleCode = permission.Code,
                    ModuleName = permission.Name,
                    ModuleHead = permission.ModuleHead,
                    HasAccess = true,
                    BranchCode = null
                });
            }
        }

        foreach (var row in existing)
        {
            if (string.IsNullOrWhiteSpace(row.ModuleCode))
                continue;

            if (!grantedCodes.Contains(row.ModuleCode))
                row.HasAccess = false;
        }
    }

    private async Task<IReadOnlyDictionary<string, Permission>> LoadCatalogAsync(
        CancellationToken cancellationToken)
    {
        var rows = await _context.Permissions
            .AsNoTracking()
            .Where(x => x.IsActive)
            .ToListAsync(cancellationToken);

        return rows.ToDictionary(x => x.Code, StringComparer.OrdinalIgnoreCase);
    }

    private async Task EnsureUsernameAvailableAsync(
        string username,
        int? excludingUserId,
        CancellationToken cancellationToken)
    {
        var taken = await _context.Users
            .AsNoTracking()
            .AnyAsync(
                x => x.Username == username && (!excludingUserId.HasValue || x.ID != excludingUserId.Value),
                cancellationToken);

        if (taken)
            throw new InvalidOperationException("A user with this username already exists.");
    }

    private static string NormalizeUsername(string? username)
    {
        var value = (username ?? string.Empty).Trim();
        if (value.Length == 0)
            throw new ArgumentException("Username is required.");
        return value;
    }

    private static HashSet<string> NormalizeGrantedCodes(
        IEnumerable<string>? codes,
        IReadOnlyDictionary<string, Permission> catalog)
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

    private async Task<bool> IsActorSuperAdminAsync(int actorUserId, CancellationToken cancellationToken)
    {
        if (actorUserId <= 0)
            return false;

        return await _context.Users
            .AsNoTracking()
            .AnyAsync(x => x.ID == actorUserId && x.IsActive == true && x.IsSuperAdmin, cancellationToken);
    }

    private static void EnsureCanAssignSuperAdmin(
        bool actorIsSuperAdmin,
        bool requestedIsSuperAdmin,
        bool existingIsSuperAdmin)
    {
        if (actorIsSuperAdmin)
            return;

        if (requestedIsSuperAdmin != existingIsSuperAdmin)
        {
            throw new UnauthorizedAccessException(
                "Only a super admin can grant or change super admin access.");
        }
    }

    private static CampusUserDto Map(User user, IReadOnlyList<string> granted) => new()
    {
        Id = user.ID,
        Username = user.Username ?? string.Empty,
        RoleId = user.RoleID,
        IsActive = user.IsActive == true,
        IsSuperAdmin = user.IsSuperAdmin,
        GrantedPermissionCodes = granted
    };
}
