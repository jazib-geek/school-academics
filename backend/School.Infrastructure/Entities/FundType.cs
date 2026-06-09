
namespace School.Infrastructure.Entities
{
    public class FundType
    {
        public int ID { get; set; }

        public string? FundTypeName { get; set; }

        // Reverse navigation
        public ICollection<FeeAndFundCollection> FeeAndFundCollections { get; set; }
            = new List<FeeAndFundCollection>();
    }
}
