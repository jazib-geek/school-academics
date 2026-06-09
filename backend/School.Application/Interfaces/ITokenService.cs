namespace School.Application.Interfaces;

public interface ITokenService
{
    string GenerateToken(int familyDbId, int? familyId, string campus);
    string GenerateAcademicToken(int userId, string userName);
}
