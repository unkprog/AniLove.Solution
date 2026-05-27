let svg, allAnimals = [], allObjects = [];
let viewBoxX = 0, viewBoxY = 0, viewBoxWidth = 2000, viewBoxHeight = 1500;
let isPanning = false, panModeEnabled = false;
let panStartX, panStartY, panStartViewBoxX, panStartViewBoxY;

async function loadSchemeData() {
    allAnimals = await API.getAnimals();
    allObjects = await API.getObjects();
    renderScheme();
}

function renderScheme() {
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
    allObjects.forEach(obj => renderObject(obj));
}

function renderObject(obj) {
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('data-id', obj.id);
    const animalsInObj = allAnimals.filter(a => obj.animalIds?.includes(a.id));
    const percent = animalsInObj.length / obj.maxCapacity;
    let fill = '#e0e0e0';
    if (obj.type === 'booth') fill = '#c8e6c9';
    else if (obj.type === 'enclosure') fill = '#bbdef5';
    else if (obj.type === 'utility') fill = '#ffe0b2';
    if (percent >= 1) fill = '#ffcdd2';
    else if (percent >= 0.7) fill = '#fff3e0';
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', obj.x); rect.setAttribute('y', obj.y);
    rect.setAttribute('width', obj.width); rect.setAttribute('height', obj.height);
    rect.setAttribute('fill', fill); rect.setAttribute('stroke', '#999'); rect.setAttribute('stroke-width', '2');
    rect.setAttribute('rx', '8');
    g.appendChild(rect);
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', obj.x + 10); text.setAttribute('y', obj.y + 25);
    text.textContent = obj.name;
    g.appendChild(text);
    const countText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    countText.setAttribute('x', obj.x + obj.width - 30); countText.setAttribute('y', obj.y + 15);
    countText.textContent = `${animalsInObj.length}/${obj.maxCapacity}`;
    g.appendChild(countText);
    g.addEventListener('mouseenter', (e) => showTooltip(obj, e));
    g.addEventListener('mouseleave', () => document.getElementById('objectTooltip').style.display = 'none');
    g.addEventListener('click', () => showObjectAnimals(obj));
    svg.appendChild(g);
}

function showTooltip(obj, event) {
    const animals = allAnimals.filter(a => obj.animalIds?.includes(a.id));
    const tooltip = document.getElementById('objectTooltip');
    if (!animals.length) tooltip.innerHTML = `<strong>${obj.name}</strong><br>Нет собак`;
    else if (animals.length === 1) {
        const a = animals[0];
        tooltip.innerHTML = `<img src="${a.photoUrl}" style="width:100%; height:100px; object-fit:cover; border-radius:12px;"><strong>${a.name}</strong><br>${a.breed}, ${a.age} лет`;
    } else {
        tooltip.innerHTML = `<strong>${obj.name}</strong><br>${animals.slice(0, 3).map(a => `🐕 ${a.name}`).join('<br>')}${animals.length > 3 ? `<br>+ ещё ${animals.length - 3}` : ''}`;
    }
    tooltip.style.left = (event.clientX + 15) + 'px';
    tooltip.style.top = (event.clientY - 10) + 'px';
    tooltip.style.display = 'block';
}

function showObjectAnimals(obj) {
    const animals = allAnimals.filter(a => obj.animalIds?.includes(a.id));
    if (!animals.length) return alert(`В "${obj.name}" нет собак`);
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'flex';
    modal.innerHTML = `<div class="modal-content"><span class="modal-close">&times;</span><h3>Собаки в "${obj.name}"</h3>${animals.map(a => `<div class="animal-card" style="margin-bottom:15px; cursor:pointer;" onclick="showAnimalCard('${a.id}')"><div style="display:flex; gap:15px;"><img src="${a.photoUrl}" style="width:80px; height:80px; object-fit:cover; border-radius:12px;"><div><strong>${a.name}</strong><br>${a.breed}, ${a.age} лет</div></div></div>`).join('')}</div>`;
    document.body.appendChild(modal);
    modal.querySelector('.modal-close').onclick = () => modal.remove();
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
}

window.showAnimalCard = async (id) => {
    const a = allAnimals.find(a => a.id === id);
    if (!a) return;
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'flex';
    modal.innerHTML = `<div class="modal-content"><span class="modal-close">&times;</span><h3>${a.name}</h3><img src="${a.photoUrl}" style="width:100%; max-height:200px; object-fit:cover; border-radius:16px;"><p><strong>Порода:</strong> ${a.breed}</p><p><strong>Возраст:</strong> ${a.age} лет</p><p><strong>Пол:</strong> ${a.gender === 'male' ? 'Мальчик' : 'Девочка'}</p><p><strong>Описание:</strong> ${a.description || 'Нет'}</p><p><strong>Статус:</strong> ${getStatusLabel(a.status)}</p></div>`;
    document.body.appendChild(modal);
    modal.querySelector('.modal-close').onclick = () => modal.remove();
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
};

function initPanZoom() {
    const container = document.getElementById('schemeContainer');
    svg = document.getElementById('shelterScheme');
    svg.setAttribute('viewBox', `${viewBoxX} ${viewBoxY} ${viewBoxWidth} ${viewBoxHeight}`);
    document.getElementById('zoomInBtn').onclick = () => zoom(0.8);
    document.getElementById('zoomOutBtn').onclick = () => zoom(1.25);
    document.getElementById('zoomFitBtn').onclick = () => { viewBoxWidth = 2000; viewBoxHeight = 1500; viewBoxX = 0; viewBoxY = 0; svg.setAttribute('viewBox', `${viewBoxX} ${viewBoxY} ${viewBoxWidth} ${viewBoxHeight}`); document.getElementById('zoomLevel').innerText = '100%'; };
    const panBtn = document.getElementById('panBtn');
    panBtn.onclick = () => { panModeEnabled = !panModeEnabled; panBtn.classList.toggle('active', panModeEnabled); container.style.cursor = panModeEnabled ? 'grab' : 'default'; };
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
        const dx = e.clientX - panStartX, dy = e.clientY - panStartY;
        const scaleX = viewBoxWidth / container.clientWidth;
        const scaleY = viewBoxHeight / container.clientHeight;
        viewBoxX = panStartViewBoxX - dx * scaleX;
        viewBoxY = panStartViewBoxY - dy * scaleY;
        viewBoxX = Math.max(-500, Math.min(2000 - viewBoxWidth + 500, viewBoxX));
        viewBoxY = Math.max(-500, Math.min(1500 - viewBoxHeight + 500, viewBoxY));
        svg.setAttribute('viewBox', `${viewBoxX} ${viewBoxY} ${viewBoxWidth} ${viewBoxHeight}`);
    });
    window.addEventListener('mouseup', () => { if (isPanning) { isPanning = false; container.style.cursor = panModeEnabled ? 'grab' : 'default'; } });
}

function zoom(factor) {
    const container = document.getElementById('schemeContainer');
    const oldW = viewBoxWidth, oldH = viewBoxHeight;
    let newW = viewBoxWidth * factor, newH = viewBoxHeight * factor;
    if (newW < 500 || newW > 8000) return;
    viewBoxWidth = newW; viewBoxHeight = newH;
    viewBoxX += (oldW - newW) * 0.5;
    viewBoxY += (oldH - newH) * 0.5;
    viewBoxX = Math.max(-500, Math.min(2000 - viewBoxWidth + 500, viewBoxX));
    viewBoxY = Math.max(-500, Math.min(1500 - viewBoxHeight + 500, viewBoxY));
    svg.setAttribute('viewBox', `${viewBoxX} ${viewBoxY} ${viewBoxWidth} ${viewBoxHeight}`);
    document.getElementById('zoomLevel').innerText = Math.round((2000 / viewBoxWidth) * 100) + '%';
}

document.addEventListener('DOMContentLoaded', async () => {
    await loadSchemeData();
    initPanZoom();
});