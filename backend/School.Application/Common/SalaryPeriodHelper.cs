namespace School.Application.Common;

/// <summary>
/// Classifies payroll months relative to the current Pakistan calendar month.
/// </summary>
public static class SalaryPeriodHelper
{
    public static (int Year, int Month) CurrentPakistanYearMonth()
    {
        var today = PakistanTime.Today;
        return (today.Year, today.Month);
    }

    public static int PeriodKey(int year, int month) => year * 12 + month;

    public static bool IsFutureMonth(int month, int year)
    {
        var (cy, cm) = CurrentPakistanYearMonth();
        return PeriodKey(year, month) > PeriodKey(cy, cm);
    }

    public static bool IsCurrentMonth(int month, int year)
    {
        var (cy, cm) = CurrentPakistanYearMonth();
        return year == cy && month == cm;
    }

    public static bool IsPastMonth(int month, int year) =>
        !IsFutureMonth(month, year) && !IsCurrentMonth(month, year);

    public static void EnsureNotFuture(int month, int year)
    {
        if (month is < 1 or > 12)
            throw new ArgumentException("Month must be between 1 and 12.");
        if (year is < 2000 or > 2100)
            throw new ArgumentException("Year is out of range.");
        if (IsFutureMonth(month, year))
            throw new ArgumentException("Salary cannot be calculated for a future month.");
    }
}
