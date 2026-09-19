using School.Infrastructure.Entities;

namespace School.Infrastructure.Data;

/// <summary>
/// Seeded conduct types and quick-pick tags. System rows cannot be renamed or deleted.
/// </summary>
public static class StudentConductCatalog
{
    public const int UniformId = 1;
    public const int PunctualityId = 2;
    public const int HomeworkId = 3;
    public const int ClassBehaviourId = 4;

    public static IReadOnlyList<StudentConductType> Types { get; } =
    [
        Type(UniformId, "Uniform", 10),
        Type(PunctualityId, "Punctuality", 20),
        Type(HomeworkId, "Homework", 30),
        Type(ClassBehaviourId, "Class Behaviour", 40),
    ];

    public static IReadOnlyList<StudentConductTag> Tags { get; } =
    [
        Tag(101, UniformId, "Dirty", 10, isGood: false),
        Tag(102, UniformId, "Untidy", 20, isGood: false),
        Tag(103, UniformId, "Torn", 30, isGood: false),
        Tag(104, UniformId, "Incomplete", 40, isGood: false),
        Tag(105, UniformId, "Wrong uniform", 50, isGood: false),
        Tag(106, UniformId, "Neat", 60, isGood: true),

        Tag(201, PunctualityId, "Late to school", 10, isGood: false),
        Tag(202, PunctualityId, "Late to class", 20, isGood: false),
        Tag(203, PunctualityId, "Habitual latecomer", 30, isGood: false),
        Tag(204, PunctualityId, "Left early", 40, isGood: false),
        Tag(205, PunctualityId, "Missed assembly", 50, isGood: false),

        Tag(301, HomeworkId, "Not done", 10, isGood: false),
        Tag(302, HomeworkId, "Incomplete", 20, isGood: false),
        Tag(303, HomeworkId, "Copied", 30, isGood: false),
        Tag(304, HomeworkId, "Poor quality", 40, isGood: false),
        Tag(305, HomeworkId, "Bad handwriting", 50, isGood: false),
        Tag(306, HomeworkId, "Good handwriting", 60, isGood: true),
        Tag(307, HomeworkId, "Excellent", 70, isGood: true),

        Tag(401, ClassBehaviourId, "Talking", 10, isGood: false),
        Tag(402, ClassBehaviourId, "Disruptive", 20, isGood: false),
        Tag(403, ClassBehaviourId, "Disrespectful", 30, isGood: false),
        Tag(404, ClassBehaviourId, "Inattentive", 40, isGood: false),
        Tag(405, ClassBehaviourId, "Fighting", 50, isGood: false),
        Tag(406, ClassBehaviourId, "Helpful", 60, isGood: true),
    ];

    private static StudentConductType Type(int id, string name, int sortOrder) => new()
    {
        Id = id,
        Name = name,
        SortOrder = sortOrder,
        IsSystem = true,
        IsActive = true,
    };

    private static StudentConductTag Tag(int id, int typeId, string name, int sortOrder, bool isGood) => new()
    {
        Id = id,
        ConductTypeId = typeId,
        Name = name,
        SortOrder = sortOrder,
        IsSystem = true,
        IsGood = isGood,
        IsActive = true,
    };
}
