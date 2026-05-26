namespace AniLove.Models
{
    public class MovementRecordModel
    {
        public string Id { get; set; } = Guid.NewGuid().ToString();
        public DateTime Date { get; set; } = DateTime.Now;
        public string FromObjectId { get; set; } = "";
        public string FromObjectName { get; set; } = "";
        public string ToObjectId { get; set; } = "";
        public string ToObjectName { get; set; } = "";
        public string Reason { get; set; } = "";
        public string ChangedBy { get; set; } = "";
    }
}
