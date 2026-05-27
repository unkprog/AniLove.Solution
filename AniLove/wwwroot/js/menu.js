// Мобильное меню
const mobileBtn = document.getElementById('mobileMenuBtn');
const navTabs = document.querySelector('.nav-tabs');
mobileBtn.addEventListener('click', () => navTabs.classList.toggle('active'));