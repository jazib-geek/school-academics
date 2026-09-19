namespace School.Application.Common;

/// <summary>
/// JWT claim values distinguishing portal tokens that share the same FamilyDbId shape.
/// Campus login omits AuthSource; employee login sets AuthSource=Employee.
/// </summary>
public static class AuthSourceClaims
{
    public const string ClaimType = "AuthSource";
    public const string Employee = "Employee";
}
