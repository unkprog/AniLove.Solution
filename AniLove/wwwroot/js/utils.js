// Вспомогательные функции
window.getMedicalTypeLabel = (type) => {
    const labels = {
        'vaccination': '💉 Вакцинация',
        'sterilization': '✂️ Стерилизация',
        'treatment': '💊 Лечение',
        'checkup': '🏥 Осмотр'
    };
    return labels[type] || type;
};

window.getStatusLabel = (status) => {
    const labels = {
        'active': 'В приюте',
        'adopted': 'Нашла дом',
        'deceased': 'Умерла',
        'transferred': 'Передана'
    };
    return labels[status] || status;
};

window.showToast = (message, isError = false) => {
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%);
        background: ${isError ? 'var(--md-sys-color-error)' : 'var(--md-sys-color-primary)'};
        color: white; padding: 12px 24px; border-radius: 100px;
        z-index: 10000; font-size: 14px; font-weight: 500;
        box-shadow: var(--md-sys-elevation-3); animation: fadeInOut 2.5s ease forwards;
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2500);
};

// Добавим стиль для анимации тоста
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeInOut {
        0% { opacity: 0; transform: translateX(-50%) translateY(20px); }
        15% { opacity: 1; transform: translateX(-50%) translateY(0); }
        85% { opacity: 1; transform: translateX(-50%) translateY(0); }
        100% { opacity: 0; transform: translateX(-50%) translateY(20px); }
    }
`;
document.head.appendChild(style);

// Простая защита от XSS
window.escapeHtml = (str) => {
    if (!str) return '';
    return str.replace(/[&<>]/g, function (m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}