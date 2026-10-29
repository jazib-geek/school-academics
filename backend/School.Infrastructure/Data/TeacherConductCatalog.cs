using School.Infrastructure.Entities;

namespace School.Infrastructure.Data;

/// <summary>
/// Seeded teacher conduct types and quick-pick tags. System rows cannot be renamed or deleted.
/// </summary>
public static class TeacherConductCatalog
{
    public const int AttendancePunctualityId = 1;
    public const int ClassDeliveryId = 2;
    public const int ProfessionalConductId = 3;
    public const int ParentsCommunicationId = 4;

    public static IReadOnlyList<TeacherConductType> Types { get; } =
    [
        Type(AttendancePunctualityId, "Attendance & punctuality", 10),
        Type(ClassDeliveryId, "Class delivery", 20),
        Type(ProfessionalConductId, "Professional conduct", 30),
        Type(ParentsCommunicationId, "Parents & communication", 40),
    ];

    public static IReadOnlyList<TeacherConductTag> Tags { get; } =
    [
        Tag(101, AttendancePunctualityId, "Started class on time", 10, isGood: true),
        Tag(102, AttendancePunctualityId, "Late start", 20, isGood: false),
        Tag(103, AttendancePunctualityId, "Continuous absence", 30, isGood: false),
        Tag(104, AttendancePunctualityId, "Too many short leaves", 40, isGood: false),
        Tag(105, AttendancePunctualityId, "Left early without permission", 50, isGood: false),
        Tag(106, AttendancePunctualityId, "Full attendance this month", 60, isGood: true),

        Tag(201, ClassDeliveryId, "Lesson prepared", 10, isGood: true),
        Tag(202, ClassDeliveryId, "Lesson not prepared", 20, isGood: false),
        Tag(203, ClassDeliveryId, "Syllabus behind schedule", 30, isGood: false),
        Tag(204, ClassDeliveryId, "Good class control", 40, isGood: true),
        Tag(205, ClassDeliveryId, "Weak class control", 50, isGood: false),
        Tag(206, ClassDeliveryId, "Did not follow timetable", 60, isGood: false),

        Tag(301, ProfessionalConductId, "Dress code issue", 10, isGood: false),
        Tag(302, ProfessionalConductId, "Behaviour issue", 20, isGood: false),
        Tag(303, ProfessionalConductId, "Policy breach", 30, isGood: false),
        Tag(304, ProfessionalConductId, "Positive feedback", 40, isGood: true),
        Tag(305, ProfessionalConductId, "Unprofessional with staff", 50, isGood: false),
        Tag(306, ProfessionalConductId, "Mobile phone misuse in class", 60, isGood: false),

        Tag(401, ParentsCommunicationId, "Parent complaint", 10, isGood: false),
        Tag(402, ParentsCommunicationId, "Did not respond to parent", 20, isGood: false),
        Tag(403, ParentsCommunicationId, "Handled concern well", 30, isGood: true),
        Tag(404, ParentsCommunicationId, "Diary not updated", 40, isGood: false),
        Tag(405, ParentsCommunicationId, "Miscommunication with parents", 50, isGood: false),
        Tag(406, ParentsCommunicationId, "Good parent meeting", 60, isGood: true),
    ];

    private static TeacherConductType Type(int id, string name, int sortOrder) => new()
    {
        Id = id,
        Name = name,
        SortOrder = sortOrder,
        IsSystem = true,
        IsActive = true,
    };

    private static TeacherConductTag Tag(int id, int typeId, string name, int sortOrder, bool isGood) => new()
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
