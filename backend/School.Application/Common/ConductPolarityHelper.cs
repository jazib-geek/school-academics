using School.Application.DTOs;

namespace School.Application.Common;

public static class ConductPolarityHelper
{
    public static string FromTags(IEnumerable<StudentConductNoteTagDto>? tags)
    {
        var hasGood = false;
        var hasBad = false;
        foreach (var tag in tags ?? [])
        {
            if (tag.IsGood) hasGood = true;
            else hasBad = true;
        }

        if (hasGood && hasBad) return ConductPolarities.Mixed;
        if (hasGood) return ConductPolarities.Good;
        if (hasBad) return ConductPolarities.Bad;
        return ConductPolarities.None;
    }

    public static string CombineDay(IEnumerable<string> notePolarities)
    {
        var hasGood = false;
        var hasBad = false;
        foreach (var polarity in notePolarities)
        {
            if (polarity is ConductPolarities.Good or ConductPolarities.Mixed) hasGood = true;
            if (polarity is ConductPolarities.Bad or ConductPolarities.Mixed) hasBad = true;
        }

        if (hasGood && hasBad) return ConductPolarities.Mixed;
        if (hasGood) return ConductPolarities.Good;
        if (hasBad) return ConductPolarities.Bad;
        return ConductPolarities.None;
    }

    public static string WeekdayShort(DateOnly date) =>
        date.ToDateTime(TimeOnly.MinValue).ToString("ddd", System.Globalization.CultureInfo.InvariantCulture);
}
