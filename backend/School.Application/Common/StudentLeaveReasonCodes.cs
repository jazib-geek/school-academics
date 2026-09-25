namespace School.Application.Common;

public static class StudentLeaveReasonCodes
{
    public const string Sick = "sick";
    public const string TransportIssue = "transport_issue";
    public const string DomesticIssue = "domestic_issue";
    public const string OutOfCity = "out_of_city";
    public const string FamilyFunction = "family_function";
    public const string WeatherRoad = "weather_road";
    public const string Other = "other";

    private static readonly IReadOnlyDictionary<string, string> Labels =
        new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            [Sick] = "Sick",
            [TransportIssue] = "Transport issue",
            [DomesticIssue] = "Domestic issue",
            [OutOfCity] = "Out of city",
            [FamilyFunction] = "Family function",
            [WeatherRoad] = "Weather / road condition",
            [Other] = "Other",
        };

    public static IReadOnlyList<(string Code, string Label)> Catalog =>
        Labels.Select(x => (x.Key, x.Value)).ToList();

    public static string Require(string? code)
    {
        if (string.IsNullOrWhiteSpace(code))
            throw new ArgumentException("Please select a reason.");

        var key = code.Trim();
        if (!Labels.ContainsKey(key))
            throw new ArgumentException("The selected reason is not valid.");

        return Labels.Keys.First(k => k.Equals(key, StringComparison.OrdinalIgnoreCase));
    }

    public static string Label(string code) =>
        Labels.TryGetValue(code, out var label) ? label : code;
}
