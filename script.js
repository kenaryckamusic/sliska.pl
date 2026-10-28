document.addEventListener('DOMContentLoaded', () => {
    const yearElement = document.getElementById('year');
    const yearMobileElement = document.getElementById('year-mobile');
    if (yearElement) {
        const currentYear = new Date().getFullYear();
        yearElement.textContent = currentYear;
        if (yearMobileElement) {
            yearMobileElement.textContent = currentYear;
        }
    }

    const streamingToggle = document.querySelector('.streaming-toggle');
    const streamingModal = document.getElementById('streamingModal');
    const closeModal = document.querySelector('.close-modal');

    if (streamingToggle && streamingModal) {
        streamingToggle.addEventListener('click', () => {
            streamingModal.classList.add('active');
        });
    }

    if (closeModal && streamingModal) {
        closeModal.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            streamingModal.classList.remove('active');
        });
    }

    if (streamingModal) {
        streamingModal.addEventListener('click', (e) => {
            if (e.target === streamingModal) {
                streamingModal.classList.remove('active');
            }
        });
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && streamingModal.classList.contains('active')) {
            streamingModal.classList.remove('active');
        }
    });

    const socialButtons = document.querySelectorAll('.social-btn');
    socialButtons.forEach((btn, index) => {
        btn.style.animationDelay = `${0.8 + index * 0.1}s`;
    });
});
