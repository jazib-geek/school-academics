using School.Infrastructure.Entities;

namespace School.Infrastructure.Data;

/// <summary>
/// Seeded absence follow-up reasons. System rows are the initial catalog; more can be added later.
/// </summary>
public static class AbsentFollowupReasonCatalog
{
    public const int SickId = 1;
    public const int TransportIssueId = 2;
    public const int DomesticIssueId = 3;
    public const int OutOfCityId = 4;
    public const int FamilyFunctionId = 5;
    public const int WeatherRoadConditionId = 6;
    public const int OtherId = 7;

    public static IReadOnlyList<AbsentFollowupReason> Reasons { get; } =
    [
        Reason(SickId, "Sick", 10),
        Reason(TransportIssueId, "Transport issue", 20),
        Reason(DomesticIssueId, "Domestic issue", 30),
        Reason(OutOfCityId, "Out of city", 40),
        Reason(FamilyFunctionId, "Family function", 50),
        Reason(WeatherRoadConditionId, "Weather / road condition", 60),
        Reason(OtherId, "Other", 70),
    ];

    private static AbsentFollowupReason Reason(int id, string name, int sortOrder) => new()
    {
        Id = id,
        Name = name,
        SortOrder = sortOrder,
        IsSystem = true,
        IsActive = true,
    };
}
