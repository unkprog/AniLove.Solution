namespace AniLove.Models
{
    public class SectionModel
    {
        public string Id { get; set; } = Guid.NewGuid().ToString();
        public string Name { get; set; } = "";
        public int Floor { get; set; } = 1;
        public int Capacity { get; set; } = 1;
        public List<string> AnimalIds { get; set; } = new();
    }
}
