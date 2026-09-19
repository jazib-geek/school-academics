using School.Application.DTOs;

namespace School.Application.Interfaces;

public interface IFamilyAccountService
{
    Task<IReadOnlyList<FamilyAccountDto>> GetActiveFamilyAccountsAsync(CancellationToken cancellationToken = default);

    Task ChangePasswordAsync(int familyId, ChangeFamilyAccountPasswordDto request, CancellationToken cancellationToken = default);
}
