namespace AniLove.Models
{
    public class MedicalRecordModel
    {
        public string Id { get; set; } = Guid.NewGuid().ToString();
        public DateTime Date { get; set; } = DateTime.Now;
        public string Type { get; set; } = ""; // vaccination, sterilization, treatment, checkup
        public string Description { get; set; } = "";
        public string VetName { get; set; } = "";
        public DateTime? NextDate { get; set; }
    }
}
