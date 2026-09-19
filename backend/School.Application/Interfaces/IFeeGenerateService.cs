using School.Application.DTOs;

namespace School.Application.Interfaces;

public interface IFeeGenerateService
{
    Task GenerateForAllAsync(GenerateFeeAllRequestDto request, CancellationToken cancellationToken = default);

    Task GenerateForStudentAsync(GenerateFeeStudentRequestDto request, CancellationToken cancellationToken = default);
}
