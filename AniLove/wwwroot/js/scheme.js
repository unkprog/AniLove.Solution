let svg = null;
let allAnimals = [];
let allObjects = [];
let currentZoom = 1;
let viewBoxX = 0, viewBoxY = 0, viewBoxWidth = 2000, viewBoxHeight = 1500;
let isPanning = false;
let panStartX = 0, panStartY = 0;
let panStartViewBoxX = 0, panStartViewBoxY = 0;
let panModeEnabled = false;
let tooltipTimeout = null;

async function loadSchemeData() {
    allAnimals = await API.getAnimals();
    allObjects = await API.getObjects();
    renderScheme();
}

function renderScheme() {
    if (!svg) return;
    svg.innerHTML = '';
    // Фон
    const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bgRect.setAttribute('width', '100%');
    bgRect.setAttribute('height', '100%');
    bgRect.setAttribute('fill', '#e8e0d5');
    svg.appendChild(bgRect);
    // Сетка
    for (let i = 0; i <= 2000; i += 50) {
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', i); line.setAttribute('y1', 0);
        line.setAttribute('x2', i); line.setAttribute('y2', 1500);
        line.setAttribute('stroke', '#d4cbbc'); line.setAttribute('stroke-width', '0.5');
        svg.appendChild(line);
        const lineH = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        lineH.setAttribute('x1', 0); lineH.setAttribute('y1', i);
        lineH.setAttribute('x2', 2000); lineH.setAttribute('y2', i);
        lineH.setAttribute('stroke', '#d4cbbc'); lineH.setAttribute('stroke-width', '0.5');
        svg.appendChild(lineH);
    }
    // Объекты
    allObjects.forEach(obj => renderObject(obj));
}

function renderObject(obj) {
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('data-id', obj.id);
    g.style.cursor = 'pointer';
    const animalsInObj = allAnimals.filter(a => obj.animalIds.includes(a.id));
    const capacityPercent = animalsInObj.length / obj.maxCapacity;
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', obj.x); rect.setAttribute('y', obj.y);
    rect.setAttribute('width', obj.width); rect.setAttribute('height', obj.height);
    let fill = '#e0e0e0';
    if (obj.type === 'booth') fill = '#c8e6c9';
    else if (obj.type === 'enclosure') fill = '#bbdef5';
    else if (obj.type === 'utility') fill = '#ffe0b2';
    if (capacityPercent >= 1) fill = '#ffcdd2';
    else if (capacityPercent >= 0.7) fill = '#fff3e0';
    rect.setAttribute('fill', fill);
    rect.setAttribute('stroke', '#999'); rect.setAttribute('stroke-width', '2');
    rect.setAttribute('rx', '8');
    g.appendChild(rect);
    // Название
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', obj.x + 10); text.setAttribute('y', obj.y + 25);
    text.setAttribute('font-size', '12'); text.setAttribute('font-weight', 'bold');
    text.textContent = obj.name;
    g.appendChild(text);
    // Количество
    const countText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    countText.setAttribute('x', obj.x + obj.width - 30); countText.setAttribute('y', obj.y + 15);
    countText.setAttribute('font-size', '10');
    countText.textContent = `${animalsInObj.length}/${obj.maxCapacity}`;
    g.appendChild(countText);
    g.addEventListener('mouseenter', (e) => showTooltip(obj, e));
    g.addEventListener('mouseleave', hideTooltip);
    g.addEventListener('click', (e) => { e.stopPropagation(); showObjectAnimals(obj); });
    svg.appendChild(g);
}

function showTooltip(obj, event) {
    const animalsInObj = allAnimals.filter(a => obj.animalIds.includes(a.id));
    const tooltip = document.getElementById('objectTooltip');
    if (!tooltip) return;
    if (animalsInObj.length === 0) {
        tooltip.innerHTML = `<strong>${obj.name}</strong><br>Нет собак`;
    } else if (animalsInObj.length === 1) {
        const animal = animalsInObj[0];
        tooltip.innerHTML = `
            <img src="${animal.photoUrl}" style="width:100%; height:100px; object-fit:cover; border-radius:12px; margin-bottom:8px;">
            <strong>${animal.name}</strong><br>
            ${animal.breed}, ${animal.age} лет
        `;
    } else {
        const list = animalsInObj.slice(0, 3).map(a => `🐕 ${a.name}`).join('<br>');
        tooltip.innerHTML = `<strong>${obj.name}</strong><br>${list}${animalsInObj.length > 3 ? `<br>+ ещё ${animalsInObj.length - 3}` : ''}`;
    }
    tooltip.style.left = (event.clientX + 15) + 'px';
    tooltip.style.top = (event.clientY - 10) + 'px';
    tooltip.style.display = 'block';
}

function hideTooltip() {
    const tooltip = document.getElementById('objectTooltip');
    if (tooltip) tooltip.style.display = 'none';
}

function showObjectAnimals(obj) {
    const animals = allAnimals.filter(a => obj.animalIds.includes(a.id));
    if (animals.length === 0) {
        alert(`В "${obj.name}" нет собак`);
        return;
    }
    const modalContent = animals.map(animal => `
        <div class="animal-card" style="margin-bottom:15px; cursor:pointer;" onclick="showAnimalCard('${animal.id}')">
            <div style="display:flex; gap:15px;">
                <img src="${animal.photoUrl}" style="width:80px; height:80px; object-fit:cover; border-radius:12px;">
                <div><strong>${animal.name}</strong><br>${animal.breed}, ${animal.age} лет</div>
            </div>
        </div>
    `).join('');
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'flex';
    modal.innerHTML = `<div class="modal-content"><span class="modal-close">&times;</span><h3>Собаки в "${obj.name}"</h3><div>${modalContent}</div></div>`;
    document.body.appendChild(modal);
    modal.querySelector('.modal-close').onclick = () => modal.remove();
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
}

window.showAnimalCard = async (id) => {
    const animal = allAnimals.find(a => a.id === id);
    if (!animal) return;
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'flex';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="modal-close">&times;</span>
            <h3>${animal.name}</h3>
            <img src="${animal.photoUrl}" style="width:100%; max-height:200px; object-fit:cover; border-radius:16px; margin:10px 0;">
            <p><strong>Порода:</strong> ${animal.breed}</p>
            <p><strong>Возраст:</strong> ${animal.age} лет</p>
            <p><strong>Пол:</strong> ${animal.gender === 'male' ? 'Мальчик' : 'Девочка'}</p>
            <p><strong>Описание:</strong> ${animal.description || 'Нет описания'}</p>
            <p><strong>Статус:</strong> ${getStatusLabel(animal.status)}</p>
        </div>
    `;
    document.body.appendChild(modal);
    modal.querySelector('.modal-close').onclick = () => modal.remove();
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
};

function initSchemePanZoom() {
    const container = document.getElementById('schemeContainer');
    svg = document.getElementById('shelterScheme');
    if (!svg) return;
    svg.setAttribute('viewBox', `${viewBoxX} ${viewBoxY} ${viewBoxWidth} ${viewBoxHeight}`);
    document.getElementById('zoomInBtn').addEventListener('click', () => zoom(0.8));
    document.getElementById('zoomOutBtn').addEventListener('click', () => zoom(1.25));
    document.getElementById('zoomFitBtn').addEventListener('click', zoomFit);
    const panBtn = document.getElementById('panBtn');
    panBtn.addEventListener('click', () => {
        panModeEnabled = !panModeEnabled;
        panBtn.classList.toggle('active', panModeEnabled);
        container.style.cursor = panModeEnabled ? 'grab' : 'default';
    });
    container.addEventListener('mousedown', (e) => {
        if ((!panModeEnabled && e.button !== 1)) return;
        e.preventDefault();
        isPanning = true;
        panStartX = e.clientX; panStartY = e.clientY;
        panStartViewBoxX = viewBoxX; panStartViewBoxY = viewBoxY;
        container.style.cursor = 'grabbing';
    });
    window.addEventListener('mousemove', (e) => {
        if (!isPanning) return;
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
    window.addEventListener('mouseup', () => {
        if (isPanning) {
            isPanning = false;
            container.style.cursor = panModeEnabled ? 'grab' : 'default';
        }
    });
}

function zoom(factor) {
    const container = document.getElementById('schemeContainer');
    const oldWidth = viewBoxWidth, oldHeight = viewBoxHeight;
    let newWidth = viewBoxWidth * factor;
    let newHeight = viewBoxHeight * factor;
    if (newWidth < 500 || newWidth > 8000) return;
    const ratioX = 0.5, ratioY = 0.5;
    viewBoxWidth = newWidth; viewBoxHeight = newHeight;
    viewBoxX = viewBoxX + (oldWidth - newWidth) * ratioX;
    viewBoxY = viewBoxY + (oldHeight - newHeight) * ratioY;
    viewBoxX = Math.max(-500, Math.min(2000 - viewBoxWidth + 500, viewBoxX));
    viewBoxY = Math.max(-500, Math.min(1500 - viewBoxHeight + 500, viewBoxY));
    svg.setAttribute('viewBox', `${viewBoxX} ${viewBoxY} ${viewBoxWidth} ${viewBoxHeight}`);
    document.getElementById('zoomLevel').innerText = Math.round((2000 / viewBoxWidth) * 100) + '%';
}

function zoomFit() {
    const container = document.getElementById('schemeContainer');
    const scaleX = container.clientWidth / 2000;
    const scaleY = container.clientHeight / 1500;
    const scale = Math.min(scaleX, scaleY) * 0.9;
    viewBoxWidth = 2000; viewBoxHeight = 1500;
    viewBoxX = 0; viewBoxY = 0;
    svg.setAttribute('viewBox', `${viewBoxX} ${viewBoxY} ${viewBoxWidth} ${viewBoxHeight}`);
    document.getElementById('zoomLevel').innerText = '100%';
}

document.addEventListener('DOMContentLoaded', async () => {
    await loadSchemeData();
    initSchemePanZoom();
});