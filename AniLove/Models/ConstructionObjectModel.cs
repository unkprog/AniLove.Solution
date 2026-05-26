namespace AniLove.Models
{
    public class ConstructionObjectModel
    {
        public string Id { get; set; } = Guid.NewGuid().ToString();
        public string Type { get; set; } = "booth";
        public string Name { get; set; } = "";
        public double X { get; set; }
        public double Y { get; set; }
        public double Width { get; set; } = 80;
        public double Height { get; set; } = 60;
        public List<string> AnimalIds { get; set; } = new();
        public int MaxCapacity { get; set; } = 1;
    }
}
