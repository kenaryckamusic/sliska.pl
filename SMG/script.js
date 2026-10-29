const artists = [
	{ name: 'Tamara Kenarycka', image: 'tamarakenarycka1.jpg' },
	{ name: 'Lucyna Kredka', image: 'lucynakredka1.jpg' },
	{ name: 'biustyna', image: 'biustyna1.jpg' },
	{ name: 'GAENOVEFA', image: 'gaenovefa1.jpg' },
	{ name: 'Marika Dupodajka', image: 'marikadupodajka1.jpg' }
];

const slides = document.querySelector('.slides');
const menu = document.querySelector('.site-menu');
const openButton = document.querySelector('.menu-toggle--open');
const closeButton = document.querySelector('.menu-toggle--close');
let activeIndex = 0;

artists.forEach((artist, index) => {
	const slide = document.createElement('section');
	slide.className = 'slide';
	slide.setAttribute('aria-hidden', String(index !== activeIndex));
	slide.innerHTML = `<img class="artist-photo" src="${artist.image}" alt="" decoding="async"><h1 class="artist-name">${artist.name}</h1>`;
	slides.append(slide);
});

const slideElements = [...slides.children];

function showSlide(index) {
	activeIndex = (index + artists.length) % artists.length;
	slideElements.forEach((slide, slideIndex) => {
		const active = slideIndex === activeIndex;
		slide.classList.toggle('is-active', active);
		slide.setAttribute('aria-hidden', String(!active));
	});
}

function setMenuOpen(isOpen) {
	menu.inert = !isOpen;
	menu.classList.toggle('is-open', isOpen);
	openButton.hidden = isOpen;
	closeButton.hidden = !isOpen;
	openButton.setAttribute('aria-expanded', String(isOpen));
	closeButton.setAttribute('aria-expanded', String(isOpen));
	(isOpen ? closeButton : openButton).focus();
}

document.querySelectorAll('[data-step]').forEach((button) => {
	button.addEventListener('click', () => showSlide(activeIndex + Number(button.dataset.step)));
});

openButton.addEventListener('click', () => setMenuOpen(true));
closeButton.addEventListener('click', () => setMenuOpen(false));
document.addEventListener('keydown', (event) => {
	if (event.key === 'Escape' && !menu.inert) setMenuOpen(false);
	if (event.key === 'ArrowLeft') showSlide(activeIndex - 1);
	if (event.key === 'ArrowRight') showSlide(activeIndex + 1);
});

window.setInterval(() => showSlide(activeIndex + 1), 5000);

showSlide(activeIndex);
