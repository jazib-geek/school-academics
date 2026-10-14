using School.Application.DTOs;

namespace School.Application.Interfaces;

public interface IStudentShortLeaveService
{
    Task<List<StudentShortLeaveDto>> ListAsync(
        DateOnly? date,
        DateOnly? dateFrom,
        DateOnly? dateTo,
        CancellationToken cancellationToken = default);

    Task<StudentShortLeaveDto> GetAsync(int id, CancellationToken cancellationToken = default);

    Task<StudentShortLeaveDto> CreateAsync(
        CreateStudentShortLeaveRequestDto request,
        string approvedByUserName,
        CancellationToken cancellationToken = default);
}
