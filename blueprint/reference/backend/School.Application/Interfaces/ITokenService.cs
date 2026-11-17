namespace School.Application.Interfaces;

public interface ITokenService
{
    /// <param name="authSource">Optional portal marker (e.g. AuthSourceClaims.Employee). Campus login omits this.</param>
    string GenerateToken(int familyDbId, int? familyId, string campus, string? authSource = null);
    string GenerateAcademicToken(int userId, string userName);
}
