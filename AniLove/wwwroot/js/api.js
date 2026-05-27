// api.js — реальные запросы к бэкенду
// Предполагается, что сервер запущен и обрабатывает эти эндпоинты

const API_BASE = '/api';

window.API = {
    async getAnimals() {
        const res = await fetch(`${API_BASE}/animals`);
        if (!res.ok) throw new Error('Ошибка загрузки собак');
        return res.json();
    },

    async getObjects() {
        const res = await fetch(`${API_BASE}/objects`);
        if (!res.ok) throw new Error('Ошибка загрузки объектов');
        return res.json();
    },

    async addAnimal(animal) {
        const res = await fetch(`${API_BASE}/animals`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(animal)
        });
        if (!res.ok) throw new Error('Ошибка добавления собаки');
        return res.json();
    },

    async updateAnimal(id, data) {
        const res = await fetch(`${API_BASE}/animals/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error('Ошибка обновления собаки');
        return res.json();
    },

    async deleteAnimal(id) {
        const res = await fetch(`${API_BASE}/animals/${id}`, {
            method: 'DELETE'
        });
        if (!res.ok) throw new Error('Ошибка удаления собаки');
        return true;
    },

    async addObject(obj) {
        const res = await fetch(`${API_BASE}/objects`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(obj)
        });
        if (!res.ok) throw new Error('Ошибка добавления объекта');
        return res.json();
    },

    async updateObject(id, data) {
        const res = await fetch(`${API_BASE}/objects/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error('Ошибка обновления объекта');
        return res.json();
    },

    async deleteObject(id) {
        const res = await fetch(`${API_BASE}/objects/${id}`, {
            method: 'DELETE'
        });
        if (!res.ok) throw new Error('Ошибка удаления объекта');
        return true;
    },

    async moveAnimal(animalId, movement) {
        const res = await fetch(`${API_BASE}/animals/${animalId}/move`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(movement)
        });
        if (!res.ok) throw new Error('Ошибка перемещения');
        return res.json();
    },

    async changeAnimalStatus(animalId, status, reason) {
        const res = await fetch(`${API_BASE}/animals/${animalId}/status`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status, reason })
        });
        if (!res.ok) throw new Error('Ошибка изменения статуса');
        return res.json();
    },

    async addMedicalRecord(animalId, record) {
        const res = await fetch(`${API_BASE}/animals/${animalId}/medical`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(record)
        });
        if (!res.ok) throw new Error('Ошибка добавления записи');
        return res.json();
    }
};