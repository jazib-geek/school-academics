namespace School.Application.DTOs;

public class SmartFeeReportRunRequestDto
{
    public string ReportId { get; set; } = string.Empty;
    public Dictionary<string, object?> Parameters { get; set; } = new(StringComparer.OrdinalIgnoreCase);
}

public class SmartFeeReportParamDefDto
{
    public string Key { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
    public string Type { get; set; } = "string"; // date | month | year | int | decimal | select | fundType | className | topN | fundScope | grain
    public bool Required { get; set; }
    public object? DefaultValue { get; set; }
    public string? OptionsSource { get; set; }
    public List<SmartFeeReportOptionDto>? Options { get; set; }
}

public class SmartFeeReportOptionDto
{
    public string Value { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
}

public class SmartFeeReportCatalogItemDto
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty; // risk | cash | portfolio
    public string DirectorBlurb { get; set; } = string.Empty;
    public bool IsPreset { get; set; }
    public Dictionary<string, object?>? PresetParameters { get; set; }
    public List<SmartFeeReportParamDefDto> Parameters { get; set; } = [];
}

public class SmartFeeReportKpiDto
{
    public string Key { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
    public string Value { get; set; } = string.Empty;
    public string? Format { get; set; } // number | money | percent | text
}

public class SmartFeeReportColumnDto
{
    public string Key { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
    public string Format { get; set; } = "text"; // text | number | money | date | percent
}

public class SmartFeeReportChartDto
{
    public string Type { get; set; } = "bar"; // bar | line
    public List<string> Labels { get; set; } = [];
    public List<SmartFeeReportChartSeriesDto> Series { get; set; } = [];
}

public class SmartFeeReportChartSeriesDto
{
    public string Name { get; set; } = string.Empty;
    public List<decimal> Data { get; set; } = [];
}

public class SmartFeeReportResultDto
{
    public string ReportId { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public DateTime GeneratedAt { get; set; } = DateTime.Now;
    public int TotalRecords { get; set; }
    public decimal TotalAmount { get; set; }
    public List<SmartFeeReportKpiDto> ExtraKpis { get; set; } = [];
    public SmartFeeReportChartDto? Chart { get; set; }
    public List<SmartFeeReportColumnDto> Columns { get; set; } = [];
    public List<Dictionary<string, object?>> Rows { get; set; } = [];
    public string? GroupByKey { get; set; }
    /// <summary>Special layout hint for expected-income style sheets.</summary>
    public string? Layout { get; set; }
    public object? LayoutPayload { get; set; }
}

public class FeeExecutiveSnapshotDto
{
    public DateTime GeneratedAt { get; set; } = DateTime.Now;
    public decimal CollectedToday { get; set; }
    public decimal CollectedMtd { get; set; }
    public decimal CollectedLastMonthSamePeriod { get; set; }
    public decimal TotalReceivable { get; set; }
    public int DefaulterCount { get; set; }
    public int ActiveStudentCount { get; set; }
    public decimal RecoveryPercent { get; set; }
    public decimal ChargedAllTime { get; set; }
    public decimal ReceivedAllTime { get; set; }
}
