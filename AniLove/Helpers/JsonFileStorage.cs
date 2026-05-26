using System.Text.Json;

namespace AniLove.Helpers
{
    public static class JsonFileStorage<T> where T : class
    {
        private static readonly JsonSerializerOptions Options = new JsonSerializerOptions
        {
            WriteIndented = true,
            PropertyNameCaseInsensitive = true
        };

        public static List<T> Load(string filePath)
        {
            if (!File.Exists(filePath))
                return new List<T>();
            var json = File.ReadAllText(filePath);
            return JsonSerializer.Deserialize<List<T>>(json, Options) ?? new List<T>();
        }

        public static void Save(string filePath, List<T> data)
        {
            var json = JsonSerializer.Serialize(data, Options);
            File.WriteAllText(filePath, json);
        }
    }
}
