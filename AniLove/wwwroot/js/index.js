// Global state
let currentAdminMode = false;
let allAnimals = [];
let allObjects = [];
let svg = null;
let pendingAddType = null;
let selectedObject = null;
let isDragging = false;
let dragStartX = 0, dragStartY = 0;
let isResizing = false;
let resizeHandle = null;
let currentEditingObject = null;

// Pan and Zoom state
let currentZoom = 1;
let viewBoxX = 0, viewBoxY = 0;
let viewBoxWidth = 2000, viewBoxHeight = 1500;
let isPanning = false;
let panStartX = 0, panStartY = 0;
let panStartViewBoxX = 0, panStartViewBoxY = 0;
let panModeEnabled = false;

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    await loadData();
    initScheme();
    initGallery();
    initEventListeners();
    updateStats();
});

async function loadData() {
    try {
        const [animalsRes, objectsRes] = await Promise.all([
            fetch('/api/animals'),
            fetch('/api/objects')
        ]);
        allAnimals = await animalsRes.json();
        allObjects = await objectsRes.json();
        console.log('Loaded:', { allAnimals, allObjects });
    } catch (error) {
        console.error('Error loading data:', error);
        allAnimals = [];
        allObjects = [];
    }
}

function updateStats() {
    const activeAnimals = allAnimals.filter(a => a.status === 'active').length;
    const adoptedAnimals = allAnimals.filter(a => a.status === 'adopted').length;
    document.getElementById('statAnimals').innerText = activeAnimals;
    document.getElementById('statAdopted').innerText = adoptedAnimals;
    document.getElementById('statObjects').innerText = allObjects.length;
}

function initScheme() {
    svg = document.getElementById('shelterScheme');
    if (!svg) return;

    svg.setAttribute('viewBox', `${viewBoxX} ${viewBoxY} ${viewBoxWidth} ${viewBoxHeight}`);
    renderScheme();

    const container = document.getElementById('schemeContainer');

    // Zoom controls
    document.getElementById('zoomInBtn').addEventListener('click', () => zoom(0.8));
    document.getElementById('zoomOutBtn').addEventListener('click', () => zoom(1.25));
    document.getElementById('zoomFitBtn').addEventListener('click', zoomFit);

    // Pan mode toggle
    const panBtn = document.getElementById('panBtn');
    panBtn.addEventListener('click', () => {
        panModeEnabled = !panModeEnabled;
        if (panModeEnabled) {
            panBtn.classList.add('active');
            container.style.cursor = 'grab';
        } else {
            panBtn.classList.remove('active');
            container.style.cursor = 'default';
        }
    });

    // Pan functionality
    container.addEventListener('mousedown', (e) => {
        // Only pan if pan mode is enabled OR middle mouse button
        if (!panModeEnabled && e.button !== 1) return;

        e.preventDefault();
        isPanning = true;
        panStartX = e.clientX;
        panStartY = e.clientY;
        panStartViewBoxX = viewBoxX;
        panStartViewBoxY = viewBoxY;
        container.style.cursor = 'grabbing';
    });

    window.addEventListener('mousemove', (e) => {
        if (!isPanning) return;

        const dx = e.clientX - panStartX;
        const dy = e.clientY - panStartY;

        // Convert screen pixels to viewBox coordinates
        const scaleX = viewBoxWidth / container.clientWidth;
        const scaleY = viewBoxHeight / container.clientHeight;

        viewBoxX = panStartViewBoxX - dx * scaleX;
        viewBoxY = panStartViewBoxY - dy * scaleY;

        // Clamp viewBox to valid range
        viewBoxX = Math.max(-500, Math.min(2000 - viewBoxWidth + 500, viewBoxX));
        viewBoxY = Math.max(-500, Math.min(1500 - viewBoxHeight + 500, viewBoxY));

        svg.setAttribute('viewBox', `${viewBoxX} ${viewBoxY} ${viewBoxWidth} ${viewBoxHeight}`);
    });

    window.addEventListener('mouseup', () => {
        if (isPanning) {
            isPanning = false;
            container.style.cursor = panModeEnabled ? 'grab' : 'default';
        }
    });

    // Prevent pan interference with object dragging
    container.addEventListener('click', (e) => {
        if (isPanning) e.stopPropagation();
    });
}

function zoom(factor) {
    const container = document.getElementById('schemeContainer');
    const rect = svg.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();

    // Get mouse position relative to SVG
    const mouseX = (containerRect.width / 2);
    const mouseY = (containerRect.height / 2);

    const oldWidth = viewBoxWidth;
    const oldHeight = viewBoxHeight;

    const newWidth = viewBoxWidth * factor;
    const newHeight = viewBoxHeight * factor;

    if (newWidth < 500 || newWidth > 8000) return;

    // Calculate new viewBox position to zoom towards mouse
    const ratioX = mouseX / container.clientWidth;
    const ratioY = mouseY / container.clientHeight;

    viewBoxWidth = newWidth;
    viewBoxHeight = newHeight;

    viewBoxX = viewBoxX + (oldWidth - newWidth) * ratioX;
    viewBoxY = viewBoxY + (oldHeight - newHeight) * ratioY;

    // Clamp
    viewBoxX = Math.max(-500, Math.min(2000 - viewBoxWidth + 500, viewBoxX));
    viewBoxY = Math.max(-500, Math.min(1500 - viewBoxHeight + 500, viewBoxY));

    svg.setAttribute('viewBox', `${viewBoxX} ${viewBoxY} ${viewBoxWidth} ${viewBoxHeight}`);

    const zoomPercent = Math.round((2000 / viewBoxWidth) * 100);
    document.getElementById('zoomLevel').innerText = zoomPercent + '%';
}

function zoomFit() {
    const container = document.getElementById('schemeContainer');
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;

    const schemeWidth = 2000;
    const schemeHeight = 1500;

    const scaleX = containerWidth / schemeWidth;
    const scaleY = containerHeight / schemeHeight;
    const scale = Math.min(scaleX, scaleY) * 0.9;

    viewBoxWidth = schemeWidth;
    viewBoxHeight = schemeHeight;
    viewBoxX = 0;
    viewBoxY = 0;

    svg.setAttribute('viewBox', `${viewBoxX} ${viewBoxY} ${viewBoxWidth} ${viewBoxHeight}`);
    document.getElementById('zoomLevel').innerText = '100%';
}

function pan(dx, dy) {
    viewBoxX += dx;
    viewBoxY += dy;
    svg.setAttribute('viewBox', `${viewBoxX} ${viewBoxY} ${viewBoxWidth} ${viewBoxHeight}`);
}

function renderScheme() {
    if (!svg) return;
    svg.innerHTML = '';

    // Background
    const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bgRect.setAttribute('width', '100%');
    bgRect.setAttribute('height', '100%');
    bgRect.setAttribute('fill', '#e8e0d5');
    svg.appendChild(bgRect);

    // Grid (50px spacing)
    for (let i = 0; i <= 2000; i += 50) {
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', i);
        line.setAttribute('y1', 0);
        line.setAttribute('x2', i);
        line.setAttribute('y2', 1500);
        line.setAttribute('stroke', '#d4cbbc');
        line.setAttribute('stroke-width', '0.5');
        svg.appendChild(line);

        const lineH = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        lineH.setAttribute('x1', 0);
        lineH.setAttribute('y1', i);
        lineH.setAttribute('x2', 2000);
        lineH.setAttribute('y2', i);
        lineH.setAttribute('stroke', '#d4cbbc');
        lineH.setAttribute('stroke-width', '0.5');
        svg.appendChild(lineH);
    }

    // Objects
    allObjects.forEach(obj => {
        renderObject(obj);
    });
}

function renderObject(obj) {
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('data-id', obj.id);
    g.style.cursor = currentAdminMode ? 'move' : 'pointer';

    const animalsInObj = allAnimals.filter(a => obj.animalIds.includes(a.id));
    const capacityPercent = animalsInObj.length / obj.maxCapacity;

    // Main rectangle
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', obj.x);
    rect.setAttribute('y', obj.y);
    rect.setAttribute('width', obj.width);
    rect.setAttribute('height', obj.height);
    rect.setAttribute('fill', getObjectColor(obj.type, capacityPercent));
    rect.setAttribute('stroke', selectedObject === obj.id ? '#6750A4' : getObjectStroke(obj.type));
    rect.setAttribute('stroke-width', selectedObject === obj.id ? '3' : '2');
    rect.setAttribute('rx', '8');
    g.appendChild(rect);

    // Capacity indicator
    const capacityText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    capacityText.setAttribute('x', obj.x + obj.width - 30);
    capacityText.setAttribute('y', obj.y + 15);
    capacityText.setAttribute('font-size', '10');
    capacityText.setAttribute('fill', capacityPercent >= 1 ? '#c62828' : '#666');
    capacityText.textContent = `${animalsInObj.length}/${obj.maxCapacity}`;
    g.appendChild(capacityText);

    // Type icon
    const icon = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    icon.setAttribute('x', obj.x + 5);
    icon.setAttribute('y', obj.y + 25);
    icon.setAttribute('font-size', '20');
    icon.textContent = obj.type === 'booth' ? '🏠' : (obj.type === 'enclosure' ? '🏃' : '🔧');
    g.appendChild(icon);

    // Name text
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', obj.x + 30);
    text.setAttribute('y', obj.y + 25);
    text.setAttribute('font-size', '12');
    text.setAttribute('fill', '#333');
    text.setAttribute('font-weight', 'bold');
    text.textContent = obj.name;
    g.appendChild(text);

    // Show animals
    if (animalsInObj.length > 0 && obj.height > 60) {
        const startY = obj.y + 40;
        animalsInObj.slice(0, Math.floor((obj.height - 40) / 25)).forEach((animal, idx) => {
            const animalText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            animalText.setAttribute('x', obj.x + 10);
            animalText.setAttribute('y', startY + idx * 22);
            animalText.setAttribute('font-size', '10');
            animalText.setAttribute('fill', '#555');
            animalText.textContent = `🐕 ${animal.name}`;
            g.appendChild(animalText);
        });

        if (animalsInObj.length > Math.floor((obj.height - 40) / 25)) {
            const moreText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            moreText.setAttribute('x', obj.x + 10);
            moreText.setAttribute('y', startY + Math.floor((obj.height - 40) / 25) * 22);
            moreText.setAttribute('font-size', '10');
            moreText.setAttribute('fill', '#999');
            moreText.textContent = `+${animalsInObj.length - Math.floor((obj.height - 40) / 25)}`;
            g.appendChild(moreText);
        }
    }

    // Resize handles
    if (currentAdminMode && selectedObject === obj.id) {
        const handles = ['se', 'sw', 'ne', 'nw', 'e', 'w', 'n', 's'];
        handles.forEach(handle => {
            const handleX = handle.includes('e') ? obj.x + obj.width : (handle.includes('w') ? obj.x : obj.x + obj.width / 2);
            const handleY = handle.includes('s') ? obj.y + obj.height : (handle.includes('n') ? obj.y : obj.y + obj.height / 2);
            const handleRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            handleRect.setAttribute('x', handleX - 6);
            handleRect.setAttribute('y', handleY - 6);
            handleRect.setAttribute('width', '12');
            handleRect.setAttribute('height', '12');
            handleRect.setAttribute('fill', '#6750A4');
            handleRect.setAttribute('stroke', 'white');
            handleRect.setAttribute('stroke-width', '2');
            handleRect.setAttribute('rx', '3');
            handleRect.setAttribute('data-handle', handle);
            handleRect.style.cursor = getResizeCursor(handle);
            g.appendChild(handleRect);

            handleRect.addEventListener('mousedown', (e) => {
                e.stopPropagation();
                startResize(obj, handle, e);
            });
        });
    }

    // Events
    g.addEventListener('mouseenter', (e) => showTooltip(obj, e));
    g.addEventListener('mouseleave', hideTooltip);
    g.addEventListener('mousedown', (e) => {
        if (currentAdminMode && !isResizing) {
            e.stopPropagation();
            startDrag(obj, e);
        }
    });
    g.addEventListener('click', (e) => {
        e.stopPropagation();
        if (currentAdminMode) {
            selectObject(obj);
            showEditObjectModal(obj);
        } else {
            showObjectAnimals(obj);
        }
    });

    svg.appendChild(g);
}

function getObjectColor(type, capacityPercent) {
    const baseColors = {
        booth: '#c8e6c9',
        enclosure: '#bbdef5',
        utility: '#ffe0b2'
    };

    if (capacityPercent >= 1) {
        return '#ffcdd2'; // Full - red tint
    } else if (capacityPercent >= 0.7) {
        return '#fff3e0'; // Almost full - orange tint
    }
    return baseColors[type] || '#e0e0e0';
}

function getObjectStroke(type) {
    switch (type) {
        case 'booth': return '#4caf50';
        case 'enclosure': return '#2196f3';
        case 'utility': return '#ff9800';
        default: return '#999';
    }
}

function getResizeCursor(handle) {
    const cursors = {
        'n': 'ns-resize', 's': 'ns-resize',
        'e': 'ew-resize', 'w': 'ew-resize',
        'ne': 'nesw-resize', 'sw': 'nwse-resize',
        'nw': 'nwse-resize', 'se': 'nesw-resize'
    };
    return cursors[handle] || 'default';
}

function startDrag(obj, e) {
    if (!currentAdminMode) return;
    isDragging = true;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    selectedObject = obj;

    const onDragMove = (moveEvt) => {
        if (!isDragging) return;
        const scaleX = viewBoxWidth / svg.clientWidth;
        const scaleY = viewBoxHeight / svg.clientHeight;
        const dx = (moveEvt.clientX - dragStartX) * scaleX;
        const dy = (moveEvt.clientY - dragStartY) * scaleY;
        obj.x = Math.max(0, Math.min(2000 - obj.width, obj.x + dx));
        obj.y = Math.max(0, Math.min(1500 - obj.height, obj.y + dy));
        dragStartX = moveEvt.clientX;
        dragStartY = moveEvt.clientY;
        renderScheme();
    };

    const onDragEnd = () => {
        if (isDragging) {
            isDragging = false;
            updateObject(obj);
            document.removeEventListener('mousemove', onDragMove);
            document.removeEventListener('mouseup', onDragEnd);
        }
    };

    document.addEventListener('mousemove', onDragMove);
    document.addEventListener('mouseup', onDragEnd);
}

function startResize(obj, handle, e) {
    if (!currentAdminMode) return;
    isResizing = true;
    const scaleX = viewBoxWidth / svg.clientWidth;
    const scaleY = viewBoxHeight / svg.clientHeight;
    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = obj.width;
    const startHeight = obj.height;
    const startXpos = obj.x;
    const startYpos = obj.y;

    const onResizeMove = (moveEvt) => {
        if (!isResizing) return;
        const dx = (moveEvt.clientX - startX) * scaleX;
        const dy = (moveEvt.clientY - startY) * scaleY;

        if (handle.includes('e')) obj.width = Math.max(40, startWidth + dx);
        if (handle.includes('w')) {
            const newWidth = Math.max(40, startWidth - dx);
            obj.x = startXpos + (startWidth - newWidth);
            obj.width = newWidth;
        }
        if (handle.includes('s')) obj.height = Math.max(40, startHeight + dy);
        if (handle.includes('n')) {
            const newHeight = Math.max(40, startHeight - dy);
            obj.y = startYpos + (startHeight - newHeight);
            obj.height = newHeight;
        }

        renderScheme();
    };

    const onResizeEnd = () => {
        isResizing = false;
        updateObject(obj);
        document.removeEventListener('mousemove', onResizeMove);
        document.removeEventListener('mouseup', onResizeEnd);
    };

    document.addEventListener('mousemove', onResizeMove);
    document.addEventListener('mouseup', onResizeEnd);
    e.stopPropagation();
}

async function selectObject(obj) {
    selectedObject = obj.id;
    renderScheme();
}

async function updateObject(obj) {
    try {
        await fetch(`/api/objects/${obj.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(obj)
        });
        await loadData();
        renderScheme();
        updateStats();
    } catch (error) {
        console.error('Error updating object:', error);
    }
}

async function addObject(type, x, y) {
    const name = prompt('Название объекта:', type === 'booth' ? 'Будка' : (type === 'enclosure' ? 'Вольер' : 'Бытовка'));
    if (!name) return;

    const maxCapacity = type === 'booth' ? 1 : (type === 'enclosure' ? 5 : 10);

    const newObj = {
        id: Date.now().toString(),
        type: type,
        name: name,
        x: x - 40,
        y: y - 30,
        width: 80,
        height: 60,
        animalIds: [],
        maxCapacity: maxCapacity
    };

    try {
        const response = await fetch('/api/objects', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newObj)
        });

        if (response.ok) {
            await loadData();
            renderScheme();
            updateStats();
            alert(`Объект "${name}" добавлен!`);
        } else {
            alert('Ошибка при добавлении');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Ошибка при добавлении');
    }
}

function showObjectAnimals(obj) {
    const animals = allAnimals.filter(a => obj.animalIds.includes(a.id));

    if (animals.length === 0) {
        alert(`В "${obj.name}" нет собак`);
        return;
    }

    document.getElementById('objectAnimalsTitle').innerHTML = `🐕 Собаки в "${obj.name}" <span style="font-size: 14px;">(${animals.length}/${obj.maxCapacity})</span>`;

    const listHtml = animals.map(animal => `
        <div class="animal-card" style="margin-bottom: 15px; cursor: pointer;" onclick="showAnimalCard('${animal.id}'); closeObjectAnimalsModal();">
            <div style="display: flex; gap: 15px; align-items: center;">
                <img src="${animal.photoUrl || 'https://placedog.net/80/80'}" style="width: 80px; height: 80px; object-fit: cover; border-radius: 12px;">
                <div style="flex: 1;">
                    <h4 style="margin: 0 0 5px 0;">${animal.name}</h4>
                    <p style="margin: 0; font-size: 12px; color: #666;">${animal.breed} • ${animal.age} лет</p>
                    <p style="margin: 5px 0 0 0; font-size: 11px; color: #888;">${animal.description?.substring(0, 60) || ''}</p>
                </div>
                <span class="material-symbols-outlined" style="color: #6750A4;">chevron_right</span>
            </div>
        </div>
    `).join('');

    document.getElementById('objectAnimalsList').innerHTML = listHtml;
    document.getElementById('objectAnimalsModal').style.display = 'flex';
}

function closeObjectAnimalsModal() {
    document.getElementById('objectAnimalsModal').style.display = 'none';
}

function showEditObjectModal(obj) {
    currentEditingObject = obj;
    const animalsInObj = allAnimals.filter(a => obj.animalIds.includes(a.id));
    const availableAnimals = allAnimals.filter(a => a.status === 'active' && !obj.animalIds.includes(a.id));

    const content = `
        <div style="margin-bottom: 20px;">
            <label style="display: block; margin-bottom: 5px; font-weight: 500;">Название объекта</label>
            <input type="text" id="editObjectName" value="${obj.name}" class="form-input" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 8px;">
        </div>
        
        <div style="margin-bottom: 20px;">
            <label style="display: block; margin-bottom: 5px; font-weight: 500;">Тип объекта</label>
            <select id="editObjectType" class="form-input" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 8px;">
                <option value="booth" ${obj.type === 'booth' ? 'selected' : ''}>🏠 Будка (1 место)</option>
                <option value="enclosure" ${obj.type === 'enclosure' ? 'selected' : ''}>🏃 Вольер (5 мест)</option>
                <option value="utility" ${obj.type === 'utility' ? 'selected' : ''}>🔧 Бытовка (10 мест)</option>
            </select>
        </div>
        
        <div style="margin-bottom: 20px;">
            <label style="display: block; margin-bottom: 5px; font-weight: 500;">Максимум мест</label>
            <input type="number" id="editObjectCapacity" value="${obj.maxCapacity}" class="form-input" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 8px;">
        </div>
        
        <div style="margin-bottom: 20px;">
            <label style="display: block; margin-bottom: 5px; font-weight: 500;">Размеры</label>
            <div style="display: flex; gap: 10px;">
                <input type="number" id="editObjectWidth" value="${obj.width}" placeholder="Ширина" style="flex: 1; padding: 10px; border: 1px solid #ddd; border-radius: 8px;">
                <input type="number" id="editObjectHeight" value="${obj.height}" placeholder="Высота" style="flex: 1; padding: 10px; border: 1px solid #ddd; border-radius: 8px;">
            </div>
        </div>
        
        <div style="margin-bottom: 20px;">
            <label style="display: block; margin-bottom: 5px; font-weight: 500;">🐕 Собаки в объекте (${animalsInObj.length}/${obj.maxCapacity})</label>
            <div id="animalsInObjectList" style="max-height: 200px; overflow-y: auto; border: 1px solid #eee; border-radius: 8px; padding: 10px;">
                ${animalsInObj.map(animal => `
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px; border-bottom: 1px solid #eee;">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <img src="${animal.photoUrl || 'https://placedog.net/40/40'}" style="width: 40px; height: 40px; object-fit: cover; border-radius: 8px;">
                            <div>
                                <strong>${animal.name}</strong><br>
                                <small style="color: #666;">${animal.breed}, ${animal.age} лет</small>
                            </div>
                        </div>
                        <button class="btn-text" onclick="removeAnimalFromObject('${animal.id}')" style="color: #dc3545;">Удалить</button>
                    </div>
                `).join('')}
                ${animalsInObj.length === 0 ? '<p style="text-align: center; color: #999;">Нет собак</p>' : ''}
            </div>
        </div>
        
        ${availableAnimals.length > 0 && animalsInObj.length < obj.maxCapacity ? `
            <div style="margin-bottom: 20px;">
                <label style="display: block; margin-bottom: 5px; font-weight: 500;">Доступные собаки для добавления</label>
                <div style="max-height: 150px; overflow-y: auto; border: 1px solid #eee; border-radius: 8px; padding: 10px;">
                    ${availableAnimals.map(animal => `
                        <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px; border-bottom: 1px solid #eee;">
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <img src="${animal.photoUrl || 'https://placedog.net/40/40'}" style="width: 40px; height: 40px; object-fit: cover; border-radius: 8px;">
                                <div>
                                    <strong>${animal.name}</strong><br>
                                    <small style="color: #666;">${animal.breed}, ${animal.age} лет</small>
                                </div>
                            </div>
                            <button class="btn-text" onclick="addAnimalToObject('${animal.id}')" style="color: #4caf50;">Добавить</button>
                        </div>
                    `).join('')}
                </div>
            </div>
        ` : ''}
        
        <div style="display: flex; gap: 10px; margin-top: 15px;">
            <button onclick="saveObjectChanges()" class="btn-primary" style="flex: 1;">💾 Сохранить</button>
            <button onclick="deleteCurrentObject()" class="btn-outline" style="flex: 1; color: #dc3545;">🗑️ Удалить</button>
            <button onclick="closeEditObjectModal()" class="btn-secondary" style="flex: 1;">Отмена</button>
        </div>
    `;

    document.getElementById('editObjectContent').innerHTML = content;
    document.getElementById('editObjectModal').style.display = 'flex';
}

function closeEditObjectModal() {
    document.getElementById('editObjectModal').style.display = 'none';
    currentEditingObject = null;
}

async function saveObjectChanges() {
    if (!currentEditingObject) return;

    currentEditingObject.name = document.getElementById('editObjectName').value;
    currentEditingObject.type = document.getElementById('editObjectType').value;
    currentEditingObject.maxCapacity = parseInt(document.getElementById('editObjectCapacity').value);
    currentEditingObject.width = parseInt(document.getElementById('editObjectWidth').value);
    currentEditingObject.height = parseInt(document.getElementById('editObjectHeight').value);

    await updateObject(currentEditingObject);
    await loadData();
    renderScheme();
    updateStats();
    closeEditObjectModal();
    alert('Изменения сохранены!');
}

async function deleteCurrentObject() {
    if (!currentEditingObject) return;
    if (confirm(`Удалить объект "${currentEditingObject.name}"?`)) {
        await fetch(`/api/objects/${currentEditingObject.id}`, { method: 'DELETE' });
        await loadData();
        renderScheme();
        updateStats();
        closeEditObjectModal();
        alert('Объект удален');
    }
}

async function addAnimalToObject(animalId) {
    if (!currentEditingObject) return;

    const animal = allAnimals.find(a => a.id === animalId);
    if (!animal) return;

    if (currentEditingObject.animalIds.length >= currentEditingObject.maxCapacity) {
        alert('Нет свободных мест в этом объекте!');
        return;
    }

    // Record movement
    const reason = prompt('Причина перемещения:', 'Размещение в вольере');
    if (!reason) return;

    const fromObjectId = animal.currentObjectId || '';
    const fromObject = allObjects.find(o => o.id === fromObjectId);

    // Remove from old object
    if (fromObject) {
        fromObject.animalIds = fromObject.animalIds.filter(id => id !== animalId);
        await updateObject(fromObject);
    }

    // Add to new object
    currentEditingObject.animalIds.push(animalId);
    await updateObject(currentEditingObject);

    // Add movement record
    const movement = {
        toObjectId: currentEditingObject.id,
        reason: reason,
        changedBy: 'Администратор'
    };

    await fetch(`/api/animals/${animalId}/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(movement)
    });

    await loadData();
    renderScheme();
    updateStats();
    showEditObjectModal(currentEditingObject);
    alert(`Собака "${animal.name}" перемещена!`);
}

async function removeAnimalFromObject(animalId) {
    if (!currentEditingObject) return;

    const animal = allAnimals.find(a => a.id === animalId);
    if (!animal) return;

    const confirmMsg = confirm(`Удалить собаку "${animal.name}" из объекта "${currentEditingObject.name}"?`);
    if (!confirmMsg) return;

    currentEditingObject.animalIds = currentEditingObject.animalIds.filter(id => id !== animalId);
    await updateObject(currentEditingObject);

    // Clear current object from animal
    animal.currentObjectId = '';
    await fetch(`/api/animals/${animalId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(animal)
    });

    await loadData();
    renderScheme();
    updateStats();
    showEditObjectModal(currentEditingObject);
    alert(`Собака "${animal.name}" удалена из объекта!`);
}

function showTooltip(obj, event) {
    const animalsInObj = allAnimals.filter(a => obj.animalIds.includes(a.id));
    const tooltip = document.getElementById('objectTooltip');

    const capacityClass = animalsInObj.length >= obj.maxCapacity ? 'capacity-full' :
        (animalsInObj.length >= obj.maxCapacity * 0.7 ? 'capacity-warning' : '');

    if (animalsInObj.length === 0) {
        tooltip.style.display = 'block';
        tooltip.innerHTML = `<div style="padding: 12px; text-align: center; min-width: 150px;">
            <strong>${obj.name}</strong><br>
            <span class="capacity-indicator ${capacityClass}">${animalsInObj.length}/${obj.maxCapacity}</span><br>
            <em style="color: #999;">Нет собак</em>
        </div>`;
    } else if (animalsInObj.length === 1) {
        const animal = animalsInObj[0];
        tooltip.style.display = 'block';
        tooltip.innerHTML = `
            <div style="min-width: 200px; cursor: pointer;" onclick="showAnimalCard('${animal.id}'); hideTooltip();">
                <img src="${animal.photoUrl || 'https://placedog.net/200/150'}" style="width: 100%; height: 120px; object-fit: cover; border-radius: 12px; margin-bottom: 8px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <strong style="font-size: 14px;">${animal.name}</strong>
                    <span class="capacity-indicator ${capacityClass}">${animalsInObj.length}/${obj.maxCapacity}</span>
                </div>
                <p style="font-size: 11px; color: #666; margin-top: 4px;">${animal.breed} • ${animal.age} лет</p>
                <p style="font-size: 11px; margin-top: 4px;">${animal.description?.substring(0, 60) || ''}</p>
            </div>
        `;
    } else {
        const animalsHtml = animalsInObj.slice(0, 3).map(animal => `
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px; cursor: pointer;" onclick="showAnimalCard('${animal.id}'); hideTooltip();">
                <img src="${animal.photoUrl || 'https://placedog.net/40/40'}" style="width: 40px; height: 40px; object-fit: cover; border-radius: 8px;">
                <div>
                    <strong style="font-size: 12px;">${animal.name}</strong>
                    <span style="font-size: 10px; color: #666;">${animal.age} лет</span>
                </div>
            </div>
        `).join('');

        const moreCount = animalsInObj.length - 3;
        tooltip.style.display = 'block';
        tooltip.innerHTML = `
            <div style="min-width: 220px;">
                <div style="display: flex; justify-content: space-between; align-items: center; background: #f5f5f5; padding: 8px; border-radius: 8px; margin-bottom: 8px;">
                    <strong>${obj.name}</strong>
                    <span class="capacity-indicator ${capacityClass}">${animalsInObj.length}/${obj.maxCapacity}</span>
                </div>
                ${animalsHtml}
                ${moreCount > 0 ? `<div style="text-align: center; font-size: 11px; color: #999; padding-top: 5px;">и ещё ${moreCount}...</div>` : ''}
            </div>
        `;
    }

    const scaleX = viewBoxWidth / svg.clientWidth;
    const scaleY = viewBoxHeight / svg.clientHeight;
    tooltip.style.left = (event.clientX + 15) + 'px';
    tooltip.style.top = (event.clientY - 10) + 'px';
}

function hideTooltip() {
    const tooltip = document.getElementById('objectTooltip');
    if (tooltip) tooltip.style.display = 'none';
}

async function showAnimalCard(id) {
    const animal = allAnimals.find(a => a.id === id);
    if (!animal) return;

    const currentObject = allObjects.find(o => o.id === animal.currentObjectId);
    const statusLabels = {
        'active': 'В приюте',
        'adopted': 'Нашла дом',
        'deceased': 'Умерла',
        'transferred': 'Передана'
    };

    const content = `
        <div style="display: flex; gap: 20px; flex-wrap: wrap;">
            <div style="flex: 1; min-width: 200px;">
                <img src="${animal.photoUrl || 'https://placedog.net/300/300'}" style="width: 100%; border-radius: 16px;">
                <div style="margin-top: 10px; text-align: center;">
                    <span class="status-badge status-${animal.status}">${statusLabels[animal.status] || animal.status}</span>
                </div>
            </div>
            <div style="flex: 2;">
                <h2 style="margin: 0 0 10px 0;">${animal.name}</h2>
                <p><strong>Порода:</strong> ${animal.breed || 'Неизвестна'}</p>
                <p><strong>Возраст:</strong> ${animal.age} лет</p>
                <p><strong>Пол:</strong> ${animal.gender === 'male' ? 'Мальчик' : 'Девочка'}</p>
                <p><strong>Описание:</strong> ${animal.description || 'Нет описания'}</p>
                <p><strong>Дата поступления:</strong> ${new Date(animal.arrivalDate).toLocaleDateString()}</p>
                ${animal.departureDate ? `<p><strong>Дата выбытия:</strong> ${new Date(animal.departureDate).toLocaleDateString()}</p>` : ''}
                ${animal.departureReason ? `<p><strong>Причина выбытия:</strong> ${animal.departureReason}</p>` : ''}
                <p><strong>Текущее местоположение:</strong> ${currentObject ? currentObject.name : 'Не размещена'}</p>
                
                <div style="margin-top: 20px;">
                    <button onclick="showMedicalHistory('${animal.id}')" class="btn-outline" style="margin-right: 10px;">📋 Медицинская история</button>
                    <button onclick="showMovementHistory('${animal.id}')" class="btn-outline">📍 История перемещений</button>
                    ${currentAdminMode && animal.status === 'active' ? `
                        <button onclick="changeAnimalStatus('${animal.id}')" class="btn-outline" style="margin-left: 10px;">✏️ Изменить статус</button>
                        <button onclick="addMedicalRecord('${animal.id}')" class="btn-outline">💉 Добавить запись</button>
                    ` : ''}
                </div>
            </div>
        </div>
    `;

    document.getElementById('modalTitle').innerHTML = `🐕 Карточка собаки`;
    document.getElementById('animalModalContent').innerHTML = content;
    document.getElementById('animalModal').style.display = 'flex';
}

async function showMedicalHistory(animalId) {
    const animal = allAnimals.find(a => a.id === animalId);
    if (!animal) return;

    const historyHtml = animal.medicalHistory && animal.medicalHistory.length > 0 ?
        animal.medicalHistory.map(record => `
            <div class="timeline-item">
                <div class="timeline-date">${new Date(record.date).toLocaleDateString()}</div>
                <div class="timeline-title">${getMedicalTypeLabel(record.type)}</div>
                <div class="timeline-desc">${record.description}</div>
                ${record.vetName ? `<div class="timeline-desc">Ветеринар: ${record.vetName}</div>` : ''}
                ${record.nextDate ? `<div class="timeline-desc">Следующая: ${new Date(record.nextDate).toLocaleDateString()}</div>` : ''}
            </div>
        `).join('') :
        '<p>Нет медицинских записей</p>';

    document.getElementById('historyTitle').innerHTML = `📋 Медицинская история: ${animal.name}`;
    document.getElementById('historyContent').innerHTML = `<div class="timeline">${historyHtml}</div>`;
    document.getElementById('historyModal').style.display = 'flex';
}

async function showMovementHistory(animalId) {
    const animal = allAnimals.find(a => a.id === animalId);
    if (!animal) return;

    const historyHtml = animal.movementHistory && animal.movementHistory.length > 0 ?
        animal.movementHistory.map(move => `
            <div class="timeline-item">
                <div class="timeline-date">${new Date(move.date).toLocaleDateString()}</div>
                <div class="timeline-title">Перемещение</div>
                <div class="timeline-desc">Из: ${move.fromObjectName || 'Нет'}</div>
                <div class="timeline-desc">В: ${move.toObjectName}</div>
                <div class="timeline-desc">Причина: ${move.reason}</div>
                <div class="timeline-desc">Кто: ${move.changedBy}</div>
            </div>
        `).join('') :
        '<p>Нет истории перемещений</p>';

    document.getElementById('historyTitle').innerHTML = `📍 История перемещений: ${animal.name}`;
    document.getElementById('historyContent').innerHTML = `<div class="timeline">${historyHtml}</div>`;
    document.getElementById('historyModal').style.display = 'flex';
}

function getMedicalTypeLabel(type) {
    const labels = {
        'vaccination': '💉 Вакцинация',
        'sterilization': '✂️ Стерилизация',
        'treatment': '💊 Лечение',
        'checkup': '🏥 Осмотр'
    };
    return labels[type] || type;
}

async function changeAnimalStatus(animalId) {
    const status = prompt('Новый статус (active/adopted/deceased/transferred):', 'active');
    if (!status) return;

    const reason = prompt('Причина изменения статуса:', '');

    await fetch(`/api/animals/${animalId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: status, reason: reason })
    });

    await loadData();
    updateStats();
    showAnimalCard(animalId);
}

async function addMedicalRecord(animalId) {
    const type = prompt('Тип записи (vaccination/sterilization/treatment/checkup):', 'vaccination');
    if (!type) return;

    const description = prompt('Описание:', '');
    if (!description) return;

    const vetName = prompt('Имя ветеринара:', '');

    await fetch(`/api/animals/${animalId}/medical`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: type, description: description, vetName: vetName })
    });

    await loadData();
    showAnimalCard(animalId);
}

function closeHistoryModal() {
    document.getElementById('historyModal').style.display = 'none';
}

async function initGallery() {
    await renderGallery(allAnimals);
}

async function renderGallery(animals) {
    const grid = document.getElementById('galleryGrid');
    if (!grid) return;

    const filtered = animals.filter(a => a.status === 'active');

    if (filtered.length === 0) {
        grid.innerHTML = '<div style="text-align:center; padding:40px;">Пока нет собак в приюте</div>';
        return;
    }

    grid.innerHTML = filtered.map(animal => {
        const parentObject = allObjects.find(obj => obj.id === animal.currentObjectId);
        const locationText = parentObject ? `📍 ${parentObject.name}` : '📍 Не размещена';

        return `
        <div class="animal-card" onclick="showAnimalCard('${animal.id}')">
            <img src="${animal.photoUrl || 'https://placedog.net/400/300'}" alt="${animal.name}">
            <div class="animal-card-content">
                <h3>${animal.name}</h3>
                <div class="breed">${animal.breed || 'Неизвестная порода'}</div>
                <div class="age">${animal.age} лет • ${animal.gender === 'male' ? 'Мальчик' : 'Девочка'}</div>
                <div class="location" style="font-size: 11px; color: #6750A4; margin-top: 5px;">${locationText}</div>
            </div>
        </div>
    `}).join('');
}

function initEventListeners() {
    // Admin mode
    document.getElementById('adminModeBtn').addEventListener('click', () => {
        currentAdminMode = !currentAdminMode;
        document.getElementById('adminPanel').style.display = currentAdminMode ? 'block' : 'none';
        if (!currentAdminMode) selectedObject = null;
        renderScheme();
        alert(currentAdminMode ?
            '🔧 Режим администратора\n\n- Клик на объект для редактирования\n- Перетаскивайте объекты\n- Изменяйте размер за синие квадратики' :
            '👁️ Режим просмотра\n- Наводите на объекты для просмотра фото собак\n- Клик для списка собак');
    });

    // Add object buttons
    document.getElementById('addBoothBtn').addEventListener('click', () => {
        if (!currentAdminMode) { alert('Включите режим администратора'); return; }
        pendingAddType = 'booth';
        alert('Кликните на схеме, чтобы добавить будку');

        const clickHandler = (e) => {
            if (pendingAddType) {
                const rect = svg.getBoundingClientRect();
                const containerRect = document.getElementById('schemeContainer').getBoundingClientRect();

                // Get click position relative to SVG
                const clickX = e.clientX - rect.left;
                const clickY = e.clientY - rect.top;

                // Convert to viewBox coordinates
                const x = viewBoxX + (clickX / rect.width) * viewBoxWidth;
                const y = viewBoxY + (clickY / rect.height) * viewBoxHeight;

                addObject(pendingAddType, x, y);
                pendingAddType = null;
                svg.removeEventListener('click', clickHandler);
            }
        };

        svg.addEventListener('click', clickHandler);
        setTimeout(() => {
            if (pendingAddType) {
                pendingAddType = null;
                svg.removeEventListener('click', clickHandler);
                alert('Добавление отменено');
            }
        }, 30000);
    });

    document.getElementById('addEnclosureBtn').addEventListener('click', () => {
        if (!currentAdminMode) { alert('Включите режим администратора'); return; }
        pendingAddType = 'enclosure';
        alert('Кликните на схеме, чтобы добавить вольер');
        const clickHandler = (e) => {
            if (pendingAddType && (e.target === svg || e.target === svg.querySelector('rect'))) {
                const rect = svg.getBoundingClientRect();
                const scaleX = viewBoxWidth / rect.width;
                const scaleY = viewBoxHeight / rect.height;
                const x = (e.clientX - rect.left) * scaleX;
                const y = (e.clientY - rect.top) * scaleY;
                addObject(pendingAddType, x, y);
                pendingAddType = null;
                svg.removeEventListener('click', clickHandler);
            }
        };
        svg.addEventListener('click', clickHandler);
        setTimeout(() => {
            if (pendingAddType) {
                pendingAddType = null;
                svg.removeEventListener('click', clickHandler);
            }
        }, 30000);
    });

    document.getElementById('addUtilityBtn').addEventListener('click', () => {
        if (!currentAdminMode) { alert('Включите режим администратора'); return; }
        pendingAddType = 'utility';
        alert('Кликните на схеме, чтобы добавить бытовку');
        const clickHandler = (e) => {
            if (pendingAddType && (e.target === svg || e.target === svg.querySelector('rect'))) {
                const rect = svg.getBoundingClientRect();
                const scaleX = viewBoxWidth / rect.width;
                const scaleY = viewBoxHeight / rect.height;
                const x = (e.clientX - rect.left) * scaleX;
                const y = (e.clientY - rect.top) * scaleY;
                addObject(pendingAddType, x, y);
                pendingAddType = null;
                svg.removeEventListener('click', clickHandler);
            }
        };
        svg.addEventListener('click', clickHandler);
        setTimeout(() => {
            if (pendingAddType) {
                pendingAddType = null;
                svg.removeEventListener('click', clickHandler);
            }
        }, 30000);
    });

    document.getElementById('clearSchemeBtn').addEventListener('click', async () => {
        if (!currentAdminMode) { alert('Включите режим администратора'); return; }
        if (confirm('Очистить схему? Собаки останутся.')) {
            for (const obj of allObjects) {
                await fetch(`/api/objects/${obj.id}`, { method: 'DELETE' });
            }
            await loadData();
            renderScheme();
            updateStats();
        }
    });

    document.getElementById('saveSchemeBtn').addEventListener('click', () => {
        alert('Схема сохранена!');
    });

    // Create new animal button
    const createAnimalBtn = document.createElement('button');
    createAnimalBtn.textContent = '+ Новая собака';
    createAnimalBtn.className = 'btn-outline';
    createAnimalBtn.addEventListener('click', async () => {
        const name = prompt('Имя собаки:');
        if (!name) return;

        const newAnimal = {
            name: name,
            breed: prompt('Порода:', 'Беспородная'),
            age: parseInt(prompt('Возраст:', '1')),
            gender: prompt('Пол (male/female):', 'male'),
            description: prompt('Описание:', ''),
            photoUrl: prompt('URL фото:', 'https://placedog.net/400/300'),
            status: 'active',
            medicalHistory: [],
            movementHistory: [],
            currentObjectId: ''
        };

        await fetch('/api/animals', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newAnimal)
        });

        await loadData();
        renderGallery(allAnimals);
        updateStats();
        alert(`Собака "${name}" создана! Теперь привяжите её к объекту.`);
    });
    document.querySelector('.admin-controls').appendChild(createAnimalBtn);

    // Modal closes
    document.querySelectorAll('.modal-close').forEach(closeBtn => {
        closeBtn.addEventListener('click', () => {
            document.getElementById('animalModal').style.display = 'none';
            document.getElementById('objectAnimalsModal').style.display = 'none';
            document.getElementById('editObjectModal').style.display = 'none';
            document.getElementById('historyModal').style.display = 'none';
        });
    });

    // Filters
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

    // Navigation
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const target = link.getAttribute('href');
            document.querySelector(target).scrollIntoView({ behavior: 'smooth' });
            document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
            link.classList.add('active');
        });
    });

    // Mobile menu
    document.getElementById('mobileMenuBtn').addEventListener('click', () => {
        document.querySelector('.nav-links').classList.toggle('active');
    });

    // Close modals on outside click
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
        }
    });

    // Tooltip element
    const tooltipDiv = document.createElement('div');
    tooltipDiv.id = 'objectTooltip';
    tooltipDiv.className = 'object-tooltip';
    tooltipDiv.style.cssText = 'position: fixed; background: white; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); padding: 12px; z-index: 2000; display: none; max-width: 280px;';
    document.body.appendChild(tooltipDiv);
}