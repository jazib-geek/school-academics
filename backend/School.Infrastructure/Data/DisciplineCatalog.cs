using School.Infrastructure.Entities;

namespace School.Infrastructure.Data;

public static class DisciplineCatalog
{
    public const string StatusClear = "Clear";
    public const string StatusIssue = "Issue";
    public const string StatusSkipped = "Skipped";

    public const string KindConcern = "Concern";
    public const string KindPraise = "Praise";
    public const string KindNote = "Note";

    public static readonly string[] Statuses = [StatusClear, StatusIssue, StatusSkipped];
    public static readonly string[] Kinds = [KindConcern, KindPraise, KindNote];

    public static IReadOnlyList<DisciplineRound> Rounds { get; } =
    [
        Round(1, "GateLatecomers", "Gate and latecomers", 10),
        Round(2, "BagCheck", "Bag check", 20),
        Round(3, "Uniform", "Uniform and appearance", 30),
        Round(4, "AssemblyHall", "Assembly and hall", 40),
        Round(5, "Classes", "Classes (spot check)", 50),
        Round(6, "CorridorsBuilding", "Corridors and building", 60),
        Round(7, "OutdoorGround", "Outdoor ground", 70),
        Round(8, "BreakSeparation", "Break — boys and girls kept apart", 80),
        Round(9, "ProhibitedItems", "Prohibited items", 90),
        Round(10, "HomeDispersal", "Home-time dispersal", 100),
    ];

    private static DisciplineRound Round(int id, string code, string name, int sortOrder) => new()
    {
        Id = id,
        Code = code,
        Name = name,
        SortOrder = sortOrder,
        IsActive = true,
    };
}
