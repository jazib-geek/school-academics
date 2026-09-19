namespace School.Application.DTOs;

public class EmployeeSalaryComponentDto
{
    public int Id { get; set; }
    public int EmployeeId { get; set; }
    public int Month { get; set; }
    public int Year { get; set; }
    public string ComponentType { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public string? Description { get; set; }
}

public class UpsertEmployeeSalaryComponentDto
{
    public int EmployeeId { get; set; }
    public int Month { get; set; }
    public int Year { get; set; }
    public string ComponentType { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public string? Description { get; set; }
}

public class EmployeeSalaryPeriodStatusDto
{
    public bool IsGenerated { get; set; }
    public bool IsCurrentMonth { get; set; }
    public bool IsPastMonth { get; set; }
    public bool IsFutureMonth { get; set; }
    public decimal BasicSalary { get; set; }
    public bool HasBasicSalarySnapshot { get; set; }
    public bool CanEditBasic { get; set; }
}

public class RecalculateEmployeeSalaryRequestDto
{
    public int EmployeeId { get; set; }
    public int Month { get; set; }
    public int Year { get; set; }
    public int? SundaysToInclude { get; set; }
}

public class CampusPayrollSettingsDto
{
    public decimal TeaAllowance { get; set; }
}

public class UpdateCampusPayrollSettingsDto
{
    public decimal TeaAllowance { get; set; }
}

public class StartEmployeeSalaryCalculationRequestDto
{
    public int Month { get; set; }
    public int Year { get; set; }

    /// <summary>
    /// How many calendar Sundays to pay for this run. Null = all Sundays in the month.
    /// Not persisted; only used while generating. Clamped to Sundays in Month/Year.
    /// </summary>
    public int? SundaysToInclude { get; set; }
}

public class StartEmployeeSalaryCalculationResponseDto
{
    public string GenerationId { get; set; } = string.Empty;
}

public class EmployeeSalaryRowDto
{
    public int EmployeeId { get; set; }
    public string EmployeeName { get; set; } = string.Empty;
    public decimal BasicSalary { get; set; }
    public int PresentDaysCount { get; set; }
    public int LateComingsCount { get; set; }
    public decimal LateDeduction { get; set; }
    public decimal AbsentDeduction { get; set; }
    public decimal WorkingDaysSalary { get; set; }
    public decimal Loan { get; set; }
    public decimal SecurityCharges { get; set; }
    /// <summary>Loan + security charges + advance (shown as combined deductions).</summary>
    public decimal LoanAndSecurityCharges => Loan + SecurityCharges + Advance;
    public decimal Fine { get; set; }
    public decimal Advance { get; set; }
    public decimal Bonus { get; set; }
    public decimal TeaAllowance { get; set; }
    public decimal NetSalary { get; set; }
}

public class EmployeeSalaryCalculationResultDto
{
    public int Month { get; set; }
    public int Year { get; set; }
    public IReadOnlyList<EmployeeSalaryRowDto> Rows { get; set; } = Array.Empty<EmployeeSalaryRowDto>();
    public decimal TotalNetSalary { get; set; }
}