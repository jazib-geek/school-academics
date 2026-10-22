namespace School.Application.DTOs;

public class RoyaltyShareMetaDto
{
    public bool IsFranchise { get; set; }

    public decimal? RoyaltySharePercent { get; set; }
}

public class RoyaltyShareMonthDto
{
    public int CalendarYear { get; set; }

    public int CalendarMonth { get; set; }

    public bool IsClosed { get; set; }

    public decimal TotalFeeCollected { get; set; }

    public decimal RoyaltySharePercent { get; set; }

    public decimal RoyaltyAmount { get; set; }

    public string? VoucherNo { get; set; }

    public string? ClosedByUserName { get; set; }

    public DateTime? ClosedAtPkt { get; set; }

    public string? CampusLabel { get; set; }

    public string? SchoolName { get; set; }

    public IReadOnlyList<RoyaltyShareFundLineDto> FundBreakdown { get; set; } = [];
}

public class RoyaltyShareFundLineDto
{
    public int FundTypeId { get; set; }

    public string FundTypeName { get; set; } = string.Empty;

    public decimal Collected { get; set; }

    public decimal RoyaltyShare { get; set; }
}

public class RoyaltyShareHistoryItemDto
{
    public int Id { get; set; }

    public int CalendarYear { get; set; }

    public int CalendarMonth { get; set; }

    public decimal TotalFeeCollected { get; set; }

    public decimal RoyaltySharePercent { get; set; }

    public decimal RoyaltyAmount { get; set; }

    public string? VoucherNo { get; set; }

    public string? ClosedByUserName { get; set; }

    public DateTime ClosedAtPkt { get; set; }
}

public class CloseRoyaltyShareRequestDto
{
    public int Year { get; set; }

    public int Month { get; set; }
}
