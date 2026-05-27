async function loadStats() {
    try {
        const animals = await API.getAnimals();
        const objects = await API.getObjects();
        const active = animals.filter(a => a.status === 'active').length;
        const adopted = animals.filter(a => a.status === 'adopted').length;
        document.getElementById('statAnimals').innerText = active;
        document.getElementById('statAdopted').innerText = adopted;
        document.getElementById('statObjects').innerText = objects.length;
    } catch (e) { console.error(e); }
}
loadStats();

// Кнопка "наверх"
const fab = document.getElementById('fabScrollTop');
window.addEventListener('scroll', () => fab.classList.toggle('visible', window.scrollY > 300));
fab.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));