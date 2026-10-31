// Śliska News – osobny podgląd linku (og:image) dla każdego artykułu.
// Cloudflare Worker. Działa na trasach:  sliska.pl/news/a/*   oraz   sliska.pl/news/og/*
// Reszta ruchu przechodzi bez zmian do GitHub Pages.
const PROJECT = 'altplus-news';
const API_KEY = 'AIzaSyA-cJXdFeRETW1SaYpkrYZ4loUEWQkzmvw';
const SITE = 'https://sliska.pl';
const DB = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;

const esc = s => String(s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const str = f => (f && f.stringValue) || '';

async function getDoc(col, id) {
  const r = await fetch(`${DB}/${col}/${encodeURIComponent(id)}?key=${API_KEY}`, { cf: { cacheTtl: 300, cacheEverything: true } });
  return r.ok ? (await r.json()).fields || {} : null;
}

async function page(id) {
  const f = await getDoc('articles', id);
  if (!f) return Response.redirect(`${SITE}/news/`, 302);
  const title = str(f.title), lead = str(f.lead);
  const upd = str(f.updatedAt) || str(f.createdAt);
  const img = `${SITE}/news/og/${encodeURIComponent(id)}.jpg?v=${encodeURIComponent(upd)}`;
  const url = `${SITE}/news/a/${encodeURIComponent(id)}`;
  const dest = `${SITE}/news/#/artykul/${encodeURIComponent(id)}`;
  const html = `<!doctype html><html lang="pl"><head><meta charset="utf-8">
<title>${esc(title)} – Śliska News</title>
<meta name="description" content="${esc(lead)}">
<meta property="og:type" content="article"><meta property="og:site_name" content="Śliska News">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(lead)}">
<meta property="og:url" content="${url}"><meta property="og:image" content="${img}">
<meta property="og:image:secure_url" content="${img}"><meta property="og:image:type" content="image/jpeg"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta name="theme-color" content="#d6001c"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(lead)}"><meta name="twitter:image" content="${img}">
<link rel="canonical" href="${url}">
<script>location.replace(${JSON.stringify(dest)})</script>
</head><body><a href="${dest}">${esc(title)}</a></body></html>`;
  return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=300' } });
}

async function image(id) {
  const f = await getDoc('og', id);
  const data = f && str(f.img);
  const m = data && data.match(/^data:image\/jpeg;base64,(.+)$/);
  if (!m) return Response.redirect(`${SITE}/news/og-image.png`, 302);
  const bin = Uint8Array.from(atob(m[1]), c => c.charCodeAt(0));
  return new Response(bin, { headers: { 'content-type': 'image/jpeg', 'cache-control': 'public, max-age=86400' } });
}

export default {
  async fetch(req) {
    const p = new URL(req.url).pathname;
    let m = p.match(/^\/news\/a\/([^/]+)\/?$/);
    if (m) return page(decodeURIComponent(m[1]));
    m = p.match(/^\/news\/og\/([^/]+)\.jpg$/);
    if (m) return image(decodeURIComponent(m[1]));
    return fetch(req);
  }
};
