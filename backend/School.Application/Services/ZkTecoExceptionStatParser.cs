using System.Globalization;
using System.Text;
using ExcelDataReader;

namespace School.Application.Services;

public sealed class ZkTecoPunchRow
{
    public string EmployeeCode { get; init; } = string.Empty;
    public string? EmployeeName { get; init; }
    public DateTime Date { get; init; }
    public string? CheckInTime { get; init; }
    public string? CheckOutTime { get; init; }
}

public sealed class ZkTecoParseResult
{
    public IReadOnlyList<DateTime> Dates { get; init; } = [];
    public IReadOnlyList<ZkTecoPunchRow> Punches { get; init; } = [];
    public int RowCount { get; init; }
}

public static class ZkTecoExceptionStatParser
{
    public const string RequiredSheetName = "Exception Stat.";

    private static bool _encodingRegistered;

    public static ZkTecoParseResult Parse(Stream stream)
    {
        EnsureEncoding();

        if (!stream.CanSeek)
        {
            var copy = new MemoryStream();
            stream.CopyTo(copy);
            copy.Position = 0;
            stream = copy;
        }

        using var reader = ExcelReaderFactory.CreateReader(
            stream,
            new ExcelReaderConfiguration
            {
                FallbackEncoding = Encoding.GetEncoding(1252),
            });
        if (!MoveToExceptionStatSheet(reader))
        {
            throw new ArgumentException(
                "This file does not contain the Exception Stat. sheet from the device.");
        }

        var rows = ReadSheetRows(reader);
        if (!TryFindHeaders(rows, out var headerIndex, out var dataStart, out var columns))
        {
            throw new ArgumentException(
                "The Exception Stat. sheet is missing the expected columns (Name, Date, On-duty, Off-duty).");
        }

        var punches = new List<ZkTecoPunchRow>();
        for (var i = dataStart; i < rows.Count; i++)
        {
            var row = rows[i];
            if (!TryReadPunch(row, columns, out var punch))
                continue;
            punches.Add(punch);
        }

        if (punches.Count == 0)
        {
            throw new ArgumentException("No attendance rows were found in the Exception Stat. sheet.");
        }

        var dates = punches
            .Select(p => p.Date)
            .Distinct()
            .OrderBy(d => d)
            .ToList();

        return new ZkTecoParseResult
        {
            Dates = dates,
            Punches = punches,
            RowCount = punches.Count,
        };
    }

    private static void EnsureEncoding()
    {
        if (_encodingRegistered)
            return;

        Encoding.RegisterProvider(CodePagesEncodingProvider.Instance);
        _encodingRegistered = true;
    }

    private static bool MoveToExceptionStatSheet(IExcelDataReader reader)
    {
        do
        {
            if (IsExceptionStatSheet(reader.Name))
                return true;
        }
        while (reader.NextResult());

        return false;
    }

    private static bool IsExceptionStatSheet(string? name)
    {
        var n = (name ?? string.Empty).Trim();
        if (n.Length == 0)
            return false;

        var withoutDot = n.TrimEnd('.');
        return withoutDot.Equals("Exception Stat", StringComparison.OrdinalIgnoreCase)
               || n.Equals("Exception Statistic Report", StringComparison.OrdinalIgnoreCase)
               || withoutDot.StartsWith("Exception Stat", StringComparison.OrdinalIgnoreCase);
    }

    private static List<object?[]> ReadSheetRows(IExcelDataReader reader)
    {
        var rows = new List<object?[]>();

        while (reader.Read())
        {
            var fieldCount = Math.Max(reader.FieldCount, 16);
            var cells = new object?[fieldCount];
            var any = false;
            for (var i = 0; i < reader.FieldCount; i++)
            {
                var value = reader.GetValue(i);
                cells[i] = value;
                if (value != null && !string.IsNullOrWhiteSpace(Convert.ToString(value)))
                    any = true;
            }

            if (any)
                rows.Add(cells);
        }

        return rows;
    }

    private readonly record struct ColumnMap(int Id, int Date, int OnDuty, int OffDuty, int Name);

    private static bool TryFindHeaders(
        List<object?[]> rows,
        out int headerIndex,
        out int dataStart,
        out ColumnMap columns)
    {
        headerIndex = -1;
        dataStart = -1;
        columns = default;

        var scanLimit = Math.Min(rows.Count, 12);
        for (var i = 0; i < scanLimit; i++)
        {
            var single = BuildHeaderLabels(rows[i], null);
            if (TryMapColumns(single, out columns))
            {
                headerIndex = i;
                dataStart = i + 1;
                return true;
            }

            if (i + 1 >= rows.Count)
                continue;

            var merged = BuildHeaderLabels(rows[i], rows[i + 1]);
            if (TryMapColumns(merged, out columns))
            {
                headerIndex = i;
                dataStart = i + 2;
                return true;
            }
        }

        return false;
    }

    private static string[] BuildHeaderLabels(object?[] primary, object?[]? secondary)
    {
        var len = Math.Max(primary.Length, secondary?.Length ?? 0);
        var labels = new string[len];
        for (var i = 0; i < len; i++)
        {
            var top = i < primary.Length ? CellText(primary[i]) : string.Empty;
            var bottom = secondary != null && i < secondary.Length ? CellText(secondary[i]) : string.Empty;
            labels[i] = NormalizeHeader(string.IsNullOrEmpty(bottom) ? top : bottom);
        }

        return labels;
    }

    private static bool TryMapColumns(string[] headers, out ColumnMap columns)
    {
        columns = default;
        var name = IndexOfExact(headers, "name");
        var date = IndexOfExact(headers, "date");
        var onDuty = IndexOfContains(headers, "on-duty", "onduty", "on duty");
        var offDuty = IndexOfContains(headers, "off-duty", "offduty", "off duty");
        if (name < 0 || date < 0 || onDuty < 0 || offDuty < 0)
            return false;

        var id = IndexOfExact(headers, "id");
        columns = new ColumnMap(id, date, onDuty, offDuty, name);
        return true;
    }

    private static int IndexOfExact(string[] headers, string expected)
    {
        for (var i = 0; i < headers.Length; i++)
        {
            if (headers[i] == expected)
                return i;
        }

        return -1;
    }

    private static int IndexOfContains(string[] headers, params string[] needles)
    {
        for (var i = 0; i < headers.Length; i++)
        {
            var h = headers[i];
            if (needles.Any(n => h.Contains(n, StringComparison.Ordinal)))
                return i;
        }

        return -1;
    }

    private static string NormalizeHeader(string value) =>
        value.Trim().ToLowerInvariant().Replace("  ", " ");

    private static bool TryReadPunch(object?[] row, ColumnMap columns, out ZkTecoPunchRow punch)
    {
        punch = null!;
        var code = CellText(GetCell(row, columns.Name));
        if (string.IsNullOrWhiteSpace(code))
            code = ReadEmployeeCode(GetCell(row, columns.Id));
        if (string.IsNullOrWhiteSpace(code))
            return false;

        if (!TryReadDate(GetCell(row, columns.Date), out var date))
            return false;

        var checkIn = ReadTime(GetCell(row, columns.OnDuty));
        var checkOut = ReadTime(GetCell(row, columns.OffDuty));
        if (string.IsNullOrWhiteSpace(checkIn) && string.IsNullOrWhiteSpace(checkOut))
            return false;

        punch = new ZkTecoPunchRow
        {
            EmployeeCode = code,
            EmployeeName = CellText(GetCell(row, columns.Name)),
            Date = date.Date,
            CheckInTime = checkIn,
            CheckOutTime = checkOut,
        };
        return true;
    }

    private static object? GetCell(object?[] row, int index) =>
        index >= 0 && index < row.Length ? row[index] : null;

    private static string CellText(object? value) =>
        value is null ? string.Empty : Convert.ToString(value, CultureInfo.InvariantCulture)?.Trim() ?? string.Empty;

    private static string ReadEmployeeCode(object? value)
    {
        switch (value)
        {
            case null:
                return string.Empty;
            case double d when Math.Abs(d - Math.Truncate(d)) < 0.0001:
                return ((long)Math.Truncate(d)).ToString(CultureInfo.InvariantCulture);
            case float f when Math.Abs(f - Math.Truncate(f)) < 0.0001:
                return ((long)Math.Truncate(f)).ToString(CultureInfo.InvariantCulture);
            case decimal m when m == decimal.Truncate(m):
                return decimal.Truncate(m).ToString(CultureInfo.InvariantCulture);
            case DateTime:
                return string.Empty;
            default:
                return CellText(value);
        }
    }

    private static bool TryReadDate(object? value, out DateTime date)
    {
        date = default;
        switch (value)
        {
            case DateTime dt:
                date = dt.Date;
                return true;
            case double d:
                try
                {
                    date = DateTime.FromOADate(d).Date;
                    return date.Year is >= 2000 and <= 2100;
                }
                catch (ArgumentException)
                {
                    return false;
                }
            default:
                var text = CellText(value);
                if (string.IsNullOrWhiteSpace(text))
                    return false;
                if (DateTime.TryParse(text, CultureInfo.InvariantCulture, DateTimeStyles.None, out var parsed) ||
                    DateTime.TryParse(text, out parsed))
                {
                    date = parsed.Date;
                    return true;
                }

                return false;
        }
    }

    private static string? ReadTime(object? value)
    {
        switch (value)
        {
            case null:
                return null;
            case DateTime dt:
                return dt.ToString("HH:mm", CultureInfo.InvariantCulture);
            case TimeSpan ts:
                return $"{ts.Hours:D2}:{ts.Minutes:D2}";
            case double d:
                if (d is > 0 and < 1)
                {
                    var fromFraction = DateTime.FromOADate(d);
                    return fromFraction.ToString("HH:mm", CultureInfo.InvariantCulture);
                }

                try
                {
                    var fromOa = DateTime.FromOADate(d);
                    if (fromOa.TimeOfDay > TimeSpan.Zero)
                        return fromOa.ToString("HH:mm", CultureInfo.InvariantCulture);
                }
                catch (ArgumentException)
                {
                    return null;
                }

                return null;
            default:
                var text = CellText(value);
                if (string.IsNullOrWhiteSpace(text))
                    return null;
                if (EmployeeAttendanceCalculator.TryParseTimeOfDay(text, out var parsed))
                    return EmployeeAttendanceCalculator.FormatHhMm(parsed);
                return null;
        }
    }
}
