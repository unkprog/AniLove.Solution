let allAnimals = [], allObjects = [];
let currentEditAnimal = null, currentEditObject = null;
let svg = null;
let viewBoxX = 0, viewBoxY = 0, viewBoxWidth = 2000, viewBoxHeight = 1500;
let isDragging = false, isResizing = false;
let selectedObjectId = null;
let panModeEnabled = false;

async function loadAdminData() {
    try {
        allAnimals = await API.getAnimals();
        allObjects = await API.getObjects();
        renderAnimalsList();
        renderObjectsList();
        if (svg) renderSchemeEditor();
    } catch (err) { showToast(err.message, true); }
}

function renderAnimalsList() {
    const container = document.getElementById('animalsList');
    if (!container) return;
    if (!allAnimals.length) { container.innerHTML = '<div class="empty-state">Нет добавленных собак</div>'; return; }
    container.innerHTML = allAnimals.map(animal => `
        <div class="animal-admin-card">
            <div class="animal-card-left">
                <img src="${animal.photoUrl || 'https://placekitten.com/80/80'}" class="animal-avatar" onerror="this.src='https://placekitten.com/80/80'">
                <div class="animal-info">
                    <div class="animal-name">${escapeHtml(animal.name)}</div>
                    <div class="animal-details">${escapeHtml(animal.breed || 'Неизвестная порода')}, ${animal.age} лет, ${getStatusLabel(animal.status)}</div>
                </div>
            </div>
            <div class="animal-card-actions">
                <button class="chip" onclick="editAnimal('${animal.id}')">✏️ Редактировать</button>
                <button class="chip" onclick="deleteAnimal('${animal.id}')">🗑️ Удалить</button>
                <button class="chip" onclick="showMedicalHistory('${animal.id}')">📋 История</button>
                <button class="chip" onclick="moveAnimal('${animal.id}')">🚚 Переместить</button>
            </div>
        </div>
    `).join('');
}

function renderObjectsList() {
    const container = document.getElementById('objectsList');
    if (!container) return;
    container.innerHTML = allObjects.map(obj => `
        <div class="admin-list-item">
            <div><strong>${escapeHtml(obj.name)}</strong> (${obj.type === 'booth' ? 'Будка' : obj.type === 'enclosure' ? 'Вольер' : 'Бытовка'}) — ${obj.animalIds?.length || 0}/${obj.maxCapacity} мест</div>
            <div class="admin-list-item-actions">
                <button class="chip" onclick="editObject('${obj.id}')">✏️ Редактировать</button>
                <button class="chip" onclick="deleteObject('${obj.id}')">🗑️ Удалить</button>
            </div>
        </div>
    `).join('');
}

function escapeHtml(str) { if (!str) return ''; return str.replace(/[&<>]/g, function (m) { if (m === '&') return '&amp;'; if (m === '<') return '&lt;'; if (m === '>') return '&gt;'; return m; }); }

window.editAnimal = async (id) => {
    const animal = allAnimals.find(a => a.id === id);
    if (!animal) return;
    currentEditAnimal = animal;
    const form = `
        <div class="form-group"><label>Имя</label><input type="text" id="editAnimalName" value="${escapeHtml(animal.name)}"></div>
        <div class="form-group"><label>Порода</label><input type="text" id="editAnimalBreed" value="${escapeHtml(animal.breed || '')}"></div>
        <div class="form-row"><div class="form-group"><label>Возраст</label><input type="number" id="editAnimalAge" value="${animal.age}"></div>
        <div class="form-group"><label>Пол</label><select id="editAnimalGender"><option value="male" ${animal.gender === 'male' ? 'selected' : ''}>Мальчик</option><option value="female" ${animal.gender === 'female' ? 'selected' : ''}>Девочка</option></select></div></div>
        <div class="form-group"><label>Описание</label><textarea id="editAnimalDesc">${escapeHtml(animal.description || '')}</textarea></div>
        <div class="form-group"><label>Фото URL</label><input type="text" id="editAnimalPhoto" value="${animal.photoUrl || ''}"></div>
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
    if (confirm('Удалить собаку?')) { await API.deleteAnimal(id); await loadAdminData(); showToast('Удалено'); }
};

window.moveAnimal = async (id) => {
    const animal = allAnimals.find(a => a.id === id);
    const reason = prompt('Причина перемещения:', 'Размещение в вольере');
    if (!reason) return;
    const newObjId = prompt('ID объекта (скопируйте из списка объектов):', animal.currentObjectId || '');
    if (newObjId && newObjId !== animal.currentObjectId) {
        await API.moveAnimal(id, { toObjectId: newObjId, reason, changedBy: 'Админ' });
        await loadAdminData();
        showToast('Перемещено');
    }
};

window.editObject = async (id) => {
    const obj = allObjects.find(o => o.id === id);
    if (!obj) return;
    currentEditObject = obj;
    const form = `
        <div class="form-group"><label>Название</label><input type="text" id="editObjName" value="${escapeHtml(obj.name)}"></div>
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
    if (confirm('Удалить объект?')) { await API.deleteObject(id); await loadAdminData(); showToast('Удалено'); }
};

document.getElementById('addAnimalBtn')?.addEventListener('click', async () => {
    const name = prompt('Имя собаки:'); if (!name) return;
    const newAnimal = {
        name, breed: prompt('Порода:', 'Беспородная'), age: parseInt(prompt('Возраст:', '1')),
        gender: prompt('Пол (male/female):', 'male'), description: prompt('Описание:', ''),
        photoUrl: prompt('URL фото:', 'https://placekitten.com/400/300'), status: 'active', currentObjectId: ''
    };
    await API.addAnimal(newAnimal);
    await loadAdminData();
    showToast('Собака добавлена');
});

document.getElementById('addBoothBtn')?.addEventListener('click', () => addObjectUI('booth'));
document.getElementById('addEnclosureBtn')?.addEventListener('click', () => addObjectUI('enclosure'));
document.getElementById('addUtilityBtn')?.addEventListener('click', () => addObjectUI('utility'));

async function addObjectUI(type) {
    const name = prompt('Название объекта:', type === 'booth' ? 'Будка' : (type === 'enclosure' ? 'Вольер' : 'Бытовка'));
    if (!name) return;
    const maxCapacity = type === 'booth' ? 1 : (type === 'enclosure' ? 5 : 10);
    await API.addObject({ type, name, x: 100, y: 100, width: 80, height: 60, animalIds: [], maxCapacity });
    await loadAdminData();
    showToast('Объект добавлен');
}

// --- Редактор схемы (упрощённый, но рабочий) ---
function initSchemeEditor() {
    const container = document.getElementById('schemeContainer');
    svg = document.getElementById('shelterScheme');
    if (!svg) return;
    svg.setAttribute('viewBox', `0 0 2000 1500`);
    renderSchemeEditor();
    let isPan = false, panStart = { x: 0, y: 0 }, startVB = { x: 0, y: 0 };
    const panBtn = document.getElementById('panBtn');
    panBtn?.addEventListener('click', () => { panModeEnabled = !panModeEnabled; panBtn.classList.toggle('active', panModeEnabled); container.style.cursor = panModeEnabled ? 'grab' : 'default'; });
    container.addEventListener('mousedown', (e) => {
        if (!panModeEnabled && e.button !== 1) return;
        e.preventDefault();
        isPan = true;
        panStart.x = e.clientX; panStart.y = e.clientY;
        const vb = svg.getAttribute('viewBox').split(' ').map(Number);
        startVB.x = vb[0]; startVB.y = vb[1];
        container.style.cursor = 'grabbing';
    });
    window.addEventListener('mousemove', (e) => {
        if (!isPan) return;
        const dx = e.clientX - panStart.x, dy = e.clientY - panStart.y;
        const rect = container.getBoundingClientRect();
        const scaleX = viewBoxWidth / rect.width;
        const scaleY = viewBoxHeight / rect.height;
        let newX = startVB.x - dx * scaleX;
        let newY = startVB.y - dy * scaleY;
        newX = Math.max(-500, Math.min(2000 - viewBoxWidth + 500, newX));
        newY = Math.max(-500, Math.min(1500 - viewBoxHeight + 500, newY));
        svg.setAttribute('viewBox', `${newX} ${newY} ${viewBoxWidth} ${viewBoxHeight}`);
    });
    window.addEventListener('mouseup', () => { isPan = false; container.style.cursor = panModeEnabled ? 'grab' : 'default'; });
    document.getElementById('zoomInBtn')?.addEventListener('click', () => zoomEditor(0.8));
    document.getElementById('zoomOutBtn')?.addEventListener('click', () => zoomEditor(1.25));
    document.getElementById('zoomFitBtn')?.addEventListener('click', () => { viewBoxWidth = 2000; viewBoxHeight = 1500; svg.setAttribute('viewBox', `0 0 2000 1500`); document.getElementById('zoomLevel').innerText = '100%'; });
}

function zoomEditor(factor) {
    const oldW = viewBoxWidth, oldH = viewBoxHeight;
    let newW = viewBoxWidth * factor;
    if (newW < 500 || newW > 8000) return;
    viewBoxWidth = newW; viewBoxHeight = viewBoxHeight * factor;
    const vb = svg.getAttribute('viewBox').split(' ').map(Number);
    let newX = vb[0] + (oldW - viewBoxWidth) * 0.5;
    let newY = vb[1] + (oldH - viewBoxHeight) * 0.5;
    newX = Math.max(-500, Math.min(2000 - viewBoxWidth + 500, newX));
    newY = Math.max(-500, Math.min(1500 - viewBoxHeight + 500, newY));
    svg.setAttribute('viewBox', `${newX} ${newY} ${viewBoxWidth} ${viewBoxHeight}`);
    document.getElementById('zoomLevel').innerText = Math.round((2000 / viewBoxWidth) * 100) + '%';
}

function renderSchemeEditor() {
    if (!svg) return;
    svg.innerHTML = '';
    const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bg.setAttribute('width', '100%'); bg.setAttribute('height', '100%'); bg.setAttribute('fill', '#e8e0d5');
    svg.appendChild(bg);
    for (let i = 0; i <= 2000; i += 50) {
        const l = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        l.setAttribute('x1', i); l.setAttribute('y1', 0); l.setAttribute('x2', i); l.setAttribute('y2', 1500);
        l.setAttribute('stroke', '#d4cbbc'); l.setAttribute('stroke-width', '0.5');
        svg.appendChild(l);
        const lh = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        lh.setAttribute('x1', 0); lh.setAttribute('y1', i); lh.setAttribute('x2', 2000); lh.setAttribute('y2', i);
        lh.setAttribute('stroke', '#d4cbbc'); lh.setAttribute('stroke-width', '0.5');
        svg.appendChild(lh);
    }
    allObjects.forEach(obj => renderObjectEditor(obj));
}

function renderObjectEditor(obj) {
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
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
    rect.addEventListener('mousedown', (e) => { e.stopPropagation(); startDragObject(obj, e); });
    rect.addEventListener('click', (e) => { e.stopPropagation(); selectObject(obj); });
    if (selectedObjectId === obj.id) {
        const handles = ['se', 'sw', 'ne', 'nw'];
        handles.forEach(handle => {
            let x = handle.includes('e') ? obj.x + obj.width : obj.x;
            let y = handle.includes('s') ? obj.y + obj.height : obj.y;
            const hr = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            hr.setAttribute('x', x - 6); hr.setAttribute('y', y - 6);
            hr.setAttribute('width', '12'); hr.setAttribute('height', '12');
            hr.setAttribute('fill', '#6750A4'); hr.setAttribute('stroke', 'white');
            hr.setAttribute('stroke-width', '2'); hr.setAttribute('rx', '3');
            hr.style.cursor = 'nwse-resize';
            hr.addEventListener('mousedown', (e) => { e.stopPropagation(); startResizeObject(obj, handle, e); });
            g.appendChild(hr);
        });
    }
    svg.appendChild(g);
}

let dragObj = null;
function startDragObject(obj, e) {
    dragObj = obj;
    isDragging = true;
    let startX = e.clientX, startY = e.clientY;
    const onMove = (moveEvt) => {
        if (!isDragging) return;
        const rect = document.getElementById('schemeContainer').getBoundingClientRect();
        const vb = svg.getAttribute('viewBox').split(' ').map(Number);
        const scaleX = vb[2] / rect.width;
        const scaleY = vb[3] / rect.height;
        const dx = (moveEvt.clientX - startX) * scaleX;
        const dy = (moveEvt.clientY - startY) * scaleY;
        obj.x = Math.max(0, Math.min(2000 - obj.width, obj.x + dx));
        obj.y = Math.max(0, Math.min(1500 - obj.height, obj.y + dy));
        startX = moveEvt.clientX; startY = moveEvt.clientY;
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
    const startW = obj.width, startH = obj.height;
    const startXpos = obj.x, startYpos = obj.y;
    const onMove = (moveEvt) => {
        if (!isResizing) return;
        const rect = document.getElementById('schemeContainer').getBoundingClientRect();
        const vb = svg.getAttribute('viewBox').split(' ').map(Number);
        const scaleX = vb[2] / rect.width;
        const scaleY = vb[3] / rect.height;
        const dx = (moveEvt.clientX - startX) * scaleX;
        const dy = (moveEvt.clientY - startY) * scaleY;
        if (handle.includes('e')) obj.width = Math.max(40, startW + dx);
        if (handle.includes('w')) { obj.width = Math.max(40, startW - dx); obj.x = startXpos + (startW - obj.width); }
        if (handle.includes('s')) obj.height = Math.max(40, startH + dy);
        if (handle.includes('n')) { obj.height = Math.max(40, startH - dy); obj.y = startYpos + (startH - obj.height); }
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

// --- История (переиспользуем из gallery) ---
window.showMedicalHistory = async (id) => {
    const animal = allAnimals.find(a => a.id === id);
    const history = animal.medicalHistory || [];
    const html = history.length ? history.map(rec => `<div class="timeline-item"><div class="timeline-date">${new Date(rec.date).toLocaleDateString()}</div><div class="timeline-title">${getMedicalTypeLabel(rec.type)}</div><div class="timeline-desc">${rec.description}</div></div>`).join('') : '<p>Нет записей</p>';
    document.getElementById('historyTitle').innerHTML = `📋 Медицинская история: ${animal.name}`;
    document.getElementById('historyContent').innerHTML = `<div class="timeline">${html}</div>`;
    document.getElementById('historyModal').style.display = 'flex';
};

window.showMovementHistory = async (id) => {
    const animal = allAnimals.find(a => a.id === id);
    const history = animal.movementHistory || [];
    const html = history.length ? history.map(m => `<div class="timeline-item"><div class="timeline-date">${new Date(m.date).toLocaleDateString()}</div><div class="timeline-title">Перемещение</div><div class="timeline-desc">Из: ${m.fromObjectName || 'Нет'}</div><div class="timeline-desc">В: ${m.toObjectName}</div><div class="timeline-desc">Причина: ${m.reason}</div></div>`).join('') : '<p>Нет перемещений</p>';
    document.getElementById('historyTitle').innerHTML = `📍 История перемещений: ${animal.name}`;
    document.getElementById('historyContent').innerHTML = `<div class="timeline">${html}</div>`;
    document.getElementById('historyModal').style.display = 'flex';
};

// Вкладки
function initTabs() {
    const btns = document.querySelectorAll('.admin-tab-btn');
    btns.forEach(btn => {
        btn.addEventListener('click', () => {
            btns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            document.querySelectorAll('.admin-tab-content').forEach(c => c.style.display = 'none');
            document.getElementById(`tab-${btn.dataset.tab}`).style.display = 'block';
            if (btn.dataset.tab === 'scheme') setTimeout(() => initSchemeEditor(), 50);
        });
    });
}

document.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', () => {
        document.getElementById('animalEditModal').style.display = 'none';
        document.getElementById('objectEditModal').style.display = 'none';
        document.getElementById('historyModal').style.display = 'none';
    });
});
window.addEventListener('click', (e) => { if (e.target.classList.contains('modal')) e.target.style.display = 'none'; });

document.addEventListener('DOMContentLoaded', async () => {
    await loadAdminData();
    initTabs();
});