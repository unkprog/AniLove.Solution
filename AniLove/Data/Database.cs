using AniLove.Helpers;
using AniLove.Models;
using System.Text.Json;

namespace AniLove.Data
{
    public static class Database
    {
        private static readonly string DataPath = Path.Combine(Directory.GetCurrentDirectory(), "Data");
        private static readonly string AnimalsFile = Path.Combine(DataPath, "animals.json");
        private static readonly string ObjectsFile = Path.Combine(DataPath, "objects.json");

        static Database()
        {
            if (!Directory.Exists(DataPath))
                Directory.CreateDirectory(DataPath);

            if (!File.Exists(AnimalsFile))
                File.WriteAllText(AnimalsFile, "[]");
            if (!File.Exists(ObjectsFile))
                File.WriteAllText(ObjectsFile, "[]");
        }

        public static async Task<List<AnimalModel>> GetAnimals()
        {
            var json = await File.ReadAllTextAsync(AnimalsFile);
            return JsonSerializer.Deserialize<List<AnimalModel>>(json) ?? new();
        }

        public static async Task SaveAnimals(List<AnimalModel> animals)
        {
            var json = JsonSerializer.Serialize(animals, new JsonSerializerOptions { WriteIndented = true });
            await File.WriteAllTextAsync(AnimalsFile, json);
        }

        public static async Task<List<ConstructionObjectModel>> GetObjects()
        {
            var json = await File.ReadAllTextAsync(ObjectsFile);
            return JsonSerializer.Deserialize<List<ConstructionObjectModel>>(json) ?? new();
        }

        public static async Task SaveObjects(List<ConstructionObjectModel> objects)
        {
            var json = JsonSerializer.Serialize(objects, new JsonSerializerOptions { WriteIndented = true });
            await File.WriteAllTextAsync(ObjectsFile, json);
        }
    }

}