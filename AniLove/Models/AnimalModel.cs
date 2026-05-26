namespace AniLove.Models
{
    public class AnimalModel
    {
        public string Id { get; set; } = Guid.NewGuid().ToString();
        public string Name { get; set; } = "";
        public string Breed { get; set; } = "";
        public int Age { get; set; }
        public string Gender { get; set; } = "";
        public string Description { get; set; } = "";
        public string PhotoUrl { get; set; } = "";
        public string Status { get; set; } = "active"; // active, adopted, deceased, transferred
        public DateTime ArrivalDate { get; set; } = DateTime.Now;
        public DateTime? DepartureDate { get; set; }
        public string DepartureReason { get; set; } = "";
        public List<MedicalRecordModel> MedicalHistory { get; set; } = new();
        public List<MovementRecordModel> MovementHistory { get; set; } = new();
        public string CurrentObjectId { get; set; } = "";
    }
}
