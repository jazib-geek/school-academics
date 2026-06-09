namespace School.Application.Common;

/// <summary>Values persisted in tblCoordinatorModDuty.DutyScope (must match DB CHECK constraint).</summary>
public static class CoordinatorModDutyScopes
{
    public const string Assembly = "Assembly";
    public const string Break = "Break";
    public const string OffTime = "OffTime";
    public const string Other = "Other";

    public static bool IsValid(string scope) =>
        scope is Assembly or Break or OffTime or Other;
}
