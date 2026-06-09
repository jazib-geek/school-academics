namespace School.API.Models;

public class ClassDiaryUploadForm
{
    public int ClassId { get; set; }

    public string Date { get; set; } = string.Empty;

    public List<IFormFile>? Files { get; set; }

    public string? Description { get; set; }
}
