using System.Text.Json;

namespace School.Application.Academics;

public static class QuestionStructureCatalog
{
    public const string ProfileStandard = "standard";
    public const string ProfileEnglish = "english";
    public const string ProfileUrdu = "urdu";

    public const string KindStandard = "standard";
    public const string KindChoiceSet = "choice-set";
    public const string KindSpellingTable = "spelling-table";
    public const string KindWordList = "word-list";
    public const string KindFillBlanks = "fill-blanks";
    public const string KindClassifyLine = "classify-line";
    public const string KindSentencePair = "sentence-pair";
    public const string KindPassageSet = "passage-set";
    public const string KindPrompt = "prompt";
    public const string KindVerseSet = "verse-set";

    private static readonly HashSet<string> Profiles = new(StringComparer.OrdinalIgnoreCase)
    {
        ProfileStandard, ProfileEnglish, ProfileUrdu
    };

    private static readonly Dictionary<string, string[]> KindsByProfile = new(StringComparer.OrdinalIgnoreCase)
    {
        [ProfileEnglish] =
        [
            KindChoiceSet, KindSpellingTable, KindWordList, KindFillBlanks,
            KindClassifyLine, KindSentencePair, KindPassageSet, KindPrompt
        ],
        [ProfileUrdu] =
        [
            KindChoiceSet, KindVerseSet, KindPassageSet, KindWordList, KindFillBlanks, KindPrompt
        ]
    };

    public static string NormalizeProfile(string? value)
    {
        var profile = (value ?? string.Empty).Trim().ToLowerInvariant();
        return Profiles.Contains(profile) ? profile : ProfileStandard;
    }

    public static string NormalizeKind(string? value)
    {
        var kind = (value ?? string.Empty).Trim().ToLowerInvariant();
        return string.IsNullOrEmpty(kind) ? KindStandard : kind;
    }

    public static bool IsStandardKind(string? kind) =>
        NormalizeKind(kind) == KindStandard;

    private static readonly Dictionary<string, string> HeadingDefaults = new(StringComparer.OrdinalIgnoreCase)
    {
        [KindChoiceSet] = "Choose the correct option.",
        [KindSpellingTable] = "Choose the correct spelling.",
        [KindWordList] = "Write meanings of these words.",
        [KindFillBlanks] = "Fill in the blanks with suitable words.",
        [KindClassifyLine] = "Tell whether the underlined noun is countable or uncountable.",
        [KindSentencePair] = "Change the voice of the following.",
        [KindPassageSet] = "Read the paragraph and answer the questions.",
        [KindPrompt] = "Write on the following topic.",
        [KindVerseSet] = "درج ذیل اشعار کی تشریح کیجیے۔"
    };

    private static readonly Dictionary<string, string> UrduHeadingOverrides = new(StringComparer.OrdinalIgnoreCase)
    {
        [KindChoiceSet] = "درست جواب کا انتخاب کریں۔",
        [KindPassageSet] = "درج ذیل عبارت پڑھ کر سوالات کے جواب دیں۔",
        [KindWordList] = "درج ذیل الفاظ کے معانی لکھیں۔",
        [KindFillBlanks] = "خالی جگہ پُر کریں۔",
        [KindPrompt] = "درج ذیل عنوان پر تحریر لکھیں۔"
    };

    public static IReadOnlyList<string> KindsFor(string? profile)
    {
        var normalized = NormalizeProfile(profile);
        return KindsByProfile.TryGetValue(normalized, out var kinds) ? kinds : [];
    }

    public static Dictionary<string, string> DefaultHeadings(string? profile)
    {
        var headings = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        var useUrdu = NormalizeProfile(profile) == ProfileUrdu;
        foreach (var kind in KindsFor(profile))
        {
            if (useUrdu && UrduHeadingOverrides.TryGetValue(kind, out var urdu))
            {
                headings[kind] = urdu;
            }
            else if (HeadingDefaults.TryGetValue(kind, out var english))
            {
                headings[kind] = english;
            }
        }

        return headings;
    }

    public static Dictionary<string, string> MergeHeadings(string? profile, string? storedJson)
    {
        var merged = DefaultHeadings(profile);
        if (merged.Count == 0 || string.IsNullOrWhiteSpace(storedJson))
        {
            return merged;
        }

        try
        {
            using var document = JsonDocument.Parse(storedJson);
            if (document.RootElement.ValueKind != JsonValueKind.Object)
            {
                return merged;
            }

            foreach (var property in document.RootElement.EnumerateObject())
            {
                if (!merged.ContainsKey(property.Name) || property.Value.ValueKind != JsonValueKind.String)
                {
                    continue;
                }

                var text = property.Value.GetString()?.Trim();
                if (!string.IsNullOrEmpty(text))
                {
                    merged[property.Name] = text;
                }
            }
        }
        catch (JsonException)
        {
            return merged;
        }

        return merged;
    }

    public static string SaveHeadings(string? profile, IDictionary<string, string>? incoming)
    {
        var kinds = KindsFor(profile);
        if (kinds.Count == 0)
        {
            throw new InvalidOperationException("This subject uses the usual question form.");
        }

        var saved = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        foreach (var kind in kinds)
        {
            string? text = null;
            if (incoming != null)
            {
                foreach (var pair in incoming)
                {
                    if (string.Equals(pair.Key, kind, StringComparison.OrdinalIgnoreCase))
                    {
                        text = pair.Value;
                        break;
                    }
                }
            }

            text = text?.Trim() ?? string.Empty;
            if (text.Length == 0)
            {
                throw new InvalidOperationException("Enter a heading for each question shape.");
            }

            if (text.Length > 400)
            {
                throw new InvalidOperationException("A heading is too long.");
            }

            saved[kind] = text;
        }

        return JsonSerializer.Serialize(saved);
    }

    public static bool IsAllowed(string? profile, string? kind)
    {
        var normalizedProfile = NormalizeProfile(profile);
        var normalizedKind = NormalizeKind(kind);
        if (normalizedProfile == ProfileStandard)
        {
            return normalizedKind == KindStandard;
        }

        return KindsByProfile.TryGetValue(normalizedProfile, out var kinds) &&
               kinds.Contains(normalizedKind, StringComparer.OrdinalIgnoreCase);
    }

    public static string CoarseType(string? kind) =>
        NormalizeKind(kind) is KindChoiceSet or KindSpellingTable ? "mcq" : "laq";

    public static string? ValidateBody(string? kind, string? bodyJson)
    {
        var normalizedKind = NormalizeKind(kind);
        if (normalizedKind == KindStandard)
        {
            return string.IsNullOrWhiteSpace(bodyJson) ? null : "Standard questions cannot store a language body.";
        }

        if (string.IsNullOrWhiteSpace(bodyJson))
        {
            return normalizedKind == KindPrompt ? null : "Add the question parts before saving.";
        }

        if (bodyJson.Length > 100_000)
        {
            return "This question is too long to save.";
        }

        JsonDocument document;
        try
        {
            document = JsonDocument.Parse(bodyJson);
        }
        catch (JsonException)
        {
            return "Question parts could not be read.";
        }

        using (document)
        {
            if (document.RootElement.ValueKind != JsonValueKind.Object)
            {
                return "Question parts could not be read.";
            }

            var root = document.RootElement;
            return normalizedKind switch
            {
                KindChoiceSet => RequireItems(root, "items", static item =>
                    Text(item, "text").Length > 0 &&
                    Options(item).Count(static option => option.Length > 0) >= 2),
                KindSpellingTable => RequireItems(root, "rows", static row =>
                    Options(row).Count(static option => option.Length > 0) == 4),
                KindWordList => RequireStrings(root, "words"),
                KindFillBlanks => RequireStrings(root, "sentences"),
                KindClassifyLine => RequireItems(root, "lines", static line => Text(line, "text").Length > 0),
                KindSentencePair => RequireItems(root, "pairs", static pair =>
                    Text(pair, "left").Length > 0 && Text(pair, "right").Length > 0),
                KindPassageSet => HasPassageOrQuestion(root)
                    ? null
                    : "Add a passage or a question.",
                KindPrompt => null,
                KindVerseSet => HasLineOrQuestion(root)
                    ? null
                    : "Add a verse line or a question.",
                _ => "This question shape is not supported."
            };
        }
    }

    private static string? RequireStrings(JsonElement root, string property)
    {
        if (!root.TryGetProperty(property, out var array) || array.ValueKind != JsonValueKind.Array)
        {
            return "Add at least one line.";
        }

        var count = array.EnumerateArray().Count(item => item.ValueKind == JsonValueKind.String && item.GetString()?.Trim().Length > 0);
        return count > 0 ? null : "Add at least one line.";
    }

    private static string? RequireItems(JsonElement root, string property, Func<JsonElement, bool> isValid)
    {
        if (!root.TryGetProperty(property, out var array) || array.ValueKind != JsonValueKind.Array)
        {
            return "Add at least one item.";
        }

        var count = array.EnumerateArray().Count(item => item.ValueKind == JsonValueKind.Object && isValid(item));
        return count > 0 ? null : "Add at least one complete item.";
    }

    private static bool HasPassageOrQuestion(JsonElement root)
    {
        var passages = CountValid(root, "passages", item => Text(item, "text").Length > 0);
        var questions = CountValid(root, "questions", item => Text(item, "text").Length > 0);
        return passages + questions > 0;
    }

    private static bool HasLineOrQuestion(JsonElement root)
    {
        var lines = 0;
        if (root.TryGetProperty("lines", out var lineArray) && lineArray.ValueKind == JsonValueKind.Array)
        {
            lines = lineArray.EnumerateArray().Count(item =>
                item.ValueKind == JsonValueKind.String && item.GetString()?.Trim().Length > 0);
        }

        var questions = CountValid(root, "questions", item => Text(item, "text").Length > 0);
        return lines + questions > 0;
    }

    private static int CountValid(JsonElement root, string property, Func<JsonElement, bool> isValid)
    {
        if (!root.TryGetProperty(property, out var array) || array.ValueKind != JsonValueKind.Array)
        {
            return 0;
        }

        return array.EnumerateArray().Count(item => item.ValueKind == JsonValueKind.Object && isValid(item));
    }

    private static string Text(JsonElement item, string property) =>
        item.TryGetProperty(property, out var value) && value.ValueKind == JsonValueKind.String
            ? value.GetString()?.Trim() ?? string.Empty
            : string.Empty;

    private static IEnumerable<string> Options(JsonElement item)
    {
        if (!item.TryGetProperty("options", out var array) || array.ValueKind != JsonValueKind.Array)
        {
            yield break;
        }

        foreach (var option in array.EnumerateArray())
        {
            yield return option.ValueKind == JsonValueKind.String
                ? option.GetString()?.Trim() ?? string.Empty
                : string.Empty;
        }
    }
}
