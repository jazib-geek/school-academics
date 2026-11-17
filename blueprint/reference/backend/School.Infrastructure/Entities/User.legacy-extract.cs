// Extracted from School.Infrastructure/Entities/LegacyEntities.cs (the rest of that file is school domain).
// The blueprint replaces these with User : BaseEntity (PasswordHash, FullName, Email, ...) and UserPermission (UserId, PermissionCode).
namespace School.Infrastructure.Entities;

public class User
{
    public int ID { get; set; }
    public string? Username { get; set; }
    public int? RoleID { get; set; }
    public bool? IsActive { get; set; }
    public string? Password { get; set; }
    public bool IsSuperAdmin { get; set; }
}

public class UserRight
{
    public int ID { get; set; }
    public string? UserName { get; set; }
    public string? ModuleCode { get; set; }
    public string? ModuleName { get; set; }
    public bool? HasAccess { get; set; }
    public string? BranchCode { get; set; }
    public string? ModuleHead { get; set; }
}
