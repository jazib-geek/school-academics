using School.Application.DTOs;

namespace School.Application.Interfaces;

public interface IEmployeeSalaryComponentService
{
    Task<IReadOnlyList<EmployeeSalaryComponentDto>> GetByEmployeeAsync(
        int employeeId,
        CancellationToken cancellationToken = default);

    Task<EmployeeSalaryPeriodStatusDto> GetPeriodStatusAsync(
        int employeeId,
        int month,
        int year,
        CancellationToken cancellationToken = default);

    Task<EmployeeSalaryComponentDto> UpsertAsync(
        UpsertEmployeeSalaryComponentDto request,
        int? userId = null,
        CancellationToken cancellationToken = default);

    Task DeleteAsync(int id, int? userId = null, CancellationToken cancellationToken = default);
}

public interface ICampusPayrollSettingsService
{
    Task<CampusPayrollSettingsDto> GetAsync(CancellationToken cancellationToken = default);

    Task<CampusPayrollSettingsDto> UpdateAsync(
        UpdateCampusPayrollSettingsDto request,
        CancellationToken cancellationToken = default);
}

public interface IEmployeeSalaryService
{
    Task<string> StartCalculationAsync(
        int month,
        int year,
        int? sundaysToInclude = null,
        CancellationToken cancellationToken = default);

    Task<EmployeeSalaryRowDto> RecalculateEmployeeAsync(
        int employeeId,
        int month,
        int year,
        int? sundaysToInclude = null,
        CancellationToken cancellationToken = default);

    Task<EmployeeSalaryCalculationResultDto?> GetCalculationResultAsync(
        string generationId,
        CancellationToken cancellationToken = default);
}

public interface IEmployeeSalaryProgressStore
{
    void Start(string generationId, int month, int year);
    void SetPercent(string generationId, int percent);
    void Complete(string generationId, EmployeeSalaryCalculationResultDto result);
    void Fail(string generationId, string error);
    EmployeeSalaryProgressSnapshot? Get(string generationId);
}

public sealed class EmployeeSalaryProgressSnapshot
{
    public string GenerationId { get; init; } = string.Empty;
    public int Month { get; init; }
    public int Year { get; init; }
    public int Percent { get; set; }
    public bool IsDone { get; set; }
    public bool IsFailed { get; set; }
    public string? Error { get; set; }
    public EmployeeSalaryCalculationResultDto? Result { get; set; }
    public DateTime CreatedAtUtc { get; init; }
}