using System.ComponentModel.DataAnnotations;

namespace School.Application.Academics.DTOs;

public class AcademicUserListItemDto
{
    public int Id { get; set; }
    public string UserName { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public bool IsActive { get; set; }
    public int GrantedPermissionCount { get; set; }
}

public class AcademicUserDto
{
    public int Id { get; set; }
    public string UserName { get; set; } = string.Empty;
    public bool IsActive { get; set; }
    public IReadOnlyList<string> GrantedPermissionCodes { get; set; } = [];
}

public class AcademicUserUpsertDto
{
    [Required, StringLength(100)]
    public string UserName { get; set; } = string.Empty;

    /// <summary>Required on create. On update, leave null/empty to keep the existing password.</summary>
    [StringLength(200)]
    public string? Password { get; set; }

    public bool IsActive { get; set; } = true;

    /// <summary>Permission codes that should have HasAccess = true.</summary>
    public List<string> GrantedPermissionCodes { get; set; } = [];
}

public class AcademicUserStatusUpdateDto
{
    public bool IsActive { get; set; }
}

public class ForceChangeAcademicPasswordDto
{
    [Required, StringLength(200, MinimumLength = 1)]
    public string NewPassword { get; set; } = string.Empty;

    [Required, StringLength(200)]
    public string ConfirmPassword { get; set; } = string.Empty;
}
