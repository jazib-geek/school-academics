namespace School.Infrastructure.Entities;

public class StationeryBudgetLine
{
    public int ID { get; set; }
    public int BudgetID { get; set; }
    public int ItemID { get; set; }
    public decimal Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal LineTotal { get; set; }

    public StationeryBudget Budget { get; set; } = null!;
    public StationeryItem Item { get; set; } = null!;
}
