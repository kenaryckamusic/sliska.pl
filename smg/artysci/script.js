const artists = [
	{
		name: 'Tamara Kenarycka',
		image: 'photos/tamarakenarycka.jpg',
		socials: {
			instagram: 'https://instagram.com/kenaryckamusic',
			spotify: 'https://open.spotify.com/artist/0LStwz5X9rmEdyh4BLroZN',
			youtube: 'https://www.youtube.com/@tamarakenarycka',
			fandom: 'https://sunopedia.fandom.com/pl/wiki/Tamara_Kenarycka'
		}
	},
	{
		name: 'Lucyna Kredka',
		image: 'photos/lucynakredka.jpg',
		socials: {
			instagram: '',
			spotify: 'https://open.spotify.com/artist/5R3DYaJvNVPDn0BdYYW1mb?si=Kuj2YSMuRp-ymFK2mJcGlA',
			youtube: 'https://music.youtube.com/channel/UCLrIHarXUol9bDwjTdsatQA',
			fandom: 'https://sunopedia.fandom.com/pl/wiki/Lucyna_Kredka'
		}
	},
	{
		name: 'Miss Tamiza',
		image: 'photos/misstamiza.jpg',
		socials: {
			instagram: 'https://instagram.com/miss_tamiza',
			spotify: 'https://open.spotify.com/artist/7JvWyCVNHQABckf7H405SP?si=ef220691d227438b',
			youtube: 'https://music.youtube.com/channel/UCtaFeCT6-4-XUrUJTiDM7qg',
			fandom: ''
		}
	},
	{
		name: 'biustyna',
		image: 'photos/biustyna.jpg',
		socials: {
			instagram: '',
			spotify: 'https://open.spotify.com/artist/5mB5LEYMVgwwzv0UzqeKSO?si=7f578c10922b418c',
			youtube: 'https://music.youtube.com/channel/UCiOGxPssnQVe3vh5A0izj8A',
			fandom: 'https://sunopedia.fandom.com/pl/wiki/Biustyna'
		}
	},
	{
		name: 'Violetta LC',
		image: 'photos/violettalc.jpg',
		socials: {
			instagram: 'https://instagram.com/violettalecoq',
			spotify: 'https://open.spotify.com/artist/2lcUjExlGUQex28d45SQOv?si=d8f503cb52ed4448',
			youtube: 'https://music.youtube.com/channel/UC-vmEzN6u4oPg-IJ5Nt6gOQ',
			fandom: ''
		}
	},
	{
		name: 'Loretta Szmatożerna',
		image: 'photos/lorettaszmatozerna.jpg',
		socials: {
			instagram: 'https://instagram.com/lorettcia',
			spotify: 'https://open.spotify.com/artist/7z5rlc7zF6SRBRg0FGu0Rq?si=3013c57e13e041f0',
			youtube: 'https://music.youtube.com/channel/UCfMOdwVOQ_Nphs0t0gELFww',
			fandom: ''
		}
	},
	{
		name: 'Fiona Fikunova',
		image: 'photos/fionafikunova.jpg',
		socials: {
			instagram: 'https://instagram.com/808fikunova',
			spotify: 'https://open.spotify.com/artist/7g47bu77v3tBtYlXGpbWs6?si=1dbf9af8213b488e',
			youtube: 'https://music.youtube.com/channel/UCkJbwZgkCM9ADDAqb0dhDIQ',
			fandom: 'https://sunopedia.fandom.com/pl/wiki/Fiona_Fikunova'
		}
	},
	{
		name: 'GAENOVEFA',
		image: 'photos/gaenovefa.jpg',
		socials: {
			instagram: 'https://instagram.com/americasnextsupermodel',
			spotify: 'https://open.spotify.com/artist/6dNngdYDRKzFH8rfZXG2bh?si=31b026ec31c04897',
			youtube: 'https://music.youtube.com/@GAENOVEFA',
			fandom: 'https://sunopedia.fandom.com/pl/wiki/GAENOVEFA'
		}
	},
	{
		name: 'Marika Dupodajka',
		image: 'photos/marikadupodajka.jpg',
		socials: {
			instagram: 'https://instagram.com/paniprowokator',
			spotify: 'https://open.spotify.com/artist/0y3Hz2TBbj4CSW7PsZB0xh?si=acfb4aa20c6d4325',
			youtube: 'https://music.youtube.com/@MarikaDupodajka',
			fandom: 'https://sunopedia.fandom.com/pl/wiki/Marika_Dupodajka'
		}
	},
	{
		name: 'Shemrel',
		image: 'photos/shemrel.jpg',
		socials: {
			instagram: 'https://instagram.com/shemrel.official',
			spotify: 'https://open.spotify.com/artist/2prPAB97jnQ5EOJTvIxsWN?si=91e4a35c9def49e7',
			youtube: 'https://music.youtube.com/channel/UClzOzGRXXxLzqm9KYF79CyA',
			fandom: 'https://sunopedia.fandom.com/pl/wiki/Shemrel'
		}
	},
	{
		name: 'Gejowi Geje Gejozy',
		image: 'photos/gejowigejegejozy.jpg',
		socials: {
			instagram: 'https://instagram.com/gejowi.geje_gejozy',
			spotify: 'https://open.spotify.com/artist/0bzizQDZuhvIgKI2d11iCQ?si=9e66ab17ac9c4793',
			youtube: 'https://music.youtube.com/channel/UCsLtvDcnXdZrzMNAGuSSZKg',
			fandom: 'https://sunopedia.fandom.com/pl/wiki/Gejowi_Geje_Gejozy'
		}
	},
	{
		name: 'Erona Queen',
		image: 'photos/eronaqueen.jpg',
		socials: {
			instagram: 'https://instagram.com/eronaqueenofficial',
			spotify: 'https://open.spotify.com/artist/5m1pThFo6IAVA5S73OZbJY?si=f794024f5395473b',
			youtube: 'https://music.youtube.com/@EronaQueen',
			fandom: 'https://sunopedia.fandom.com/pl/wiki/Erona_Queen'
		}
	},
	{
		name: 'Daniella Stoipała',
		image: 'photos/daniellastoipala.jpg',
		socials: {
			instagram: 'https://instagram.com/daniellastoipalaofficial',
			spotify: 'https://open.spotify.com/artist/7b6UxDEyVbGe4qGgWrxYvr?si=c6750033f1514514',
			youtube: 'https://music.youtube.com/channel/UCcvhhp1b8n6mf8RgFFUKhhQ',
			fandom: 'https://sunopedia.fandom.com/pl/wiki/Daniella_Stoipała'
		}
	},
	{
		name: 'Żaneta Pocisk',
		image: 'photos/zanetapocisk.jpg',
		socials: {
			instagram: 'https://instagram.com/pociskzaneta',
			spotify: 'https://open.spotify.com/artist/7oj6ux9yBAJIAstjqbDlaT?si=a7613784ddfa4fa3',
			youtube: 'https://music.youtube.com/channel/UCdDxNEfcT3dEAu-BCAj9xzQ',
			fandom: 'https://sunopedia.fandom.com/pl/wiki/Żaneta_Pocisk'
		}
	},
	{
		name: 'Lil Vexx',
		image: 'photos/lilvexx.jpg',
		socials: {
			instagram: 'https://instagram.com/lilvexx.official',
			spotify: 'https://open.spotify.com/artist/33HhRnVsaQQPAlPW75Jiin?si=dc361e07195a43ba',
			youtube: 'https://music.youtube.com/channel/UCs4BG1GpK2lSP5FeRQMeFYA',
			fandom: 'https://sunopedia.fandom.com/pl/wiki/Lil_Vexx'
		}
	},
	{
		name: 'Basia Lateks',
		image: 'photos/basialateks.jpg',
		socials: {
			instagram: 'https://instagram.com/bbasialateks',
			spotify: 'https://open.spotify.com/artist/62ov6ymKGjHucfYC9qL0HQ?si=eba54d4ad9ff45ae',
			youtube: 'https://music.youtube.com/channel/UCXXMn0e8_59oG7mT2eRlbVQ',
			fandom: ''
		}
	}
];

const artistGrid = document.querySelector('#artist-grid');
const menu = document.querySelector('.site-menu');
const openButton = document.querySelector('.menu-toggle--open');
const closeButton = document.querySelector('.menu-toggle--close');

const socialPlatforms = {
	instagram: {
		label: 'Instagram',
		icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="17.5" cy="6.5" r="1.2" fill="currentColor"/></svg>'
	},
	spotify: {
		label: 'Spotify',
		icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="currentColor"/><path d="M6.5 9.5c3.5-1 7.5-.7 11 1.2M7 12.7c3-.8 6-.5 8.8 1M7.5 15.7c2.4-.6 4.7-.3 6.9.9" stroke="#f4f4f0" stroke-width="1.6" fill="none" stroke-linecap="round"/></svg>'
	},
	youtube: {
		label: 'YouTube',
		icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M22 8.2c-.2-1.2-1-2-2.2-2.2C18 5.6 12 5.6 12 5.6s-6 0-7.8.4C3 6.2 2.2 7 2 8.2 1.7 10 1.7 12 1.7 12s0 2 .3 3.8c.2 1.2 1 2 2.2 2.2 1.8.4 7.8.4 7.8.4s6 0 7.8-.4c1.2-.2 2-1 2.2-2.2.3-1.8.3-3.8.3-3.8s0-2-.3-3.8z"/><path d="M10 9.2v5.6l5-2.8z" fill="#f4f4f0"/></svg>'
	},
	fandom: {
		label: 'Wiki Fandom',
		icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 5.2c3.2-.9 6.4-.2 9 2v12c-2.6-2.2-5.8-2.9-9-2zM21 5.2c-3.2-.9-6.4-.2-9 2v12c2.6-2.2 5.8-2.9 9-2z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M6 9h3M6 12h3m6-3h3m-3 3h3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>'
	}
};

function renderSocialLinks(socials = {}) {
	const links = Object.entries(socialPlatforms).flatMap(([platform, social]) => {
		const href = socials[platform];
		if (typeof href !== 'string' || !href.trim()) return [];

		let url;
		try {
			url = new URL(href);
		} catch {
			return [];
		}
		if (!['http:', 'https:'].includes(url.protocol)) return [];

		return [`<a href="${url.href}" target="_blank" rel="noopener noreferrer" aria-label="${social.label}">${social.icon}</a>`];
	}).join('');

	return links ? `<div class="artist-socials">${links}</div>` : '';
}

artists.forEach((artist) => {
	const card = document.createElement('article');
	card.className = 'artist-card';
	const portrait = `
		<div class="artist-placeholder" aria-hidden="true">Zdjęcie czarno-białe</div>
		<img class="artist-photo" src="${artist.image}" alt="Portret: ${artist.name}" loading="lazy" decoding="async">
	`;

	card.innerHTML = `
		<div class="artist-portrait">${portrait}</div>
		<div class="artist-details">
			<h2>${artist.name}</h2>
			${renderSocialLinks(artist.socials)}
		</div>
	`;
	const image = card.querySelector('.artist-photo');
	image.addEventListener('error', () => {
		image.hidden = true;
		card.querySelector('.artist-portrait').classList.add('is-missing');
	}, { once: true });
	artistGrid.append(card);
});

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
