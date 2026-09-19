namespace School.Application.Common;

/// <summary>
/// Fixed Level-4 account titles. Resolve string AccountID via tblAccounts.AccountTitle.
/// </summary>
public static class SystemAccountTitles
{
    public const string CashInHand = "CASH IN HAND";
    public const string OwnerDrawings = "OWNER DRAWINGS";

    public static readonly IReadOnlySet<string> Reserved = new HashSet<string>(
        StringComparer.OrdinalIgnoreCase)
    {
        CashInHand,
        OwnerDrawings
    };

    public static bool IsReserved(string? title) =>
        !string.IsNullOrWhiteSpace(title) && Reserved.Contains(title.Trim());

    public static string Normalize(string title) => title.Trim().ToUpperInvariant();
}
