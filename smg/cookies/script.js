const menu = document.querySelector('.site-menu');
const openButton = document.querySelector('.menu-toggle--open');
const closeButton = document.querySelector('.menu-toggle--close');

function setMenuOpen(isOpen) {
	menu.inert = !isOpen;
	menu.classList.toggle('is-open', isOpen);
	openButton.hidden = isOpen;
	closeButton.hidden = !isOpen;
	openButton.setAttribute('aria-expanded', String(isOpen));
	closeButton.setAttribute('aria-expanded', String(isOpen));
	(isOpen ? closeButton : openButton).focus();
}

openButton.addEventListener('click', () => setMenuOpen(true));
closeButton.addEventListener('click', () => setMenuOpen(false));
document.addEventListener('keydown', (event) => {
	if (event.key === 'Escape' && !menu.inert) setMenuOpen(false);
});