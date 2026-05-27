let allAnimals = [];
let allObjects = [];

async function loadGallery() {
    allAnimals = await API.getAnimals();
    allObjects = await API.getObjects();
    renderGallery(allAnimals);
    setupFilters();
}

function renderGallery(animals) {
    const grid = document.getElementById('galleryGrid');
    if (!grid) return;
    if (animals.length === 0) {
        grid.innerHTML = '<div style="text-align:center; padding:40px;">Нет собак</div>';
        return;
    }
    grid.innerHTML = animals.map(animal => {
        const obj = allObjects.find(o => o.id === animal.currentObjectId);
        const location = obj ? `📍 ${obj.name}` : '📍 Не размещена';
        return `
            <div class="animal-card" onclick="showAnimalCard('${animal.id}')">
                <img src="${animal.photoUrl}" alt="${animal.name}">
                <div class="animal-card-content">
                    <h3>${animal.name}</h3>
                    <div class="breed">${animal.breed || 'Неизвестная порода'}</div>
                    <div class="age">${animal.age} лет • ${animal.gender === 'male' ? 'Мальчик' : 'Девочка'}</div>
                    <div class="location">${location}</div>
                </div>
            </div>
        `;
    }).join('');
}

function setupFilters() {
    document.querySelectorAll('.filter-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            const filter = chip.dataset.filter;
            let filtered = [...allAnimals];
            if (filter === 'active') filtered = filtered.filter(a => a.status === 'active');
            else if (filter === 'adopted') filtered = filtered.filter(a => a.status === 'adopted');
            else if (filter === 'male') filtered = filtered.filter(a => a.gender === 'male');
            else if (filter === 'female') filtered = filtered.filter(a => a.gender === 'female');
            else if (filter === 'young') filtered = filtered.filter(a => a.age < 2);
            else if (filter === 'adult') filtered = filtered.filter(a => a.age >= 2);
            renderGallery(filtered);
        });
    });
}

window.showAnimalCard = async (id) => {
    const animal = allAnimals.find(a => a.id === id);
    if (!animal) return;
    const content = `
        <div style="display:flex; flex-wrap:wrap; gap:20px;">
            <img src="${animal.photoUrl}" style="flex:1; min-width:200px; border-radius:16px;">
            <div style="flex:2;">
                <h2>${animal.name}</h2>
                <p><strong>Порода:</strong> ${animal.breed}</p>
                <p><strong>Возраст:</strong> ${animal.age} лет</p>
                <p><strong>Пол:</strong> ${animal.gender === 'male' ? 'Мальчик' : 'Девочка'}</p>
                <p><strong>Описание:</strong> ${animal.description || 'Нет описания'}</p>
                <p><strong>Статус:</strong> ${getStatusLabel(animal.status)}</p>
                <div style="margin-top:20px;">
                    <button class="btn-outline" onclick="showMedicalHistory('${animal.id}')">📋 Медицинская история</button>
                    <button class="btn-outline" onclick="showMovementHistory('${animal.id}')">📍 История перемещений</button>
                </div>
            </div>
        </div>
    `;
    document.getElementById('modalTitle').innerHTML = `🐕 Карточка собаки`;
    document.getElementById('animalModalContent').innerHTML = content;
    document.getElementById('animalModal').style.display = 'flex';
};

window.showMedicalHistory = async (id) => {
    const animal = allAnimals.find(a => a.id === id);
    if (!animal) return;
    const history = animal.medicalHistory || [];
    const html = history.length ? history.map(rec => `
        <div class="timeline-item">
            <div class="timeline-date">${new Date(rec.date).toLocaleDateString()}</div>
            <div class="timeline-title">${getMedicalTypeLabel(rec.type)}</div>
            <div class="timeline-desc">${rec.description}</div>
        </div>
    `).join('') : '<p>Нет записей</p>';
    document.getElementById('historyTitle').innerHTML = `📋 Медицинская история: ${animal.name}`;
    document.getElementById('historyContent').innerHTML = `<div class="timeline">${html}</div>`;
    document.getElementById('historyModal').style.display = 'flex';
};

window.showMovementHistory = async (id) => {
    const animal = allAnimals.find(a => a.id === id);
    if (!animal) return;
    const history = animal.movementHistory || [];
    const html = history.length ? history.map(m => `
        <div class="timeline-item">
            <div class="timeline-date">${new Date(m.date).toLocaleDateString()}</div>
            <div class="timeline-title">Перемещение</div>
            <div class="timeline-desc">Из: ${m.fromObjectName || 'Нет'}</div>
            <div class="timeline-desc">В: ${m.toObjectName}</div>
            <div class="timeline-desc">Причина: ${m.reason}</div>
        </div>
    `).join('') : '<p>Нет перемещений</p>';
    document.getElementById('historyTitle').innerHTML = `📍 История перемещений: ${animal.name}`;
    document.getElementById('historyContent').innerHTML = `<div class="timeline">${html}</div>`;
    document.getElementById('historyModal').style.display = 'flex';
};

// Закрытие модалок
document.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', () => {
        document.getElementById('animalModal').style.display = 'none';
        document.getElementById('historyModal').style.display = 'none';
    });
});
window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) e.target.style.display = 'none';
});

loadGallery();