namespace School.Infrastructure.Academics.Entities;

public class AcademicUserRight
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public string PermissionCode { get; set; } = string.Empty;
    public bool HasAccess { get; set; }

    public AcademicUser? User { get; set; }
}
