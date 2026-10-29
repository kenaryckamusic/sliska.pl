const menu = document.querySelector('.site-menu');
const openButton = document.querySelector('.menu-toggle--open');
const closeButton = document.querySelector('.menu-toggle--close');
const form = document.querySelector('#contact-form');
const submitButton = form.querySelector('.submit-button');

function setMenuOpen(isOpen) {
	menu.inert = !isOpen;
	menu.classList.toggle('is-open', isOpen);
	openButton.hidden = isOpen;
	closeButton.hidden = !isOpen;
	openButton.setAttribute('aria-expanded', String(isOpen));
	closeButton.setAttribute('aria-expanded', String(isOpen));
	(isOpen ? closeButton : openButton).focus();
}

function updateSubmitState() {
	submitButton.disabled = !form.checkValidity();
}

openButton.addEventListener('click', () => setMenuOpen(true));
closeButton.addEventListener('click', () => setMenuOpen(false));
document.addEventListener('keydown', (event) => {
	if (event.key === 'Escape' && !menu.inert) setMenuOpen(false);
});

form.addEventListener('input', updateSubmitState);
form.addEventListener('change', updateSubmitState);
form.addEventListener('submit', (event) => {
	event.preventDefault();
	if (!form.reportValidity()) return;

	const formData = new FormData(form);
	const subject = `${formData.get('topic')} — ${formData.get('firstName')} ${formData.get('lastName') || ''}`.trim();
	const body = [
		`Imię: ${formData.get('firstName')}`,
		`Nazwisko: ${formData.get('lastName') || ''}`,
		`E-mail: ${formData.get('email')}`,
		'',
		formData.get('message')
	].join('\r\n');
	window.location.href = `mailto:ssmlabel@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
});