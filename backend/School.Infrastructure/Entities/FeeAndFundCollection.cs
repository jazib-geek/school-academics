namespace School.Infrastructure.Entities;

public class FeeAndFundCollection
{
    public int ID { get; set; }

    public int? TransactionID { get; set; }

    public int? StudentID { get; set; }

    public int? FundTypeID { get; set; }

    public int? ClassID { get; set; }

    public DateTime? Date { get; set; }

    public int? Month { get; set; }

    public int? Year { get; set; }

    public decimal? Payment { get; set; }

    public decimal? Recieved { get; set; }

    public int? BranchID { get; set; }

    public string? SessionYear { get; set; }

    public string? ReceivedBy { get; set; }

    public string? Time { get; set; }

    public int? RcptID { get; set; }

    public decimal? VoidAmount { get; set; }

    public DateTime? VoidDate { get; set; }

    public string? VoidBy { get; set; }

    public decimal? Discount { get; set; }

    public string? ManualRcptNo { get; set; }

    public decimal? AugustGen { get; set; }

    // Navigation
    public Student? Student { get; set; }
    public FundType? FundType { get; set; }
}
