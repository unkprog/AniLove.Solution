using AniLove.Data;
using AniLove.Models;
using System.Text.Json;




var builder = WebApplication.CreateBuilder(args);
builder.Services.AddEndpointsApiExplorer();

var app = builder.Build();

app.UseDefaultFiles();
app.UseStaticFiles();

// API Endpoints (same as before)
// API Endpoints
app.MapGet("/api/animals", async () => await Database.GetAnimals());
app.MapGet("/api/objects", async () => await Database.GetObjects());

app.MapPost("/api/animals", async (AnimalModel animal) =>
{
    var animals = await Database.GetAnimals();
    animal.Id = Guid.NewGuid().ToString();
    animal.ArrivalDate = DateTime.Now;
    animals.Add(animal);
    await Database.SaveAnimals(animals);
    return Results.Ok(animal);
});

app.MapPut("/api/animals/{id}", async (string id, AnimalModel updated) =>
{
    var animals = await Database.GetAnimals();
    var index = animals.FindIndex(a => a.Id == id);
    if (index == -1) return Results.NotFound();
    updated.Id = id;
    animals[index] = updated;
    await Database.SaveAnimals(animals);
    return Results.Ok(updated);
});

app.MapPost("/api/animals/{id}/medical", async (string id, MedicalRecordModel record) =>
{
    var animals = await Database.GetAnimals();
    var animal = animals.FirstOrDefault(a => a.Id == id);
    if (animal == null) return Results.NotFound();
    record.Id = Guid.NewGuid().ToString();
    record.Date = DateTime.Now;
    animal.MedicalHistory.Add(record);
    await Database.SaveAnimals(animals);
    return Results.Ok(record);
});

app.MapPost("/api/animals/{id}/move", async (string id, MovementRequestModel request) =>
{
    var animals = await Database.GetAnimals();
    var objects = await Database.GetObjects();

    var animal = animals.FirstOrDefault(a => a.Id == id);
    if (animal == null) return Results.NotFound();

    var fromObject = objects.FirstOrDefault(o => o.Id == animal.CurrentObjectId);
    var toObject = objects.FirstOrDefault(o => o.Id == request.ToObjectId);

    if (toObject == null) return Results.NotFound();
    if (toObject.AnimalIds.Count >= toObject.MaxCapacity)
        return Results.BadRequest("Объект переполнен");

    // Remove from old object
    if (fromObject != null)
    {
        fromObject.AnimalIds.Remove(id);
        await Database.SaveObjects(objects);
    }

    // Add to new object
    toObject.AnimalIds.Add(id);
    await Database.SaveObjects(objects);

    // Add movement record
    var movement = new MovementRecordModel
    {
        FromObjectId = fromObject?.Id ?? "",
        FromObjectName = fromObject?.Name ?? "Нет",
        ToObjectId = toObject.Id,
        ToObjectName = toObject.Name,
        Reason = request.Reason,
        ChangedBy = request.ChangedBy
    };
    animal.MovementHistory.Add(movement);
    animal.CurrentObjectId = toObject.Id;

    await Database.SaveAnimals(animals);
    return Results.Ok(movement);
});

app.MapPost("/api/animals/{id}/status", async (string id, StatusUpdateRequestModel request) =>
{
    var animals = await Database.GetAnimals();
    var animal = animals.FirstOrDefault(a => a.Id == id);
    if (animal == null) return Results.NotFound();

    animal.Status = request.Status;
    if (request.Status == "adopted" || request.Status == "deceased" || request.Status == "transferred")
    {
        animal.DepartureDate = DateTime.Now;
        animal.DepartureReason = request.Reason;
    }

    await Database.SaveAnimals(animals);
    return Results.Ok(animal);
});

app.MapPost("/api/objects", async (ConstructionObjectModel obj) =>
{
    var objects = await Database.GetObjects();
    obj.Id = Guid.NewGuid().ToString();
    objects.Add(obj);
    await Database.SaveObjects(objects);
    return Results.Ok(obj);
});

app.MapPut("/api/objects/{id}", async (string id, ConstructionObjectModel updated) =>
{
    var objects = await Database.GetObjects();
    var index = objects.FindIndex(o => o.Id == id);
    if (index == -1) return Results.NotFound();
    updated.Id = id;
    objects[index] = updated;
    await Database.SaveObjects(objects);
    return Results.Ok(updated);
});

app.MapDelete("/api/objects/{id}", async (string id) =>
{
    var objects = await Database.GetObjects();
    objects.RemoveAll(o => o.Id == id);
    await Database.SaveObjects(objects);
    return Results.Ok();
});

app.Run();