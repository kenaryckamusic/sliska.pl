/* Śliska News – prosty service worker: strona działa też przy słabym zasięgu.
   Strategia: najpierw sieć (zawsze świeża wersja), a gdy brak internetu – ostatnia zapamiętana kopia. */
const CACHE = 'sliska-news-v2';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (/\/news\/(a|og)\//.test(url.pathname)) return;   // linki do artykułów i podglądy obsługuje Worker – bez service workera       // Firebase, czcionki, CDN – bez ingerencji
  e.respondWith(
    fetch(req).then(res => {
      if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {}); }
      return res;
    }).catch(() => caches.match(req).then(hit => hit || (req.mode === 'navigate' ? caches.match('./') || caches.match('index.html') : Response.error())))
  );
});
