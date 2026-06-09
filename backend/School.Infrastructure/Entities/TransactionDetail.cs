namespace School.Infrastructure.Entities;

public class TransactionDetail
{
    public int ID { get; set; }

    public string? VoucherNumber { get; set; }

    public string? VoucherType { get; set; }

    public DateTime? Date { get; set; }

    public int? Month { get; set; }

    public int? Year { get; set; }

    public int? MasterID { get; set; }

    public string? GroupID { get; set; }

    public string? SubGroupID { get; set; }

    public string? AccountID { get; set; }

    public string? Narration { get; set; }

    public decimal? Debit { get; set; }

    public decimal? Credit { get; set; }

    public int? SerialNo { get; set; }
}
