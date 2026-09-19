namespace School.Application.Common;

public static class SalaryComponentTypes
{
    public const string WorkingDaySalary = "WorkingDaySalary";
    public const string BasicSalary = "BasicSalary";
    public const string TeaAllowance = "TeaAllowance";
    public const string Loan = "Loan";
    public const string SecurityCharges = "SecurityCharges";
    public const string Bonus = "Bonus";
    public const string Fine = "Fine";
    public const string Advance = "Advance";

    public static readonly IReadOnlyList<string> EditableTypes =
    [
        Loan,
        SecurityCharges,
        Bonus,
        Fine,
        Advance,
    ];

    public static bool IsEditable(string? type) =>
        !string.IsNullOrWhiteSpace(type) &&
        EditableTypes.Contains(type, StringComparer.OrdinalIgnoreCase);

    /// <summary>Editable adjustment types plus BasicSalary (month snapshot editor).</summary>
    public static bool IsAdjustmentManaged(string? type) =>
        IsEditable(type) ||
        string.Equals(type, BasicSalary, StringComparison.OrdinalIgnoreCase);
}

public static class SpecialDesignations
{
    public const string Coordinator = "Co-ordinator";
}