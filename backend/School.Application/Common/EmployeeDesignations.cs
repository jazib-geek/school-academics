namespace School.Application.Common;

/// <summary>
/// Well-known designation IDs in tblDesignation / employee records.
/// </summary>
public static class EmployeeDesignations
{
    /// <summary>Coordinators (Employee Portal head-office daily updates).</summary>
    public const int Coordinator = 3;

    public static bool IsAdminName(string? designationName)
    {
        var name = designationName?.Trim();
        if (string.IsNullOrEmpty(name))
        {
            return false;
        }

        return name.Equals("Admin", StringComparison.OrdinalIgnoreCase)
            || name.Equals("Administrator", StringComparison.OrdinalIgnoreCase)
            || name.Equals("Admins", StringComparison.OrdinalIgnoreCase);
    }
}
