using School.Infrastructure.Entities;

namespace School.Infrastructure.Data;

public static class FeeReminderNoticeTemplateCatalog
{
    public const int PreDueId = 1;
    public const int LastDueId = 2;

    public const string PreDueCode = "pre_due";
    public const string LastDueCode = "last_due";

    public static IReadOnlyList<FeeReminderNoticeTemplate> Templates { get; } =
    [
        new FeeReminderNoticeTemplate
        {
            Id = PreDueId,
            Code = PreDueCode,
            Title = "Fee Reminder Voucher",
            Greeting = "Dear Parents,",
            BodyText =
                "This is gentle reminder to clear your child's outstanding school dues on or before {dueDate}.",
            ClosingText = "Your prompt attention and cooperation will be highly appreciated.",
            DayOfMonth = 10,
            SortOrder = 10,
            IsActive = true,
        },
        new FeeReminderNoticeTemplate
        {
            Id = LastDueId,
            Code = LastDueCode,
            Title = "Last Fee Reminder",
            Greeting = "Dear Parents,",
            BodyText =
                "The due date for your child's school dues has already passed. Kindly clear all outstanding dues immediately to avoid any interruption in your child's studies and school activities.",
            ClosingText = "Your prompt cooperation will be highly appreciated.",
            DayOfMonth = null,
            SortOrder = 20,
            IsActive = true,
        },
    ];
}
