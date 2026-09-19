namespace School.Infrastructure.Entities;

public class EmployeeAsset
{
    public int ID { get; set; }
    public int? EmpID { get; set; }
    public string? AssetName { get; set; }
    public DateTime? DateOfIssue { get; set; }
    public decimal? AssetWorth { get; set; }
    public string? Remarks { get; set; }
    public Employee? Employee { get; set; }
}
