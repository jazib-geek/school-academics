namespace School.Infrastructure.Entities
{
    public class NewsAndEvent
    {
        public int ID { get; set; }

        public DateTime? Date { get; set; }

        public string? Title { get; set; }

        public string? Type { get; set; }

        public string? Description { get; set; }

        public bool? IsActive { get; set; }

        public bool? ShowOnHome { get; set; }

        public string? ImagePath { get; set; }
    }
}
