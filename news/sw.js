/* Śliska News – prosty service worker: strona działa też przy słabym zasięgu.
   Strategia: najpierw sieć (zawsze świeża wersja), a gdy brak internetu – ostatnia zapamiętana kopia. */
const CACHE = 'sliska-news-v4';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (/\/news\/(a|og|api)\//.test(url.pathname)) return;   // linki do artykułów i podglądy obsługuje Worker – bez service workera       // Firebase, czcionki, CDN – bez ingerencji
  e.respondWith(
    fetch(req).then(res => {
      if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {}); }
      return res;
    }).catch(() => caches.match(req).then(hit => hit || (req.mode === 'navigate' ? caches.match('./') || caches.match('index.html') : Response.error())))
  );
});

/* Powiadomienia push: serwer wysyła „puste” powiadomienie, a tytuł najnowszego artykułu pobieramy stąd. */
self.addEventListener('push', e => {
  e.waitUntil((async () => {
    let d = {};
    try { const r = await fetch('/news/api/latest', { cache: 'no-store' }); d = await r.json(); } catch { /* brak sieci */ }
    const more = d.more > 0 ? ` (+${d.more} więcej)` : '';
    await self.registration.showNotification('Nowe w Śliska News', {
      body: d.title ? d.title + more : 'Na stronie pojawił się nowy artykuł.',
      icon: '/news/icons/icon-192.png',
      badge: '/news/icons/icon-192.png',
      tag: 'sliska-new',
      renotify: true,
      data: { url: d.id ? '/news/#/artykul/' + encodeURIComponent(d.id) : '/news/' }
    });
  })());
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || '/news/';
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    for (const c of list) {
      if (c.url.includes('/news/') && 'focus' in c) { c.navigate(url).catch(() => {}); return c.focus(); }
    }
    return self.clients.openWindow(url);
  }));
});
