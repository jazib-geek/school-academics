namespace School.Infrastructure.Entities;

public class AccountSubGroup
{
    public int ID { get; set; }

    public int MasterID { get; set; }

    public string? GroupID { get; set; }

    public string? SubGroupID { get; set; }

    public string? SubGroupName { get; set; }
}
