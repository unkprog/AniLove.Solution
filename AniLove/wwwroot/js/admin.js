let allAnimals = [], allObjects = [];
let currentEditAnimal = null, currentEditObject = null;

// SVG и состояния для редактора схемы (те же переменные, что в scheme.js)
let svg = null;
let viewBoxX = 0, viewBoxY = 0, viewBoxWidth = 2000, viewBoxHeight = 1500;
let isPanning = false, panModeEnabled = false;
let panStartX, panStartY, panStartViewBoxX, panStartViewBoxY;
let isDragging = false, isResizing = false;
let dragStartX, dragStartY;
let selectedObjectId = null;

async function loadAdminData() {
    try {
        allAnimals = await API.getAnimals();
        allObjects = await API.getObjects();
        renderAnimalsList();
        renderObjectsList();
        if (svg) renderSchemeEditor();
    } catch (err) {
        showToast(err.message, true);
    }
}

// --- Управление вкладками ---
function initTabs() {
    const btns = document.querySelectorAll('.admin-tab-btn');
    btns.forEach(btn => {
        btn.addEventListener('click', () => {
            btns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            document.querySelectorAll('.admin-tab-content').forEach(content => content.style.display = 'none');
            document.getElementById(`tab-${btn.dataset.tab}`).style.display = 'block';
            if (btn.dataset.tab === 'scheme') setTimeout(() => initSchemeEditor(), 100);
        });
    });
}

// --- Список собак ---
function renderAnimalsList() {
    const container = document.getElementById('animalsList');
    if (!container) return;

    if (!allAnimals.length) {
        container.innerHTML = '<div class="empty-state">Нет добавленных собак</div>';
        return;
    }

    container.innerHTML = allAnimals.map(animal => {
        const photoUrl = animal.photoUrl && animal.photoUrl !== ''
            ? animal.photoUrl
            : 'https://placekitten.com/80/80'; // fallback
        const statusText = getStatusLabel(animal.status);

        return `
            <div class="animal-admin-card">
                <div class="animal-card-left">
                    <img src="${photoUrl}" alt="${animal.name}" class="animal-avatar" onerror="this.src='https://placekitten.com/80/80'">
                    <div class="animal-info">
                        <div class="animal-name">${escapeHtml(animal.name)}</div>
                        <div class="animal-details">
                            ${escapeHtml(animal.breed || 'Неизвестная порода')}, ${animal.age} лет, ${statusText}
                        </div>
                    </div>
                </div>
                <div class="animal-card-actions">
                    <button class="chip" onclick="editAnimal('${animal.id}')">✏️ Редактировать</button>
                    <button class="chip" onclick="deleteAnimal('${animal.id}')">🗑️ Удалить</button>
                    <button class="chip" onclick="showMedicalHistory('${animal.id}')">📋 История</button>
                    <button class="chip" onclick="moveAnimal('${animal.id}')">🚚 Переместить</button>
                </div>
            </div>
        `;
    }).join('');
}


window.editAnimal = async (id) => {
    const animal = allAnimals.find(a => a.id === id);
    if (!animal) return;
    currentEditAnimal = animal;
    const objects = allObjects;
    const form = `
        <div class="form-group"><label>Имя</label><input type="text" id="editAnimalName" value="${animal.name}"></div>
        <div class="form-group"><label>Порода</label><input type="text" id="editAnimalBreed" value="${animal.breed}"></div>
        <div class="form-row">
            <div class="form-group"><label>Возраст</label><input type="number" id="editAnimalAge" value="${animal.age}"></div>
            <div class="form-group"><label>Пол</label><select id="editAnimalGender"><option value="male" ${animal.gender === 'male' ? 'selected' : ''}>Мальчик</option><option value="female" ${animal.gender === 'female' ? 'selected' : ''}>Девочка</option></select></div>
        </div>
        <div class="form-group"><label>Описание</label><textarea id="editAnimalDesc">${animal.description || ''}</textarea></div>
        <div class="form-group"><label>Фото URL</label><input type="text" id="editAnimalPhoto" value="${animal.photoUrl}"></div>
        <div class="form-group"><label>Статус</label><select id="editAnimalStatus"><option value="active" ${animal.status === 'active' ? 'selected' : ''}>В приюте</option><option value="adopted" ${animal.status === 'adopted' ? 'selected' : ''}>Нашла дом</option></select></div>
        <button class="btn-primary" onclick="saveAnimalEdit()">Сохранить</button>
    `;
    document.getElementById('animalEditTitle').innerHTML = `Редактирование: ${animal.name}`;
    document.getElementById('animalEditContent').innerHTML = form;
    document.getElementById('animalEditModal').style.display = 'flex';
};

window.saveAnimalEdit = async () => {
    if (!currentEditAnimal) return;
    const updated = {
        ...currentEditAnimal,
        name: document.getElementById('editAnimalName').value,
        breed: document.getElementById('editAnimalBreed').value,
        age: parseInt(document.getElementById('editAnimalAge').value),
        gender: document.getElementById('editAnimalGender').value,
        description: document.getElementById('editAnimalDesc').value,
        photoUrl: document.getElementById('editAnimalPhoto').value,
        status: document.getElementById('editAnimalStatus').value
    };
    await API.updateAnimal(currentEditAnimal.id, updated);
    await loadAdminData();
    document.getElementById('animalEditModal').style.display = 'none';
    showToast('Сохранено');
};

window.deleteAnimal = async (id) => {
    if (confirm('Удалить собаку?')) {
        await API.deleteAnimal(id);
        await loadAdminData();
        showToast('Удалено');
    }
};

window.moveAnimal = async (id) => {
    const animal = allAnimals.find(a => a.id === id);
    if (!animal) return;
    const objects = allObjects;
    const objectSelect = objects.map(obj => `<option value="${obj.id}" ${animal.currentObjectId === obj.id ? 'selected' : ''}>${obj.name} (${obj.animalIds.length}/${obj.maxCapacity})</option>`).join('');
    const reason = prompt('Причина перемещения:', 'Размещение в вольере');
    if (!reason) return;
    const newObjId = prompt('Введите ID объекта (можно скопировать из списка):', animal.currentObjectId);
    if (newObjId && newObjId !== animal.currentObjectId) {
        await API.moveAnimal(id, { toObjectId: newObjId, reason, changedBy: 'Админ' });
        await loadAdminData();
        showToast('Перемещено');
    }
};

// --- Список объектов ---
function renderObjectsList() {
    const container = document.getElementById('objectsList');
    if (!container) return;
    container.innerHTML = allObjects.map(obj => `
        <div class="admin-list-item">
            <div><strong>${obj.name}</strong> (${obj.type === 'booth' ? 'Будка' : obj.type === 'enclosure' ? 'Вольер' : 'Бытовка'}) — ${obj.animalIds.length}/${obj.maxCapacity} мест</div>
            <div class="admin-list-item-actions">
                <button class="chip" onclick="editObject('${obj.id}')">✏️ Редактировать</button>
                <button class="chip" onclick="deleteObject('${obj.id}')">🗑️ Удалить</button>
            </div>
        </div>
    `).join('');
}

window.editObject = async (id) => {
    const obj = allObjects.find(o => o.id === id);
    if (!obj) return;
    currentEditObject = obj;
    const form = `
        <div class="form-group"><label>Название</label><input type="text" id="editObjName" value="${obj.name}"></div>
        <div class="form-group"><label>Тип</label><select id="editObjType"><option value="booth" ${obj.type === 'booth' ? 'selected' : ''}>Будка (1 место)</option><option value="enclosure" ${obj.type === 'enclosure' ? 'selected' : ''}>Вольер (5 мест)</option><option value="utility" ${obj.type === 'utility' ? 'selected' : ''}>Бытовка (10 мест)</option></select></div>
        <div class="form-group"><label>Макс. мест</label><input type="number" id="editObjCapacity" value="${obj.maxCapacity}"></div>
        <div class="form-row"><div class="form-group"><label>Ширина</label><input type="number" id="editObjWidth" value="${obj.width}"></div><div class="form-group"><label>Высота</label><input type="number" id="editObjHeight" value="${obj.height}"></div></div>
        <button class="btn-primary" onclick="saveObjectEdit()">Сохранить</button>
    `;
    document.getElementById('objectEditTitle').innerHTML = `Редактирование: ${obj.name}`;
    document.getElementById('objectEditContent').innerHTML = form;
    document.getElementById('objectEditModal').style.display = 'flex';
};

window.saveObjectEdit = async () => {
    if (!currentEditObject) return;
    const updated = {
        ...currentEditObject,
        name: document.getElementById('editObjName').value,
        type: document.getElementById('editObjType').value,
        maxCapacity: parseInt(document.getElementById('editObjCapacity').value),
        width: parseInt(document.getElementById('editObjWidth').value),
        height: parseInt(document.getElementById('editObjHeight').value)
    };
    await API.updateObject(currentEditObject.id, updated);
    await loadAdminData();
    document.getElementById('objectEditModal').style.display = 'none';
    showToast('Сохранено');
};

window.deleteObject = async (id) => {
    if (confirm('Удалить объект? Собаки будут отвязаны.')) {
        await API.deleteObject(id);
        await loadAdminData();
        showToast('Удалено');
    }
};

// Добавление объектов через кнопки
document.getElementById('addBoothBtn')?.addEventListener('click', () => addObjectUI('booth'));
document.getElementById('addEnclosureBtn')?.addEventListener('click', () => addObjectUI('enclosure'));
document.getElementById('addUtilityBtn')?.addEventListener('click', () => addObjectUI('utility'));

async function addObjectUI(type) {
    const name = prompt('Название объекта:', type === 'booth' ? 'Будка' : (type === 'enclosure' ? 'Вольер' : 'Бытовка'));
    if (!name) return;
    const maxCapacity = type === 'booth' ? 1 : (type === 'enclosure' ? 5 : 10);
    const newObj = { type, name, x: 100, y: 100, width: 80, height: 60, animalIds: [], maxCapacity };
    await API.addObject(newObj);
    await loadAdminData();
    showToast('Объект добавлен');
}

// --- Редактор схемы (аналогичен scheme.js, но с возможностью перетаскивания) ---
function initSchemeEditor() {
    const container = document.getElementById('schemeContainer');
    svg = document.getElementById('shelterScheme');
    if (!svg) return;
    svg.setAttribute('viewBox', `${viewBoxX} ${viewBoxY} ${viewBoxWidth} ${viewBoxHeight}`);
    renderSchemeEditor();
    // Панорамирование
    let isPanningLocal = false;
    container.addEventListener('mousedown', (e) => {
        if (e.target.closest('.scheme-controls')) return;
        if (panModeEnabled || e.button === 1) {
            e.preventDefault();
            isPanningLocal = true;
            panStartX = e.clientX; panStartY = e.clientY;
            panStartViewBoxX = viewBoxX; panStartViewBoxY = viewBoxY;
            container.style.cursor = 'grabbing';
        }
    });
    window.addEventListener('mousemove', (e) => {
        if (!isPanningLocal) return;
        const dx = e.clientX - panStartX;
        const dy = e.clientY - panStartY;
        const scaleX = viewBoxWidth / container.clientWidth;
        const scaleY = viewBoxHeight / container.clientHeight;
        viewBoxX = panStartViewBoxX - dx * scaleX;
        viewBoxY = panStartViewBoxY - dy * scaleY;
        viewBoxX = Math.max(-500, Math.min(2000 - viewBoxWidth + 500, viewBoxX));
        viewBoxY = Math.max(-500, Math.min(1500 - viewBoxHeight + 500, viewBoxY));
        svg.setAttribute('viewBox', `${viewBoxX} ${viewBoxY} ${viewBoxWidth} ${viewBoxHeight}`);
    });
    window.addEventListener('mouseup', () => { isPanningLocal = false; container.style.cursor = panModeEnabled ? 'grab' : 'default'; });
    // Кнопки зума
    document.getElementById('zoomInBtn').onclick = () => zoomEditor(0.8);
    document.getElementById('zoomOutBtn').onclick = () => zoomEditor(1.25);
    document.getElementById('zoomFitBtn').onclick = () => { viewBoxWidth = 2000; viewBoxHeight = 1500; viewBoxX = 0; viewBoxY = 0; svg.setAttribute('viewBox', `${viewBoxX} ${viewBoxY} ${viewBoxWidth} ${viewBoxHeight}`); document.getElementById('zoomLevel').innerText = '100%'; };
    document.getElementById('panBtn').onclick = () => { panModeEnabled = !panModeEnabled; document.getElementById('panBtn').classList.toggle('active', panModeEnabled); container.style.cursor = panModeEnabled ? 'grab' : 'default'; };
}

function renderSchemeEditor() {
    if (!svg) return;
    svg.innerHTML = '';
    const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bg.setAttribute('width', '100%'); bg.setAttribute('height', '100%'); bg.setAttribute('fill', '#e8e0d5');
    svg.appendChild(bg);
    for (let i = 0; i <= 2000; i += 50) {
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', i); line.setAttribute('y1', 0); line.setAttribute('x2', i); line.setAttribute('y2', 1500);
        line.setAttribute('stroke', '#d4cbbc'); line.setAttribute('stroke-width', '0.5');
        svg.appendChild(line);
        const lineH = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        lineH.setAttribute('x1', 0); lineH.setAttribute('y1', i); lineH.setAttribute('x2', 2000); lineH.setAttribute('y2', i);
        lineH.setAttribute('stroke', '#d4cbbc'); lineH.setAttribute('stroke-width', '0.5');
        svg.appendChild(lineH);
    }
    allObjects.forEach(obj => renderObjectEditor(obj));
}

function renderObjectEditor(obj) {
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('data-id', obj.id);
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', obj.x); rect.setAttribute('y', obj.y);
    rect.setAttribute('width', obj.width); rect.setAttribute('height', obj.height);
    let fill = '#e0e0e0';
    if (obj.type === 'booth') fill = '#c8e6c9';
    else if (obj.type === 'enclosure') fill = '#bbdef5';
    else if (obj.type === 'utility') fill = '#ffe0b2';
    rect.setAttribute('fill', fill);
    rect.setAttribute('stroke', selectedObjectId === obj.id ? '#6750A4' : '#999');
    rect.setAttribute('stroke-width', selectedObjectId === obj.id ? '3' : '2');
    rect.setAttribute('rx', '8');
    g.appendChild(rect);
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', obj.x + 10); text.setAttribute('y', obj.y + 25);
    text.textContent = obj.name;
    g.appendChild(text);
    // Обработчики перетаскивания и выделения
    rect.addEventListener('mousedown', (e) => { e.stopPropagation(); startDragObject(obj, e); });
    rect.addEventListener('click', (e) => { e.stopPropagation(); selectObject(obj); });
    // Ручки изменения размера при выделении
    if (selectedObjectId === obj.id) {
        const handles = ['se', 'sw', 'ne', 'nw'];
        handles.forEach(handle => {
            let x = handle.includes('e') ? obj.x + obj.width : obj.x;
            let y = handle.includes('s') ? obj.y + obj.height : obj.y;
            const handleRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            handleRect.setAttribute('x', x - 6); handleRect.setAttribute('y', y - 6);
            handleRect.setAttribute('width', '12'); handleRect.setAttribute('height', '12');
            handleRect.setAttribute('fill', '#6750A4'); handleRect.setAttribute('stroke', 'white');
            handleRect.setAttribute('stroke-width', '2'); handleRect.setAttribute('rx', '3');
            handleRect.style.cursor = 'nwse-resize';
            handleRect.addEventListener('mousedown', (e) => { e.stopPropagation(); startResizeObject(obj, handle, e); });
            g.appendChild(handleRect);
        });
    }
    svg.appendChild(g);
}

let dragObj = null;
function startDragObject(obj, e) {
    dragObj = obj;
    isDragging = true;
    dragStartX = e.clientX; dragStartY = e.clientY;
    const onMove = (moveEvt) => {
        if (!isDragging) return;
        const scaleX = viewBoxWidth / svg.clientWidth;
        const scaleY = viewBoxHeight / svg.clientHeight;
        const dx = (moveEvt.clientX - dragStartX) * scaleX;
        const dy = (moveEvt.clientY - dragStartY) * scaleY;
        obj.x = Math.max(0, Math.min(2000 - obj.width, obj.x + dx));
        obj.y = Math.max(0, Math.min(1500 - obj.height, obj.y + dy));
        dragStartX = moveEvt.clientX; dragStartY = moveEvt.clientY;
        renderSchemeEditor();
    };
    const onEnd = async () => {
        isDragging = false;
        await API.updateObject(obj.id, obj);
        dragObj = null;
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onEnd);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onEnd);
}

function startResizeObject(obj, handle, e) {
    isResizing = true;
    const startX = e.clientX, startY = e.clientY;
    const startWidth = obj.width, startHeight = obj.height;
    const startXpos = obj.x, startYpos = obj.y;
    const scaleX = viewBoxWidth / svg.clientWidth;
    const scaleY = viewBoxHeight / svg.clientHeight;
    const onMove = (moveEvt) => {
        if (!isResizing) return;
        const dx = (moveEvt.clientX - startX) * scaleX;
        const dy = (moveEvt.clientY - startY) * scaleY;
        if (handle.includes('e')) obj.width = Math.max(40, startWidth + dx);
        if (handle.includes('w')) { obj.width = Math.max(40, startWidth - dx); obj.x = startXpos + (startWidth - obj.width); }
        if (handle.includes('s')) obj.height = Math.max(40, startHeight + dy);
        if (handle.includes('n')) { obj.height = Math.max(40, startHeight - dy); obj.y = startYpos + (startHeight - obj.height); }
        renderSchemeEditor();
    };
    const onEnd = async () => {
        isResizing = false;
        await API.updateObject(obj.id, obj);
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onEnd);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onEnd);
}

function selectObject(obj) {
    selectedObjectId = obj.id;
    renderSchemeEditor();
    editObject(obj.id);
}

function zoomEditor(factor) {
    const oldWidth = viewBoxWidth, oldHeight = viewBoxHeight;
    let newWidth = viewBoxWidth * factor;
    if (newWidth < 500 || newWidth > 8000) return;
    viewBoxWidth = newWidth; viewBoxHeight = viewBoxHeight * factor;
    viewBoxX = viewBoxX + (oldWidth - viewBoxWidth) * 0.5;
    viewBoxY = viewBoxY + (oldHeight - viewBoxHeight) * 0.5;
    viewBoxX = Math.max(-500, Math.min(2000 - viewBoxWidth + 500, viewBoxX));
    viewBoxY = Math.max(-500, Math.min(1500 - viewBoxHeight + 500, viewBoxY));
    svg.setAttribute('viewBox', `${viewBoxX} ${viewBoxY} ${viewBoxWidth} ${viewBoxHeight}`);
    document.getElementById('zoomLevel').innerText = Math.round((2000 / viewBoxWidth) * 100) + '%';
}

// Добавление новой собаки
document.getElementById('addAnimalBtn')?.addEventListener('click', async () => {
    const name = prompt('Имя собаки:');
    if (!name) return;
    const newAnimal = {
        name, breed: prompt('Порода:', 'Беспородная'), age: parseInt(prompt('Возраст:', '1')),
        gender: prompt('Пол (male/female):', 'male'), description: prompt('Описание:', ''),
        photoUrl: prompt('URL фото:', 'https://placedog.net/400/300'), status: 'active', currentObjectId: ''
    };
    await API.addAnimal(newAnimal);
    await loadAdminData();
    showToast('Собака добавлена');
});

// Функции для истории (переиспользуем из gallery)
window.showMedicalHistory = async (id) => {
    const animal = allAnimals.find(a => a.id === id);
    if (!animal) return;
    const history = animal.medicalHistory || [];
    const html = history.length ? history.map(rec => `<div class="timeline-item"><div class="timeline-date">${new Date(rec.date).toLocaleDateString()}</div><div class="timeline-title">${getMedicalTypeLabel(rec.type)}</div><div class="timeline-desc">${rec.description}</div></div>`).join('') : '<p>Нет записей</p>';
    document.getElementById('historyTitle').innerHTML = `📋 Медицинская история: ${animal.name}`;
    document.getElementById('historyContent').innerHTML = `<div class="timeline">${html}</div>`;
    document.getElementById('historyModal').style.display = 'flex';
};

window.showMovementHistory = async (id) => {
    const animal = allAnimals.find(a => a.id === id);
    if (!animal) return;
    const history = animal.movementHistory || [];
    const html = history.length ? history.map(m => `<div class="timeline-item"><div class="timeline-date">${new Date(m.date).toLocaleDateString()}</div><div class="timeline-title">Перемещение</div><div class="timeline-desc">Из: ${m.fromObjectName || 'Нет'}</div><div class="timeline-desc">В: ${m.toObjectName}</div><div class="timeline-desc">Причина: ${m.reason}</div></div>`).join('') : '<p>Нет перемещений</p>';
    document.getElementById('historyTitle').innerHTML = `📍 История перемещений: ${animal.name}`;
    document.getElementById('historyContent').innerHTML = `<div class="timeline">${html}</div>`;
    document.getElementById('historyModal').style.display = 'flex';
};

// Закрытие модалок
document.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', () => {
        document.getElementById('animalEditModal').style.display = 'none';
        document.getElementById('objectEditModal').style.display = 'none';
        document.getElementById('historyModal').style.display = 'none';
    });
});
window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) e.target.style.display = 'none';
});

// Запуск
document.addEventListener('DOMContentLoaded', async () => {
    await loadAdminData();
    initTabs();
});