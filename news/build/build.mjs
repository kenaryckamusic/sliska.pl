// Śliska News – generator stron artykułów (SEO)
// ------------------------------------------------------------------
// Co robi:
//  1. pobiera opublikowane artykuły z Firestore (odczyt publiczny, tak jak strona),
//  2. dla każdego tworzy osobną stronę:  news/artykul/<tytuł>-<id>/index.html
//     (z tytułem, opisem, obrazkiem dla Google/Facebooka i pełną treścią),
//  3. zapisuje zdjęcia jako pliki w news/img/,
//  4. generuje news/sitemap.xml,
//  5. odświeża listę linków do artykułów w news/index.html.
//
// Działa bez instalowania czegokolwiek (Node 18+). Uruchamia go GitHub Actions
// (plik .github/workflows/news-build.yml), ale można też ręcznie:  node news/build/build.mjs
//
// Do testów: NEWS_SOURCE_FILE=plik.json (zwykła lista artykułów zamiast Firestore).

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

export const CFG = {
  SITE_URL: 'https://sliska.pl/news/',     // adres folderu ze stroną (z ukośnikiem na końcu)
  SITE_NAME: 'Śliska News',
  SITE_DESC: 'Wiadomości z muzyki, kontrowersji i dram. Codziennie najświeższe informacje.',
  FIREBASE_PROJECT: 'altplus-news',
  FIREBASE_API_KEY: 'AIzaSyA-cJXdFeRETW1SaYpkrYZ4loUEWQkzmvw',
  MAX_LINKS_ON_HOME: 40
};

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');                       // folder news/
const BASE_PATH = new URL(CFG.SITE_URL).pathname;            // np. /news/
const ARTICLES_DIR = path.join(ROOT, 'artykul');
const IMG_DIR = path.join(ROOT, 'img');

/* ---------------------------------------------------------------
   Pomocnicze
   --------------------------------------------------------------- */
const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const jsonLd = obj => JSON.stringify(obj).replace(/</g, '\\u003c');

/** Ta sama funkcja jest w app.js (slugify) – adresy muszą wychodzić identyczne. */
export function slugify(text) {
  const map = { ą: 'a', ć: 'c', ę: 'e', ł: 'l', ń: 'n', ó: 'o', ś: 's', ź: 'z', ż: 'z' };
  let s = String(text || '').toLowerCase().replace(/[ąćęłńóśźż]/g, c => map[c]);
  s = s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  if (s.length > 60) s = s.slice(0, 60).replace(/-[^-]*$/, '');
  return s || 'artykul';
}

const folderName = a => `${slugify(a.title)}-${a.id}`;
export const articleUrl = a => `${CFG.SITE_URL}artykul/${folderName(a)}/`;

function writeIfChanged(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  if (fs.existsSync(file) && fs.readFileSync(file, 'utf8') === content) return false;
  fs.writeFileSync(file, content);
  return true;
}

function cats(a) {
  if (Array.isArray(a.categories) && a.categories.length) return a.categories;
  return a.category ? [a.category] : [];
}

/* ---------------------------------------------------------------
   Pobieranie artykułów z Firestore (REST)
   --------------------------------------------------------------- */
function fromValue(v) {
  if (v == null) return null;
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('timestampValue' in v) return v.timestampValue;
  if ('nullValue' in v) return null;
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(fromValue);
  if ('mapValue' in v) return fromFields(v.mapValue.fields || {});
  return null;
}
export function fromFields(fields) {
  const out = {};
  for (const [k, v] of Object.entries(fields)) out[k] = fromValue(v);
  return out;
}

export async function loadArticles() {
  if (process.env.NEWS_SOURCE_FILE) {
    return JSON.parse(fs.readFileSync(process.env.NEWS_SOURCE_FILE, 'utf8'));
  }
  const base = `https://firestore.googleapis.com/v1/projects/${CFG.FIREBASE_PROJECT}/databases/(default)/documents/articles`;
  const list = [];
  let token = '';
  do {
    const url = `${base}?pageSize=100&key=${CFG.FIREBASE_API_KEY}${token ? `&pageToken=${encodeURIComponent(token)}` : ''}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Firestore odpowiedział błędem ${res.status}: ${(await res.text()).slice(0, 300)}`);
    const data = await res.json();
    for (const d of data.documents || []) list.push(fromFields(d.fields || {}));
    token = data.nextPageToken || '';
  } while (token);
  return list;
}

/* ---------------------------------------------------------------
   Zdjęcia: data:image/... → pliki w img/
   --------------------------------------------------------------- */
const usedImages = new Set();
const DATA_IMG = /^data:image\/(png|jpe?g|gif|webp);base64,([A-Za-z0-9+/=\s]+)$/i;

/** Zwraca adres obrazka (pliku lub zewnętrznego URL) albo '' gdy się nie da. */
function imageToFile(src) {
  src = String(src || '').trim();
  if (!src) return '';
  const m = src.match(DATA_IMG);
  if (!m) return /^https?:\/\//i.test(src) ? src : '';
  const ext = m[1].toLowerCase().replace('jpeg', 'jpg');
  const buf = Buffer.from(m[2].replace(/\s+/g, ''), 'base64');
  const name = `${crypto.createHash('sha1').update(buf).digest('hex').slice(0, 16)}.${ext}`;
  usedImages.add(name);
  const file = path.join(IMG_DIR, name);
  if (!fs.existsSync(file)) { fs.mkdirSync(IMG_DIR, { recursive: true }); fs.writeFileSync(file, buf); }
  return `${BASE_PATH}img/${name}`;
}
const absUrl = p => (p.startsWith('/') ? new URL(p, CFG.SITE_URL).href : p);

/* ---------------------------------------------------------------
   Oczyszczanie HTML treści (ta sama lista dozwolonych znaczników co w app.js)
   --------------------------------------------------------------- */
const TAGS = new Set(['p', 'br', 'h2', 'h3', 'h4', 'strong', 'b', 'em', 'i', 'u', 's', 'blockquote',
  'ul', 'ol', 'li', 'a', 'img', 'figure', 'figcaption', 'span', 'div', 'aside']);
const VOID = new Set(['br', 'img']);
const DROP_RE = /<(script|style|iframe|object|embed|svg|math|template|form|textarea|select|button|noscript)\b[\s\S]*?<\/\1\s*>/gi;
const TAG_RE = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)((?:"[^"]*"|'[^']*'|[^'">])*)>/g;
const ATTR_RE = /([a-zA-Z_:][-\w:.]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
const decodeAttr = s => String(s).replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

export function sanitize(html) {
  let s = String(html || '').replace(/<!--[\s\S]*?-->/g, '').replace(DROP_RE, '');
  s = s.replace(/<(script|style|iframe|object|embed|svg|math|template|form|textarea|select|button|noscript)\b[^>]*>/gi, '');
  return s.replace(TAG_RE, (_, close, name, rest) => {
    const tag = name.toLowerCase();
    if (!TAGS.has(tag)) return '';
    if (close) return VOID.has(tag) ? '' : `</${tag}>`;
    const attrs = {};
    let m;
    ATTR_RE.lastIndex = 0;
    while ((m = ATTR_RE.exec(rest))) {
      const n = m[1].toLowerCase();
      const v = decodeAttr((m[2] ?? m[3] ?? m[4] ?? '').trim());
      if (n === 'class') attrs.class = v.replace(/[^\w\s-]/g, '');
      else if (n === 'href' && tag === 'a' && /^(https?:|mailto:|\/|#)/i.test(v)) attrs.href = v;
      else if (n === 'alt' && tag === 'img') attrs.alt = v;
      else if ((n === 'data-kind' || n === 'data-id') && tag === 'aside') attrs[n] = v;
      else if (n === 'src' && tag === 'img') {
        const f = imageToFile(v);
        if (f) attrs.src = f;
      }
    }
    if (tag === 'img' && !attrs.src) return '';
    if (tag === 'a') { attrs.target = '_blank'; attrs.rel = 'noopener noreferrer'; }
    if (tag === 'img') attrs.loading = 'lazy';
    const out = Object.entries(attrs).map(([k, v]) => ` ${k}="${esc(v)}"`).join('');
    return `<${tag}${out}>`;
  });
}

/* Odtwarzacze YouTube / Spotify – te same zasady co w app.js (Embeds) */
const EMBED_ID = { youtube: /^[\w-]{11}$/, spotify: /^(track|album|playlist|artist|episode|show)\/[A-Za-z0-9]{22}$/ };
export function renderEmbeds(html) {
  return html.replace(/<aside\b([^>]*)>([\s\S]*?)<\/aside>/g, (whole, attrs) => {
    if (!/class="[^"]*\barticle-embed\b/.test(attrs)) return whole;
    const kind = (attrs.match(/data-kind="([^"]*)"/) || [])[1] || '';
    const id = (attrs.match(/data-id="([^"]*)"/) || [])[1] || '';
    if (!EMBED_ID[kind] || !EMBED_ID[kind].test(id)) return '';
    const src = kind === 'youtube' ? `https://www.youtube-nocookie.com/embed/${id}` : `https://open.spotify.com/embed/${id}`;
    const link = kind === 'youtube' ? `https://www.youtube.com/watch?v=${id}` : `https://open.spotify.com/${id}`;
    const title = kind === 'youtube' ? 'Film z YouTube' : 'Odtwarzacz Spotify';
    const text = kind === 'youtube' ? 'Obejrzyj na YouTube ↗' : 'Posłuchaj na Spotify ↗';
    return `<aside class="article-embed embed-${kind}"><div class="embed-frame"><iframe src="${esc(src)}" title="${title}" loading="lazy" allow="autoplay; encrypted-media; fullscreen; picture-in-picture" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></div><a class="embed-link" href="${esc(link)}" target="_blank" rel="noopener noreferrer">${text}</a></aside>`;
  });
}

const plainText = html => String(html || '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim();

/* ---------------------------------------------------------------
   Szablon strony artykułu
   --------------------------------------------------------------- */
const PL_MONTHS = ['stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca', 'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia'];
function plDate(iso) {
  const d = new Date(iso);
  const p = new Intl.DateTimeFormat('pl-PL', { timeZone: 'Europe/Warsaw', day: 'numeric', month: 'numeric', year: 'numeric' }).formatToParts(d);
  const g = t => p.find(x => x.type === t).value;
  return `${g('day')} ${PL_MONTHS[Number(g('month')) - 1]} ${g('year')}`;
}

function coverOf(a) {
  const r = a.review;
  if (!r) return '';
  return (r.coverSame || !r.cover) ? (a.image || '') : r.cover;
}

function renderArticleBody(a) {
  const mainImg = imageToFile(a.image);
  const review = a.review && a.review.score != null ? a.review : null;
  const body = renderEmbeds(sanitize(a.content));
  const tags = (a.tags || []).filter(Boolean);
  const reviewHtml = review
    ? `<section class="review review-nocover" aria-label="Ocena">
        <div class="review-info">
          ${review.kind ? `<div class="review-kind">${esc(review.kind)}</div>` : ''}
          <div class="review-work">${esc(review.work)}</div>
          ${review.artist ? `<div class="review-artist">${esc(review.artist)}</div>` : ''}
          <div class="review-year">Ocena: ${esc(String(review.score).replace('.', ','))} / 10${review.year ? ' · ' + esc(review.year) : ''}</div>
        </div></section>`
    : '';
  const hero = mainImg && !review
    ? `<figure class="article-hero"><div class="media-wrap"><img src="${esc(mainImg)}" alt="${esc(a.title)}"></div>${a.imageCaption ? `<figcaption>${esc(a.imageCaption)}</figcaption>` : ''}</figure>`
    : '';
  return `<div class="article-top"><a class="btn" href="${esc(BASE_PATH)}">← Powrót do strony głównej</a></div>
    <article class="article">
      <header class="article-header">
        <div class="card-tags"><span class="chips">${cats(a).map(c => `<span class="chip">${esc(c)}</span>`).join('')}</span></div>
        <h1>${esc(a.title)}</h1>
        <div class="article-meta"><span>Autor: <strong>${esc(a.author)}</strong></span><span>Opublikowano: <time datetime="${esc(a.createdAt)}">${esc(plDate(a.createdAt))}</time></span></div>
      </header>
      ${reviewHtml}${hero}
      <div class="article-layout"><div class="article-main">
        <p class="article-lead">${esc(a.lead)}</p>
        <div class="article-body">${body}</div>
        ${tags.length ? `<div class="article-tags">${tags.map(t => `<span class="tag">#${esc(t)}</span>`).join('')}</div>` : ''}
      </div></div>
    </article>`;
}

function buildHead(template, a) {
  const url = articleUrl(a);
  const title = `${a.title} – ${CFG.SITE_NAME}`;
  const desc = (a.lead || plainText(a.content)).slice(0, 200);
  const imgFile = imageToFile(coverOf(a)) || imageToFile(a.image);
  const image = imgFile ? absUrl(imgFile) : `${CFG.SITE_URL}og-image.png`;
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: a.title.slice(0, 110),
    description: desc,
    image: [image],
    datePublished: a.createdAt,
    dateModified: a.updatedAt || a.createdAt,
    author: { '@type': 'Person', name: a.author || CFG.SITE_NAME },
    publisher: { '@type': 'Organization', name: CFG.SITE_NAME, logo: { '@type': 'ImageObject', url: `${CFG.SITE_URL}og-image.png` } },
    mainEntityOfPage: url,
    inLanguage: 'pl-PL'
  };
  const meta = `
  <link rel="canonical" href="${esc(url)}">
  <meta property="og:site_name" content="${esc(CFG.SITE_NAME)}">
  <meta property="og:type" content="article">
  <meta property="og:locale" content="pl_PL">
  <meta property="og:title" content="${esc(a.title)}">
  <meta property="og:description" content="${esc(desc)}">
  <meta property="og:url" content="${esc(url)}">
  <meta property="og:image" content="${esc(image)}">
  <meta property="article:published_time" content="${esc(a.createdAt)}">
  <meta property="article:modified_time" content="${esc(a.updatedAt || a.createdAt)}">
  ${cats(a).map(c => `<meta property="article:section" content="${esc(c)}">`).join('\n  ')}
  ${(a.tags || []).map(t => `<meta property="article:tag" content="${esc(t)}">`).join('\n  ')}
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${esc(a.title)}">
  <meta name="twitter:description" content="${esc(desc)}">
  <meta name="twitter:image" content="${esc(image)}">
  <script type="application/ld+json">${jsonLd(ld)}</script>`;
  return { title, desc, meta };
}

function renderArticlePage(template, a) {
  const { title, desc, meta } = buildHead(template, a);
  let html = template;
  // 1) usuń nagłówki strony głównej (title, description, og:*, canonical, twitter, ld+json)
  html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${esc(title)}</title>`);
  html = html.replace(/\s*<meta name="description"[^>]*>/i, `\n  <meta name="description" content="${esc(desc)}">`);
  html = html.replace(/\s*<meta property="og:[^>]*>/gi, '').replace(/\s*<meta name="twitter:[^>]*>/gi, '');
  html = html.replace(/\s*<link rel="canonical"[^>]*>/gi, '');
  html = html.replace(/\s*<script type="application\/ld\+json">[\s\S]*?<\/script>/gi, '');
  // 2) wstaw nowe
  html = html.replace(/<\/head>/i, `${meta}\n</head>`);
  // 3) ścieżki bezwzględne do plików strony
  html = html.replace(/(href|src)="(style\.css|app\.js|og-image\.png|manifest\.webmanifest|icons\/apple-touch-icon\.png|favicon\.svg|favicon\.ico|favicon-48\.png)"/g, `$1="${BASE_PATH}$2"`);
  // 4) widok artykułu zamiast strony głównej
  html = html.replace(/<html([^>]*)>/i, `<html$1 data-article-id="${esc(a.id)}">`);
  html = html.replace(/<section id="view-home"/, '<section id="view-home" hidden');
  html = html.replace(/<section id="view-article" hidden><\/section>/, `<section id="view-article">${renderArticleBody(a)}</section>`);
  html = html.replace(/(<div class="container wide layout" id="layout" data-view=")home(")/, '$1article$2');
  return html;
}

function redirectStub(toUrl) {
  return `<!DOCTYPE html>
<html lang="pl"><head><meta charset="utf-8"><title>Przeniesiono – ${esc(CFG.SITE_NAME)}</title>
<meta name="robots" content="noindex">
<link rel="canonical" href="${esc(toUrl)}">
<meta http-equiv="refresh" content="0; url=${esc(toUrl)}">
</head><body><p>Ta strona została przeniesiona: <a href="${esc(toUrl)}">${esc(toUrl)}</a></p></body></html>
`;
}

/* ---------------------------------------------------------------
   Sitemap, linki na stronie głównej
   --------------------------------------------------------------- */
function buildSitemap(list) {
  const latest = list.reduce((m, a) => (Date.parse(a.updatedAt || a.createdAt) > m ? Date.parse(a.updatedAt || a.createdAt) : m), 0);
  const urls = [`<url><loc>${esc(CFG.SITE_URL)}</loc>${latest ? `<lastmod>${new Date(latest).toISOString()}</lastmod>` : ''}</url>`]
    .concat(list.map(a => `<url><loc>${esc(articleUrl(a))}</loc><lastmod>${new Date(a.updatedAt || a.createdAt).toISOString()}</lastmod></url>`));
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
}


function updateHomeLinks(templateFile, list) {
  const html = fs.readFileSync(templateFile, 'utf8');
  const re = /<!--SEO-LINKS-->[\s\S]*?<!--\/SEO-LINKS-->/;
  if (!re.test(html)) { console.warn('Uwaga: w index.html brak znaczników <!--SEO-LINKS-->.'); return false; }
  const links = list.slice(0, CFG.MAX_LINKS_ON_HOME).map(a => `<li><a href="${esc(BASE_PATH)}artykul/${esc(folderName(a))}/">${esc(a.title)}</a></li>`).join('');
  const block = `<!--SEO-LINKS--><nav class="sr-only" aria-label="Najnowsze artykuły"><ul>${links}</ul></nav><!--/SEO-LINKS-->`;
  return writeIfChanged(templateFile, html.replace(re, () => block));
}

/* ---------------------------------------------------------------
   Główna część
   --------------------------------------------------------------- */
async function main() {
  const all = await loadArticles();
  const now = Date.now();
  const list = all
    .filter(a => a && a.id && a.title && a.createdAt && Date.parse(a.createdAt) <= now)
    .filter(a => /^[\w-]{1,100}$/.test(a.id))
    .sort((x, y) => Date.parse(y.createdAt) - Date.parse(x.createdAt));

  const templateFile = path.join(ROOT, 'index.html');
  // najpierw lista linków w index.html, potem szablon dla stron artykułów
  updateHomeLinks(templateFile, list);
  const template = fs.readFileSync(templateFile, 'utf8');

  let written = 0;
  const keep = new Set();
  for (const a of list) {
    const name = folderName(a);
    keep.add(name);
    if (writeIfChanged(path.join(ARTICLES_DIR, name, 'index.html'), renderArticlePage(template, a))) written++;
  }

  // Stare adresy (zmieniony tytuł) → przekierowanie; usunięte artykuły → kasujemy folder
  // (zabezpieczenie: pusta lista z bazy nie kasuje niczego – to raczej błąd pobierania)
  let moved = 0, removed = 0;
  if (list.length === 0 && fs.existsSync(ARTICLES_DIR) && fs.readdirSync(ARTICLES_DIR).length) {
    console.warn('Baza zwróciła 0 artykułów – pomijam usuwanie istniejących stron.');
    return;
  }
  if (fs.existsSync(ARTICLES_DIR)) {
    for (const dir of fs.readdirSync(ARTICLES_DIR)) {
      if (keep.has(dir)) continue;
      const owner = list.find(a => dir.endsWith('-' + a.id));
      if (owner) {
        if (writeIfChanged(path.join(ARTICLES_DIR, dir, 'index.html'), redirectStub(articleUrl(owner)))) moved++;
      } else {
        fs.rmSync(path.join(ARTICLES_DIR, dir), { recursive: true, force: true });
        removed++;
      }
    }
  }

  // Zdjęcia, których nic już nie używa
  let imgRemoved = 0;
  if (fs.existsSync(IMG_DIR)) {
    for (const f of fs.readdirSync(IMG_DIR)) {
      if (!usedImages.has(f)) { fs.rmSync(path.join(IMG_DIR, f), { force: true }); imgRemoved++; }
    }
  }

  writeIfChanged(path.join(ROOT, 'sitemap.xml'), buildSitemap(list));
  // Kanał RSS został wycofany – usuń stary plik, jeśli został po wcześniejszych wersjach
  fs.rmSync(path.join(ROOT, 'rss.xml'), { force: true });

  console.log(`Artykułów: ${list.length} | zapisane/zmienione strony: ${written} | przekierowania: ${moved} | usunięte: ${removed} | zdjęcia: ${usedImages.size} (usunięto ${imgRemoved})`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(err => { console.error('BŁĄD:', err.message); process.exit(1); });
}
