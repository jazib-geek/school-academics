
namespace School.Application.DTOs
{
    public class NewsAndEventDto
    {
        public int Id { get; set; }
        public DateTime? Date { get; set; }
        public string? Title { get; set; }
        public string? Type { get; set; }
        public string? Description { get; set; }
        public string? ImagePath { get; set; }
        public bool? ShowOnHome { get; set; }
    }
}
