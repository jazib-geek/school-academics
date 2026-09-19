using System.ComponentModel.DataAnnotations;

namespace School.Application.DTOs;

public class PermissionDto
{
    public int Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string ModuleHead { get; set; } = string.Empty;
    public int SortOrder { get; set; }
}

public class PermissionGroupDto
{
    public string ModuleHead { get; set; } = string.Empty;
    public IReadOnlyList<PermissionDto> Permissions { get; set; } = [];
}

public class CampusUserListItemDto
{
    public int Id { get; set; }
    public string Username { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public int? RoleId { get; set; }
    public bool IsActive { get; set; }
    public bool IsSuperAdmin { get; set; }
    public int GrantedPermissionCount { get; set; }
}

public class ChangeCampusPasswordDto
{
    [Required, StringLength(100)]
    public string CurrentPassword { get; set; } = string.Empty;

    [Required, StringLength(100, MinimumLength = 1)]
    public string NewPassword { get; set; } = string.Empty;

    [Required, StringLength(100)]
    public string ConfirmPassword { get; set; } = string.Empty;
}

public class ForceChangeCampusPasswordDto
{
    [Required, StringLength(100, MinimumLength = 1)]
    public string NewPassword { get; set; } = string.Empty;

    [Required, StringLength(100)]
    public string ConfirmPassword { get; set; } = string.Empty;
}

public class CampusUserDto
{
    public int Id { get; set; }
    public string Username { get; set; } = string.Empty;
    public int? RoleId { get; set; }
    public bool IsActive { get; set; }
    public bool IsSuperAdmin { get; set; }
    public IReadOnlyList<string> GrantedPermissionCodes { get; set; } = [];
}

public class CampusUserUpsertDto
{
    [Required, StringLength(500)]
    public string Username { get; set; } = string.Empty;

    /// <summary>Required on create. On update, leave null/empty to keep the existing password.</summary>
    [StringLength(100)]
    public string? Password { get; set; }

    public bool IsActive { get; set; } = true;
    public bool IsSuperAdmin { get; set; }

    /// <summary>Permission codes that should have HasAccess = true.</summary>
    public List<string> GrantedPermissionCodes { get; set; } = [];
}

public class CampusUserStatusUpdateDto
{
    public bool IsActive { get; set; }
}
