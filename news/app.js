/* =========================================================
   Śliska News – portal informacyjny z wbudowanym CMS
   Struktura pliku:
     1. CONFIG            – ustawienia (Firebase, limity, czasy autozapisu)
     2. Utils / Sanitizer – funkcje pomocnicze i czyszczenie HTML
     3. Dane startowe     – artykuły demonstracyjne (tylko tryb localStorage)
     4. DataService       – warstwa danych (Firebase Firestore / localStorage)
     5. Auth              – logowanie redaktora
     6. Aplikacja (UI)    – widoki, routing, edytor, wersje robocze, panel
   ========================================================= */
'use strict';

/* ---- Atrapy usuniętych funkcji redakcyjnych (wersja publiczna) ---- */
const __no = new Proxy(function () {}, { get: (t, k) => (k === Symbol.toPrimitive ? () => '' : typeof k === 'symbol' || k === 'then' ? undefined : __no), apply: () => undefined, construct: () => ({}) });
const bylineName = n => 'Redaktor ' + String(n || '').replace(/^Redaktor\s+/i, '');
let IG_SLIDES = __no;
function keySentence() {}
function fitText() {}
async function slideTexture() {}
async function drawSlide() {}
async function makeZip() {}
function captionFor() {}
async function renderSocialSet() {}
async function makeInstagramPost() {}
async function exportBackup() {}
async function importBackup() {}
function editDraftId() {}
function newPointerKey() {}
let Buffers = __no;
function clearPointer() {}
let OWNER_TABS = __no;
function applyOwnerTabs() {}
function ensureOwnerPanes() {}
function setPanelTab() {}
function updatePanelCounts() {}
async function renderPanel() {}
async function deleteDraft() {}
async function publishNow() {}
function upsertLocalState() {}
let removeTarget = __no;
function openRemoveModal() {}
async function unpublishToDraft() {}
async function deleteArticle() {}
function defaultAuthor() {}
function emptyData() {}
function normalizeData() {}
function dataFromArticle() {}
function contentHtml() {}
function collectData() {}
function isEmptyData() {}
function renderCatPicker() {}
function updateReviewUi() {}
function setCover() {}
let defaultPos = __no;
function applyCrop() {}
function setMainImage() {}
function initCropper() {}
function updateTagSuggest() {}
let RECENT_TAGS_KEY = __no;
function recentTags() {}
function rememberTags() {}
function tagStats() {}
function suggestedTags() {}
let moreTags = __no;
function renderTagChips() {}
let renderTagChipsSoon = __no;
function toggleTag() {}
function applyData() {}
function updateCounters() {}
function updateChecklist() {}
async function insertImageFiles() {}
function updateStats() {}
let SIZE_LIMIT_KB = __no;
function updateSizeMeter() {}
let updateSizeMeterSoon = __no;
function updatePublishUi() {}
function setStatus() {}
function captureContext() {}
function writeBuffer() {}
async function persistDraft() {}
async function saveCloudDraft() {}
function onFormChange() {}
function leaveEditor() {}
let GALLERY_MAX = __no;
function openGalleryModal() {}
function galleryError() {}
function renderGalleryItems() {}
async function addGalleryFiles() {}
function addGalleryUrl() {}
function submitGallery() {}
function deleteGallery() {}
function renderRelatedPicker() {}
function articleQuotes() {}
function articleImages() {}
function buildIgPhotos() {}
function openIgModal() {}
function igFormat() {}
let igThumbJob = __no;
let igThumbCache = __no;
let IG_TEXT_KINDS = __no;
function igBgFor() {}
function igBgMode() {}
function igSlideTheme() {}
function buildIgGrid() {}
function refreshIgGrid() {}
function updateIgUi() {}
function cleanPastedHtml() {}
function handleRichPaste() {}
function openQuickModal() {}
async function submitQuick() {}
async function deleteQuick() {}
async function shareQuick() {}
async function renderQuickStory() {}
async function shareQuickStory() {}
async function ogJpegDataUrl() {}
async function publishOg() {}
async function refreshAllOg() {}
function registerFigureBlot() {}
function markdownLine() {}
function initQuill() {}
async function openEditor() {}
async function discardRestored() {}
async function saveArticle() {}
function openPreview() {}
function openImageModal() {}
function setModalImage() {}
function insertImageIntoEditor() {}
let QM_MAX_MID = __no;
let qmParts = __no;
function qmRead() {}
function qmRender() {}
function qmAction() {}
function openQuoteModal() {}
function submitQuote() {}
function openEmbedModal() {}
function submitEmbed() {}
function deleteEmbed() {}
function deleteQuote() {}
function deleteFigure() {}
let AD_ST = __no;
let AD_FMTS = __no;
async function adImgBlob() {}
async function renderAdSubs() {}
async function renderModComments() {}
function modApply() {}
function userVerified() {}
function modUserHtml() {}
let MU_FILTERS = __no;
function modUserFilter() {}
async function loadModUsers() {}
function renderModUsersPanel() {}
function renderModeration() {}
let fmtDT = __no;
async function openUserProfile() {}
let modQTimer = __no;
async function loadProfile() {}
let settingsAvatar = __no;
function foreignArticles() {}
let myUsername = __no;
function fillAuthorNameFields() {}
function syncAuthorName() {}
let ASSIGN_PICKED = __no;
function renderAssignList() {}
function renderSettings() {}
async function testPush() {}
async function updateDevicePush() {}
function updateSettingsAvatar() {}
async function reassignAuthor() {}
async function saveSettings() {}

/* =========================================================
   1. KONFIGURACJA
   ========================================================= */
const CONFIG = {
  SITE_NAME: 'Śliska News',

  // Adres, pod którym stoi strona (z ukośnikiem na końcu). Służy do linków do osobnych stron artykułów.
  SITE_URL: 'https://sliska.pl/news/',
  // Po ilu minutach od publikacji osobna strona artykułu na pewno już istnieje (generator działa co 30 min)

  // true  = Firebase Firestore (artykuły widoczne dla wszystkich odwiedzających)
  // false = localStorage (tryb demonstracyjny, dane tylko w tej przeglądarce)
  USE_FIREBASE: true,
  // Osobny podgląd linku dla każdego artykułu (Facebook, Messenger, X, Threads…).
  // Ustaw na true dopiero po wdrożeniu og-worker.js w Cloudflare (patrz INSTRUKCJA.md).
  OG_WORKER: true,
  FIREBASE_OG_COLLECTION: 'og',
  // Oceny czytelników i powiadomienia push – działają przez Cloudflare Worker (patrz INSTRUKCJA.md)
  API_BASE: '/news/api',
  PEEK_CHANCE: 0.5,        // jak często w połowie artykułu pojawia się polecany inny artykuł (0–1)

  // Gdy Firebase nie odpowiada: false = pokaż komunikat o błędzie (zalecane na stronie publicznej),
  // true = przełącz się na localStorage z artykułami demonstracyjnymi.
  ALLOW_LOCAL_FALLBACK: false,

  // Hasło redaktora – używane TYLKO w trybie localStorage (USE_FIREBASE: false).
  // W trybie Firebase logowanie odbywa się przez Firebase Authentication (e-mail + hasło).
  ADMIN_PASSWORD: 'admin123',

  // Opcjonalnie: UID konta redaktora (Firebase → Authentication → Users).
  // Jeśli go podasz, panel redaktora odblokuje się tylko dla tego konta.
  // Prawdziwą ochroną zapisu są i tak reguły Firestore.
  ADMIN_UID: '',
  // Konta czytelników i komentarze: dane OSOBNEGO projektu Firebase (tylko Authentication). null = funkcja wyłączona.
  READER_FIREBASE: {
    apiKey: 'AIzaSyDi7M7X4cwsfIkxTebYlGsJPFN-NoAtwAU',
    authDomain: 'sliska.pl',          // logowanie Google przez własną domenę (worker przekazuje /__/auth/* do sliska-users.firebaseapp.com)
    projectId: 'sliska-users',
    storageBucket: 'sliska-users.firebasestorage.app',
    messagingSenderId: '236153117470',
    appId: '1:236153117470:web:6b4bd4db90314fed52470f'
  },
  LEGACY_PROFILE_UID: 'BxuILURRczbzyR2SWZg4jMltO0B3',   // konto, które dostaje dotychczasowy wspólny profil (nazwa i zdjęcie)

  MAX_ARTICLES: 40,        // ile najnowszych artykułów pobierać z bazy (oszczędza limit odczytów)
  PAGE_SIZE: 12,           // ile kafli pokazywać na stronie głównej, zanim pojawi się „Pokaż więcej”

  BUFFER_DELAY: 600,       // ms – kopia robocza w przeglądarce po każdej zmianie
  CLOUD_DRAFT_DELAY: 8000, // ms – zapis wersji roboczej w bazie po zmianie

  SESSION_KEY: 'sliska_admin_session',
  LOCAL_KEY: 'sliska_articles_v1',
  LOCAL_DRAFTS_KEY: 'sliska_drafts_v1',
  BUFFER_KEY: 'sliska_editor_buffers_v1',
  NEW_POINTER_KEY: 'sliska_editor_new_pointer',
  AUTHOR_KEY: 'sliska_last_author',
  LOCAL_TIPS_KEY: 'sliska_tips_v1',
  FIREBASE_TIPS_COLLECTION: 'tips',

  // Dane administratora serwisu – pokazują się w Polityce prywatności i Regulaminie.
  // UZUPEŁNIJ je swoimi danymi (zamiast tekstów w nawiasach [UZUPEŁNIJ: …]).
  LEGAL: {
    ADMIN_NAME: 'SMG Entertainment Sp. z o.o. (NIP 3789021824)',
    ADMIN_ADDRESS: 'ul. Śliska 10, Warszawa',
    CONTACT_EMAIL: 'kontakt@sliska.pl',
    REDAKCJA_EMAIL: 'redakcja@sliska.pl',
    UPDATED: '31 października 2026'
  },

  FIREBASE_SDK_VERSION: '10.12.2',
  FIREBASE_COLLECTION: 'articles',
  FIREBASE_DRAFTS_COLLECTION: 'drafts',
  FIREBASE_CONFIG: {
    apiKey: 'AIzaSyA-cJXdFeRETW1SaYpkrYZ4loUEWQkzmvw',
    authDomain: 'altplus-news.firebaseapp.com',
    projectId: 'altplus-news',
    storageBucket: 'altplus-news.firebasestorage.app',
    messagingSenderId: '192116116300',
    appId: '1:192116116300:web:68d14f926726cfbc6adde9'
  }
};

const CATEGORIES = ['Muzyka', 'Recenzje', 'Kontrowersje', 'Dramy', 'Inne'];
const CATEGORY_INFO = {
  'Muzyka': 'Premiery, wywiady, koncerty i wszystko, co dzieje się na scenie.',
  'Recenzje': 'Oceny płyt, singli i EP – z rankingiem najlepszych.',
  'Kontrowersje': 'Afery, skandale i sprawy, o których się dyskutuje.',
  'Dramy': 'Konflikty, beefy i dramy ze świata rozrywki.',
  'Inne': 'Wszystko, co nie mieści się w pozostałych działach.'
};
const ALL = 'Wszystkie';

/* =========================================================
   2. NARZĘDZIA
   ========================================================= */
const Utils = {
  /** Taka sama funkcja jest w news/build/build.mjs – adresy muszą wychodzić identyczne. */
  slugify(text) {
    const map = { ą: 'a', ć: 'c', ę: 'e', ł: 'l', ń: 'n', ó: 'o', ś: 's', ź: 'z', ż: 'z' };
    let s = String(text || '').toLowerCase().replace(/[ąćęłńóśźż]/g, c => map[c]);
    s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    if (s.length > 60) s = s.slice(0, 60).replace(/-[^-]*$/, '');
    return s || 'artykul';
  },

  esc(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  },

  uid(prefix = 'a_') {
    return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  },

  _dateFmt: new Intl.DateTimeFormat('pl-PL', { dateStyle: 'long', timeStyle: 'short' }),
  formatDate(iso) {
    const d = new Date(iso);
    return isNaN(d) ? '' : this._dateFmt.format(d);
  },

  formatTime(iso) {
    const d = new Date(iso);
    return isNaN(d) ? '' : d.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
  },

  /** Zamienia datę na format pola datetime-local (czas lokalny): RRRR-MM-DDTGG:MM */
  toLocalInput(date) {
    const d = new Date(date);
    if (isNaN(d)) return '';
    const p = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
  },

  /** Lista kategorii artykułu (obsługuje stare artykuły z jedną kategorią). */
  catsOf(a) {
    if (a && Array.isArray(a.categories) && a.categories.length) return a.categories;
    return a && a.category ? [a.category] : [];
  },

  /** Bez wielkich liter i polskich znaków („Śliska” → „sliska”). */
  fold(s) { return String(s || '').toLowerCase().replace(/ł/g, 'l').normalize('NFD').replace(/[\u0300-\u036f]/g, ''); },

  STATUSES: { potwierdzone: 'Potwierdzone', niepotwierdzone: 'Niepotwierdzone', plotka: 'Plotka' },

  chipsHtml(a) {
    const nw = a && typeof Visit !== 'undefined' && Visit.isNew(a) ? '<span class="badge-new">NOWE</span>' : '';
    const st = a && this.STATUSES[a.status] ? `<span class="badge-status st-${a.status}">${this.STATUSES[a.status]}</span>` : '';
    return '<span class="chips">' + this.catsOf(a).map(c =>
      `<a class="chip" href="#/kategoria/${encodeURIComponent(c)}">${this.esc(c)}</a>`).join('') + nw + st + '</span>';
  },

  tagsOf(a) { return a && Array.isArray(a.tags) ? a.tags : []; },

  /** „a, b; #c” → ['a','b','c'] (bez duplikatów, maks. 12 tagów po 40 znaków). */
  parseTags(str) {
    const seen = new Set();
    const out = [];
    String(str || '').split(/[,;\n]/).forEach(raw => {
      const t = raw.trim().replace(/^#+/, '').slice(0, 40).trim();
      const k = t.toLowerCase();
      if (t && !seen.has(k)) { seen.add(k); out.push(t); }
    });
    return out.slice(0, 12);
  },

  same(a, b) { return String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase(); },

  /** „6,4” / „6.4” → liczba 0–10 (jedno miejsce po przecinku) albo null. */
  parseScore(v) {
    const n = parseFloat(String(v ?? '').replace(',', '.'));
    return isFinite(n) && n >= 0 && n <= 10 ? Math.round(n * 10) / 10 : null;
  },

  formatScore(n) {
    return Number(n).toLocaleString('pl-PL', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  },

  stripHtml(html) {
    const doc = new DOMParser().parseFromString(html || '', 'text/html');
    return (doc.body.textContent || '').replace(/\s+/g, ' ').trim();
  },

  countWords(text) {
    const t = String(text || '').trim();
    return t ? t.split(/\s+/).length : 0;
  },

  readingTime(article, plainText) {
    const words = this.countWords(`${article.lead || ''} ${plainText || ''}`);
    return Math.max(1, Math.ceil(words / 200));
  },

  debounce(fn, ms) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), ms);
    };
  },

  loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = () => reject(new Error('Nie udało się załadować: ' + src));
      document.head.appendChild(s);
    });
  },

  /**
   * Wczytuje obraz, zmniejsza go i kompresuje do JPEG tak, by mieścił się w budżecie (targetKB).
   * Najpierw obniża jakość, potem wymiary. Informację o oszczędności zostawia w Utils.lastImageInfo.
   */
  async fileToDataUrl(file, maxWidth = 1600, targetKB = 280) {
    if (!file || !file.type.startsWith('image/')) {
      throw new Error('Wybrany plik nie jest obrazem.');
    }
    const raw = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Nie udało się odczytać pliku.'));
      reader.readAsDataURL(file);
    });
    Utils.lastImageInfo = null;
    if (file.type === 'image/gif') {      // zachowaj animację, ale pilnuj rozmiaru
      if (file.size > 700 * 1024) throw new Error('Animowany GIF jest za duży (maks. ok. 700 KB). Zmniejsz go albo użyj zwykłego zdjęcia.');
      return raw;
    }

    const img = await new Promise((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error('Nie udało się wczytać obrazu.'));
      i.src = raw;
    });
    if (!img.naturalWidth) return raw;

    const budget = targetKB * 1024;
    const bytesOf = url => Math.round((url.length - url.indexOf(',') - 1) * 0.75);
    let width = Math.min(img.naturalWidth, maxWidth);
    let quality = 0.86;
    let out = '';
    for (let attempt = 0; attempt < 12; attempt++) {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = Math.round(img.naturalHeight * (width / img.naturalWidth));
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      out = canvas.toDataURL('image/jpeg', quality);
      if (bytesOf(out) <= budget) break;
      if (quality > 0.58) quality -= 0.07; else width = Math.round(width * 0.85);
      if (width < 480) break;
    }
    // jeśli oryginał jest już mniejszy od wyniku – zostaw oryginał
    if (file.size <= bytesOf(out) && file.size <= budget && img.naturalWidth <= maxWidth) {
      Utils.lastImageInfo = { before: file.size, after: file.size };
      return raw;
    }
    Utils.lastImageInfo = { before: file.size, after: bytesOf(out) };
    return out;
  },

  formatBytes(n) {
    return n >= 1048576 ? (n / 1048576).toFixed(1).replace('.', ',') + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB';
  },

  /** Zdjęcie profilowe: kadr do kwadratu, jakość jak od użytkownika (do 1600 px, JPEG 0,95; kompresja rośnie dopiero, gdy plik przekroczy limit zapisu). */
  async fileToSquare(file, size = 1600, maxChars = 900000) {
    let bmp = null;
    try { bmp = await createImageBitmap(file, { imageOrientation: 'from-image' }); } catch { /* starsza przeglądarka */ }
    let img = bmp;
    if (!img) {
      const url = URL.createObjectURL(file);
      try { img = await new Promise((resolve, reject) => { const i = new Image(); i.onload = () => resolve(i); i.onerror = () => reject(new Error('Nie udało się wczytać obrazu.')); i.src = url; }); }
      finally { setTimeout(() => URL.revokeObjectURL(url), 5000); }
    }
    const w = img.width || img.naturalWidth, h = img.height || img.naturalHeight;
    const side = Math.min(w, h);
    if (!side) throw new Error('Nie udało się wczytać obrazu.');
    const out = Math.min(size, side);                       // małych zdjęć nie powiększamy
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = out;
    const cx = canvas.getContext('2d'); cx.imageSmoothingEnabled = true; cx.imageSmoothingQuality = 'high';
    cx.drawImage(img, (w - side) / 2, (h - side) / 2, side, side, 0, 0, out, out);
    let q = 0.95, data = canvas.toDataURL('image/jpeg', q);
    while (data.length > maxChars && q > 0.6) { q -= 0.05; data = canvas.toDataURL('image/jpeg', q); }
    if (data.length > maxChars) {                           // bardzo „ciężkie” zdjęcie: zmniejszamy rozmiar, nie jakość
      let px = out;
      while (data.length > maxChars && px > 400) { px = Math.round(px * 0.85); canvas.width = canvas.height = px; cx.imageSmoothingQuality = 'high'; cx.drawImage(img, (w - side) / 2, (h - side) / 2, side, side, 0, 0, px, px); data = canvas.toDataURL('image/jpeg', 0.92); }
    }
    return data;
  },


  placeholder(category) {
    const hues = { 'Muzyka': 265, 'Kontrowersje': 350, 'Dramy': 330, 'Recenzje': 28, 'Inne': 205 };
    const hue = hues[category] ?? 200;
    // Płaski kolor kategorii, cienka ramka i duża obrysowa gwiazda (spójnie z grafikami na social media)
    const pts = Array.from({ length: 10 }, (_, i) => { const r = i % 2 ? 120 : 300, a = -Math.PI / 2 + i * Math.PI / 5; return (Math.cos(a) * r + 980).toFixed(1) + ',' + (Math.sin(a) * r + 300).toFixed(1); }).join(' ');
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">` +
      `<rect width="1280" height="720" fill="hsl(${hue},48%,17%)"/>` +
      `<polygon points="${pts}" fill="none" stroke="rgba(255,255,255,.14)" stroke-width="4" stroke-linejoin="round"/>` +
      `<rect x="20" y="20" width="1240" height="680" rx="28" fill="none" stroke="rgba(255,255,255,.12)" stroke-width="2"/>` +
      `<rect x="64" y="620" width="56" height="6" fill="hsl(${hue},85%,55%)"/></svg>`;
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }
};

/** Odtwarzacze YouTube / Spotify: rozpoznawanie linków i bezpieczne budowanie ramki (tylko zaufane adresy). */
const Embeds = {
  ID_RE: { youtube: /^[\w-]{11}$/, spotify: /^(track|album|playlist|artist|episode|show)\/[A-Za-z0-9]{22}$/ },
  valid(kind, id) { return !!this.ID_RE[kind] && this.ID_RE[kind].test(String(id || '')); },
  parse(input) {
    let u;
    try { u = new URL(String(input || '').trim()); } catch { return null; }
    if (!/^https?:$/.test(u.protocol)) return null;
    const host = u.hostname.replace(/^www\.|^m\./, '');
    if (host === 'youtu.be') {
      const id = u.pathname.slice(1).split('/')[0];
      return this.valid('youtube', id) ? { kind: 'youtube', id } : null;
    }
    if (host === 'youtube.com' || host === 'music.youtube.com') {
      let id = u.searchParams.get('v') || '';
      const m = u.pathname.match(/^\/(?:shorts|embed|live)\/([\w-]{11})/);
      if (m) id = m[1];
      return this.valid('youtube', id) ? { kind: 'youtube', id } : null;
    }
    if (host === 'open.spotify.com') {
      const m = u.pathname.match(/^\/(?:intl-[a-z]{2}\/)?(track|album|playlist|artist|episode|show)\/([A-Za-z0-9]{22})/);
      return m ? { kind: 'spotify', id: `${m[1]}/${m[2]}` } : null;
    }
    return null;
  },
  src(kind, id) {
    return kind === 'youtube'
      ? `https://www.youtube-nocookie.com/embed/${id}`
      : `https://open.spotify.com/embed/${id}`;
  },
  link(kind, id) {
    return kind === 'youtube' ? `https://www.youtube.com/watch?v=${id}` : `https://open.spotify.com/${id}`;
  },
  /** Zamienia puste bloki aside.article-embed na gotowy odtwarzacz (używane tylko do wyświetlania). */
  hydrate(root) {
    root.querySelectorAll('aside.article-embed').forEach(el => {
      const kind = el.getAttribute('data-kind');
      const id = el.getAttribute('data-id');
      if (!this.valid(kind, id)) { el.remove(); return; }
      el.textContent = '';
      el.className = `article-embed embed-${kind}`;
      const frame = document.createElement('div');
      frame.className = 'embed-frame';
      const f = document.createElement('iframe');
      f.src = this.src(kind, id);
      f.loading = 'lazy';
      f.title = kind === 'youtube' ? 'Film z YouTube' : 'Odtwarzacz Spotify';
      f.setAttribute('allow', 'autoplay; encrypted-media; fullscreen; picture-in-picture');
      f.setAttribute('allowfullscreen', '');
      f.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
      frame.appendChild(f);
      el.appendChild(frame);
      const a = document.createElement('a');
      a.className = 'embed-link';
      a.href = this.link(kind, id);
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.textContent = kind === 'youtube' ? 'Obejrzyj na YouTube ↗' : 'Posłuchaj na Spotify ↗';
      el.appendChild(a);
    });
  }
};

/** Czyści HTML artykułu (ochrona przed XSS – ważne przy bazie w chmurze) i łączy kolejne cytaty. */
const Sanitizer = {
  TAGS: new Set(['p', 'br', 'h2', 'h3', 'h4', 'strong', 'b', 'em', 'i', 'u', 's', 'blockquote',
    'ul', 'ol', 'li', 'a', 'img', 'figure', 'figcaption', 'span', 'div', 'aside']),
  DROP: new Set(['script', 'style', 'iframe', 'object', 'embed', 'link', 'meta', 'form', 'input',
    'button', 'textarea', 'select', 'svg', 'math', 'base', 'template']),
  ATTRS: { a: ['href'], img: ['src', 'alt'], aside: ['data-kind', 'data-id'], '*': ['class'] },

  clean(html) {
    const doc = new DOMParser().parseFromString(`<body>${html || ''}</body>`, 'text/html');
    this._walk(doc.body);
    this._collapse(doc.body);
    return doc.body.innerHTML;
  },

  /** Jeden Enter = nowa linia, dwa Entery = jedna pusta linia. Nadmiarowe puste akapity znikają. */
  _collapse(body) {
    const isEmpty = el => el.tagName === 'P' && !el.querySelector('img,figure') && el.textContent.trim() === '';
    const isHeading = el => !!el && /^H[1-6]$/.test(el.tagName);
    let prevEmpty = true; // puste akapity na początku też usuwamy
    Array.from(body.children).forEach(el => {
      if (isEmpty(el)) {
        // Nagłówek ma własny odstęp – pusta linia obok niego byłaby podwójną przerwą
        if (prevEmpty || isHeading(el.previousElementSibling) || isHeading(el.nextElementSibling)) el.remove(); else prevEmpty = true;
      } else {
        prevEmpty = false;
      }
    });
    while (body.lastElementChild && isEmpty(body.lastElementChild)) body.lastElementChild.remove();
  },

  /** HTML do wyświetlenia czytelnikowi: oczyszczony, a stare cytaty (blockquote) zamienione na nowy wygląd cytatu. */
  render(html) {
    const doc = new DOMParser().parseFromString(`<body>${this.upgradeQuotes(this.clean(html))}</body>`, 'text/html');
    Embeds.hydrate(doc.body);
    return doc.body.innerHTML;
  },

  /** Kolejne stare cytaty <blockquote> łączy w jeden blok cytatu (aside.article-quote). */
  upgradeQuotes(html) {
    const doc = new DOMParser().parseFromString(`<body>${html || ''}</body>`, 'text/html');
    let group = null;
    Array.from(doc.body.children).forEach(el => {
      if (el.tagName !== 'BLOCKQUOTE') { group = null; return; }
      const text = (el.innerText !== undefined ? el.innerText : el.textContent).trim() || el.textContent.trim();
      if (group) {
        const q = group.querySelector('.q-text');
        q.textContent += '\n' + text;
        el.remove();
      } else {
        const aside = doc.createElement('aside');
        aside.className = 'article-quote';
        const p = doc.createElement('p');
        p.className = 'q-text';
        p.textContent = text;
        aside.appendChild(p);
        el.replaceWith(aside);
        group = aside;
      }
    });
    return doc.body.innerHTML;
  },

  _walk(node) {
    Array.from(node.childNodes).forEach(child => {
      if (child.nodeType === Node.TEXT_NODE) return;
      if (child.nodeType !== Node.ELEMENT_NODE) { child.remove(); return; }

      const tag = child.tagName.toLowerCase();
      if (this.DROP.has(tag)) { child.remove(); return; }

      this._walk(child);

      if (!this.TAGS.has(tag)) {
        child.replaceWith(...Array.from(child.childNodes));
        return;
      }

      Array.from(child.attributes).forEach(attr => {
        const name = attr.name.toLowerCase();
        const allowed = (this.ATTRS[tag] || []).includes(name) || this.ATTRS['*'].includes(name);
        if (!allowed) { child.removeAttribute(attr.name); return; }
        const val = attr.value.trim();
        if (name === 'href' && !/^(https?:|mailto:|\/|#)/i.test(val)) child.removeAttribute('href');
        if (name === 'src' && !/^(https?:|data:image\/(png|jpe?g|gif|webp);base64,)/i.test(val)) child.removeAttribute('src');
      });

      if (tag === 'a') {
        child.setAttribute('target', '_blank');
        child.setAttribute('rel', 'noopener noreferrer');
      }
      if (tag === 'img') child.setAttribute('loading', 'lazy');
      if (tag === 'aside' && child.classList.contains('article-embed') && !Embeds.valid(child.getAttribute('data-kind'), child.getAttribute('data-id'))) child.remove();
    });
  }
};

/* =========================================================
   3. DANE STARTOWE (tylko tryb localStorage / demonstracyjny)
   ========================================================= */
function seedArticles() {
  const now = Date.now();
  const ago = minutes => new Date(now - minutes * 60000).toISOString();

  return [
    {
      id: 'seed-1',
      title: 'Witamy w Śliska News – tak wygląda artykuł z ramką faktów i cytatem',
      lead: 'To artykuł demonstracyjny trybu lokalnego. Zaloguj się jako redaktor, aby dodawać, edytować i planować własne materiały.',
      category: 'Muzyka',
      author: 'Redakcja Śliska News',
      image: '',
      urgent: false,
      featured: true,
      content:
        '<h2>Jak to działa?</h2>' +
        '<p>Kliknięcie w kafel otwiera artykuł <strong>bez przeładowania strony</strong>, a adres w przeglądarce można skopiować i wysłać dalej.</p>' +
        '<blockquote>Pierwsza linia cytatu.</blockquote>' +
        '<blockquote>Druga linia – cytat jest ciągły, bez przerw między liniami.</blockquote>' +
        '<h3>Co potrafi redaktor?</h3>' +
        '<ul><li>pisać w edytorze z autozapisem wersji roboczych,</li><li>planować publikację na wybraną godzinę,</li><li>dodawać ramkę faktów i zdjęcia z podpisem.</li></ul>',
      createdAt: ago(20),
      updatedAt: ago(20)
    },
    {
      id: 'seed-2',
      title: 'PILNE: przykładowy komunikat na pasku najświeższych wiadomości',
      lead: 'Artykuł oznaczony flagą „Pilne” pojawia się w czerwonym pasku na samej górze serwisu.',
      category: 'Dramy',
      author: 'Redakcja Śliska News',
      image: '',
      urgent: true,
      featured: false,
      content: '<p>To przykładowy materiał demonstracyjny. Flagę <strong>„Pilne”</strong> ustawia się w panelu Ustawienia w edytorze.</p>',
      createdAt: ago(45),
      updatedAt: ago(45)
    },
    {
      id: 'seed-3',
      title: 'Przykładowy materiał z kategorii Kontrowersje',
      lead: 'Każdy kafel na stronie głównej zawiera zdjęcie, kategorię, tytuł, zajawkę oraz datę publikacji.',
      category: 'Kontrowersje',
      author: 'Anna Kowalska',
      image: '',
      urgent: false,
      featured: false,
      content: '<p>Wyszukiwarka w nagłówku filtruje kafle na żywo – po tytule, zajawce i treści artykułu.</p>',
      createdAt: ago(180),
      updatedAt: ago(180)
    }
    ,
    {
      id: 'seed-4',
      title: 'Recenzja: nowy album, który dzieli słuchaczy',
      lead: 'Przykładowa recenzja z oceną w kółku – wystarczy zaznaczyć „Dodaj ocenę” w edytorze.',
      category: 'Recenzje',
      categories: ['Muzyka', 'Recenzje'],
      author: 'Redakcja Śliska News',
      image: '',
      urgent: false,
      featured: false,
      review: { score: 9.1, coverSame: true, cover: '', kind: 'Albumy', work: 'Przykładowy album', artist: 'Przykładowy zespół', year: '2026' },
      content: '<p>To materiał demonstracyjny trybu lokalnego.</p><p><br></p><p>Pusta linia powyżej powstała po dwóch Enterach.</p>',
      createdAt: ago(300),
      updatedAt: ago(300)
    }
  ];
}

/* =========================================================
   4. DATASERVICE – warstwa danych
   Provider udostępnia: init, watch, save, remove,
   getDrafts, getDraft, saveDraft, removeDraft
   ========================================================= */
const PROFILE_KEY = 'sliska_profile_v1';
/** Profil (nazwa, zdjęcie) jest osobny dla każdego redaktora – także jego kopia w przeglądarce. */
function profileCacheKey() {
  const uid = Auth.uid();
  return uid && uid !== 'local' ? `${PROFILE_KEY}_${uid}` : PROFILE_KEY;
}
function readLocalProfile() {
  try { return JSON.parse(localStorage.getItem(profileCacheKey())); } catch { return null; }
}
function writeLocalProfile(p) {
  try { localStorage.setItem(profileCacheKey(), JSON.stringify(p)); } catch { /* ignoruj */ }
}

const LocalProvider = {
  listeners: [],

  async init() {
    try {
      if (localStorage.getItem(CONFIG.LOCAL_KEY) === null) {
        localStorage.setItem(CONFIG.LOCAL_KEY, JSON.stringify(seedArticles()));
      }
    } catch (e) {
      console.warn('localStorage niedostępny:', e);
    }
    // Synchronizacja między kartami przeglądarki
    window.addEventListener('storage', e => {
      if (e.key === CONFIG.LOCAL_KEY) this._emit();
    });
  },

  _get(key) {
    try {
      return JSON.parse(localStorage.getItem(key)) || [];
    } catch {
      return [];
    }
  },

  _set(key, list) {
    try {
      localStorage.setItem(key, JSON.stringify(list));
    } catch {
      throw new Error('Brak miejsca w pamięci przeglądarki (limit ok. 5 MB). Użyj mniejszych zdjęć lub linków URL.');
    }
  },

  // Zwraca aktualną listę i zapamiętuje funkcję wywoływaną przy każdej zmianie
  async watch(onChange) {
    this.listeners.push(onChange);
    return this._get(CONFIG.LOCAL_KEY);
  },

  async save() { throw new Error('Niedostępne w wersji publicznej.'); },

  async remove() { throw new Error('Niedostępne w wersji publicznej.'); },

  async getProfile() { return readLocalProfile(); },
  async saveProfile(p) { writeLocalProfile(p); },

  async getAllArticles() { return this._get(CONFIG.LOCAL_KEY); },

  async addTip(tip) {
    const list = this._get(CONFIG.LOCAL_TIPS_KEY);
    list.push(tip);
    this._set(CONFIG.LOCAL_TIPS_KEY, list);
  },
  async getTips() { throw new Error('Niedostępne w wersji publicznej.'); },
  async removeTip() { throw new Error('Niedostępne w wersji publicznej.'); },
  async updateTip() { throw new Error('Niedostępne w wersji publicznej.'); },

  async getDrafts() { throw new Error('Niedostępne w wersji publicznej.'); },

  async getDraft() { throw new Error('Niedostępne w wersji publicznej.'); },

  async saveDraft() { throw new Error('Niedostępne w wersji publicznej.'); },

  async removeDraft() { throw new Error('Niedostępne w wersji publicznej.'); },

  _emit() {
    const list = this._get(CONFIG.LOCAL_KEY);
    this.listeners.forEach(cb => cb(list));
  }
};

const FirebaseProvider = {
  db: null,
  auth: null,

  col() { return this.db.collection(CONFIG.FIREBASE_COLLECTION); },
  dcol() { return this.db.collection(CONFIG.FIREBASE_DRAFTS_COLLECTION); },

  async init() {
    const cfg = CONFIG.FIREBASE_CONFIG;
    if (!cfg.apiKey || String(cfg.apiKey).startsWith('WKLEJ')) {
      throw new Error('Nie wklejono kluczy Firebase w CONFIG.FIREBASE_CONFIG.');
    }
    const v = CONFIG.FIREBASE_SDK_VERSION;
    await Utils.loadScript(`https://www.gstatic.com/firebasejs/${v}/firebase-app-compat.js`);
    await Utils.loadScript(`https://www.gstatic.com/firebasejs/${v}/firebase-firestore-compat.js`);

    if (!firebase.apps.some(a => a.name === '[DEFAULT]')) firebase.initializeApp(cfg);
    this.db = firebase.firestore();
    this.auth = null;

  },

  _wrap(err) {
    if (err && err.code === 'permission-denied') {
      return new Error('Brak uprawnień do zapisu. Zaloguj się kontem redaktora i sprawdź reguły Firestore.');
    }
    return err;
  },

  // Jeden nasłuch zamiast dwóch odczytów: pierwsza paczka danych wraca z obietnicą,
  // kolejne zmiany trafiają do onChange (na żywo, dla wszystkich odwiedzających)
  watch(onChange) {
    return new Promise((resolve, reject) => {
      let first = true;
      this.col()
        .orderBy('createdAt', 'desc')
        .limit(CONFIG.MAX_ARTICLES)
        .onSnapshot(
          snap => {
            const list = snap.docs.map(d => d.data());
            if (first) { first = false; resolve(list); } else { onChange(list); }
          },
          err => {
            console.error('Błąd odczytu z Firestore:', err);
            if (first) { first = false; reject(err); }
          }
        );
    });
  },

  _checkSize(obj) {
    // Dokument Firestore może mieć maks. ok. 1 MiB
    if (JSON.stringify(obj).length > 900000) {
      throw new Error('Dokument jest zbyt duży dla bazy (limit ok. 1 MB). Zmniejsz zdjęcia lub użyj linków URL.');
    }
  },

  async save(article) {
    if (!this.auth.currentUser) throw new Error('Zaloguj się, aby zapisywać artykuły.');
    this._checkSize(article);
    try {
      await this.col().doc(article.id).set(article);
    } catch (err) {
      throw this._wrap(err);
    }
  },

  async remove(id) {
    if (!this.auth.currentUser) throw new Error('Zaloguj się, aby usuwać artykuły.');
    try {
      await this.col().doc(id).delete();
    } catch (err) {
      throw this._wrap(err);
    }
  },

  // Wszystkie artykuły (także starsze niż limit na stronie) – do kopii zapasowej
  async getAllArticles() {
    if (!this.auth.currentUser) throw new Error('Zaloguj się, aby pobrać kopię zapasową.');
    const snap = await this.col().get();
    return snap.docs.map(d => d.data());
  },

  async addTip(tip) {
    try {
      await this.db.collection(CONFIG.FIREBASE_TIPS_COLLECTION).doc(tip.id).set(tip);
    } catch (err) {
      if (err && err.code === 'permission-denied') throw new Error('Zgłoszenia są chwilowo niedostępne. Spróbuj później.');
      throw err;
    }
  },
  async getTips() {
    if (!this.auth.currentUser) return [];
    const snap = await this.db.collection(CONFIG.FIREBASE_TIPS_COLLECTION).orderBy('createdAt', 'desc').limit(200).get();
    return snap.docs.map(d => d.data());
  },
  async updateTip(id, patch) {
    if (!this.auth.currentUser) throw new Error('Zaloguj się, aby zmienić status zgłoszenia.');
    await this.db.collection(CONFIG.FIREBASE_TIPS_COLLECTION).doc(id).update(patch);
  },
  async removeTip(id) {
    if (!this.auth.currentUser) throw new Error('Zaloguj się, aby usuwać zgłoszenia.');
    try { await this.db.collection(CONFIG.FIREBASE_TIPS_COLLECTION).doc(id).delete(); } catch (err) { throw this._wrap(err); }
  },

  async getProfile() {
    const user = this.auth.currentUser;
    if (!user) return null;
    const own = await this.db.collection('meta').doc('profile_' + user.uid).get();
    if (own.exists) return own.data();
    // dotychczasowy, wspólny profil przechodzi tylko na pierwsze konto redakcji; nowe konta zaczynają od pustego
    if (CONFIG.LEGACY_PROFILE_UID && user.uid === CONFIG.LEGACY_PROFILE_UID) {
      const old = await this.db.collection('meta').doc('profile').get();
      return old.exists ? old.data() : null;
    }
    return null;
  },

  async saveProfile() { throw new Error('Niedostępne w wersji publicznej.'); },

  async getDrafts() {
    if (!this.auth.currentUser) return [];
    // tylko wersje robocze zalogowanego redaktora (reguły Firestore też to wymuszają)
    const snap = await this.dcol().where('ownerUid', '==', this.auth.currentUser.uid).limit(100).get();
    return snap.docs.map(d => d.data()).sort((a, b) => String(b.savedAt).localeCompare(String(a.savedAt))).slice(0, 50);
  },

  async getDraft(id) {
    if (!this.auth.currentUser) return null;
    let snap;
    try { snap = await this.dcol().doc(id).get(); } catch (err) { return null; }   // cudza wersja robocza: reguły odmawiają dostępu
    const d = snap.exists ? snap.data() : null;
    return d && (!d.ownerUid || d.ownerUid === this.auth.currentUser.uid) ? d : null;
  },

  async saveDraft(draft) {
    if (!this.auth.currentUser) throw new Error('Zaloguj się, aby zapisywać wersje robocze.');
    draft = { ...draft, ownerUid: this.auth.currentUser.uid };
    this._checkSize(draft);
    try {
      await this.dcol().doc(draft.id).set(draft);
    } catch (err) {
      throw this._wrap(err);
    }
  },

  async saveOg() { throw new Error('Niedostępne w wersji publicznej.'); },
  async removeOg() { throw new Error('Niedostępne w wersji publicznej.'); },

  async removeDraft(id) {
    if (!this.auth.currentUser) return;
    try {
      await this.dcol().doc(id).delete();
    } catch (err) {
      throw this._wrap(err);
    }
  }
};

/** Provider „awaryjny”: gdy Firebase nie działa, a localStorage jest wyłączony w CONFIG. */
const OfflineProvider = {
  async init() {},
  async watch() { return []; },
  async save() { throw new Error('Brak połączenia z bazą danych.'); },
  async remove() { throw new Error('Brak połączenia z bazą danych.'); },
  async getProfile() { return null; },
  async saveProfile() { throw new Error('Brak połączenia z bazą danych.'); },
  async getDrafts() { return []; },
  async getDraft() { return null; },
  async saveDraft() { throw new Error('Brak połączenia z bazą danych.'); },
  async removeDraft() {},
  async getAllArticles() { return []; },
  async addTip() { throw new Error('Brak połączenia z bazą danych.'); },
  async getTips() { return []; },
  async removeTip() { throw new Error('Brak połączenia z bazą danych.'); },
  async updateTip() { throw new Error('Brak połączenia z bazą danych.'); }
};

const DataService = {
  provider: null,
  mode: 'local',          // 'firebase' | 'local' | 'offline'
  fallbackReason: '',

  async init() {
    if (CONFIG.USE_FIREBASE) {
      try {
        await FirebaseProvider.init();
        this.provider = FirebaseProvider;
        this.mode = 'firebase';
        return;
      } catch (err) {
        console.warn('Firebase niedostępny:', err);
        this.fallbackReason = err.message;
        if (!CONFIG.ALLOW_LOCAL_FALLBACK) {
          this.provider = OfflineProvider;
          this.mode = 'offline';
          return;
        }
      }
    }
    await LocalProvider.init();
    this.provider = LocalProvider;
    this.mode = 'local';
  },

  // Zwraca (obietnicą) pierwszą listę artykułów; zmiany później trafiają do onChange
  watch(onChange) { return this.provider.watch(onChange); },
  save(article) { return this.provider.save(article); },
  remove(id) { return this.provider.remove(id); },
  getProfile() { return this.provider.getProfile(); },
  saveProfile(p) { return this.provider.saveProfile(p); },
  getDrafts() { return this.provider.getDrafts(); },
  getDraft(id) { return this.provider.getDraft(id); },
  saveDraft(draft) { return this.provider.saveDraft(draft); },
  removeDraft(id) { return this.provider.removeDraft(id); },
  saveOg(id, img) { return this.provider.saveOg ? this.provider.saveOg(id, img) : Promise.resolve(); },
  removeOg(id) { return this.provider.removeOg ? this.provider.removeOg(id) : Promise.resolve(); },
  getAllArticles() { return this.provider.getAllArticles(); },
  addTip(t) { return this.provider.addTip(t); },
  getTips() { return this.provider.getTips(); },
  removeTip(id) { return this.provider.removeTip(id); },
  updateTip(id, patch) { return this.provider.updateTip(id, patch); }
};

/* =========================================================
   5. AUTH – logowanie redaktora
   - tryb Firebase: Firebase Authentication (e-mail + hasło)
   - tryb localStorage: hasło z CONFIG.ADMIN_PASSWORD (sessionStorage)
   ========================================================= */
function authError(code) {
  const e = new Error(code);
  e.code = code;
  return e;
}

const Auth = {
  mode: 'offline',
  uid() { return ''; },
  get useFirebase() { return false; },
  isAdmin() { return false; },
  async login() { throw authError('app/offline'); },
  async logout() {},
  onChange() {},
  explain() { return 'Logowanie redakcji jest dostępne tylko w środowisku deweloperskim.'; }
};

/* =========================================================
   6. APLIKACJA (UI)
   ========================================================= */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const state = {
  articles: [],
  plain: new Map(),       // id -> tekst bez HTML (wyszukiwarka, czas czytania)
  ready: false,
  loadError: false,
  category: ALL,
  tag: '',
  artist: '',
  author: '',
  rank: { kind: 'Wszystkie', year: 'Wszystkie' },
  tips: [],
  query: '',
  visible: CONFIG.PAGE_SIZE,
  profile: EMPTY_PROFILE(),
  profileLoaded: false,
  profileUid: '',
  lastTick: Date.now()
};

const editor = {
  quill: null,
  session: 0,           // znacznik sesji edycji (chroni przed wyścigami przy szybkiej zmianie widoku)
  active: false,
  mode: 'new',          // 'new' | 'edit' | 'draft'
  draftId: null,
  articleId: null,
  existing: null,       // edytowany artykuł (opublikowany lub zaplanowany)
  image: '',            // zdjęcie główne (URL lub Base64)
  pos: { x: 50, y: 50, z: 1 },   // kadr zdjęcia głównego (punkt ostrości w % i przybliżenie)
  cover: '',            // własna okładka recenzji (URL lub Base64)
  author: '',           // autor – z profilu redaktora (nowy artykuł) albo z edytowanego artykułu
  modalImage: '',       // zdjęcie wstawiane do treści
  related: [],          // ręcznie wybrane „Zobacz też” (id artykułów)
  gallery: { items: [], editing: null },
  range: null,
  editingFigure: null,
  editingEmbed: null,
  editingQuote: null,  // indeks edytowanego zdjęcia w treści
  dirty: false,
  restoring: false,
  lastCloud: '',
  bufferTimer: null,
  cloudTimer: null
};

/* ---------- Pomocnicze UI ---------- */
/** Krótka informacja o tym, ile udało się zaoszczędzić na zdjęciu. */
function imageNote() {
  const i = Utils.lastImageInfo;
  return i && i.before > i.after * 1.25 ? ` Zmniejszono z ${Utils.formatBytes(i.before)} do ${Utils.formatBytes(i.after)}.` : '';
}

function toast(message, type = 'info') {
  const el = $('#toast');
  el.textContent = message;
  el.className = 'toast' + (type === 'error' ? ' error' : '');
  el.hidden = false;
  clearTimeout(toast.t);
  toast.t = setTimeout(() => { el.hidden = true; }, type === 'error' ? 6000 : 3500);
}

function openModal(id) {
  const m = $('#' + id);
  m.hidden = false;
  document.body.classList.add('modal-open');
  const focusTarget = $$('input:not([type=file]), textarea', m).find(el => el.offsetParent !== null);
  if (focusTarget) setTimeout(() => focusTarget.focus(), 30);
}

function closeModal(id) {
  if (id === 'rename-modal' && typeof renameRequired === 'function' && renameRequired()) return;     // tego okna nie da się zamknąć
  $('#' + id).hidden = true;
  if (!$$('.modal').some(m => !m.hidden)) document.body.classList.remove('modal-open');
}

function isPublished(a) {
  const t = Date.parse(a.createdAt);
  return isNaN(t) || t <= Date.now();
}

function sortedArticles() {
  return [...state.articles].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function publishedArticles() { return sortedArticles().filter(a => isPublished(a) && !a.quick); }
function publishedQuick() { return sortedArticles().filter(a => a.quick && isPublished(a)); }

function scheduledArticles() {
  return state.articles.filter(a => !a.quick && !isPublished(a)).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
}

function setArticles(list) {
  state.articles = Array.isArray(list) ? list : [];
  state.plain = new Map(state.articles.map(a => [a.id, Utils.stripHtml(a.content)]));
}

/** Kadr zdjęcia głównego (wybrany w edytorze): punkt ostrości i przybliżenie. Działa tylko dla zdjęcia głównego artykułu. */
function imgFocus(a, src) {
  const p = a && a.imagePos;
  if (!p || !a.image || (src !== undefined && src !== a.image)) return '';
  const x = Math.min(100, Math.max(0, Number(p.x))), y = Math.min(100, Math.max(0, Number(p.y))), z = Math.min(3, Math.max(1, Number(p.z) || 1));
  if (!Number.isFinite(x) || !Number.isFinite(y) || (x === 50 && y === 50 && z === 1)) return '';
  return ` style="object-position:${x}% ${y}%;transform-origin:${x}% ${y}%${z > 1 ? ';scale:' + z : ''}"`;
}
function getImage(a) { return a.image || Utils.placeholder(Utils.catsOf(a)[0]); }

function sourceTag(src) {
  return src ? `<span class="img-source">${Utils.esc(src)}</span>` : '';
}

const BEST_SCORE = 8.5; // powyżej tej oceny kółko dostaje strzałki „wyróżnienia”
const BEST_ARROWS = '<svg class="score-arrows" viewBox="0 0 100 40" aria-hidden="true"><polygon points="0,40 24,16 24,40"/><polygon points="100,40 76,16 76,40"/><polygon points="50,0 68,20 56,20 56,40 44,40 44,20 32,20"/></svg>';

/** Miernik łukowy: wypełnienie łuku odpowiada ocenie (0–10); powyżej 8,5 – czerwony ze znacznikami. */
function scoreHtml(score) {
  const best = score > BEST_SCORE;
  const r = 66;
  const len = Math.PI * r;
  const filled = Math.max(0.001, Math.min(1, score / 10)) * len;
  const arc = `M${-r},0 A${r},${r} 0 0 1 ${r},0`;
  const ticks = best
    ? Array.from({ length: 11 }, (_, i) => `<path d="M0,-80 L0,-90" transform="rotate(${-90 + i * 18})"/>`).join('')
    : '';
  return `<div class="score-wrap${best ? ' best' : ''}">
    <svg class="score-gauge" viewBox="-86 -96 172 112" role="img" aria-label="Ocena ${Utils.formatScore(score)} na 10">
      <path class="gauge-track" d="${arc}"/>
      <path class="gauge-fill" d="${arc}" stroke-dasharray="${filled.toFixed(1)} ${len.toFixed(1)}"/>
      ${best ? `<g class="gauge-ticks">${ticks}</g>` : ''}
      <text x="0" y="-2" text-anchor="middle" class="gauge-num">${Utils.formatScore(score)}</text>
    </svg>
  </div>`;
}

/** Okładka recenzji: własna albo (gdy zaznaczono / brak własnej) zdjęcie główne. */
function reviewSameCover(a) { const r = a.review; return !!r && (r.coverSame || !r.cover); }
function coverOf(a) {
  const r = a.review;
  if (!r) return '';
  return reviewSameCover(a) ? (a.image || '') : r.cover;
}

/** Miniatura na liście: w kategorii „Recenzje” okładka, wszędzie indziej zdjęcie główne. */
function thumbFor(a, useCover) {
  if (useCover && Utils.catsOf(a).includes('Recenzje')) {
    const c = coverOf(a);
    if (c) return c;
  }
  return getImage(a);
}


/* ---------- Oceny czytelników (API w Cloudflare Workerze) ---------- */
/** Kto jest „zalogowany do interakcji”: czytelnik (konto z projektu sliska-users) albo redaktor (konto z projektu redakcji). */
async function actorAuth() {
  try {
    if (typeof Readers !== 'undefined' && Readers.user) return { authorization: 'Bearer ' + await Readers.user.getIdToken() };
    const u = Auth.isAdmin() && FirebaseProvider.auth && FirebaseProvider.auth.currentUser;
    if (u) return { authorization: 'Bearer ' + await u.getIdToken() };
  } catch { /* brak tokenu – działamy anonimowo */ }
  return {};
}
const isStaffActor = () => false;
const staffName = () => isStaffActor() ? ((state.profile && state.profile.name) || 'Redakcja') : undefined;
async function actorApi(path, opts = {}) {
  const r = await fetch(CONFIG.API_BASE + path, { ...opts, headers: { 'content-type': 'application/json', ...(await actorAuth()), ...(opts.headers || {}) }, cache: 'no-store' });
  let d = {}; try { d = await r.json(); } catch { /* ignoruj */ }
  if (!r.ok) { if (d.error === 'session_revoked' || d.error === 'session_expired') { try { Readers.auth && Readers.auth.signOut(); } catch { /* ignoruj */ } } const e = new Error(d.error || 'http'); e.error = d.error || 'http'; e.data = d; throw e; }
  return d;
}

const Votes = {
  MIN_SHOWN: 3,                       // tyle ocen potrzeba, żeby pokazać średnią
  _all: null, _allAt: 0,
  token() {
    try {
      let t = localStorage.getItem('sliska_vote_tok');
      if (!t || !/^[A-Za-z0-9_-]{16,64}$/.test(t)) {
        t = Array.from(crypto.getRandomValues(new Uint8Array(24)), b => b.toString(36).padStart(2, '0')).join('').slice(0, 32);
        localStorage.setItem('sliska_vote_tok', t);
      }
      return t;
    } catch { return 'anon' + Math.random().toString(36).slice(2, 12) + Date.now().toString(36); }
  },
  async summary(id) {
    try {
      const r = await fetch(`${CONFIG.API_BASE}/votes?article=${encodeURIComponent(id)}&token=${encodeURIComponent(this.token())}`, { cache: 'no-store', headers: await actorAuth() });
      if (!r.ok || !/json/.test(r.headers.get('content-type') || '')) return null;
      const j = await r.json();
      return typeof j.n === 'number' ? j : null;
    } catch { return null; }
  },
  async send(id, score) {
    try {
      const r = await fetch(`${CONFIG.API_BASE}/vote`, { method: 'POST', headers: { 'content-type': 'application/json', ...(await actorAuth()) }, body: JSON.stringify({ article: id, score, token: this.token(), staffName: staffName() }) });
      let data = {}; try { data = await r.json(); } catch { /* ignoruj */ }
      return { status: r.status, data };
    } catch { return { status: 0, data: {} }; }
  },
  async all() {
    if (this._all && Date.now() - this._allAt < 60000) return this._all;
    try {
      const r = await fetch(`${CONFIG.API_BASE}/votes`);
      if (!r.ok || !/json/.test(r.headers.get('content-type') || '')) return {};
      this._all = await r.json(); this._allAt = Date.now();
      return this._all;
    } catch { return {}; }
  }
};


/* ---------- Powiadomienia push o nowych artykułach ---------- */
const Push = {
  supported() { return !document.documentElement.classList.contains('is-mac-app') && location.protocol === 'https:' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window; },
  isIos() { return /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); },
  standalone() { return window.navigator.standalone === true || (window.matchMedia && matchMedia('(display-mode: standalone)').matches); },
  key(b64) { const pad = '='.repeat((4 - b64.length % 4) % 4); const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from(raw, c => c.charCodeAt(0)); },
  async sub() { try { const reg = await navigator.serviceWorker.ready; return await reg.pushManager.getSubscription(); } catch { return null; } },
  async post(path, endpoint) { return fetch(`${CONFIG.API_BASE}/push/${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ endpoint }) }); },
  async enable() {
    const kr = await fetch(`${CONFIG.API_BASE}/push/key`).then(r => r.ok ? r.json() : null).catch(() => null);
    if (!kr || !kr.key) throw new Error('Powiadomienia są chwilowo niedostępne.');
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') throw new Error('Powiadomienia są zablokowane – włącz je w ustawieniach przeglądarki dla tej strony.');
    const reg = await navigator.serviceWorker.ready;
    const sub = (await reg.pushManager.getSubscription()) || await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: this.key(kr.key) });
    const r = await this.post('subscribe', sub.endpoint);
    this.link();
    if (!r.ok) { try { await sub.unsubscribe(); } catch { /* ignoruj */ } throw new Error('Nie udało się włączyć powiadomień. Spróbuj później.'); }
  },
  /** Zalogowany czytelnik: powiąż to urządzenie z kontem, żeby dostawać powiadomienia o odpowiedziach. */
  async link() { try { const sb = await this.sub(); if (sb && (Readers.loggedIn() || isStaffActor())) await actorApi('/push/subscribe', { method: 'POST', body: JSON.stringify({ endpoint: sb.endpoint }) }); } catch { /* ignoruj */ } },
  async unlink() { try { const sb = await this.sub(); if (sb) await this.post('unlink', sb.endpoint); } catch { /* ignoruj */ } },
  async disable() {
    const sub = await this.sub();
    if (!sub) return;
    const ep = sub.endpoint;
    try { await sub.unsubscribe(); } catch { /* ignoruj */ }
    try { await this.post('unsubscribe', ep); } catch { /* ignoruj */ }
  }
};

const isStaffViewer = () => { const st = Auth.isAdmin() || ['editor', 'chief', 'owner'].includes(myRole()) || !!(Readers.me && Readers.me.crown); try { document.body.classList.toggle('is-staff', st); } catch { /* ignoruj */ } return st; };
async function updatePushButton() {
  const b = $('#btn-push');
  if (!b) return;
  const staffViewer = isStaffViewer();   // redakcja i Właściciel nie potrzebują dzwonka
  const usable = !staffViewer && (Push.supported() || (Push.isIos() && !Push.standalone()));
  b.hidden = !usable;
  if (!usable) return;
  const on = Push.supported() && Notification.permission === 'granted' && !!(await Push.sub());
  b.classList.toggle('is-on', on);
  b.setAttribute('aria-pressed', on);
  b.title = on ? 'Powiadomienia włączone – kliknij, aby wyłączyć' : 'Włącz powiadomienia o nowych artykułach';
}

/** Przy każdym wejściu na stronę: prośba o włączenie powiadomień (tylko gdy ktoś jeszcze ich nie włączył). */
async function maybeAskPush() {
  try {
    if (typeof Readers !== 'undefined' && Readers.loading && !maybeAskPush.retried) { maybeAskPush.retried = true; setTimeout(maybeAskPush, 3500); return; }
    if (isStaffViewer()) return;               // redakcja i Właściciel nie dostają prośby o powiadomienia
    const iosBrowser = Push.isIos() && !Push.standalone() && !Push.supported();
    if (!Push.supported() && !iosBrowser) return;
    if (Push.supported()) {
      if (Notification.permission === 'denied') return;
      if (Notification.permission === 'granted') { const sb = await Push.sub(); if (sb) { Push.post('subscribe', sb.endpoint).catch(() => {}); return; } }
      const kr = await fetch(`${CONFIG.API_BASE}/push/key`).then(r => r.ok ? r.json() : null).catch(() => null);
      if (!kr || !kr.key) return;      // backend powiadomień niedostępny (np. tryb demo)
    }
    if (document.querySelector('.modal:not([hidden])')) return;
    $('#push-ask-ios').hidden = !iosBrowser;
    $('#push-ask-yes').hidden = iosBrowser;
    $('#push-ask-text').hidden = iosBrowser;
    openModal('push-modal');
  } catch { /* brak popupu */ }
}

async function pushAskYes() {
  const btn = $('#push-ask-yes'); btn.disabled = true;
  try { await Push.enable(); closeModal('push-modal'); toast('Gotowe! Dostaniesz powiadomienie o nowym artykule.'); }
  catch (err) { closeModal('push-modal'); toast(err.message || 'Nie udało się włączyć powiadomień.', 'error'); }
  finally { btn.disabled = false; updatePushButton(); }
}

async function togglePush() {
  if (!Push.supported()) {
    toast(Push.isIos() ? 'Na iPhonie: Udostępnij → „Do ekranu początkowego”, otwórz stronę z ikony i dopiero wtedy włącz dzwonek.' : 'Ta przeglądarka nie obsługuje powiadomień.', 'error');
    return;
  }
  const b = $('#btn-push'); b.disabled = true;
  try {
    if (b.classList.contains('is-on')) { await Push.disable(); toast('Powiadomienia wyłączone.'); }
    else { await Push.enable(); toast('Gotowe! Dostaniesz powiadomienie o nowym artykule.'); }
  } catch (err) { toast(err.message || 'Nie udało się zmienić powiadomień.', 'error'); }
  finally { b.disabled = false; updatePushButton(); }
}

const fmt1 = n => Utils.formatScore(Math.round(n * 10) / 10);

function votersHtml(list) {
  if (!list || !list.length) return '';
  return `<div class="rv-who"><b>Kto jak ocenił</b><ul>${list.map(v => `<li${v.staff || v.role ? ' class="is-staff"' : ''}><span class="avatar">${readerAvatar(v.name, v.av, v.u)}</span><span class="rv-who-name">${Utils.esc(v.name)}</span><b>${fmt1(v.score)}</b></li>`).join('')}</ul></div>`;
}

function voteResultsHtml(editorScore, sum) {
  const enough = sum.n >= Votes.MIN_SHOWN;
  const diff = enough ? Math.round((sum.avg - editorScore) * 10) / 10 : 0;
  const verdict = !enough ? '' : Math.abs(diff) < 0.3 ? 'Prawie zgodni z redakcją.' : diff > 0 ? `Czytelnicy dali o ${fmt1(Math.abs(diff))} więcej niż redakcja.` : `Czytelnicy dali o ${fmt1(Math.abs(diff))} mniej niż redakcja.`;
  return `<div class="rv-bars">
      <div class="rv-bar"><span class="rv-lab">Redakcja</span><span class="rv-track"><i style="width:${(editorScore * 10).toFixed(0)}%"></i></span><b>${fmt1(editorScore)}</b></div>
      <div class="rv-bar is-readers"><span class="rv-lab">Czytelnicy</span><span class="rv-track"><i style="width:${enough ? (sum.avg * 10).toFixed(0) : 0}%"></i></span><b>${enough ? fmt1(sum.avg) : '–'}</b></div>
    </div>
    ${votersHtml(sum.voters)}
    <p class="rv-note">${enough ? `${verdict} <span>(${sum.n} ${plural(sum.n, 'ocena', 'oceny', 'ocen')})</span>` : `Średnia pojawi się po ${Votes.MIN_SHOWN} ocenach (teraz: ${sum.n}).`}</p>`;
}


/* ---- Wyświetlenia i reakcje (bez konta, jedna reakcja na przeglądarkę) ---- */
const REACTIONS = [['haha', '😂', 'Haha'], ['wrr', '😡', 'Wrr'], ['wow', '😮', 'Wow'], ['smutne', '😢', 'Smutne'], ['ogien', '🔥', 'Ogień']];
const Reacts = { article: '', counts: {}, mine: '', views: 0, viewed: new Set() };
async function initReactions(a) {
  const box = $('#reactions'); if (!box) return;
  Reacts.article = a.id; Reacts.counts = {}; Reacts.mine = ''; Reacts.views = 0;
  const tok = Votes.token();
  try {
    const count = isPublished(a) && !Auth.isAdmin() && !Reacts.viewed.has(a.id);
    if (count) Reacts.viewed.add(a.id);
    const [v, d] = await Promise.all([
      count ? fetch(CONFIG.API_BASE + '/view', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ article: a.id }) }).then(r => r.ok ? r.json() : {}).catch(() => ({})) : Promise.resolve({}),
      fetch(CONFIG.API_BASE + '/react?article=' + encodeURIComponent(a.id) + '&tok=' + encodeURIComponent(tok), { cache: 'no-store' }).then(r => r.ok ? r.json() : null)
    ]);
    if (!d || Reacts.article !== a.id) return;
    Reacts.counts = d.counts || {}; Reacts.mine = d.mine || ''; Reacts.views = Math.max(v.views || 0, d.views || 0);
    drawReactions();
  } catch { /* brak Workera – sekcja zostaje ukryta */ }
}
function drawReactions() {
  const box = $('#reactions'); if (!box || box.dataset.article !== Reacts.article) return;
  box.hidden = false;
  const top = $('#rx-top');
  if (top) {
    const best = REACTIONS.map(([k, e]) => [e, Reacts.counts[k] || 0]).filter(x => x[1] > 0).sort((a, b) => b[1] - a[1]).slice(0, 3);
    const fv = n => n >= 1000 ? (n / 1000).toFixed(1).replace('.', ',') + ' tys.' : String(n);
    const parts = [];
    if (Reacts.views) parts.push(`<span class="rx-v"><svg class="ic-eye" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>${fv(Reacts.views)}</span>`);
    best.forEach(([e, n]) => parts.push(`<span>${e} ${fv(n)}</span>`));
    top.innerHTML = parts.join('');
    top.hidden = !parts.length;
  }
  const fmt = n => n >= 1000 ? (n / 1000).toFixed(1).replace('.', ',') + ' tys.' : String(n);
  box.innerHTML = `<div class="rx-head"><b>Jak Ci się podobało?</b><span class="rx-views" title="Wyświetlenia artykułu"><svg class="ic-eye" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg> ${fmt(Reacts.views)}</span></div>
    <div class="rx-row">${REACTIONS.map(([k, e, l]) => `<button type="button" class="rx-btn${Reacts.mine === k ? ' is-on' : ''}" data-rx="${k}" aria-pressed="${Reacts.mine === k}"><span class="rx-e" aria-hidden="true">${e}</span><span class="rx-l">${l}</span><b>${Reacts.counts[k] || 0}</b></button>`).join('')}</div>`;
}
async function reactTo(kind) {
  if (!Reacts.article) return;
  const prev = { mine: Reacts.mine, counts: { ...Reacts.counts } }, next = Reacts.mine === kind ? '' : kind;
  if (prev.mine) Reacts.counts[prev.mine] = Math.max(0, (Reacts.counts[prev.mine] || 0) - 1);
  if (next) Reacts.counts[next] = (Reacts.counts[next] || 0) + 1;
  Reacts.mine = next; drawReactions();
  try {
    const r = await fetch(CONFIG.API_BASE + '/react', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ article: Reacts.article, tok: Votes.token(), kind: next }) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.error === 'rate' ? 'Za dużo reakcji naraz. Poczekaj chwilę.' : 'Nie udało się zapisać reakcji.');
    Reacts.counts = d.counts || Reacts.counts; Reacts.mine = d.mine || ''; drawReactions();
  } catch (ex) { Reacts.mine = prev.mine; Reacts.counts = prev.counts; drawReactions(); toast(ex.message || 'Nie udało się zapisać reakcji.', 'error'); }
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-rx]'); if (b) reactTo(b.dataset.rx);
  if (e.target.closest('[data-rx-go]')) { const r = $('#reactions'); if (r) r.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
});

async function initReaderVote(a) {
  const box = $('#reader-vote');
  if (!box || !a.review || a.review.score == null || !isPublished(a)) return;
  const sum = await Votes.summary(a.id);
  if (!sum || !$('#reader-vote') || $('#reader-vote').dataset.article !== a.id) return;   // brak API albo użytkownik już zmienił stronę
  const editor = a.review.score;
  let mine = typeof sum.mine === 'number' ? sum.mine : null;
  let cur = { ...sum };
  let signed = !!sum.signed;
  let showResults = mine !== null;

  const draw = (err) => {
    box.hidden = false;
    if (showResults) {
      box.innerHTML = `<div class="rv-head"><h2>Oceny czytelników</h2>${mine !== null ? `<span class="rv-mine">Twoja ocena: <b>${fmt1(mine)}</b></span>` : ''}</div>
        ${voteResultsHtml(editor, cur)}
        <button type="button" class="rv-link" data-rv="edit">${mine !== null ? 'Zmień swoją ocenę' : 'Oceń i ty'}</button>`;
    } else {
      const v = mine !== null ? mine : 7;
      box.innerHTML = `<div class="rv-head"><h2>A Ty jak oceniasz?</h2></div>
        <p class="rv-lead">Daj swoją ocenę od 0 do 10 – średnią czytelników zobaczysz od razu po oddaniu głosu.</p>
        <p class="rv-who-note">${(Readers.loggedIn() && Readers.hasName()) || isStaffActor() ? `Głosujesz jako <b>${Utils.esc(isStaffActor() ? staffName() : Readers.me.name)}</b> – Twoja ocena będzie widoczna na liście oceniających.` : 'Możesz zagłosować bez konta. Zalogowani czytelnicy oceniają pod własną nazwą.'}</p>
        <div class="rv-pick"><output class="rv-val" id="rv-val">${fmt1(v)}</output>
          <input type="range" id="rv-range" min="0" max="10" step="0.5" value="${v}" aria-label="Twoja ocena od 0 do 10">
          <button type="button" class="btn btn-primary rv-send" data-rv="send">Oceń</button></div>
        <div class="rv-btns" role="group" aria-label="Wybierz ocenę – kliknięcie od razu oddaje głos">${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => `<button type="button" data-rv="score" data-score="${n}" class="${mine === n ? 'is-mine' : ''}">${n}</button>`).join('')}</div>
        ${err ? `<p class="form-error">${Utils.esc(err)}</p>` : ''}
        <div class="rv-actions"><button type="button" class="rv-link" data-rv="peek">Zobacz wyniki bez głosowania</button></div>`;
      const rg = $('#rv-range', box), out = $('#rv-val', box);
      rg.addEventListener('input', () => { out.textContent = fmt1(Number(rg.value)); rg.style.setProperty('--p', (rg.value * 10) + '%'); });
      rg.style.setProperty('--p', (rg.value * 10) + '%');
    }
  };
  box.onclick = async e => {
    const b = e.target.closest('[data-rv]'); if (!b || b.disabled) return;
    const act = b.dataset.rv;
    if (act === 'peek') { showResults = true; draw(); return; }
    if (act === 'edit') { showResults = false; draw(); return; }
    if (act === 'send' || act === 'score') {
      const score = act === 'score' ? Number(b.dataset.score) : Number($('#rv-range', box).value);
      b.disabled = true;
      const r = await Votes.send(a.id, score);
      if (r.status === 200 && r.data.ok) { mine = r.data.mine; cur = { n: r.data.n, avg: r.data.avg, voters: r.data.voters }; showResults = true; draw(); toast('Dziękujemy za ocenę!'); Votes._all = null; return; }
      const msg = r.status === 409 ? 'Z tej sieci ktoś już ocenił tę recenzję – na jedną sieć przypada jedna ocena.'
        : r.status === 429 ? 'Za dużo ocen w krótkim czasie. Spróbuj za godzinę.'
        : r.status === 404 ? 'Tej recenzji nie można teraz ocenić.' : 'Nie udało się zapisać oceny. Spróbuj ponownie.';
      if (r.status === 409 && r.data && typeof r.data.n === 'number') cur = { n: r.data.n, avg: r.data.avg, voters: r.data.voters };
      draw(msg);
    }
  };
  draw();
}

/** Średnie czytelników w rankingu (po wczytaniu rankingu, bez blokowania widoku). */
async function decorateRankingVotes() {
  const rows = $$('#view-ranking .rank-row[data-id]');
  if (!rows.length) return;
  const all = await Votes.all();
  rows.forEach(row => {
    const v = all[row.dataset.id];
    const slot = $('.rank-score', row);
    if (!v || v.n < Votes.MIN_SHOWN || !slot || $('.rank-readers', slot)) return;
    slot.insertAdjacentHTML('beforeend', `<span class="rank-readers" title="Średnia ocen czytelników (${v.n})">Czytelnicy ${fmt1(v.avg)}</span>`);
  });
}

/** Kółko z oceną + tytuł, wykonawca, rok i okładka (zdjęcie główne) – styl Pitchfork. */
function reviewHtml(a) {
  const r = a.review;
  if (!r || r.score === null || r.score === undefined) return '';
  const coverSrc = coverOf(a);
  const same = reviewSameCover(a);
  const cover = coverSrc
    ? `<figure class="review-cover"><div class="media-wrap"><img src="${Utils.esc(coverSrc)}" alt="Okładka: ${Utils.esc(r.work)}" data-cat="${Utils.esc(Utils.catsOf(a)[0] || '')}"></div></figure>`
    : '';
  return `<section class="review ${cover ? '' : 'review-nocover'}" aria-label="Ocena">
    ${scoreHtml(r.score)}
    <div class="review-info">
      ${r.kind ? `<div class="review-kind">${Utils.esc(r.kind)}</div>` : ''}
      <div class="review-work">${Utils.esc(r.work)}</div>
      ${r.artist ? `<div class="review-artist"><a href="#/artysta/${encodeURIComponent(r.artist)}">${Utils.esc(r.artist)}</a></div>` : ''}
      ${r.year ? `<div class="review-year">${Utils.esc(r.year)}</div>` : ''}
    </div>
    ${cover}
  </section>`;
}

function currentRoute() {
  const [hpath, hquery] = location.hash.replace(/^#\/?/, '').split('?');
  const parts = hpath.split('/').filter(Boolean);
  if ((parts[0] === 'artykul' || parts[0] === 'a') && parts[1]) return { name: 'article', id: decodeURIComponent(parts[0 + 1]), k: Number(new URLSearchParams(hquery || '').get('k')) || 0 };
  if (parts[0] === 'edytor') return { name: 'editor', id: parts[1] ? decodeURIComponent(parts[1]) : null, draft: null };
  if (parts[0] === 'szkic' && parts[1]) return { name: 'editor', id: null, draft: decodeURIComponent(parts[1]) };
  if (parts[0] === 'panel') return { name: 'panel' };
  if (parts[0] === 'ustawienia') return { name: 'settings' };
  if (parts[0] === 'konto') return { name: 'account', tab: parts[1] || '' };
  if (parts[0] === 'uzytkownik' && parts[1]) return { name: 'user', pub: decodeURIComponent(parts[1]).replace(/[^A-Za-z0-9]/g, '') };
  if (parts[0] === 'kategoria' && parts[1]) return { name: 'home', category: decodeURIComponent(parts[1]) };
  if (parts[0] === 'tag' && parts[1]) return { name: 'home', tag: decodeURIComponent(parts[1]) };
  if (parts[0] === 'artysta' && parts[1]) return { name: 'home', artist: decodeURIComponent(parts[1]) };
  if (parts[0] === 'redaktor' && parts[1]) return { name: 'home', author: decodeURIComponent(parts[1]) };
  if (parts[0] === 'redakcja' || parts[0] === 'redaktorzy') return { name: 'authors' };
  if (parts[0] === 'ranking') return { name: 'ranking' };
  if (parts[0] === 'zglos') return { name: 'tip' };
  if (parts[0] === 'prywatnosc' || parts[0] === 'regulamin') return { name: 'legal', doc: parts[0] };
  if (parts[0] === 'o-nas' || parts[0] === 'kontakt') return { name: 'legal', doc: 'o-nas' };
  if (parts[0] === 'zapisane') return { name: 'saved' };
  if (parts[0] === 'szybkie') return { name: 'quick' };
  if (parts.length) return { name: 'notfound' };
  return { name: 'home' };
}

function adminButtons(id) {
  if (!Auth.isAdmin()) return '';
  const safe = Utils.esc(id);
  return `<span class="admin-actions">
    <button type="button" class="btn btn-sm" data-action="edit" data-id="${safe}">Edytuj</button>
    <button type="button" class="btn btn-sm" data-action="ig-post" data-id="${safe}" title="Grafiki na Instagram, Story, X i recenzję – z opisem do wklejenia">Grafika</button>
    ${canManage() ? `<button type="button" class="btn btn-sm btn-push-send" data-action="push-send" data-id="${safe}" title="Wyślij powiadomienie push o tym artykule do wszystkich subskrybentów">🔔 Powiadom</button>` : ''}
    <button type="button" class="btn btn-sm btn-danger" data-action="delete" data-id="${safe}">Usuń</button>
  </span>`;
}

/* ---------- Pasek PILNE ---------- */
function renderBreaking() {
  const bar = $('#breaking-bar');
  const urgent = publishedArticles().filter(a => a.urgent);
  if (!urgent.length) { bar.hidden = true; return; }

  bar.hidden = false;
  const items = urgent.map(a =>
    `<a class="ticker-item" href="#/artykul/${encodeURIComponent(a.id)}">${Utils.esc(a.title)}</a>`
  ).join('<span class="ticker-dot" aria-hidden="true">•</span>');
  $('#ticker-track').innerHTML = `<div class="ticker-set">${items}</div>`;
  fitTicker();
}

/** Mieści się = wyśrodkowane; nie mieści się = płynnie przewija się w pętli. */
function fitTicker() {
  const ticker = $('#ticker');
  const track = $('#ticker-track');
  const set = track.firstElementChild;
  if (!set || ticker.offsetParent === null && $('#breaking-bar').hidden) return;
  while (track.children.length > 1) track.lastElementChild.remove();
  track.classList.remove('is-scrolling');
  track.style.removeProperty('--ticker-duration');
  if (set.scrollWidth <= ticker.clientWidth) return;
  const clone = set.cloneNode(true);
  clone.setAttribute('aria-hidden', 'true');
  clone.tabIndex = -1;
  $$('a', clone).forEach(a => { a.tabIndex = -1; });
  track.appendChild(clone);
  track.classList.add('is-scrolling');
  track.style.setProperty('--ticker-duration', Math.max(14, Math.round(set.scrollWidth / 60)) + 's');
}

/* ---------- Strona kolekcji: wykonawca / tag ---------- */
/** Przycisk „wstecz”: jeśli przyszliśmy z artykułu, wraca do tego artykułu (nie na listę). */
function cameFromArticle() { return /^#\/artykul\//.test((typeof ScrollMemory !== 'undefined' && ScrollMemory.prev) || ''); }
function backBtn(defHref, defLabel, cls = 'btn btn-sm') {
  return cameFromArticle()
    ? `<a class="${cls}" href="${Utils.esc(ScrollMemory.prev)}" data-smartback>← Wróć do artykułu</a>`
    : `<a class="${cls}" href="${defHref}">${defLabel}</a>`;
}

function authorHeadHtml(list) {
  const name = state.author;
  const e = Authors.find(name) || { name, photo: Authors.photo(name, '') };
  const bio = Authors.bio(name);
  const reviews = list.filter(a => a.review && a.review.score !== null && a.review.score !== undefined).length;
  const plural = (n, one, few, many) => n === 1 ? one : (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? few : many);
  const stats = [`${list.length} ${plural(list.length, 'artykuł', 'artykuły', 'artykułów')}`];
  if (reviews) stats.push(`${reviews} ${plural(reviews, 'recenzja', 'recenzje', 'recenzji')}`);
  const last = list.map(a => a.createdAt).sort().pop();
  const pills = [`<span class="au-pill"><b>${list.length}</b> ${plural(list.length, 'artykuł', 'artykuły', 'artykułów')}</span>`];
  if (reviews) pills.push(`<span class="au-pill"><b>${reviews}</b> ${plural(reviews, 'recenzja', 'recenzje', 'recenzji')}</span>`);
  if (last) pills.push(`<span class="au-pill">ostatni tekst: <b>${Utils.esc(Utils.formatDate(last).replace(/( o)? \d{1,2}:\d{2}$/, ''))}</b></span>`);
  return `<header class="collection-head author-head">
    <div class="author-cover" aria-hidden="true"></div>
    <div class="author-topbar">${backBtn('#/redakcja', '← Redaktorzy', 'btn btn-sm author-back')}</div>
    <div class="author-hero">
      <span class="avatar avatar-lg" aria-hidden="true">${avatarHtml({ name: e.name || name, avatar: e.photo })}</span>
      <div class="author-hero-text">
        <span class="author-role">Redaktor</span>
        <h1 class="collection-name is-tag">${Utils.esc((e.name || name).replace(/^Redaktor\s+/i, ''))}</h1>
        ${bio ? `<p class="author-bio">${Utils.esc(bio)}</p>` : '<p class="author-bio is-empty">Ten redaktor nie dodał jeszcze biografii.</p>'}
        <div class="author-pills">${pills.join('')}</div>
      </div>
    </div>
  </header>`;
}

function collectionHeadHtml(list) {
  if (state.author) return authorHeadHtml(list);
  const isArtist = !!state.artist;
  const name = isArtist ? state.artist : state.tag;
  const reviews = list.filter(a => a.review && a.review.score !== null && a.review.score !== undefined && (!isArtist || Utils.same(a.review.artist, name)));
  const avg = reviews.length ? reviews.reduce((n, a) => n + a.review.score, 0) / reviews.length : null;
  const plural = (n, one, few, many) => n === 1 ? one : (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? few : many);
  const stats = [`${list.length} ${plural(list.length, 'artykuł', 'artykuły', 'artykułów')}`];
  if (reviews.length) stats.push(`${reviews.length} ${plural(reviews.length, 'recenzja', 'recenzje', 'recenzji')}`);
  if (avg !== null) stats.push(`średnia ocena ${Utils.formatScore(avg)}`);
  return `<header class="collection-head">
    ${backBtn('#/', '← Wszystkie artykuły')}
    <span class="collection-kind">${isArtist ? 'Wykonawca' : 'Tag'}</span>
    <h1 class="collection-name${isArtist ? '' : ' is-tag'}">${isArtist ? '' : '#'}${Utils.esc(name)}</h1>
    <p class="collection-stats">${stats.map(Utils.esc).join(' · ')}</p>
  </header>`;
}

/* ---------- Redaktorzy: profile, biografie, lista ---------- */
/** Podpis „Redaktor Imię Nazwisko” i samo „Imię Nazwisko” to ta sama osoba (starsze artykuły mają w polu autora przedrostek). */
const authorBase = n => String(n || '').replace(/^Redaktor\s+/i, '').trim();
const authorKey = n => Utils.fold(authorBase(n));
const Authors = {
  bios: new Map(), loaded: false,
  async load(force) {
    if (this.loaded && !force) return;
    try {
      const r = await fetch(CONFIG.API_BASE + '/authors', { cache: 'no-store' });
      if (!r.ok) return;
      const d = await r.json();
      this.bios = new Map((d.authors || []).map(x => [authorKey(x.name), { name: x.name, bio: x.bio, av: x.av || 0 }]));
      this.loaded = true;
    } catch { /* bez biografii strona nadal działa */ }
  },
  bio(name) { const b = this.bios.get(authorKey(name)); return b ? b.bio : ''; },
  hasPhoto(name) { const b = this.bios.get(authorKey(name)); return !!(b && b.av); },
  /** Zdjęcie w pełnej jakości (z Workera), a gdy go brak – miniatura z artykułu. */
  photo(name, fallback) { const b = this.bios.get(authorKey(name)); return b && b.av ? `${CONFIG.API_BASE}/author-avatar?n=${encodeURIComponent(b.name)}&v=${b.av}` : (fallback || ''); },
  /** Redaktorzy z opublikowanych artykułów (bez nowinek) + osoby, które mają tylko biografię. */
  list() {
    const m = new Map();
    publishedArticles().filter(a => !a.quick && a.author).forEach(a => {
      const k = authorKey(a.author);
      const e = m.get(k) || { name: authorBase(a.author), photo: '', n: 0, last: '' };
      e.n++;
      if (!e.photo && a.authorPhoto) e.photo = a.authorPhoto;
      if (a.createdAt > e.last) e.last = a.createdAt;
      m.set(k, e);
    });
    this.bios.forEach((b, k) => { if (!m.has(k)) m.set(k, { name: b.name, photo: '', n: 0, last: '' }); });
    m.forEach(e => { e.photo = this.photo(e.name, e.photo); });
    return [...m.values()].sort((x, y) => y.n - x.n || x.name.localeCompare(y.name, 'pl'));
  },
  find(name) { const k = authorKey(name); return this.list().find(e => authorKey(e.name) === k) || null; },
  href(name) { return '#/redaktor/' + encodeURIComponent(authorBase(name)); }
};

function renderAuthors() {
  const el = $('#view-authors');
  const draw = () => {
    if (currentRoute().name !== 'authors') return;
    const q = Utils.fold(($('#au-q') && $('#au-q').value) || '').trim();
    const list = Authors.list().filter(e => !q || Utils.fold(e.name).includes(q));
    const plural = (n, one, few, many) => n === 1 ? one : (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? few : many);
    $('#au-list').innerHTML = list.length ? list.map(e => {
      const bio = Authors.bio(e.name);
      return `<a class="au-card" href="${Authors.href(e.name)}">
        <span class="avatar avatar-lg" aria-hidden="true">${avatarHtml({ name: e.name, avatar: e.photo })}</span>
        <span class="au-body"><strong>${Utils.esc(e.name)}</strong>
          ${bio ? `<span class="au-bio">${Utils.esc(bio)}</span>` : ''}
          <span class="au-n">${e.n} ${plural(e.n, 'artykuł', 'artykuły', 'artykułów')}</span></span>
      </a>`;
    }).join('') : '<p class="muted">Nikogo takiego nie znaleziono.</p>';
  };
  if (!$('#au-list')) {
    el.innerHTML = `<div class="article-top"><a class="btn" href="#/">← Powrót do strony głównej</a></div>
      <header class="rank-head"><span class="rank-eyebrow">Ludzie Śliska News</span><h1 class="rank-title">Redakcja</h1></header>
      <input type="search" class="mod-q" id="au-q" placeholder="Szukaj redaktora…" aria-label="Szukaj redaktora" autocomplete="off">
      <div class="au-list" id="au-list"></div>`;
    $('#au-q').addEventListener('input', draw);
  }
  draw();
  if (!Authors.loaded) Authors.load().then(draw);
}

/* ---------- Strona główna ---------- */
function editDistance(a, b, max) {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let rowMin = i;
    for (let k = 1; k <= b.length; k++) {
      const v = Math.min(prev[k] + 1, cur[k - 1] + 1, prev[k - 1] + (a[i - 1] === b[k - 1] ? 0 : 1));
      cur.push(v);
      if (v < rowMin) rowMin = v;
    }
    if (rowMin > max) return max + 1;
    prev = cur;
  }
  return prev[b.length];
}

/** Wyszukiwanie bez polskich znaków i z tolerancją literówek. */
const SearchIndex = {
  cache: new Map(),
  get(a) {
    const plain = state.plain.get(a.id) || '';
    const sig = (a.updatedAt || '') + '|' + plain.length;
    const hit = this.cache.get(a.id);
    if (hit && hit.sig === sig) return hit;
    const rv = a.review ? `${a.review.work || ''} ${a.review.artist || ''}` : '';
    const text = Utils.fold(`${a.title} ${a.lead} ${Utils.tagsOf(a).join(' ')} ${rv} ${a.author || ''} ${plain}`);
    const entry = { sig, text, words: [...new Set(text.split(/[^a-z0-9]+/).filter(w => w.length >= 3))] };
    this.cache.set(a.id, entry);
    return entry;
  },
  tokens(q) { return Utils.fold(q).split(/[^a-z0-9]+/).filter(Boolean); },
  matches(a, q) {
    const tokens = this.tokens(q);
    if (!tokens.length) return true;
    const e = this.get(a);
    return tokens.every(t => {
      if (e.text.includes(t)) return true;
      if (t.length < 4) return false;
      const max = t.length <= 6 ? 1 : 2;
      return e.words.some(w => editDistance(t, w, max) <= max);
    });
  }
};

function plural(n, one, few, many) {
  const m10 = n % 10, m100 = n % 100;
  if (n === 1) return one;
  if (m10 >= 2 && m10 <= 4 && !(m100 >= 12 && m100 <= 14)) return few;
  return many;
}

/** Czy artykuł dotyczy wykonawcy – automatycznie, bez ręcznego powiązania:
 *  recenzja tego wykonawcy, tag, jego nazwa w tytule lub leadzie albo co najmniej 2 wzmianki w treści.
 *  Przy nazwach wieloczłonowych ostatni wyraz dopuszcza polską końcówkę („Hemingwaya”, „Hemingwayem”). */
const ARTIST_SRC = new Map();
function artistPattern(name) {
  const key = Utils.fold(name).replace(/[^a-z0-9]+/g, ' ').trim();
  if (!key) return null;
  let src = ARTIST_SRC.get(key);
  if (src) return src;
  const parts = key.split(' ');
  // nazwy wieloczłonowe: każdy człon ≥ 4 liter dopuszcza polską końcówkę („Taco” → „Tacem”, „Hemingway” → „Hemingwaya”)
  const stem = w => (parts.length > 1 && w.length >= 4) ? w.replace(/[aeiouy]$/, '') + '[a-z]{0,3}' : w;
  src = '(^|[^a-z0-9])' + parts.map(stem).join('[^a-z0-9]+') + '(?![a-z0-9])';
  ARTIST_SRC.set(key, src);
  return src;
}
function articleMentions(a, name) {
  if (a.review && Utils.same(a.review.artist, name)) return true;
  if (Utils.tagsOf(a).some(t => Utils.same(t, name))) return true;
  const src = artistPattern(name);
  if (!src) return false;
  if (new RegExp(src).test(Utils.fold(`${a.title} ${a.lead}`))) return true;
  const re = new RegExp(src, 'g'), body = SearchIndex.get(a).text;
  let n = 0;
  while (re.exec(body)) { if (++n >= 2) return true; }
  return false;
}

function filteredArticles() {
  const q = state.query.trim();
  return publishedArticles().filter(a => {
    if (state.category !== ALL && !Utils.catsOf(a).includes(state.category)) return false;
    if (state.tag && !Utils.tagsOf(a).some(t => Utils.same(t, state.tag))) return false;
    if (state.artist && !articleMentions(a, state.artist)) return false;
    if (state.author && authorKey(a.author) !== authorKey(state.author)) return false;
    if (state.onlyNew && !Visit.isNew(a)) return false;
    if (!q) return true;
    return SearchIndex.matches(a, q);
  });
}

function cardHtml(a, opts = {}) {
  const id = encodeURIComponent(a.id);
  return `<article class="card" data-id="${Utils.esc(a.id)}">
    <div class="img-tags">${Utils.chipsHtml(a)}${a.urgent ? '<span class="badge-urgent">PILNE</span>' : ''}</div>
    <a class="card-media" href="#/artykul/${id}" tabindex="-1" aria-hidden="true">
      <img src="${Utils.esc(thumbFor(a, opts.cover))}"${imgFocus(a, thumbFor(a, opts.cover))} alt="" data-cat="${Utils.esc(Utils.catsOf(a)[0] || '')}" loading="lazy" decoding="async">
    </a>
    <div class="card-body">
      <h3 class="card-title"><a href="#/artykul/${id}">${Utils.esc(a.title)}</a></h3>
      <p class="card-lead">${Utils.esc(a.lead)}</p>
      <div class="card-meta">
        <time datetime="${Utils.esc(a.createdAt)}">${Utils.formatDate(a.createdAt)}</time>
        ${opts.noAdmin ? '' : adminButtons(a.id)}
      </div>
    </div>
  </article>`;
}

function mastheadHtml(list) {
  const d = new Date();
  const date = d.toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const upd = list.length ? Utils.formatTime(list[0].createdAt) : '';
  return `<div class="masthead"><span class="mh-date">${Utils.esc(date)}</span>${upd ? `<span class="mh-live"><i aria-hidden="true"></i>Ostatnia aktualizacja: ${Utils.esc(upd)}</span>` : ''}<span class="mh-sp"></span><a href="#/szybkie">Nowinki</a><a href="#/ranking">Ranking</a><a href="#/redakcja">Redakcja</a></div>`;
}

function latestPanelHtml(items) {
  return `<aside class="latest-panel" aria-label="Najnowsze"><h2 class="lp-h"><i aria-hidden="true"></i>Najnowsze</h2><ol class="lp-list">${items.map(a => {
    const id = encodeURIComponent(a.id);
    return `<li class="lp-item" data-id="${Utils.esc(a.id)}"><time datetime="${Utils.esc(a.createdAt)}">${Utils.esc(Utils.formatTime(a.createdAt))}</time><div><span class="lp-cat">${Utils.esc(Utils.catsOf(a)[0] || '')}</span><a class="lp-t" href="#/artykul/${id}">${Utils.esc(a.title)}</a></div></li>`;
  }).join('')}</ol></aside>`;
}

function heroHtml(a, useCover) {
  const id = encodeURIComponent(a.id);
  return `<section class="hero" data-id="${Utils.esc(a.id)}" aria-label="Temat dnia">
    <img class="hero-img" fetchpriority="high" decoding="async" src="${Utils.esc(thumbFor(a, useCover))}"${imgFocus(a, thumbFor(a, useCover))} alt="" data-cat="${Utils.esc(Utils.catsOf(a)[0] || '')}">
    <div class="hero-tags"><span class="hero-flag">Temat dnia</span>${Utils.chipsHtml(a)}</div>
    <div class="hero-content">
      <h2 class="hero-title"><a href="#/artykul/${id}">${Utils.esc(a.title)}</a></h2>
      <div class="card-meta">
        <time datetime="${Utils.esc(a.createdAt)}">${Utils.formatDate(a.createdAt)} · ${Utils.esc(a.author)}</time>
        ${adminButtons(a.id)}
      </div>
    </div>
  </section>`;
}

function tileHtml(a) {
  const id = encodeURIComponent(a.id);
  return `<article class="tile" data-id="${Utils.esc(a.id)}">
    <img class="tile-img" src="${Utils.esc(getImage(a))}"${imgFocus(a)} alt="" data-cat="${Utils.esc(Utils.catsOf(a)[0] || '')}" loading="lazy" decoding="async">
    <div class="img-tags">${Utils.chipsHtml(a)}</div>
    <div class="tile-content">
      <h3 class="tile-title"><a href="#/artykul/${id}">${Utils.esc(a.title)}</a></h3>
      <time class="tile-time" datetime="${Utils.esc(a.createdAt)}">${Utils.formatDate(a.createdAt)}</time>
    </div>
  </article>`;
}

function renderHome() {
  const status = $('#home-status');

  if (state.loadError) {
    const devCode = /^dev\./.test(location.hostname) ? (state.loadErrCode || DataService.fallbackReason || '') : '';
    status.innerHTML = '<div class="empty-state">Nie udało się wczytać wiadomości. Odśwież stronę za chwilę.' + (devCode ? '<br><small>[dev: ' + Utils.esc(devCode) + ']</small>' : '') + '</div>';
    $('#hero-slot').innerHTML = '';
    $('#resume-slot').innerHTML = '';
    $('#quick-slot').innerHTML = '';
    $('#news-grid').innerHTML = '';
    $('#grid-title').hidden = true;
    $('#load-more').hidden = true;
    return;
  }

  const list = filteredArticles();
  const isReviews = state.category === 'Recenzje';
  // Blok na górze: Temat dnia (lub najnowszy) + 2 kafle – tylko na „Wszystkie” bez wyszukiwania
  const coll = state.tag || state.artist || state.author;
  const showTop = state.category === ALL && !coll && !state.query.trim() && list.length > 0;
  const hero = showTop ? (list.find(a => a.featured) || list[0]) : null;
  const tiles = showTop ? list.filter(a => a !== hero).slice(0, 2) : [];
  const top = hero ? [hero] : [];
  const rest = list.filter(a => !top.includes(a) && !tiles.includes(a));
  const shown = rest.slice(0, state.visible);

  if (!list.length) {
    const q = state.query.trim();
    if (q) {
      const latest = publishedArticles().slice(0, 3);
      status.innerHTML = `<div class="empty-state empty-search">
          <div class="empty-icon" aria-hidden="true">🔍</div>
          <strong>Brak wyników dla „${Utils.esc(q)}”</strong>
          <p>Sprawdź pisownię, spróbuj krótszej frazy albo wpisz samo nazwisko wykonawcy.</p>
          <button type="button" class="btn btn-primary" data-action="clear-search">Wyczyść wyszukiwanie</button>
        </div>
        ${latest.length ? `<section class="related"><h2 class="section-title">Może Cię zainteresuje</h2><div class="related-grid">${latest.map(a => cardHtml(a, { noAdmin: true })).join('')}</div></section>` : ''}`;
    } else {
      status.innerHTML = `<div class="empty-state">${coll
        ? 'Nie ma jeszcze artykułów w tej kolekcji.'
        : state.category !== ALL
          ? 'W tej kategorii nie ma jeszcze artykułów.'
          : 'Wkrótce pojawią się tu pierwsze wiadomości.'}</div>`;
    }
  } else if (state.query.trim()) {
    status.textContent = `Wyniki wyszukiwania dla „${state.query.trim()}”: ${list.length}`;
  } else {
    status.textContent = '';
  }

  $('#hero-slot').innerHTML = hero
    ? mastheadHtml(list) + `<div class="home-top${tiles.length ? '' : ' single'}">${heroHtml(hero, false)}${tiles.length ? `<div class="home-tiles">${tiles.map(tileHtml).join('')}</div>` : ''}</div>`
    : coll ? collectionHeadHtml(list) : '';
  $('#resume-slot').innerHTML = (state.category === ALL && !coll && !state.query.trim() ? newBannerHtml() : '') + '';
  $('#quick-slot').innerHTML = showTop && !state.onlyNew ? quickStripHtml() : '';
  $('#news-grid').classList.toggle('is-square', isReviews);
  $('#news-grid').innerHTML = shown.map(a => cardHtml(a, { cover: state.category === 'Recenzje' })).join('');

  const title = $('#grid-title');
  title.hidden = shown.length === 0 || !!coll;
  title.textContent = state.query.trim() ? 'Wyniki' : (state.category === ALL ? 'Więcej wiadomości' : state.category);
  const desc = $('#grid-desc');
  if (desc) {
    const info = !state.query.trim() && state.category !== ALL && !coll ? CATEGORY_INFO[state.category] : '';
    desc.textContent = info || '';
    desc.hidden = !info || title.hidden;
  }

  $('#load-more').hidden = rest.length <= shown.length;
}

/* ---------- Prawa kolumna: pozostałe artykuły ---------- */
function renderSideList() {
  const r = currentRoute();
  const layout = $('#layout');
  const side = $('#side-right');
  const current = r.name === 'article' ? r.id : null;
  const coll = r.name === 'home' && (state.tag || state.artist || state.author);
  const onCategory = r.name === 'home' && (state.category !== ALL || coll) && !state.query.trim();
  const visibleHere = r.name === 'article' || onCategory;
  // Pomijamy artykuły z kategorii, w której jesteśmy (i bieżący artykuł)
  const ctx = (r.name === 'article' || r.name === 'home') ? state.category : ALL;
  const shownHere = coll ? new Set(filteredArticles().map(a => a.id)) : null;     // to, co już jest na liście po lewej, nie powtarza się z boku
  const list = publishedArticles()
    .filter(a => a.id !== current && !(shownHere && shownHere.has(a.id)) && (ctx === ALL || !Utils.catsOf(a).includes(ctx)))
    .slice(0, 6);
  const cur = current ? state.articles.find(x => x.id === current) : null;
  const wantComments = !!(cur && !cur.quick && isPublished(cur) && Readers.enabled() && window.matchMedia(SIDE_MQ).matches);
  if (!wantComments || !current) $('#side-comments').innerHTML = '';
  const show = (visibleHere && list.length > 0) || wantComments;
  side.dataset.hasList = visibleHere && list.length > 0 ? '1' : '0';
  $('.side-head', side).hidden = !(visibleHere && list.length > 0);
  layout.dataset.cat = r.name === 'home' && (state.category !== ALL || coll) ? '1' : '0';
  layout.dataset.right = show ? '1' : '0';
  side.hidden = !show;
  $('#side-title').textContent = 'Pozostałe artykuły';
  $('#side-list').innerHTML = list.map(a => {
    const id = encodeURIComponent(a.id);
    return `<article class="side-item" data-id="${Utils.esc(a.id)}">
      <a class="side-media" href="#/artykul/${id}" tabindex="-1" aria-hidden="true"><img src="${Utils.esc(getImage(a))}"${imgFocus(a)} alt="" data-cat="${Utils.esc(Utils.catsOf(a)[0] || '')}" loading="lazy" decoding="async"></a>
      <div class="side-body">
        <div class="card-tags">${Utils.chipsHtml(a)}${a.urgent ? '<span class="badge-urgent">PILNE</span>' : ''}</div>
        <h3 class="side-item-title"><a href="#/artykul/${id}">${Utils.esc(a.title)}</a></h3>
        <time class="side-time" datetime="${Utils.esc(a.createdAt)}">${Utils.formatDate(a.createdAt)}</time>
      </div>
    </article>`;
  }).join('');
}

/* ---------- Widok artykułu ---------- */
/** Zdjęcie profilowe autora (zapisane w artykule); gdy go brak – inicjały. */
function authorAvatarHtml(a) {
  let photo = a.authorPhoto || '';
  if (!photo && state.profile.avatar && state.profile.showPhoto !== false && a.author && authorKey(a.author) === authorKey(state.profile.name)) photo = state.profile.avatar;
  return `<span class="avatar avatar-sm" aria-hidden="true">${avatarHtml({ name: a.author, avatar: photo })}</span>`;
}

/** Zmniejsza zdjęcie profilowe do miniatury (żeby nie obciążać każdego artykułu). */
function shrinkAvatar(src, size = 400) {
  return new Promise(resolve => {
    if (!src) { resolve(''); return; }
    const img = new Image();
    img.onload = () => {
      try {
        const c = document.createElement('canvas');
        const s = Math.min(img.naturalWidth, img.naturalHeight) || size;
        const out = Math.min(size, s);
        c.width = c.height = out;
        const cx = c.getContext('2d'); cx.imageSmoothingEnabled = true; cx.imageSmoothingQuality = 'high';
        cx.drawImage(img, (img.naturalWidth - s) / 2, (img.naturalHeight - s) / 2, s, s, 0, 0, out, out);
        resolve(c.toDataURL('image/jpeg', 0.92));
      } catch { resolve(''); }
    };
    img.onerror = () => resolve('');
    img.src = src;
  });
}

function articleHtml(a, plain) {
  const minutes = Utils.readingTime(a, plain);
  const hasReview = !!(a.review && a.review.score !== null && a.review.score !== undefined);
  // Przy recenzji z osobną okładką zdjęcie główne też jest widoczne; gdy okładka = zdjęcie główne, pokazujemy je tylko w ramce oceny
  const showHero = !hasReview || !!a.image;
  const heroFig = showHero
    ? `<figure class="article-hero">
        <div class="media-wrap"><img src="${Utils.esc(getImage(a))}"${imgFocus(a)} alt="${Utils.esc(a.title)}" data-cat="${Utils.esc(Utils.catsOf(a)[0] || '')}">${sourceTag(a.imageSource)}</div>
        ${a.imageCaption ? `<figcaption>${Utils.esc(a.imageCaption)}</figcaption>` : ''}
      </figure>`
    : '';
  const edited = a.updatedAt && Math.abs(new Date(a.updatedAt) - new Date(a.createdAt)) > 60000 && isPublished(a);


  const commentsHtml = commentsSectionHtml(a);

  return `<article class="article">
      <header class="article-header">
        <div class="card-tags">
          ${Utils.chipsHtml(a)}
          ${a.urgent ? '<span class="badge-urgent">PILNE</span>' : ''}
        </div>
        <h1>${Utils.esc(a.title)}</h1>
        <div class="article-meta">
          <span class="author-line">${authorAvatarHtml(a)}<a class="author-link" href="${Authors.href(a.author)}"><strong>${Utils.esc(bylineName(a.author))}</strong></a></span>
          <time datetime="${Utils.esc(a.createdAt)}">${Utils.formatDate(a.createdAt)}</time>
          <span>${minutes} min czytania</span>
          <button type="button" class="rx-top" id="rx-top" data-rx-go hidden aria-label="Reakcje czytelników – przejdź na dół, żeby zareagować"></button>
        </div>
      </header>
      ${heroFig}
      <div class="article-layout">
        <div class="article-main">
          <p class="article-lead">${Utils.esc(a.lead)}</p>
          <div class="article-body">${Sanitizer.render(a.content)}</div>
          ${hasReview ? reviewHtml(a) + `<section class="reader-vote" id="reader-vote" data-article="${Utils.esc(a.id)}" hidden></section>` : ''}
          ${tagsBlockHtml(a)}
          ${shareBarHtml(a)}
        </div>
      </div>
      <div id="comments-home">${commentsHtml}</div>
    </article>`;
}

function tagsBlockHtml(a) {
  const tags = Utils.tagsOf(a);
  if (!tags.length) return '';
  return `<div class="article-tags" aria-label="Tagi">${tags.map(t =>
    `<a class="tag" href="#/tag/${encodeURIComponent(t)}">#${Utils.esc(t)}</a>`).join('')}</div>`;
}

/** Adres do udostępniania artykułu. */
function articleUrl(a) {
  if (CONFIG.OG_WORKER) return location.href.split('#')[0].replace(/[^/]*$/, '') + 'a/' + encodeURIComponent(a.id);
  return location.href.split('#')[0] + '#/artykul/' + encodeURIComponent(a.id);
}

function shareBarHtml(a) {
  const url = encodeURIComponent(articleUrl(a));
  const text = encodeURIComponent(a.title);
  const isTouch = window.matchMedia && matchMedia('(pointer: coarse)').matches;
  const link = (href, label) => `<a class="share-btn" href="${href}" target="_blank" rel="noopener noreferrer">${label}</a>`;
  return `<div class="share-bar" aria-label="Udostępnij artykuł">
    <span class="share-label">Udostępnij</span>
    ${link('https://www.facebook.com/sharer/sharer.php?u=' + url, 'Facebook')}
    ${link('https://twitter.com/intent/tweet?url=' + url + '&text=' + text, 'X')}
    ${isTouch ? link('fb-messenger://share/?link=' + url, 'Messenger') : ''}
    ${link('https://www.threads.net/intent/post?text=' + text + '%20' + url, 'Threads')}
    ${link('https://wa.me/?text=' + text + '%20' + url, 'WhatsApp')}
    <button type="button" class="share-btn" data-action="share-image" data-id="${Utils.esc(a.id)}">Grafika</button>
    <button type="button" class="share-btn" data-action="copy-link" data-id="${Utils.esc(a.id)}">Kopiuj krótki link</button>
    <button type="button" class="share-btn share-report" data-action="report-error" data-id="${Utils.esc(a.id)}">Zauważyłeś błąd?</button>
  </div>`;
}

/** Podobne artykuły: wspólne tagi (3 pkt), ten sam wykonawca (4 pkt), wspólne kategorie (1 pkt). */
function relatedArticles(a, n = 3) {
  const tags = Utils.tagsOf(a).map(t => t.toLowerCase());
  const artist = a.review && a.review.artist ? a.review.artist.trim().toLowerCase() : '';
  const cats = Utils.catsOf(a);
  return publishedArticles().filter(x => x.id !== a.id).map(x => {
    const xt = Utils.tagsOf(x).map(t => t.toLowerCase());
    const xa = x.review && x.review.artist ? x.review.artist.trim().toLowerCase() : '';
    let score = tags.filter(t => xt.includes(t)).length * 3;
    if (artist && (xa === artist || xt.includes(artist))) score += 4;
    if (xa && tags.includes(xa)) score += 4;
    score += Utils.catsOf(x).filter(c => cats.includes(c)).length;
    return { x, score };
  }).filter(o => o.score > 0)
    .sort((p, q) => q.score - p.score || Date.parse(q.x.createdAt) - Date.parse(p.x.createdAt))
    .slice(0, n).map(o => o.x);
}

function notFoundHtml(text) {
  const latest = publishedArticles().slice(0, 3);
  return `<div class="nf">
      <div class="nf-code" aria-hidden="true">404</div>
      <h1 class="nf-title">Tu nic nie ma</h1>
      <p class="nf-text">${text}</p>
      <div class="nf-actions">
        <a class="btn btn-primary" href="#/">Wróć na stronę główną</a>
        <a class="btn" href="#/ranking">Zobacz ranking ocen</a>
      </div>
    </div>
    ${latest.length ? `<section class="related"><h2 class="section-title">Zobacz zamiast tego</h2><div class="related-grid">${latest.map(x => cardHtml(x, { noAdmin: true })).join('')}</div></section>` : ''}`;
}

/* „Czytaj też” w środku artykułu: czasem, losowy inny artykuł, minimalistyczny blok między akapitami */
function injectPeek(root, a) {
  if (!(Math.random() < CONFIG.PEEK_CHANCE)) return;
  const body = root.querySelector('.article-body');
  if (!body) return;
  const kids = [...body.children];
  if (kids.length < 8) return;
  const pool = publishedArticles().filter(x => x.id !== a.id);
  if (!pool.length) return;
  const pick = pool[Math.floor(Math.random() * pool.length)];
  let i = Math.floor(kids.length * 0.3);
  while (i < kids.length - 3 && !(kids[i].tagName === 'P' && kids[i - 1] && kids[i - 1].tagName === 'P')) i++;
  if (i >= kids.length - 3) return;
  const id = encodeURIComponent(pick.id), cat = Utils.catsOf(pick)[0] || '';
  const mins = Utils.readingTime(pick, state.plain.get(pick.id));
  const box = document.createElement('aside');
  box.className = 'peek';
  box.setAttribute('aria-label', 'Polecany artykuł');
  box.innerHTML = `<a class="peek-link" href="#/artykul/${id}">
    <span class="peek-text"><span class="peek-kicker">Czytaj też</span><strong class="peek-title">${Utils.esc(pick.title)}</strong>
    <span class="peek-meta">${cat ? Utils.esc(cat) + ' · ' : ''}${mins} min<span class="peek-go">Czytaj →</span></span></span>
    <img class="peek-img" src="${Utils.esc(thumbFor(pick))}"${imgFocus(pick, thumbFor(pick))} alt="" data-cat="${Utils.esc(cat)}" loading="lazy" decoding="async">
  </a>`;
  kids[i].insertAdjacentElement('beforebegin', box);
}

function renderArticleView(id) {
  const el = $('#view-article');
  const a = state.articles.find(x => x.id === id);
  if (a && a.quick) { location.replace('#/szybkie'); return; }
  const visible = a && (isPublished(a) || Auth.isAdmin());

  if (!visible) {
    el.innerHTML = notFoundHtml('Nie znaleziono takiego artykułu. Mógł zostać usunięty, przeniesiony albo nie jest jeszcze opublikowany.');
    document.title = `Nie znaleziono – ${CONFIG.SITE_NAME}`;
    setMeta();
    return;
  }

  const notice = !isPublished(a)
    ? `<div class="notice">Ten artykuł jest zaplanowany – czytelnicy zobaczą go od ${Utils.formatDate(a.createdAt)}.</div>`
    : '';

  const manual = (a.related || []).map(id => publishedArticles().find(x => x.id === id)).filter(Boolean).slice(0, 3);
  const rel = manual.length ? manual : relatedArticles(a);
  const relTitle = manual.length ? 'Zobacz też' : 'Czytaj dalej';
  const pub = publishedArticles();
  const idx = pub.findIndex(x => x.id === a.id);
  const newer = idx > 0 ? pub[idx - 1] : null;
  const older = idx >= 0 && idx < pub.length - 1 ? pub[idx + 1] : null;
  const pagerHtml = (newer || older)
    ? `<nav class="article-pager" aria-label="Inne artykuły">
        ${older ? `<a class="pager-link pager-older" href="#/artykul/${encodeURIComponent(older.id)}" rel="prev"><span class="pager-label">← Starszy artykuł</span><span class="pager-title">${Utils.esc(older.title)}</span></a>` : '<span></span>'}
        ${newer ? `<a class="pager-link pager-newer" href="#/artykul/${encodeURIComponent(newer.id)}" rel="next"><span class="pager-label">Nowszy artykuł →</span><span class="pager-title">${Utils.esc(newer.title)}</span></a>` : '<span></span>'}
      </nav>`
    : '';
  const relatedHtml = rel.length
    ? `<section class="related" aria-label="${relTitle}"><h2 class="section-title">${relTitle}</h2><div class="related-grid">${rel.map(x => cardHtml(x, { noAdmin: true })).join('')}</div></section>`
    : '';

  el.innerHTML = `
    <div class="article-top">
      <a class="btn" href="#/">← Powrót do strony głównej</a>
      <div class="top-actions">
        <button type="button" class="btn btn-ico" data-action="save" data-id="${Utils.esc(a.id)}" aria-pressed="${Saved.has(a.id)}" aria-label="${Saved.has(a.id) ? 'Zapisano' : 'Zapisz'}"><svg viewBox="0 0 24 24" width="18" height="18" fill="${Saved.has(a.id) ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 4h12v17l-6-4-6 4z"/></svg><span class="lbl">${Saved.has(a.id) ? 'Zapisano' : 'Zapisz'}</span></button>
        <button type="button" class="btn btn-ico" data-action="share" data-id="${Utils.esc(a.id)}" aria-label="Udostępnij"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 15V3M7 8l5-5 5 5"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/></svg><span class="lbl">Udostępnij</span></button>
        ${adminButtons(a.id)}
      </div>
    </div>
    ${notice}
    ${articleHtml(a, state.plain.get(a.id))}
    <section class="reactions" id="reactions" data-article="${Utils.esc(a.id)}" aria-label="Reakcje" hidden></section>
    ${pagerHtml}
    ${relatedHtml}`;
  enhanceGalleries(el);
  injectPeek(el, a);
  $('#side-comments').innerHTML = '';
  initReaderVote(a);
  initReactions(a);
  initComments(a);
  document.title = `${a.title} – ${CONFIG.SITE_NAME}`;
  setMeta(a.title, a.lead);
}

/* =========================================================
   Post na Instagram: grafika 1080×1350 + opis w schowku (przycisk „Post IG” obok „Edytuj”)
   ========================================================= */
const APP_BASE = (() => { try { return document.currentScript ? new URL('.', document.currentScript.src).href : ''; } catch { return ''; } })();

function loadImage(src, cors) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (cors) img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Nie udało się wczytać obrazu'));
    img.src = src;
  });
}

/** Opis do wklejenia pod postem. */
function instagramCaption(a) {
  const lead = (a.lead || '').replace(/\s+/g, ' ').trim();
  const tags = Utils.tagsOf(a).slice(0, 6).map(t => '#' + t.replace(/[^\p{L}\p{N}]+/gu, '')).filter(t => t.length > 1);
  const cats = Utils.catsOf(a).map(c => '#' + c.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ''));
  const all = [...new Set([...tags, ...cats, '#śliskanews', '#śliska'])];
  const score = a.review && a.review.score != null ? `\n⭐ Ocena: ${String(a.review.score).replace('.', ',')}/10` : '';
  return `${a.title}\n\n${lead}${score}\n\nCałość na sliska.pl/news (link w bio) ⭐\n\n${all.join(' ')}`;
}

/** Zawija tekst do szerokości; zwraca linie. */
function wrapLines(ctx, text, maxW) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines = [];
  let cur = '';
  for (const w of words) {
    const t = cur ? cur + ' ' + w : w;
    if (ctx.measureText(t).width <= maxW || !cur) cur = t; else { lines.push(cur); cur = w; }
  }
  if (cur) lines.push(cur);
  return lines;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

const PL_SAMPLE = 'ąćęłńóśźżĄĆĘŁŃÓŚŹŻ';   // żeby przeglądarka dociągnęła też polskie znaki czcionki przed rysowaniem grafiki
/** Puste, delikatnie zaznaczone miejsce na naklejkę „Link” z Instagrama (Story). */
function drawStickerZone(ctx, W, H, family) {
  const w = 640, h = 132, x = (W - w) / 2, y = H - 420;
  ctx.save();
  ctx.setLineDash([14, 12]);
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(255,255,255,.55)';
  roundRect(ctx, x, y, w, h, 66);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = 'rgba(255,255,255,.55)';
  ctx.font = `700 28px ${family}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('tu wstaw naklejkę z linkiem', W / 2, y + h / 2);
  ctx.restore();
}

function canvasBlob(canvas) {
  return new Promise((res, rej) => canvas.toBlob(b => (b ? res(b) : rej(new Error('toBlob'))), 'image/png'));
}

/** Tło ze zdjęcia artykułu (przycięte jak „cover”) + przyciemnienie; zwraca płótno do dalszego rysowania. */
async function igBackdrop(a, W, H, overlay) {
  const family = getComputedStyle(document.body).fontFamily;
  try { await Promise.all([document.fonts.load(`800 80px ${family}`, PL_SAMPLE), document.fonts.load(`700 30px ${family}`, PL_SAMPLE)]); } catch {}
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#111';
  ctx.fillRect(0, 0, W, H);
  let photoOk = true, img = null;
  const src = getImage(a);
  try { img = await loadImage(src, !src.startsWith('data:')); }
  catch { photoOk = !a.image; try { img = await loadImage(Utils.placeholder(Utils.catsOf(a)[0])); } catch {} }
  if (img) {
    const iw = img.naturalWidth || W, ih = img.naturalHeight || H;
    const k = Math.max(W / iw, H / ih);
    ctx.drawImage(img, (W - iw * k) / 2, (H - ih * k) / 2, iw * k, ih * k);
  }
  if (overlay) { ctx.fillStyle = overlay; ctx.fillRect(0, 0, W, H); }
  return { canvas, ctx, family, photoOk };
}

/** Wspólna stopka wszystkich grafik pionowych: linia, adres po lewej, opis po prawej. */
function drawFooterStd(ctx, W, H, family, right, opts = {}) {
  const PAD = 72, footY = opts.footY || H - 82;
  ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(PAD, footY - 56, W - PAD * 2, 2);
  ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.font = `700 32px ${family}`; ctx.textBaseline = 'middle';
  ctx.textAlign = 'left'; ctx.fillText('sliska.pl/news', PAD, footY);
  if (right) { ctx.textAlign = 'right'; ctx.fillText(right, W - PAD, footY); }
  ctx.textAlign = 'left';
}

/** Wspólna rama grafik (jak w karuzeli) + data w prawym górnym rogu, gdy nie ma kółka z oceną. */
function drawFrame(ctx, W, H, o = {}) {
  const inset = o.inset || 26, r = o.radius || 36;
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,.2)'; ctx.lineWidth = 2;
  roundRect(ctx, inset, inset, W - inset * 2, H - inset * 2, r); ctx.stroke();
  if (o.a && o.dateY != null) {
    const d = new Date(o.a.createdAt || Date.now());
    const txt = [String(d.getDate()).padStart(2, '0'), String(d.getMonth() + 1).padStart(2, '0'), d.getFullYear()].join('.');
    ctx.fillStyle = '#fff'; ctx.font = `800 ${o.dateSize || 34}px ${o.family}`; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    if ('letterSpacing' in ctx) ctx.letterSpacing = '2px';
    ctx.fillText(txt, W - (o.padRight || 72), o.dateY);
  }
  ctx.restore();
}

/** Redakcyjny „kicker”: krótka linia + rozstrzelony napis (zastępuje czerwone plakietki). */
function drawKicker(ctx, text, x, yTop, o = {}) {
  const size = o.size || 30, h = o.h || 56, family = o.family;
  const cy = yTop + h / 2;
  ctx.save();
  if (o.centerW) {
    ctx.font = `800 ${size}px ${family}`;
    if ('letterSpacing' in ctx) ctx.letterSpacing = Math.round(size * 0.17) + 'px';
    x = Math.round((o.centerW - (Math.round(size * 1.8) + 20 + ctx.measureText(text).width)) / 2);
  }
  ctx.fillStyle = o.line || '#d6001c';
  ctx.fillRect(x, cy - 3, Math.round(size * 1.8), 6);
  ctx.fillStyle = o.color || '#fff'; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
  ctx.font = `800 ${size}px ${family}`;
  if ('letterSpacing' in ctx) ctx.letterSpacing = Math.round(size * 0.17) + 'px';
  ctx.fillText(text, x + Math.round(size * 1.8) + 20, cy + 1);
  ctx.restore();
}

async function drawLogoWhite(ctx, x, y, w, family) {
  try {
    const logo = await loadImage(APP_BASE + 'logo-biale.svg');
    ctx.drawImage(logo, x, y, w, w * 128 / 732);
  } catch {
    ctx.fillStyle = '#fff'; ctx.font = `800 ${Math.round(w / 7)}px ${family}`; ctx.textBaseline = 'top'; ctx.fillText('śliska news', x, y);
  }
}

function scoreBadge(ctx, cx, cy, r, score, family) {
  ctx.fillStyle = '#d6001c';
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = `800 ${Math.round(r * 0.9)}px ${family}`;
  ctx.fillText(String(score).replace('.', ','), cx, cy + r * 0.04);
  ctx.textAlign = 'left';
}

/** Poziome grafiki: X (16:9) i „podgląd linku” (1200×630). */
async function renderWideImage(a, format) {
  const wideX = format === 'x';
  const W = wideX ? 1600 : 1200, H = wideX ? 900 : 630, PAD = wideX ? 80 : 56;
  const { canvas, ctx, family, photoOk } = await igBackdrop(a, W, H, null);
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, 'rgba(0,0,0,.5)'); g.addColorStop(.35, 'rgba(0,0,0,.08)'); g.addColorStop(.62, 'rgba(0,0,0,.45)'); g.addColorStop(1, 'rgba(0,0,0,.93)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  await drawLogoWhite(ctx, PAD, PAD, wideX ? 400 : 300, family);
  if (a.review && a.review.score != null) scoreBadge(ctx, W - PAD - (wideX ? 72 : 58), PAD + (wideX ? 62 : 50), wideX ? 72 : 58, a.review.score, family);
  const maxW = W - PAD * 2;
  const frameIn = wideX ? 24 : 20, fh = wideX ? 56 : 48;
  const footY = H - frameIn - fh;
  let size = wideX ? 92 : 68, lines;
  for (; size >= 38; size -= 4) {
    ctx.font = `800 ${size}px ${family}`;
    lines = wrapLines(ctx, a.title, maxW);
    if (lines.length <= 3 && lines.every(l => ctx.measureText(l).width <= maxW)) break;
  }
  const lh = Math.round(size * 1.1);
  const titleTop = footY - fh - 36 - lines.length * lh;
  ctx.fillStyle = '#fff'; ctx.textBaseline = 'top';
  lines.forEach((l, i) => ctx.fillText(l, PAD, titleTop + i * lh));
  const cat = (Utils.catsOf(a)[0] || 'News').toUpperCase();
  const chipH = wideX ? 48 : 40;
  const chipY = titleTop - 20 - chipH;
  drawKicker(ctx, cat, PAD, chipY, { size: wideX ? 26 : 22, h: chipH, family });
  ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(PAD, footY - fh, W - PAD * 2, 2);
  ctx.fillStyle = 'rgba(255,255,255,.85)';
  ctx.font = `700 ${wideX ? 30 : 24}px ${family}`;
  ctx.textBaseline = 'middle';
  ctx.fillText('sliska.pl/news', PAD, footY);
  ctx.textAlign = 'right';
  ctx.fillText(wideX ? 'Czytaj więcej →' : 'Śliska News', W - PAD, footY);
  ctx.textAlign = 'left';
  drawFrame(ctx, W, H, { inset: wideX ? 24 : 20, radius: wideX ? 34 : 30, a: (a.review && a.review.score != null) ? null : a, dateY: PAD + (wideX ? 34 : 28), dateSize: wideX ? 32 : 26, padRight: PAD, family });
  return { blob: await canvasBlob(canvas), photoOk };
}

/** Miękkie rozmycie zdjęcia na całe płótno (bez „pikseli”): zmniejszamy w kilku krokach i powiększamy z powrotem. */
function drawSoftBlur(ctx, img, W, H) {
  const iw = img.naturalWidth || W, ih = img.naturalHeight || H, k = Math.max(W / iw, H / ih);
  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high'; return c; };
  let w = Math.round(W / 3), h = Math.round(H / 3);
  let cur = mk(w, h);
  cur.getContext('2d').drawImage(img, (w - iw * k / 3) / 2, (h - ih * k / 3) / 2, iw * k / 3, ih * k / 3);
  while (w > 60) {
    const nw = Math.max(60, Math.round(w / 2)), nh = Math.max(75, Math.round(h / 2));
    const nx = mk(nw, nh); nx.getContext('2d').drawImage(cur, 0, 0, nw, nh); cur = nx; w = nw; h = nh;
  }
  while (w < W) {
    const nw = Math.min(W, w * 2), nh = Math.min(H, h * 2);
    const nx = mk(nw, nh); nx.getContext('2d').drawImage(cur, 0, 0, nw, nh); cur = nx; w = nw; h = nh;
  }
  ctx.save();
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  if ('filter' in ctx) ctx.filter = 'blur(18px)';
  ctx.drawImage(cur, -30, -30, W + 60, H + 60);
  ctx.restore();
}

/** Recenzja (4:5): w tle wybrane zdjęcie (albo – gdy go nie ma – miękko rozmyta okładka), okładka + ocena, układ jak na grafice X. */
async function renderReviewImage(a) {
  const W = 1080, H = 1350, PAD = 72;
  const r = a.review || {};
  const family = getComputedStyle(document.body).fontFamily;
  try { await Promise.all([document.fonts.load(`800 80px ${family}`, PL_SAMPLE), document.fonts.load(`700 30px ${family}`, PL_SAMPLE)]); } catch {}
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  let photoOk = true;
  const origImage = a._origImage !== undefined ? a._origImage : a.image;
  const coverSrc = (r.coverSame || !r.cover) ? origImage : r.cover;
  const load = async src => { if (!src) return null; try { return await loadImage(src, !String(src).startsWith('data:')); } catch { photoOk = false; return null; } };
  const cover = await load(coverSrc);
  const bgImg = (a.image && a.image !== coverSrc) ? await load(a.image) : null;
  ctx.fillStyle = '#111'; ctx.fillRect(0, 0, W, H);
  if (bgImg) {
    const iw = bgImg.naturalWidth || W, ih = bgImg.naturalHeight || H, k = Math.max(W / iw, H / ih);
    ctx.drawImage(bgImg, (W - iw * k) / 2, (H - ih * k) / 2, iw * k, ih * k);
  } else if (cover) {
    drawSoftBlur(ctx, cover, W, H);
  }
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, 'rgba(0,0,0,.55)'); g.addColorStop(.3, 'rgba(0,0,0,.25)'); g.addColorStop(.6, 'rgba(0,0,0,.55)'); g.addColorStop(1, 'rgba(0,0,0,.94)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  if (!bgImg) { ctx.fillStyle = 'rgba(8,8,12,.28)'; ctx.fillRect(0, 0, W, H); }

  await drawLogoWhite(ctx, PAD, PAD, 330, family);
  const hasScore = r.score != null;
  if (hasScore) scoreBadge(ctx, W - PAD - 78, PAD + 62, 78, r.score, family);

  // układ od dołu: stopka → podtytuł → tytuł → kicker → okładka
  const footY = H - 82, lineY = footY - 56, maxW = W - PAD * 2;
  const work = r.work || a.title;
  let size = 84, lines;
  for (; size >= 44; size -= 4) {
    ctx.font = `800 ${size}px ${family}`;
    lines = wrapLines(ctx, work, maxW);
    if (lines.length <= 2 && lines.every(l => ctx.measureText(l).width <= maxW)) break;
  }
  const lh = Math.round(size * 1.1);
  const sub = [r.artist, r.kind, r.year].filter(Boolean).join('  ·  ');
  const subTop = lineY - 36 - 38;
  const titleTop = subTop - 22 - lines.length * lh;
  const kickTop = titleTop - 26 - 56;
  const topFree = PAD + 58 + 44;
  const S = Math.max(300, Math.min(580, kickTop - topFree - 44));
  const tx = Math.round((W - S) / 2), ty = Math.round(topFree + (kickTop - topFree - S) / 2);
  if (cover) {
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,.55)'; ctx.shadowBlur = 50; ctx.shadowOffsetY = 20;
    ctx.fillStyle = '#000'; roundRect(ctx, tx, ty, S, S, 26); ctx.fill();
    ctx.restore();
    ctx.save();
    roundRect(ctx, tx, ty, S, S, 26); ctx.clip();
    const iw = cover.naturalWidth || S, ih = cover.naturalHeight || S, k = Math.max(S / iw, S / ih);
    ctx.drawImage(cover, tx + (S - iw * k) / 2, ty + (S - ih * k) / 2, iw * k, ih * k);
    ctx.restore();
  }
  drawKicker(ctx, 'RECENZJA', 0, kickTop, { family, centerW: W });
  ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  ctx.font = `800 ${size}px ${family}`;
  lines.forEach((l, i) => ctx.fillText(l, W / 2, titleTop + i * lh));
  ctx.fillStyle = 'rgba(255,255,255,.82)'; ctx.font = `700 34px ${family}`;
  ctx.fillText(sub, W / 2, subTop);
  ctx.textAlign = 'left';
  drawFooterStd(ctx, W, H, family, 'Link w bio →');
  drawFrame(ctx, W, H, { a: hasScore ? null : a, dateY: PAD + 29, family });
  return { blob: await canvasBlob(canvas), photoOk };
}

/** Slajd karuzeli „W skrócie”: zajawka artykułu albo własny tekst. Ta sama rama co Post 4:5. */
async function renderSummarySlide(a, text, opts = {}) {
  const W = 1080, H = 1350, PAD = 72;
  const { canvas, ctx, family, photoOk } = await igBackdrop(a, W, H, 'rgba(10,10,14,.82)');
  await drawLogoWhite(ctx, PAD, PAD, 330, family);
  drawKicker(ctx, 'W SKRÓCIE', PAD, 250, { family });
  const paras = String(text || '').split(/\n+/).map(s => s.trim()).filter(Boolean);
  const maxW = W - PAD * 2 - 36, top = 350, bottom = H - 150;
  let size = 64, lines = [];
  for (; size >= 30; size -= 2) {
    ctx.font = `700 ${size}px ${family}`;
    lines = [];
    paras.forEach((p, i) => { if (i) lines.push(''); lines.push(...wrapLines(ctx, p, maxW)); });
    if (lines.length * size * 1.3 <= bottom - top) break;
  }
  const lh = Math.round(size * 1.3), total = lines.length * lh;
  const y0 = top + Math.max(0, (bottom - top - total) / 2);
  ctx.fillStyle = '#d6001c'; ctx.fillRect(PAD, y0 - 4, 8, total + 4);
  ctx.fillStyle = '#fff'; ctx.textBaseline = 'top';
  lines.forEach((l, i) => ctx.fillText(l, PAD + 36, y0 + i * lh));
  drawFooterStd(ctx, W, H, family, opts.footRight || 'Przesuń →');
  drawFrame(ctx, W, H, {});
  return { blob: await canvasBlob(canvas), photoOk };
}

/** Ostatni slajd karuzeli: zaproszenie do artykułu. Ta sama rama co pozostałe. */
async function renderLinkSlide(a, opts = {}) {
  const W = 1080, H = 1350, PAD = 72;
  const { canvas, ctx, family, photoOk } = await igBackdrop(a, W, H, null);
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, 'rgba(242,0,42,.95)'); g.addColorStop(1, 'rgba(110,0,14,.98)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  await drawLogoWhite(ctx, PAD, PAD, 330, family);
  drawKicker(ctx, 'CAŁOŚĆ NA STRONIE', PAD, 250, { family, line: '#fff' });
  // tytuł artykułu (jak w pozostałych slajdach – po lewej, w ramie)
  const maxW = W - PAD * 2;
  let size = 84, lines;
  for (; size >= 44; size -= 4) {
    ctx.font = `800 ${size}px ${family}`;
    lines = wrapLines(ctx, a.title, maxW);
    if (lines.length <= 4 && lines.every(l => ctx.measureText(l).width <= maxW)) break;
  }
  const lh = Math.round(size * 1.1);
  ctx.fillStyle = '#fff'; ctx.textBaseline = 'top';
  let y = 380;
  lines.forEach((l, i) => ctx.fillText(l, PAD, y + i * lh));
  y += lines.length * lh + 60;
  ctx.font = `800 44px ${family}`;
  if ('letterSpacing' in ctx) ctx.letterSpacing = '4px';
  const pill = 'LINK W BIO';
  const pw = ctx.measureText(pill).width + 90;
  ctx.fillStyle = '#fff'; roundRect(ctx, PAD, y, pw, 96, 48); ctx.fill();
  ctx.fillStyle = '#d6001c'; ctx.textBaseline = 'middle'; ctx.fillText(pill, PAD + 45, y + 50);
  if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
  drawFooterStd(ctx, W, H, family, opts.footRight || 'Zapisz • Udostępnij');
  drawFrame(ctx, W, H, {});
  return { blob: await canvasBlob(canvas), photoOk };
}

async function renderInstagramImage(a, opts = {}) {
  const format = opts.format || 'post';
  if (format === 'x' || format === 'share') return renderWideImage(a, format);
  if (format === 'review') return renderReviewImage(a, opts);
  if (format === 'summary') return renderSummarySlide(a, opts.summary || '', opts);
  if (format === 'link') return renderLinkSlide(a, opts);
  const isQuote = format === 'quote' || format === 'cquote';
  const story = format === 'story' || format === 'quote';
  const W = 1080, H = story ? 1920 : 1350, PAD = 72;
  const topY = story ? 230 : PAD;        // w Story góra i dół zasłaniają interfejs Instagrama
  const footY = story ? H - 520 : H - 82, lo = story ? 42 : 56;   // lo = odległość linii nad stopką
  const family = getComputedStyle(document.body).fontFamily;
  try { await Promise.all([document.fonts.load(`800 80px ${family}`, PL_SAMPLE), document.fonts.load(`700 30px ${family}`, PL_SAMPLE)]); } catch {}

  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  let photoOk = true;

  // tło: zdjęcie (przycięte jak „cover”) albo kolorowy wzór kategorii
  ctx.fillStyle = '#111';
  ctx.fillRect(0, 0, W, H);
  const src = getImage(a);
  let img = null;
  try { img = await loadImage(src, !src.startsWith('data:')); }
  catch { photoOk = !a.image; try { img = await loadImage(Utils.placeholder(Utils.catsOf(a)[0])); } catch {} }
  if (img) {
    const iw = img.naturalWidth || W, ih = img.naturalHeight || H;
    const k = Math.max(W / iw, H / ih);
    ctx.drawImage(img, (W - iw * k) / 2, (H - ih * k) / 2, iw * k, ih * k);
  }
  // przyciemnienie: lekko u góry, mocno na dole (pod tytułem)
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, 'rgba(0,0,0,.45)');
  g.addColorStop(.28, 'rgba(0,0,0,.05)');
  g.addColorStop(.5, 'rgba(0,0,0,.35)');
  g.addColorStop(1, 'rgba(0,0,0,.92)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  if (isQuote) { ctx.fillStyle = 'rgba(10,10,14,.62)'; ctx.fillRect(0, 0, W, H); }  // cytat musi być czytelny na każdym zdjęciu

  // logo (białe) w lewym górnym rogu
  try {
    const logo = await loadImage(APP_BASE + 'logo-biale.svg');
    const lw = 330, lh = lw * 128 / 732;
    ctx.drawImage(logo, PAD, topY, lw, lh);
  } catch {
    ctx.fillStyle = '#fff'; ctx.font = `800 44px ${family}`; ctx.textBaseline = 'top'; ctx.fillText('śliska news', PAD, topY);
  }

  // ocena w kółku (recenzje) – prawy górny róg
  if (a.review && a.review.score != null) {
    const r = 82, cx = W - PAD - r, cy = topY + r - 6;
    ctx.fillStyle = '#d6001c';
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `800 74px ${family}`;
    ctx.fillText(String(a.review.score).replace('.', ','), cx, cy + 3);
    ctx.textAlign = 'left';
  }

  if (isQuote) {
    const qt = (opts.quote && opts.quote.text) || '';
    const qa = (opts.quote && opts.quote.author) || '';
    const qW = W - PAD * 2 - 40;
    let qs = 84, qLines;
    for (; qs >= 40; qs -= 4) {
      ctx.font = `800 ${qs}px ${family}`;
      qLines = qt.split(/\n+/).flatMap(p => wrapLines(ctx, p, qW));
      if (qLines.length * qs * 1.22 <= 780) break;
    }
    const qlh = Math.round(qs * 1.22);
    const blockH = qLines.length * qlh;
    const midY = H * 0.47;
    const qTop = Math.round(midY - blockH / 2);
    ctx.fillStyle = '#d6001c';
    ctx.font = `800 300px ${family}`;
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('“', PAD - 6, qTop - 10);
    ctx.fillStyle = '#fff';
    ctx.textBaseline = 'top';
    ctx.font = `800 ${qs}px ${family}`;
    qLines.forEach((l, i) => ctx.fillText(l, PAD + 20, qTop + i * qlh));
    let nextY = qTop + blockH + 44;
    if (qa) {
      ctx.fillStyle = '#d6001c';
      ctx.fillRect(PAD + 20, nextY + 6, 64, 6);
      ctx.fillStyle = '#fff';
      ctx.font = `700 44px ${family}`;
      ctx.fillText(qa, PAD + 104, nextY - 8);
      nextY += 70;
    }
    ctx.fillStyle = 'rgba(255,255,255,.7)';
    ctx.font = `600 32px ${family}`;
    wrapLines(ctx, 'z artykułu: ' + a.title, qW).slice(0, 2).forEach((l, i) => ctx.fillText(l, PAD + 20, nextY + 12 + i * 42));
    ctx.fillStyle = 'rgba(255,255,255,.35)';
    ctx.fillRect(PAD, footY - lo, W - PAD * 2, 2);
    ctx.fillStyle = 'rgba(255,255,255,.85)';
    ctx.font = `700 32px ${family}`;
    ctx.textBaseline = 'middle';
    ctx.fillText('sliska.pl/news', PAD, footY);
    ctx.textAlign = 'right';
    if (story) drawStickerZone(ctx, W, H, family); else ctx.fillText(opts.footRight || 'Link w bio →', W - PAD, footY);
    ctx.textAlign = 'left';
    drawFrame(ctx, W, H, { a: (a.review && a.review.score != null) ? null : a, dateY: topY + 29, family });
    const qblob = await new Promise((res, rej) => canvas.toBlob(b => (b ? res(b) : rej(new Error('toBlob'))), 'image/png'));
    return { blob: qblob, photoOk };
  }

  // dół: kategoria (plakietka), tytuł, adres
  const maxW = W - PAD * 2;
  let size = 96, lines;
  for (; size >= 52; size -= 4) {
    ctx.font = `800 ${size}px ${family}`;
    lines = wrapLines(ctx, a.title, maxW);
    if (lines.length <= 5 && lines.every(l => ctx.measureText(l).width <= maxW)) break;
  }
  const lh = Math.round(size * 1.1);
  const bottomY = footY - lo - 42;
  const titleTop = bottomY - lines.length * lh;
  ctx.fillStyle = '#fff';
  ctx.textBaseline = 'top';
  lines.forEach((l, i) => ctx.fillText(l, PAD, titleTop + i * lh));

  const cat = (Utils.catsOf(a)[0] || 'News').toUpperCase();
  drawKicker(ctx, cat, PAD, titleTop - 28 - 56, { family });

  ctx.fillStyle = 'rgba(255,255,255,.35)';
  ctx.fillRect(PAD, footY - lo, maxW, 2);
  ctx.fillStyle = 'rgba(255,255,255,.85)';
  ctx.font = `700 32px ${family}`;
  ctx.textBaseline = 'middle';
  ctx.fillText('sliska.pl/news', PAD, footY);
  ctx.textAlign = 'right';
  if (!story) ctx.fillText(opts.footRight || 'Link w bio →', W - PAD, footY);
  else drawStickerZone(ctx, W, H, family);
  ctx.textAlign = 'left';

  drawFrame(ctx, W, H, { a: (a.review && a.review.score != null) ? null : a, dateY: topY + 29, family });
  const blob = await new Promise((res, rej) => canvas.toBlob(b => (b ? res(b) : rej(new Error('toBlob'))), 'image/png'));
  return { blob, photoOk };
}


/*@staff-removed*/
async function shareArticle(id) {
  const a = state.articles.find(x => x.id === id);
  if (!a) return;
  const url = articleUrl(a);
  if (navigator.share) {
    try {
      await navigator.share({ url });
      return;
    } catch (e) {
      if (e && e.name === 'AbortError') return;
    }
  }
  try {
    await navigator.clipboard.writeText(url);
    toast('Link skopiowany do schowka.');
  } catch {
    toast('Skopiuj adres z paska przeglądarki.');
  }
}

async function copyLink(id) {
  const a = state.articles.find(x => x.id === id);
  if (!a) return;
  try {
    await navigator.clipboard.writeText(articleShortUrl(a));
    toast('Krótki link skopiowany do schowka.');
  } catch {
    toast('Skopiuj adres z paska przeglądarki.');
  }
}

/* ---------- Ranking ocen (własny układ: lista z miernikiem) ---------- */
const STAR_PATH = 'M180.88,53.81l2.09,11.29,11.22,2.49-10.1,5.49,1.1,11.43-8.33-7.91-10.53,4.58,4.94-10.37-7.61-8.61,11.39,1.5,5.83-9.9Z';
const REVIEW_KINDS = ['Albumy', 'Single', 'Epki', 'Reedycje'];

function reviewYearOf(a) {
  const y = String((a.review && a.review.year) || '').match(/\d{4}/);
  return y ? y[0] : String(new Date(a.createdAt).getFullYear());
}

function renderRanking() {
  const el = $('#view-ranking');
  const all = publishedArticles().filter(a => a.review && a.review.score !== null && a.review.score !== undefined);
  const years = [...new Set(all.map(reviewYearOf))].sort((p, q) => q.localeCompare(p));
  const { kind, year } = state.rank;
  const list = all
    .filter(a => (kind === 'Wszystkie' || Utils.same(a.review.kind, kind)) && (year === 'Wszystkie' || reviewYearOf(a) === year))
    .sort((p, q) => q.review.score - p.review.score || Date.parse(q.createdAt) - Date.parse(p.createdAt));

  const kindBtns = ['Wszystkie', ...REVIEW_KINDS].map(k =>
    `<button type="button" class="rank-chip${k === kind ? ' active' : ''}" data-rank-kind="${Utils.esc(k)}">${Utils.esc(k)}</button>`).join('');
  const yearSel = `<label class="rank-year"><span>Rok</span><select id="rank-year">
      <option value="Wszystkie">Wszystkie lata</option>
      ${years.map(y => `<option value="${y}"${y === year ? ' selected' : ''}>${y}</option>`).join('')}
    </select></label>`;

  const rows = list.map((a, i) => {
    const r = a.review;
    const best = r.score > BEST_SCORE;
    const cover = coverOf(a) || getImage(a);
    const id = encodeURIComponent(a.id);
    return `<li class="rank-row${best ? ' is-best' : ''}" data-id="${Utils.esc(a.id)}">
      <span class="rank-pos">${i + 1}</span>
      <a class="rank-cover" href="#/artykul/${id}" tabindex="-1" aria-hidden="true"><img src="${Utils.esc(cover)}" alt="" loading="lazy" decoding="async" data-cat="${Utils.esc(Utils.catsOf(a)[0] || '')}"></a>
      <div class="rank-main">
        <span class="rank-meta">${Utils.esc([r.kind, reviewYearOf(a)].filter(Boolean).join(' · '))}</span>
        <a class="rank-work" href="#/artykul/${id}">${Utils.esc(r.work)}</a>
        ${r.artist ? `<a class="rank-artist" href="#/artysta/${encodeURIComponent(r.artist)}">${Utils.esc(r.artist)}</a>` : ''}
      </div>
      <div class="rank-score" aria-label="Ocena ${Utils.formatScore(r.score)} na 10">
        <span class="rank-num">${best ? `<svg class="rank-star" viewBox="158 52 38 34" aria-hidden="true"><path d="${STAR_PATH}"/></svg>` : ''}${Utils.formatScore(r.score)}</span>
        <span class="rank-bar"><i style="width:${(r.score * 10).toFixed(0)}%"></i></span>
      </div>
    </li>`;
  }).join('');

  el.innerHTML = `
    <div class="article-top"><a class="btn" href="#/">← Powrót do strony głównej</a></div>
    <header class="rank-head">
      <span class="rank-eyebrow">Recenzje</span>
      <h1 class="rank-title">Ranking ocen</h1>
      <p class="rank-sub">Wszystko, co oceniliśmy – od najwyżej ocenianych. Gwiazdka oznacza wyróżnienie (ocena powyżej ${Utils.formatScore(BEST_SCORE)}).</p>
    </header>
    <div class="rank-filters">
      <div class="rank-chips" role="group" aria-label="Rodzaj">${kindBtns}</div>
      ${years.length ? yearSel : ''}
    </div>
    ${list.length
      ? `<ol class="rank-list">${rows}</ol>`
      : `<div class="empty-state">${all.length ? 'Brak recenzji dla wybranych filtrów.' : 'Nie ma jeszcze żadnych ocenionych recenzji.'}</div>`}`;
  decorateRankingVotes();
}

/* ---------- Zgłoś temat ---------- */
const TIP_LOG_KEY = 'sliska_tip_log';

function renderTip() {
  $('#view-tip').innerHTML = `
    <div class="article-top"><a class="btn" href="#/">← Powrót do strony głównej</a></div>
    <header class="rank-head">
      <span class="rank-eyebrow">Redakcja</span>
      <h1 class="rank-title">Zgłoś temat</h1>
      <p class="rank-sub">Masz newsa, wskazówkę albo temat, o którym powinniśmy napisać? Podeślij go nam. Czytamy wszystkie zgłoszenia, ale nie możemy obiecać odpowiedzi ani publikacji.</p>
    </header>
    <form id="tip-form" class="panel tip-form" novalidate>
      <input type="text" class="hp-field" tabindex="-1" autocomplete="off" aria-hidden="true">
      <label class="field"><span class="field-label">Temat *</span>
        <input type="text" id="tip-title" maxlength="120" placeholder="O czym jest sprawa? (krótko)" autocomplete="off"></label>
      <label class="field"><span class="field-label">Opis *</span>
        <textarea id="tip-message" rows="6" maxlength="2000" placeholder="Co się stało, kogo dotyczy, skąd o tym wiesz?"></textarea>
        <small class="hint"><span id="tip-count">0</span>/2000</small></label>
      <label class="field"><span class="field-label">Link do źródła (opcjonalnie)</span>
        <input type="text" id="tip-link" maxlength="300" inputmode="url" placeholder="https://…" autocomplete="off"></label>
      <label class="field"><span class="field-label">Twój e-mail (opcjonalnie)</span>
        <input type="text" id="tip-email" maxlength="120" inputmode="email" placeholder="jeśli chcesz, żebyśmy mogli odpisać" autocomplete="email">
        <small class="hint">Podaj tylko wtedy, gdy chcesz otrzymać odpowiedź.</small></label>
      <label class="check"><input type="checkbox" id="tip-consent">
        <span>Wyrażam zgodę na przetwarzanie podanych danych w celu rozpatrzenia zgłoszenia. Szczegóły w <a href="#/prywatnosc">Polityce prywatności</a>. *</span></label>
      <p class="form-error" id="tip-error" hidden></p>
      <div><button type="submit" class="btn btn-primary" id="tip-send">Wyślij zgłoszenie</button></div>
    </form>`;
}

async function submitTip(e) {
  e.preventDefault();
  const form = e.currentTarget;
  if ($('.hp-field', form).value) return;
  const err = msg => { const el = $('#tip-error'); el.textContent = msg; el.hidden = !msg; };
  const title = $('#tip-title').value.trim();
  const message = $('#tip-message').value.trim();
  let link = $('#tip-link').value.trim();
  const email = $('#tip-email').value.trim().toLowerCase();
  if (title.length < 3) { err('Wpisz temat zgłoszenia (min. 3 znaki).'); $('#tip-title').focus(); return; }
  if (message.length < 10) { err('Opisz sprawę w kilku zdaniach (min. 10 znaków).'); $('#tip-message').focus(); return; }
  if (link && !/^https?:\/\//i.test(link)) link = 'https://' + link;
  if (link && !/^https?:\/\/[^\s]+\.[^\s]+$/i.test(link)) { err('Link wygląda niepoprawnie.'); $('#tip-link').focus(); return; }
  if (email && !validEmail(email)) { err('Adres e-mail wygląda niepoprawnie.'); $('#tip-email').focus(); return; }
  if (!$('#tip-consent').checked) { err('Zaznacz zgodę na przetwarzanie danych.'); return; }

  // proste ograniczenie: maks. 3 zgłoszenia na godzinę z jednej przeglądarki
  let log = [];
  try { log = (JSON.parse(localStorage.getItem(TIP_LOG_KEY)) || []).filter(t => Date.now() - t < 3600e3); } catch { /* ignoruj */ }
  if (log.length >= 3) { err('Wysłano już kilka zgłoszeń. Spróbuj ponownie za jakiś czas.'); return; }

  err('');
  const btn = $('#tip-send');
  btn.disabled = true;
  try {
    const tipId = Utils.uid('t_');
    await DataService.addTip({ id: tipId, title, message, link, email, createdAt: new Date().toISOString() });
    notifyTip(tipId, 'topic');
    try { localStorage.setItem(TIP_LOG_KEY, JSON.stringify([...log, Date.now()])); } catch { /* ignoruj */ }
    $('#view-tip').innerHTML = `
      <div class="nf">
        <div class="nf-code" aria-hidden="true">✓</div>
        <h1 class="nf-title">Dziękujemy za zgłoszenie!</h1>
        <p class="nf-text">Wiadomość dotarła do redakcji. Jeśli podałeś e-mail, możemy się z Tobą skontaktować.</p>
        <div class="nf-actions"><a class="btn btn-primary" href="#/">Wróć na stronę główną</a></div>
      </div>`;
    window.scrollTo(0, 0);
  } catch (ex) {
    console.warn(ex);
    err(ex.message || 'Nie udało się wysłać zgłoszenia. Spróbuj później.');
  } finally {
    btn.disabled = false;
  }
}

const TIP_STATUS = {
  new:      { label: 'Nowe',         cls: 'is-new' },
  progress: { label: 'W toku',       cls: 'is-progress' },
  later:    { label: 'Odłożone',     cls: 'is-later' },
  done:     { label: 'Zrealizowane', cls: 'is-done' },
  rejected: { label: 'Odrzucone',    cls: 'is-rejected' }
};
const TIP_OPEN = ['new', 'progress', 'later'];
const TIP_OVR_KEY = 'sliska_tip_status';
function tipOverrides() { try { return JSON.parse(localStorage.getItem(TIP_OVR_KEY)) || {}; } catch { return {}; } }
function tipStatus(t) { return TIP_STATUS[t.status] ? t.status : 'new'; }
let tipFilter = 'open';

function tipHistory(t) {
  const st = tipStatus(t);
  if (st === 'new') return '';
  const art = t.statusArticleId && state.articles.find(a => a.id === t.statusArticleId);
  const when = t.statusAt ? Utils.formatDate(t.statusAt) : '';
  return `<div class="tip-hist is-${st}"><b>${tipKind(t) === 'error' ? TIP_ERR_LABEL[st] : TIP_STATUS[st].label}</b>${when ? ' · ' + when : ''}${art ? ` · artykuł: <a href="#/artykul/${encodeURIComponent(art.id)}">${Utils.esc(art.title)}</a>` : ''}${t.statusNote ? `<br><span>${Utils.esc(t.statusNote)}</span>` : ''}</div>`;
}

/** Rodzaj zgłoszenia: błąd w artykule (formularz „Zauważyłeś błąd?”) albo temat od czytelnika. Bez nowych pól w bazie – po tytule i linku. */
const tipKind = t => /^Błąd w artykule:/.test(t.title || '') ? 'error' : 'topic';
function tipArticle(t) {
  if (tipKind(t) !== 'error') return null;
  const m = String(t.link || t.message || '').match(/\/(?:a|artykul)\/([A-Za-z0-9_-]+)/);
  const id = m ? decodeURIComponent(m[1]) : '';
  return (id && state.articles.find(x => x.id === id)) || null;
}
const TIP_ERR_LABEL = { new: 'Nowy błąd', progress: 'Poprawiam', later: 'Odłożony', done: 'Naprawiony', rejected: 'Nie błąd' };
let tipKindFilter = 'all', tipQuery = '';

function renderTipList() {
  const el = $('#panel-tips');
  const all = state.tips || [];
  const q = Utils.fold(tipQuery);
  const byKind = all.filter(t => tipKindFilter === 'all' || tipKind(t) === tipKindFilter);
  const cnt = { open: 0, done: 0, rejected: 0, all: byKind.length };
  byKind.forEach(t => { const st = tipStatus(t); if (TIP_OPEN.includes(st)) cnt.open++; else cnt[st]++; });
  const kc = k => all.filter(t => (k === 'all' || tipKind(t) === k) && TIP_OPEN.includes(tipStatus(t))).length;
  const kinds = [['all', 'Wszystkie'], ['topic', 'Tematy'], ['error', 'Błędy w artykułach']]
    .map(([k, l]) => `<button type="button" class="tip-kind${tipKindFilter === k ? ' is-active' : ''}" data-tipkind="${k}">${l}${kc(k) ? ` <i>${kc(k)}</i>` : ''}</button>`).join('');
  const chips = [['open', 'Do rozpatrzenia'], ['done', tipKindFilter === 'error' ? 'Naprawione' : 'Zrealizowane'], ['rejected', 'Odrzucone'], ['all', 'Archiwum – wszystkie']]
    .map(([k, l]) => `<button type="button" class="tip-filter${tipFilter === k ? ' is-active' : ''}" data-tipfilter="${k}">${l} <i>${cnt[k]}</i></button>`).join('');
  const list = byKind.filter(t => {
    const st = tipStatus(t);
    if (!(tipFilter === 'all' || (tipFilter === 'open' ? TIP_OPEN.includes(st) : st === tipFilter))) return false;
    return !q || Utils.fold([t.title, t.message, t.email].join(' ')).includes(q);
  });
  const empty = q ? 'Nic nie pasuje do wyszukiwania.' : { open: 'Nic nie czeka na rozpatrzenie. 🎉', done: 'Nic jeszcze nie zostało zrealizowane.', rejected: 'Brak odrzuconych zgłoszeń.', all: 'Brak zgłoszeń od czytelników.' }[tipFilter];
  const item = t => {
    const st = tipStatus(t), err = tipKind(t) === 'error', art = tipArticle(t);
    const label = err ? TIP_ERR_LABEL[st] : TIP_STATUS[st].label;
    const msg = err ? String(t.message || '').replace(/\n\nArtykuł:.*$/s, '') : t.message;
    const title = err ? (art ? art.title : String(t.title).replace(/^Błąd w artykule:\s*/, '')) : t.title;
    const open = TIP_OPEN.includes(st);
    const quick = err && open ? `
            ${art ? `<a class="btn btn-sm" href="#/artykul/${encodeURIComponent(art.id)}">Otwórz artykuł</a><a class="btn btn-sm" href="#/edytor/${encodeURIComponent(art.id)}">Popraw</a>` : ''}
            <button type="button" class="btn btn-sm btn-primary" data-action="tip-quick" data-id="${Utils.esc(t.id)}" data-st="done">✓ Naprawione</button>
            <button type="button" class="btn btn-sm" data-action="tip-quick" data-id="${Utils.esc(t.id)}" data-st="rejected">To nie błąd</button>` : '';
    return `<div class="panel-item tip-item${err ? ' is-error' : ''}">
          <div class="panel-item-main">
            <div class="tip-tags"><span class="tip-kind-tag ${err ? 'is-err' : 'is-topic'}">${err ? 'Błąd w artykule' : 'Temat'}</span><span class="tip-status ${TIP_STATUS[st].cls}">${label}</span></div>
            <strong>${err && art ? `<a href="#/artykul/${encodeURIComponent(art.id)}">${Utils.esc(title)}</a>` : Utils.esc(title)}</strong>
            <span class="tip-msg">${Utils.esc(msg)}</span>
            <span class="muted">${Utils.formatDate(t.createdAt)}${t.email ? ' · ' + Utils.esc(t.email) : ' · bez adresu e-mail'}</span>
            ${tipHistory(t)}
          </div>
          <div class="panel-item-actions">${quick}
            ${err && open ? '' : `<button type="button" class="btn btn-sm btn-primary" data-action="tip-status" data-id="${Utils.esc(t.id)}">Status</button>`}
            ${!err && t.link ? `<a class="btn btn-sm" href="${Utils.esc(t.link)}" target="_blank" rel="noopener noreferrer">Źródło</a>` : ''}
            ${t.email ? `<a class="btn btn-sm" href="mailto:${Utils.esc(t.email)}?subject=${encodeURIComponent('Re: ' + title)}">Odpisz</a>` : ''}
            ${err && open ? `<button type="button" class="btn btn-sm" data-action="tip-status" data-id="${Utils.esc(t.id)}">Status…</button>` : ''}
            <button type="button" class="btn btn-sm btn-danger" data-action="delete-tip" data-id="${Utils.esc(t.id)}">Usuń</button>
          </div>
        </div>`;
  };
  const active = document.activeElement && document.activeElement.id === 'tip-search';
  el.innerHTML = `<div class="tip-bar"><div class="tip-kinds">${kinds}</div><input type="search" id="tip-search" class="mod-q" placeholder="Szukaj w zgłoszeniach…" value="${Utils.esc(tipQuery)}" aria-label="Szukaj w zgłoszeniach"></div>
    <div class="tip-filters">${chips}</div>` + (list.length ? list.map(item).join('') : `<p class="muted">${empty}</p>`);
  if (active) { const s = $('#tip-search'); s.focus(); s.setSelectionRange(s.value.length, s.value.length); }
  updatePanelCounts();
}

/** Zgłoszenie trafiło do bazy – Worker wysyła push do redakcji (bez czekania na odpowiedź, błędy ignorujemy). */
function notifyTip(id, kind) {
  try { fetch(CONFIG.API_BASE + '/tips/notify', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id, kind }), keepalive: true }).catch(() => {}); } catch { /* ignoruj */ }
}

/** Szybka zmiana statusu jednym kliknięciem (np. „Naprawione” przy zgłoszeniu błędu). */
async function quickTipStatus(id, status) {
  const t = (state.tips || []).find(x => x.id === id);
  if (!t) return;
  const art = tipArticle(t);
  await applyTipPatch(t, { status, statusNote: t.statusNote || '', statusArticleId: status === 'done' && art ? art.id : '', statusAt: new Date().toISOString() });
}

async function applyTipPatch(t, patch) {
  const id = t.id;
  let local = false;
  try {
    let viaWorker = false;
    try { const d = await adminApi('/tips/update', { method: 'POST', body: JSON.stringify({ id, patch }) }); if (d.statusAt) patch = { ...patch, statusAt: d.statusAt }; viaWorker = true; } catch (we) { console.warn('Status zgłoszenia przez Workera nie przeszedł, próbuję bezpośrednio:', we); }
    if (!viaWorker) await DataService.updateTip(id, patch);
    const o = tipOverrides(); if (o[id]) { delete o[id]; try { localStorage.setItem(TIP_OVR_KEY, JSON.stringify(o)); } catch { /* ignoruj */ } }
  } catch (err) {
    console.warn('Status zgłoszenia – zapis w bazie nieudany, zapisuję na tym urządzeniu:', err);
    const o = tipOverrides(); o[id] = patch;
    try { localStorage.setItem(TIP_OVR_KEY, JSON.stringify(o)); local = true; } catch { toast('Nie udało się zapisać statusu.', 'error'); return; }
  }
  Object.assign(t, patch);
  renderTipList();
  toast(local ? 'Status zapisany tylko na tym urządzeniu (baza nie pozwala zmieniać zgłoszeń – zobacz instrukcję reguł).' : 'Status zapisany.');
}

async function renderTips() {
  const el = $('#panel-tips');
  el.innerHTML = '<p class="muted">Ładowanie…</p>';
  try {
    const ovr = tipOverrides();
    const list = (await DataService.getTips()).map(t => ovr[t.id] && !(t.statusAt && ovr[t.id].statusAt && String(t.statusAt) >= String(ovr[t.id].statusAt)) ? { ...t, ...ovr[t.id] } : t);   // lokalny zapis ustępuje nowszemu statusowi z bazy
    state.tips = list;
    if (currentRoute().name !== 'panel') return;
    renderTipList();
  } catch (err) {
    console.warn(err);
    el.innerHTML = '<p class="form-error">Nie udało się wczytać zgłoszeń. Sprawdź reguły Firestore dla kolekcji „tips”.</p>';
  }
}

let tipEditId = null;
function openTipStatus(id) {
  const t = (state.tips || []).find(x => x.id === id);
  if (!t) return;
  tipEditId = id;
  $('#ts-title').textContent = t.title;
  const cur = tipStatus(t);
  $$('input[name="ts-status"]').forEach(r => { r.checked = r.value === cur; });
  $('#ts-note').value = t.statusNote || '';
  const sel = $('#ts-article');
  const arts = sortedArticles().filter(a => !a.quick).slice(0, 80);
  sel.innerHTML = '<option value="">— brak powiązanego artykułu —</option>' + arts.map(a => `<option value="${Utils.esc(a.id)}">${Utils.esc(a.title)}</option>`).join('');
  sel.value = t.statusArticleId || '';
  updateTipStatusForm();
  openModal('tip-status-modal');
}
function updateTipStatusForm() {
  const v = ($('input[name="ts-status"]:checked') || {}).value;
  $('#ts-article-wrap').hidden = v !== 'done';
  $('#ts-note').placeholder = v === 'rejected' ? 'Dlaczego odrzucony? (opcjonalnie, tylko dla Ciebie)' : v === 'done' ? 'Notatka (opcjonalnie)' : 'Notatka dla siebie (opcjonalnie)';
}
async function saveTipStatus(e) {
  e.preventDefault();
  const id = tipEditId;
  const t = (state.tips || []).find(x => x.id === id);
  if (!t) return;
  const status = ($('input[name="ts-status"]:checked') || {}).value || 'new';
  const patch = {
    status,
    statusNote: $('#ts-note').value.trim().slice(0, 400),
    statusArticleId: status === 'done' ? $('#ts-article').value : '',
    statusAt: status === 'new' ? '' : new Date().toISOString()
  };
  closeModal('tip-status-modal');
  await applyTipPatch(t, patch);
}

async function deleteTip(id) {
  if (!confirm('Usunąć to zgłoszenie?')) return;
  try {
    await DataService.removeTip(id);
    renderTips();
    toast('Zgłoszenie usunięte.');
  } catch (err) {
    toast(err.message || 'Nie udało się usunąć zgłoszenia.', 'error');
  }
}

/* ---------- Polityka prywatności i Regulamin ---------- */
function legalVal(v) {
  const t = String(v || '');
  return /^\[UZUPEŁNIJ/.test(t) ? `<mark class="legal-todo">${Utils.esc(t)}</mark>` : Utils.esc(t);
}

function legalMissing() {
  const L = CONFIG.LEGAL;
  return [L.ADMIN_NAME, L.ADMIN_ADDRESS, L.CONTACT_EMAIL].some(v => /^\[UZUPEŁNIJ/.test(String(v || '')));
}

function legalHtml(doc) {
  const L = CONFIG.LEGAL;
  const admin = legalVal(L.ADMIN_NAME);
  const addr = legalVal(L.ADMIN_ADDRESS);
  const mail = legalVal(L.CONTACT_EMAIL);
  const redMail = legalVal(L.REDAKCJA_EMAIL);
  if (doc === 'o-nas') {
    const cats = CATEGORIES.map(c => `<a class="chip" href="#/kategoria/${encodeURIComponent(c)}">${Utils.esc(c)}</a>`).join(' ');
    return `<h1>O nas i kontakt</h1>
      <p class="legal-date">Śliska News – serwis o muzyce, kontrowersjach i dramach ze świata rozrywki</p>
      <h2>Czym jest Śliska News</h2>
      <p>Piszemy o tym, co dzieje się w muzyce i wokół niej: o nowych płytach i recenzjach, o kontrowersjach i o dramach, które rozgrzewają internet. Staramy się podawać informacje rzetelnie, z podaniem źródeł, a opinie – oznaczać jako opinie.</p>
      <p>Znajdziesz u nas: ${cats}. Oceny płyt zbieramy w <a href="#/ranking">rankingu ocen</a>.</p>
      <h2>Redakcja</h2>
      <p>Zobacz, kto pisze: <a href="#/redakcja">lista redaktorów</a> z krótkimi biogramami i ich artykułami.</p>
      <h2>Wilgotna Brocha Media</h2>
      <p>Wilgotna Brocha Media jest spółką zależną Śliska News. Materiały podpisane „dla Wilgotna Brocha” powstają w jej ramach i są częścią tego serwisu.</p>
      <h2>Masz temat albo wskazówkę?</h2>
      <p>Skorzystaj z formularza <a href="#/zglos">Zgłoś temat</a>. Czytamy każde zgłoszenie, choć nie możemy obiecać odpowiedzi ani publikacji.</p>
      <h2>Sprostowania</h2>
      <p>Jeśli zauważysz błąd w artykule, napisz do nas na ${redMail}. Poprawiamy pomyłki i w razie potrzeby publikujemy sprostowanie.</p>
      <h2>Kontakt z redakcją</h2>
      <p>E-mail: ${redMail}<br>Instagram: <a href="https://instagram.com/sliska.pl" target="_blank" rel="noopener noreferrer">@sliska.pl</a><br>Wydawca: ${admin}<br>Adres: ${addr}</p>`;
  }
  if (doc === 'regulamin') {
    return `<h1>Regulamin serwisu Śliska News</h1>
      <p class="legal-date">Obowiązuje od: ${Utils.esc(L.UPDATED)}</p>
      <h2>1. Postanowienia ogólne</h2>
      <p>Serwis „Śliska News” (dalej: Serwis) to serwis informacyjny o muzyce, kontrowersjach i dramach ze świata rozrywki, prowadzony przez ${admin}, ${addr}. Kontakt z redakcją: ${redMail}.</p>
      <p>Korzystanie z Serwisu jest bezpłatne. Do korzystania z Serwisu potrzebna jest przeglądarka internetowa z włączoną obsługą JavaScript.</p>
      <h2>2. Treści Serwisu</h2>
      <p>Artykuły, zdjęcia, grafiki, logo i inne treści w Serwisie są chronione prawem autorskim. Kopiowanie i rozpowszechnianie ich w całości lub w części wymaga zgody redakcji, z wyjątkiem przypadków dozwolonych przez prawo (np. prawo cytatu, z podaniem źródła i linkiem do Serwisu).</p>
      <p>Recenzje i oceny liczbowe wyrażają subiektywną opinię autora. Teksty mają charakter informacyjny i publicystyczny. Dokładamy starań, aby informacje były rzetelne, ale nie możemy zagwarantować, że są wolne od błędów. O pomyłkach prosimy informować pod adresem ${mail} – poprawiamy je i w razie potrzeby publikujemy sprostowanie.</p>
      <h2>3. Zgłaszanie tematów</h2>
      <p>Każdy może przesłać redakcji zgłoszenie przez formularz „Zgłoś temat”. Wysyłając zgłoszenie, oświadczasz, że masz prawo przekazać zawarte w nim informacje i materiały oraz że nie naruszają one praw osób trzecich ani przepisów prawa. Prosimy nie przesyłać treści bezprawnych, obraźliwych ani danych wrażliwych.</p>
      <p>Redakcja nie gwarantuje odpowiedzi ani publikacji. Nadesłane informacje mogą posłużyć jako inspiracja do własnych tekstów. Przekazanie zgłoszenia nie oznacza przeniesienia autorskich praw majątkowych, a ewentualne wykorzystanie nadesłanych materiałów wymaga odrębnej zgody ich autora.</p>
      <h2>4. Konta i komentarze</h2>
      <p>Konto czytelnika jest bezpłatne i dobrowolne; pozwala komentować artykuły (poza nowinkami) oraz ustawić nazwę użytkownika i zdjęcie profilowe. Nazwę możesz zmienić raz na 30 dni. Komentujesz pod własną nazwą i odpowiadasz za treść swoich wpisów.</p>
      <p>Zabronione są komentarze wulgarne, obraźliwe, nawołujące do nienawiści, naruszające prawa osób trzecich, reklamowe oraz zawierające linki. Redakcja może ukryć lub usunąć komentarz, zmienić nieodpowiednią nazwę użytkownika oraz zablokować konto naruszające regulamin. Komentarze możesz zgłaszać przyciskiem „Zgłoś”. Przy wybranych artykułach komentarze mogą być wyłączone.</p>
      <h2>5. Odpowiedzialność</h2>
      <p>Redakcja nie odpowiada za treść zewnętrznych stron, do których prowadzą linki w Serwisie, ani za przerwy w działaniu Serwisu wynikające z przyczyn niezależnych od niej.</p>
      <h2>6. Reklamacje i kontakt</h2>
      <p>Uwagi i reklamacje dotyczące działania Serwisu można zgłaszać na adres ${mail}. Odpowiadamy w rozsądnym terminie, zwykle do 14 dni.</p>
      <h2>7. Zmiany regulaminu</h2>
      <p>Regulamin może się zmieniać. Aktualna wersja jest zawsze dostępna w Serwisie, a data jej obowiązywania podana na początku dokumentu.</p>`;
  }
  return `<h1>Polityka prywatności</h1>
    <p class="legal-date">Aktualizacja: ${Utils.esc(L.UPDATED)}</p>
    <h2>1. Kto jest administratorem danych</h2>
    <p>Administratorem Twoich danych osobowych jest ${admin}, ${addr}. Kontakt w sprawach danych osobowych: ${mail}.</p>
    <h2>2. Jakie dane przetwarzamy i po co</h2>
    <ul>
      <li><strong>Zgłoś temat</strong> – treść zgłoszenia, opcjonalnie link i adres e-mail. Cel: rozpatrzenie zgłoszenia i ewentualny kontakt zwrotny. Podstawa: Twoja zgoda (art. 6 ust. 1 lit. a RODO). Dane przechowujemy do czasu rozpatrzenia zgłoszenia, nie dłużej niż 12 miesięcy.</li>
      <li><strong>Dane techniczne</strong> – podczas wizyty w Serwisie serwery (hosting i usługi Google Firebase) mogą zapisywać w dziennikach adres IP, rodzaj przeglądarki i czas wizyty. Cel: zapewnienie działania i bezpieczeństwa Serwisu. Podstawa: uzasadniony interes administratora (art. 6 ust. 1 lit. f RODO).</li>
      <li><strong>Oceny recenzji</strong> – ocena, którą oddajesz pod recenzją, oraz losowy identyfikator przeglądarki. Aby jedna osoba nie mogła głosować wielokrotnie, zapisujemy też nieodwracalny skrót (hash) Twojego adresu sieciowego – nie przechowujemy samego adresu IP. Cel: uczciwe zliczanie ocen. Podstawa: uzasadniony interes administratora (art. 6 ust. 1 lit. f RODO). Oceny są anonimowe i przechowywane do czasu usunięcia recenzji.</li>
      <li><strong>Powiadomienia o nowych artykułach</strong> – jeśli klikniesz dzwonek, zapisujemy techniczny adres subskrypcji Twojej przeglądarki, aby wysłać powiadomienie. Cel: informowanie o nowych artykułach. Podstawa: Twoja zgoda (art. 6 ust. 1 lit. a RODO). Zgodę wycofasz, klikając dzwonek ponownie lub wyłączając powiadomienia w przeglądarce.</li>
      <li><strong>Konto czytelnika i komentarze</strong> – adres e-mail, hasło (przechowywane w usłudze Google Firebase Authentication w postaci zabezpieczonej), nazwa użytkownika, opcjonalne zdjęcie profilowe, treść i data Twoich komentarzy oraz oceny recenzji oddane po zalogowaniu (podpisane Twoją nazwą; oceny bez konta pozostają anonimowe). Cel: prowadzenie konta i publikowanie komentarzy. Podstawa: umowa o świadczenie usługi konta (art. 6 ust. 1 lit. b RODO). Nazwa użytkownika, zdjęcie, komentarze i oceny oddane po zalogowaniu są publiczne. Dane przechowujemy do usunięcia konta; usunięcia konta lub komentarzy możesz zażądać mailowo.</li>
    </ul>
    <p>Podanie danych jest dobrowolne.</p>
    <h2>3. Komu przekazujemy dane</h2>
    <p>Dane przetwarzają w naszym imieniu dostawcy usług: Google (usługa Firebase – baza danych oraz dostarczanie skryptów strony), Cloudflare (obsługa domeny, oceny czytelników i powiadomienia) oraz dostawca hostingu strony. Dane mogą być przetwarzane poza Europejskim Obszarem Gospodarczym na podstawie standardowych klauzul umownych lub innych zabezpieczeń przewidzianych w RODO. Nie sprzedajemy danych i nie przekazujemy ich reklamodawcom.</p>
    <h2>4. Pliki cookies i pamięć przeglądarki</h2>
    <p>Serwis nie używa własnych plików cookies reklamowych ani analitycznych. W pamięci Twojej przeglądarki (localStorage) zapisujemy wyłącznie dane techniczne potrzebne do działania strony: wybrany motyw jasny/ciemny, licznik ograniczający liczbę zgłoszeń oraz losowy identyfikator przeglądarki używany przy ocenianiu recenzji. Zapisane na później artykuły również pamiętamy tylko w Twojej przeglądarce. Niektóre artykuły zawierają osadzone odtwarzacze YouTube (w trybie rozszerzonej prywatności youtube-nocookie.com) lub Spotify; po ich uruchomieniu dane przetwarza odpowiednio Google lub Spotify na własnych zasadach. Możesz je usunąć w ustawieniach przeglądarki. Jeśli w przyszłości dodamy narzędzia analityczne, zaktualizujemy tę politykę.</p>
    <h2>5. Twoje prawa</h2>
    <p>Masz prawo do: dostępu do swoich danych, ich sprostowania, usunięcia, ograniczenia przetwarzania, przenoszenia oraz sprzeciwu wobec przetwarzania opartego na uzasadnionym interesie. Zgodę możesz wycofać w dowolnym momencie – nie wpływa to na zgodność z prawem przetwarzania, którego dokonano przed jej wycofaniem. Aby skorzystać z praw, napisz na ${mail}.</p>
    <p>Masz też prawo wnieść skargę do Prezesa Urzędu Ochrony Danych Osobowych (ul. Stawki 2, 00-193 Warszawa).</p>
    <h2>6. Zmiany polityki</h2>
    <p>Polityka może być aktualizowana. Aktualna wersja jest zawsze dostępna w Serwisie.</p>`;
}

function renderLegal(doc) {
  const warn = Auth.isAdmin() && legalMissing()
    ? '<div class="notice">Uzupełnij swoje dane w pliku app.js, w sekcji CONFIG.LEGAL (imię i nazwisko lub firma, adres, e-mail). Zaznaczone fragmenty są jeszcze puste.</div>'
    : '';
  $('#view-legal').innerHTML = `
    <div class="article-top"><a class="btn" href="#/">← Powrót do strony głównej</a>
      <div class="top-actions"><a class="btn${doc === 'o-nas' ? ' btn-primary' : ''}" href="#/o-nas">O nas</a><a class="btn${doc === 'prywatnosc' ? ' btn-primary' : ''}" href="#/prywatnosc">Polityka prywatności</a><a class="btn${doc === 'regulamin' ? ' btn-primary' : ''}" href="#/regulamin">Regulamin</a></div></div>
    ${warn}
    <article class="legal">${legalHtml(doc)}</article>`;
}

/* ---------- Zapisane na później (tylko w przeglądarce czytelnika) ---------- */
const Saved = {
  KEY: 'sliska_saved_v1',
  ids() { try { const v = JSON.parse(localStorage.getItem(this.KEY) || '[]'); return Array.isArray(v) ? v.filter(x => typeof x === 'string') : []; } catch { return []; } },
  has(id) { return this.ids().includes(id); },
  toggle(id) {
    const list = this.ids();
    const i = list.indexOf(id);
    if (i >= 0) list.splice(i, 1); else list.unshift(id);
    try { localStorage.setItem(this.KEY, JSON.stringify(list.slice(0, 200))); } catch { toast('Nie udało się zapisać (pamięć przeglądarki jest zablokowana).', 'error'); return null; }
    updateSavedNav();
    return i < 0;
  }
};

function updateSavedNav() {
  const known = new Set(state.articles.map(a => a.id));
  const n = state.ready ? Saved.ids().filter(id => known.has(id)).length : Saved.ids().length;
  const b = $('#saved-count');
  if (b) { b.textContent = n ? String(n) : ''; b.hidden = !n; }
}

function renderSaved() {
  const el = $('#view-saved');
  const list = Saved.ids().map(id => publishedArticles().find(a => a.id === id)).filter(Boolean);
  el.innerHTML = `
    <div class="article-top"><a class="btn" href="#/">← Powrót do strony głównej</a></div>
    <h1 class="panel-title">Zapisane na później</h1>
    <p class="muted">Lista jest zapamiętana tylko w tej przeglądarce – nie wymaga konta.</p>
    ${list.length
      ? `<div class="grid">${list.map(a => `<div class="saved-item">${cardHtml(a, { noAdmin: true })}<button type="button" class="btn btn-sm" data-action="save" data-id="${Utils.esc(a.id)}">Usuń z zapisanych</button></div>`).join('')}</div>`
      : '<div class="empty-state"><p>Nic tu jeszcze nie ma. Na stronie artykułu kliknij „Zapisz”, a wróci tutaj.</p></div>'}`;
}

function validEmail(v) { return v.length <= 120 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v); }

function downloadFile(name, text, mime) {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/*@staff-removed*/
/* ---------- Galeria w artykule: scena + miniatury + pełny ekran ---------- */
const GX_ICON = {
  prev: '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  next: '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  full: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  close: '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>'
};

/** Dodaje do galerii nawigację przesuwaniem (mysz/palec), klawiaturę, miniatury i podgląd pełnoekranowy. */
function enhanceGalleries(root) {
  (root || document).querySelectorAll('figure.article-gallery:not(.gx)').forEach(fig => {
    if (fig.closest('.ql-editor')) return;
    const srcs = Array.from(fig.querySelectorAll('.gallery-track img')).map(i => i.getAttribute('src')).filter(Boolean);
    if (srcs.length < 2) return;
    const capEl = fig.querySelector('figcaption');
    const caption = capEl ? capEl.textContent : '';
    fig.classList.add('gx');
    fig.setAttribute('tabindex', '0');
    fig.setAttribute('role', 'group');
    fig.setAttribute('aria-roledescription', 'galeria');
    fig.innerHTML = `
      <div class="gx-stage">
        <div class="gx-bg" aria-hidden="true"></div>
        <img class="gx-img" alt="" draggable="false">
        <button type="button" class="gx-nav gx-prev" aria-label="Poprzednie zdjęcie">${GX_ICON.prev}</button>
        <button type="button" class="gx-nav gx-next" aria-label="Następne zdjęcie">${GX_ICON.next}</button>
        <span class="gx-count" aria-live="polite"></span>
        <button type="button" class="gx-full" aria-label="Powiększ zdjęcie">${GX_ICON.full}</button>
      </div>
      <div class="gx-thumbs" role="tablist">${srcs.map((u, i) => `<button type="button" class="gx-thumb" role="tab" data-i="${i}" aria-label="Zdjęcie ${i + 1}"><img src="${Utils.esc(u)}" alt="" loading="lazy" draggable="false"></button>`).join('')}</div>
      ${caption ? `<figcaption>${Utils.esc(caption)}</figcaption>` : ''}`;
    const stage = fig.querySelector('.gx-stage'); let img = fig.querySelector('.gx-img'); const bg = fig.querySelector('.gx-bg');
    const count = fig.querySelector('.gx-count'), thumbs = Array.from(fig.querySelectorAll('.gx-thumb'));
    let cur = 0, busy = 0;
    const SLIDE_MS = 380;
    const show = (n, instant) => {
      const dir = n > cur ? 1 : n < cur ? -1 : 0;     // kierunek liczony przed zawinięciem (ostatnie → pierwsze)
      cur = (n + srcs.length) % srcs.length;
      const token = ++busy;
      stage.querySelectorAll('.gx-img').forEach(el => { if (el !== img) el.remove(); });   // dokończ poprzednie przesunięcie
      img.style.transition = 'none'; img.style.transform = '';
      const alt = caption || `Zdjęcie ${cur + 1} z ${srcs.length}`;
      bg.style.backgroundImage = `url("${srcs[cur].replace(/"/g, '%22')}")`;
      if (instant || !dir || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        img.src = srcs[cur]; img.alt = alt;
      } else {
        const old = img, inc = old.cloneNode(false);
        inc.src = srcs[cur]; inc.alt = alt;
        inc.style.transition = 'none'; inc.style.transform = `translateX(${dir * 100}%)`;
        old.after(inc); void inc.offsetWidth;
        const ease = `transform ${SLIDE_MS}ms cubic-bezier(.22,.7,.2,1)`;
        inc.style.transition = ease; old.style.transition = ease;
        inc.style.transform = 'translateX(0)'; old.style.transform = `translateX(${-dir * 100}%)`;
        img = inc;
        setTimeout(() => { if (token === busy) { old.remove(); inc.style.transition = ''; inc.style.transform = ''; } }, SLIDE_MS + 40);
      }
      count.textContent = `${cur + 1} / ${srcs.length}`;
      thumbs.forEach((t, i) => { t.classList.toggle('is-on', i === cur); t.setAttribute('aria-selected', String(i === cur)); });
      const t = thumbs[cur], box = fig.querySelector('.gx-thumbs');
      if (t && box) box.scrollTo({ left: t.offsetLeft - (box.clientWidth - t.clientWidth) / 2, behavior: instant ? 'auto' : 'smooth' });
      [cur + 1, cur - 1].forEach(k => { const im = new Image(); im.src = srcs[(k + srcs.length) % srcs.length]; });
    };
    // proporcje sceny = proporcje pierwszego zdjęcia (w granicach 4:3 – 2:1), żeby nie było pasów
    const probe = new Image();
    probe.onload = () => { if (probe.naturalWidth && probe.naturalHeight) stage.style.setProperty('--gx-ar', String(Math.min(2, Math.max(1.33, probe.naturalWidth / probe.naturalHeight)).toFixed(3))); };
    probe.src = srcs[0];
    show(0, true);
    fig._gx = { show: n => show(n), get cur() { return cur; }, srcs, caption };
    fig.querySelector('.gx-prev').addEventListener('click', e => { e.stopPropagation(); show(cur - 1); });
    fig.querySelector('.gx-next').addEventListener('click', e => { e.stopPropagation(); show(cur + 1); });
    fig.querySelector('.gx-full').addEventListener('click', e => { e.stopPropagation(); openGxLightbox(srcs, cur, caption, n => show(n, true)); });
    thumbs.forEach(t => t.addEventListener('click', () => show(Number(t.dataset.i))));
    fig.addEventListener('keydown', e => {
      if (e.key === 'ArrowLeft') { e.preventDefault(); show(cur - 1); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); show(cur + 1); }
    });
    gxSwipe(stage, dir => show(cur + dir), () => openGxLightbox(srcs, cur, caption, n => show(n, true)));
  });
}

/** Przesuwanie palcem / myszą; krótkie kliknięcie wywołuje onTap. */
function gxSwipe(el, onStep, onTap) {
  let x0 = null, y0 = 0, moved = false, id = null;
  el.addEventListener('pointerdown', e => {
    if (e.target.closest('button')) return;
    x0 = e.clientX; y0 = e.clientY; moved = false; id = e.pointerId;
  });
  el.addEventListener('pointermove', e => {
    if (x0 === null || e.pointerId !== id) return;
    if (Math.abs(e.clientX - x0) > 8) moved = true;
  });
  const end = e => {
    if (x0 === null || e.pointerId !== id) return;
    const dx = e.clientX - x0, dy = e.clientY - y0;
    x0 = null;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) onStep(dx < 0 ? 1 : -1);
    else if (!moved && onTap) onTap();
  };
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', () => { x0 = null; });
}

/** Podgląd pełnoekranowy: strzałki, klawiatura, przesuwanie, Esc zamyka. */
function openGxLightbox(srcs, start, caption, onChange) {
  if (document.querySelector('.gx-lb')) return;
  let cur = start;
  const lb = document.createElement('div');
  lb.className = 'gx-lb';
  lb.setAttribute('role', 'dialog'); lb.setAttribute('aria-modal', 'true'); lb.setAttribute('aria-label', 'Galeria zdjęć');
  lb.innerHTML = `
    <div class="gx-lb-top"><span class="gx-lb-count"></span><button type="button" class="gx-lb-close" aria-label="Zamknij">${GX_ICON.close}</button></div>
    <div class="gx-lb-stage"><img class="gx-lb-img" alt="" draggable="false">
      <button type="button" class="gx-nav gx-prev" aria-label="Poprzednie zdjęcie">${GX_ICON.prev}</button>
      <button type="button" class="gx-nav gx-next" aria-label="Następne zdjęcie">${GX_ICON.next}</button></div>
    <div class="gx-lb-cap">${caption ? Utils.esc(caption) : ''}</div>`;
  const prevFocus = document.activeElement;
  document.body.appendChild(lb);
  document.body.classList.add('gx-lock');
  const im = lb.querySelector('.gx-lb-img'), ct = lb.querySelector('.gx-lb-count');
  const show = n => {
    cur = (n + srcs.length) % srcs.length;
    im.classList.add('is-swap');
    setTimeout(() => { im.src = srcs[cur]; im.alt = caption || `Zdjęcie ${cur + 1}`; im.classList.remove('is-swap'); }, 90);
    ct.textContent = `${cur + 1} / ${srcs.length}`;
    [cur + 1, cur - 1].forEach(k => { const p = new Image(); p.src = srcs[(k + srcs.length) % srcs.length]; });
    if (onChange) onChange(cur);
  };
  const close = () => {
    document.removeEventListener('keydown', key, true);
    lb.remove(); document.body.classList.remove('gx-lock');
    if (prevFocus && prevFocus.focus) prevFocus.focus({ preventScroll: true });
  };
  const key = e => {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); show(cur - 1); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); show(cur + 1); }
  };
  document.addEventListener('keydown', key, true);
  lb.querySelector('.gx-lb-close').addEventListener('click', close);
  lb.querySelector('.gx-prev').addEventListener('click', e => { e.stopPropagation(); show(cur - 1); });
  lb.querySelector('.gx-next').addEventListener('click', e => { e.stopPropagation(); show(cur + 1); });
  lb.addEventListener('click', e => { if (e.target === lb || e.target.classList.contains('gx-lb-stage')) close(); });
  gxSwipe(lb.querySelector('.gx-lb-stage'), d => show(cur + d), null);
  im.src = srcs[cur]; ct.textContent = `${cur + 1} / ${srcs.length}`;
  lb.querySelector('.gx-lb-close').focus({ preventScroll: true });
}

/** Przewijanie galerii kliknięciem w lewy / prawy brzeg (na stronie artykułu). */
function galleryClick(e) {
  const g = e.target.closest && e.target.closest('figure.article-gallery');
  if (!g || g.closest('.ql-editor') || g.classList.contains('gx')) return;
  const t = g.querySelector('.gallery-track');
  if (!t) return;
  const r = g.getBoundingClientRect();
  const x = e.clientX - r.left;
  const step = t.clientWidth;
  if (x > r.width * 0.65) {
    if (t.scrollLeft + step >= t.scrollWidth - 4) t.scrollTo({ left: 0, behavior: 'smooth' });
    else t.scrollBy({ left: step, behavior: 'smooth' });
  } else if (x < r.width * 0.35) {
    if (t.scrollLeft <= 4) t.scrollTo({ left: t.scrollWidth, behavior: 'smooth' });
    else t.scrollBy({ left: -step, behavior: 'smooth' });
  }
}

/*@staff-removed*/
/* ---------- Szybkie przełączanie kont (konta czytelników zapamiętane na tym urządzeniu) ---------- */
const Accounts = {
  KEY: 'sliska_accounts', MAX: 5, SESSION_MS: 24 * 3600e3,
  list() { try { const l = JSON.parse(localStorage.getItem(this.KEY)); return Array.isArray(l) ? l : []; } catch { return []; } },
  save(l) { try { localStorage.setItem(this.KEY, JSON.stringify(l.slice(0, this.MAX))); } catch { /* ignoruj */ } },
  /** Zapamiętuje zalogowane konto (sesja Firebase, bez hasła), żeby dało się do niego wrócić jednym kliknięciem. */
  async remember(user, me) {
    if (!user || !me || !me.name || !user.toJSON) return;
    let authTime = 0; try { authTime = Date.parse((await user.getIdTokenResult()).authTime) || 0; } catch { /* ignoruj */ }
    const entry = { uid: user.uid, email: user.email || '', name: me.name, role: me.role || '', pub: me.pub || '', av: me.avatarAt || 0, authTime, user: user.toJSON() };
    const l = this.list(), i = l.findIndex(a => a.uid === user.uid);
    if (i >= 0) l[i] = entry; else l.push(entry);
    this.save(l);
  },
  forget(uid) { this.save(this.list().filter(a => a.uid !== uid)); },
  expired(a) { return !a.authTime || Date.now() - a.authTime > this.SESSION_MS - 600e3; },
  idbPut(key, value) {
    return new Promise((res, rej) => {
      const rq = indexedDB.open('firebaseLocalStorageDb');
      rq.onerror = () => rej(rq.error);
      rq.onsuccess = () => {
        try {
          const db = rq.result, tx = db.transaction('firebaseLocalStorage', 'readwrite');
          tx.objectStore('firebaseLocalStorage').put({ fbase_key: key, value });
          tx.oncomplete = () => { db.close(); res(); };
          tx.onerror = () => rej(tx.error);
        } catch (e) { rej(e); }
      };
    });
  },
  async switchTo(uid) {
    const a = this.list().find(x => x.uid === uid);
    if (!a) return;
    if (Readers.user && Readers.user.uid === uid) return;
    if (this.expired(a)) { this.forget(uid); toast('Ta sesja wygasła – zaloguj się na to konto ponownie.'); openReaderModal('login'); $('#reader-email').value = a.email || a.name; return; }
    try {
      try { const cur = Auth.mode === 'firebase' && FirebaseProvider.auth && FirebaseProvider.auth.currentUser; if (cur && /^rd_/.test(cur.uid)) await FirebaseProvider.auth.signOut(); } catch { /* ignoruj */ }
      try { await Push.unlink(); } catch { /* ignoruj */ }
      await this.idbPut(`firebase:authUser:${CONFIG.READER_FIREBASE.apiKey}:readers`, a.user);
      location.hash = '#/konto';
      location.reload();
    } catch (e) { console.warn('Przełączenie konta nie powiodło się:', e); toast('Nie udało się przełączyć konta. Zaloguj się ręcznie.', 'error'); }
  },
  html() {
    const l = this.list();
    if (!l.length || !Readers.user) return '';
    const cur = Readers.user.uid;
    const rows = l.map(a => {
      const on = a.uid === cur, exp = this.expired(a);
      return `<div class="acc-sw-row${on ? ' is-on' : ''}">
        <span class="avatar" aria-hidden="true">${readerAvatar(a.name, a.av, a.pub)}</span>
        <span class="acc-sw-main"><strong>${Utils.esc(a.name)}</strong><small>${Utils.esc(ROLE_LABEL[a.role] || 'Czytelnik')}${exp && !on ? ' · wymaga logowania' : ''}</small></span>
        ${on ? '<span class="acc-sw-badge">Aktywne</span>' : `<button type="button" class="btn btn-sm" data-acc-switch="${Utils.esc(a.uid)}">Przełącz</button><button type="button" class="acc-sw-x" data-acc-forget="${Utils.esc(a.uid)}" aria-label="Usuń z listy" title="Usuń z listy">×</button>`}
      </div>`;
    }).join('');
    return `<section class="panel st-card">
      <div class="st-head"><h2 class="st-h">Przełącz konto</h2><p class="st-sub">Konta zalogowane na tym urządzeniu. Hasła nie są zapamiętywane, a sesja trwa 24 godziny od logowania.</p></div>
      <div class="acc-sw-list">${rows}</div>
      ${l.length < this.MAX ? '<div class="st-actions"><button type="button" class="btn btn-sm" id="acc-add">+ Dodaj kolejne konto</button></div>' : ''}
    </section>`;
  }
};

/* ---------- Instalacja jako aplikacja ---------- */
let deferredInstall = null;
function isStandalone() { return (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true; }
function isIos() { return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); }
/** Safari na Macu (macOS Sonoma+) nie ma okna „Zainstaluj”, tylko File → Add to Dock. */
function isMacSafari() { const ua = navigator.userAgent; return /Macintosh/.test(ua) && /Safari\//.test(ua) && !/Chrome|Chromium|Edg|OPR|Firefox/.test(ua) && !(navigator.maxTouchPoints > 1); }
function updateInstallLink() {
  const l = $('#install-link');
  if (l) l.hidden = isStandalone() || !(deferredInstall || isIos() || isMacSafari());
}
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredInstall = e; updateInstallLink(); });
window.addEventListener('appinstalled', () => { deferredInstall = null; updateInstallLink(); toast('Aplikacja zainstalowana.'); });
async function installApp() {
  if (deferredInstall) {
    deferredInstall.prompt();
    try { await deferredInstall.userChoice; } catch { /* ignoruj */ }
    deferredInstall = null;
    updateInstallLink();
  } else if (isMacSafari()) {
    toast('Na Macu w Safari: z paska menu wybierz File → Add to Dock… i kliknij Add. Aplikacja pojawi się w Docku i w Launchpadzie.');
  } else if (isIos()) {
    toast('Na iPhonie: dotknij Udostępnij (kwadrat ze strzałką), potem „Do ekranu początkowego”.');
  }
}

/*@staff-removed*/
/* ---------- „NOWE”: artykuły opublikowane w ciągu ostatnich 12 godzin ---------- */
const Visit = {
  HOURS: 12,
  isNew(a) {
    if (a.quick) return false;
    const t = Date.parse(a.createdAt);
    return !isNaN(t) && t <= Date.now() && Date.now() - t < this.HOURS * 3600e3;
  }
};

function newBannerHtml() {
  // Baner „X nowych artykułów” usunięty – znaczniki NOWE na kartach (do 12h) zostają.
  state.onlyNew = false;
  return '';
  const n = publishedArticles().filter(a => Visit.isNew(a)).length;
  return `<div class="new-banner"><span><b>${n}</b> ${plural(n, 'nowy artykuł', 'nowe artykuły', 'nowych artykułów')} · ostatnie 12h</span>
    <button type="button" class="btn btn-sm" data-action="toggle-new">${state.onlyNew ? 'Wszystkie' : 'Tylko nowe'}</button></div>`;
}

/* ---------- Podpowiedzi w wyszukiwarce ---------- */
function searchSuggestions(q) {
  const fq = Utils.fold(q.trim());
  if (fq.length < 2) return { names: [], arts: [] };
  const names = new Map();
  const pub = publishedArticles();
  pub.forEach(a => {
    if (a.review && a.review.artist && a.review.artist.trim()) {
      const k = Utils.fold(a.review.artist.trim());
      const e = names.get(k) || { label: a.review.artist.trim(), type: 'artist', n: 0 };
      e.n++; names.set(k, e);
    }
  });
  pub.forEach(a => {
    if (a.quick || !a.author) return;
    const k = 'r:' + authorKey(a.author);
    const e = names.get(k) || { label: a.author, type: 'author', n: 0 };
    e.n++; names.set(k, e);
  });
  pub.forEach(a => Utils.tagsOf(a).forEach(t => {
    const k = Utils.fold(t);
    const e = names.get(k) || { label: t, type: 'tag', n: 0 };
    e.n++; names.set(k, e);
  }));
  const scored = [];
  names.forEach((e, k) => {
    const ws = k.replace(/^r:/, '').split(/\s+/);
    let s = null;
    const kk = k.replace(/^r:/, '');
    if (kk.startsWith(fq)) s = 0;
    else if (ws.some(w => w.startsWith(fq))) s = 1;
    else if (kk.includes(fq)) s = 2;
    else if (fq.length >= 4) { const max = fq.length <= 6 ? 1 : 2; if (ws.some(w => editDistance(fq, w, max) <= max)) s = 3; }
    if (s !== null) scored.push({ ...e, s });
  });
  scored.sort((a, b) => a.s - b.s || b.n - a.n);
  return { names: scored.slice(0, 6), arts: pub.filter(a => SearchIndex.matches(a, q)).slice(0, 3) };
}

function renderSearchSuggest() {
  const input = $('#search-input'), box = $('#search-suggest');
  const { names, arts } = searchSuggestions(input.value);
  if (!names.length && !arts.length) { box.hidden = true; input.setAttribute('aria-expanded', 'false'); return; }
  const nameHtml = names.map(n => `<button type="button" class="sg-item" role="option" data-href="${n.type === 'artist' ? '#/artysta/' : n.type === 'author' ? '#/redaktor/' : '#/tag/'}${encodeURIComponent(n.label)}"><span class="sg-ico">${n.type === 'artist' ? '♪' : n.type === 'author' ? '✎' : '#'}</span><span class="sg-text">${Utils.esc(n.label)}</span><small>${n.type === 'author' ? 'redaktor · ' : ''}${n.n} ${plural(n.n, 'artykuł', 'artykuły', 'artykułów')}</small></button>`).join('');
  const artHtml = arts.map(a => `<button type="button" class="sg-item" role="option" data-href="#/artykul/${encodeURIComponent(a.id)}"><span class="sg-ico">→</span><span class="sg-text">${Utils.esc(a.title)}</span></button>`).join('');
  box.innerHTML = (nameHtml ? `<div class="sg-head">Wykonawcy, redaktorzy i tagi</div>${nameHtml}` : '') + (artHtml ? `<div class="sg-head">Artykuły</div>${artHtml}` : '');
  box.hidden = false;
  input.setAttribute('aria-expanded', 'true');
}

function hideSearchSuggest() {
  const box = $('#search-suggest');
  if (box) box.hidden = true;
  const input = $('#search-input');
  if (input) input.setAttribute('aria-expanded', 'false');
}


/* ---------- Nowinki z Poślizgiem ---------- */
function quickHost(link) { try { return new URL(link).hostname.replace(/^www\./, ''); } catch { return ''; } }

function quickDayLabel(iso) {
  const d = new Date(iso), now = new Date();
  const day = x => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((day(now) - day(d)) / 86400000);
  if (diff === 0) return 'Dziś';
  if (diff === 1) return 'Wczoraj';
  const s = d.toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function quickItemHtml(a, withAdmin) {
  const srcName = a.sourceName || quickHost(a.link) || '';
  const src = a.link
    ? `<span class="quick-from">Źródło:</span> <a class="quick-src" href="${Utils.esc(a.link)}" target="_blank" rel="noopener noreferrer">${Utils.esc(srcName || 'link')} →</a>`
    : (srcName ? `<span class="quick-from">Źródło:</span> <span class="quick-src quick-src-plain">${Utils.esc(srcName)}</span>` : '');
  const admin = withAdmin && Auth.isAdmin()
    ? `<span class="admin-actions"><button type="button" class="btn btn-sm" data-action="quick-edit" data-id="${Utils.esc(a.id)}">Edytuj</button>${canManage() ? `<button type="button" class="btn btn-sm btn-push-send" data-action="push-send" data-id="${Utils.esc(a.id)}" title="Wyślij powiadomienie push o tej nowince">🔔 Powiadom</button>` : ''}<button type="button" class="btn btn-sm btn-danger" data-action="quick-delete" data-id="${Utils.esc(a.id)}">Usuń</button></span>` : '';
  return `<li class="quick-item">
    <time class="quick-time" datetime="${Utils.esc(a.createdAt)}">${Utils.formatTime(a.createdAt)}</time>
    <div class="quick-body">
      <p>${Utils.esc(a.title)}</p>
      <div class="quick-meta">${src}<button type="button" class="quick-share" data-action="quick-share" data-id="${Utils.esc(a.id)}">Udostępnij</button>${withAdmin && Auth.isAdmin() ? `<button type="button" class="quick-share" data-action="quick-story" data-id="${Utils.esc(a.id)}">Story</button>` : ''}${admin}</div>
    </div>
  </li>`;
}

function quickStripHtml() {
  const list = publishedQuick().slice(0, 3);
  const plus = `<button type="button" class="plus-card" data-action="plus-open" aria-label="Śliska+ – subskrypcja"><span class="plus-top"><b>Śliska+</b><i>NOWOŚĆ</i></span><span class="plus-tx">Bez reklam, wcześniejszy dostęp do newsów i odznaka przy komentarzach.</span><span class="plus-go">Dołącz →</span></button>`;
  return `<div class="quick-row"><section class="quick-strip" aria-label="Nowinki z Poślizgiem">
    <div class="quick-head"><h2 class="section-title">Nowinki z Poślizgiem</h2>
      <span><button type="button" class="btn btn-sm admin-only" data-action="quick-new">+ Dodaj</button> <a class="quick-all" href="#/szybkie">Wszystkie →</a></span></div>
    ${list.length ? `<ul class="quick-list">${list.map(a => quickItemHtml(a, false)).join('')}</ul>` : '<p class="muted">Nie ma jeszcze nowinek.</p>'}
  </section>${plus}</div>`;
}

function renderQuick() {
  const el = $('#view-quick');
  const list = publishedQuick();
  const shown = list.slice(0, state.quickVisible || 30);
  const groups = [];
  shown.forEach(a => {
    const label = quickDayLabel(a.createdAt);
    const g = groups[groups.length - 1];
    if (g && g.label === label) g.items.push(a); else groups.push({ label, items: [a] });
  });
  el.innerHTML = `
    <div class="article-top"><a class="btn" href="#/">← Powrót do strony głównej</a>
      <div class="top-actions"><button type="button" class="btn btn-primary admin-only" data-action="quick-new">+ Dodaj nowinkę</button></div></div>
    <header class="rank-head">
      <span class="rank-eyebrow">Krótko i na temat</span>
      <h1 class="rank-title">Nowinki z Poślizgiem</h1>
    </header>
    ${groups.length ? groups.map(g => `<section class="quick-day"><h2 class="quick-day-title">${g.label}</h2><ul class="quick-list">${g.items.map(a => quickItemHtml(a, true)).join('')}</ul></section>`).join('')
      : '<div class="empty-state"><p>Nie ma jeszcze nowinek. Zajrzyj tu niedługo.</p></div>'}
    ${list.length > shown.length ? '<div class="load-more"><button type="button" class="btn" data-action="quick-more">Pokaż starsze</button></div>' : ''}`;
}

/*@staff-removed*/
/* ---------- Zgłoszenie błędu w artykule ---------- */
function openReportModal(id) {
  const a = state.articles.find(x => x.id === id);
  if (!a) return;
  state.reportId = id;
  $('#report-article').textContent = a.title;
  $('#report-text').value = '';
  $('#report-email').value = '';
  $('#report-error').hidden = true;
  openModal('report-modal');
}

async function submitReport(e) {
  e.preventDefault();
  if ($('#report-form .hp-field').value) return;
  const a = state.articles.find(x => x.id === state.reportId);
  if (!a) return;
  const err = msg => { const el = $('#report-error'); el.textContent = msg; el.hidden = !msg; };
  const text = $('#report-text').value.trim();
  const email = $('#report-email').value.trim().toLowerCase();
  if (text.length < 10) { err('Opisz błąd w kilku słowach (min. 10 znaków).'); $('#report-text').focus(); return; }
  if (email && !validEmail(email)) { err('Adres e-mail wygląda niepoprawnie.'); return; }
  let log = [];
  try { log = (JSON.parse(localStorage.getItem(TIP_LOG_KEY)) || []).filter(t => Date.now() - t < 3600e3); } catch { /* ignoruj */ }
  if (log.length >= 3) { err('Wysłano już kilka zgłoszeń. Spróbuj ponownie za jakiś czas.'); return; }
  err('');
  const btn = $('#report-send');
  btn.disabled = true;
  try {
    const tipId = Utils.uid('t_');
    await DataService.addTip({
      id: tipId,
      title: ('Błąd w artykule: ' + a.title).slice(0, 120),
      message: text.slice(0, 1700) + '\n\nArtykuł: ' + articleUrl(a),
      link: articleUrl(a).slice(0, 300),
      email,
      createdAt: new Date().toISOString()
    });
    notifyTip(tipId, 'error');
    try { localStorage.setItem(TIP_LOG_KEY, JSON.stringify([...log, Date.now()])); } catch { /* ignoruj */ }
    closeModal('report-modal');
    toast('Dziękujemy! Zgłoszenie trafiło do redakcji.');
  } catch (ex) {
    err(ex.message || 'Nie udało się wysłać zgłoszenia. Spróbuj później.');
  } finally {
    btn.disabled = false;
  }
}

/*@staff-removed*/
/* ---------- Udostępnianie z grafiką ---------- */
function articleShortUrl(a) { return location.href.split('#')[0] + '#/a/' + encodeURIComponent(a.id); }

async function shareImage(id, btn) {
  const a = state.articles.find(x => x.id === id);
  if (!a) return;
  const label = btn ? btn.textContent : '';
  if (btn) { btn.disabled = true; btn.textContent = 'Tworzę…'; }
  try {
    const { blob } = await renderInstagramImage(a, { format: 'share' });
    const name = `sliska-news-${Utils.slugify(a.title).slice(0, 50) || a.id}.png`;
    const file = new File([blob], name, { type: 'image/png' });
    const url = articleUrl(a);
    if (navigator.canShare && navigator.canShare({ files: [file] }) && window.matchMedia && matchMedia('(pointer: coarse)').matches) {
      try { await navigator.share({ files: [file], text: url }); return; } catch (e) { if (e && e.name === 'AbortError') return; }
    }
    const obj = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = obj; link.download = name;
    document.body.appendChild(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(obj), 4000);
    try { await navigator.clipboard.writeText(url); toast('Grafika pobrana, link skopiowany do schowka.'); } catch { toast('Grafika pobrana.'); }
  } catch (e) {
    toast('Nie udało się utworzyć grafiki.', 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = label; }
  }
}

/*@staff-removed*/
/* =========================================================
   Konta czytelników i komentarze
   ========================================================= */
const READER_ERR = {
  weak: 'Hasło musi mieć od 6 do 128 znaków.', fb: 'Firebase odrzucił zmianę. Spróbuj ponownie.', no_sa: 'Brak konta serwisowego w Workerze (READER_SA) – nie da się ustawić hasła.', not_found: 'Nie znaleziono konta.',
  endpoint: 'Worker jest w starej wersji – wgraj najnowszy og-worker.js (Edit code → Deploy).', too_fast: 'Poczekaj chwilę – powiadomienie wysłano przed chwilą.', busy: 'Poprzednie rozsyłanie jeszcze trwa – spróbuj za minutę.', not_found: 'Nie znaleziono artykułu.',
  name_len: 'Nazwa użytkownika musi mieć od 3 do 20 znaków.', name_chars: 'Nazwa: tylko małe litery a–z, cyfry oraz pojedyncza kropka lub podkreślnik w środku (bez spacji i polskich znaków).',
  bad_login: 'Nieprawidłowa nazwa/e-mail lub hasło.', rename: 'Najpierw zmień nazwę użytkownika na zgodną z nowymi zasadami.', session_expired: 'Sesja wygasła – zaloguj się ponownie.',
  name_bad: 'Ta nazwa jest niedozwolona. Wybierz inną.', name_taken: 'Ta nazwa jest już zajęta.',
  name_cooldown: 'Nazwę użytkownika możesz zmieniać raz na 30 dni.', verify: 'Potwierdź adres e-mail (link w wiadomości od nas), żeby komentować.',
  guests_off: 'Komentowanie bez konta jest wyłączone. Zaloguj się, żeby napisać komentarz.', banned: 'Twoje konto zostało zablokowane.', rate: 'Za dużo prób – spróbuj ponownie później.', dup: 'Taki komentarz już dodałeś.',
  off: 'Komentarze do tego artykułu są wyłączone.', short: 'Komentarz jest za krótki.', long: 'Komentarz jest za długi (maks. 600 znaków).',
  no_profile: 'Najpierw ustaw nazwę użytkownika na stronie konta.', avatar: 'Nie udało się zapisać zdjęcia.', auth: 'Zaloguj się ponownie.',
  slow: 'Poczekaj chwilę przed kolejnym komentarzem (tryb wolniejszej dyskusji).', edit_late: 'Komentarz można poprawiać tylko przez 5 minut od publikacji.', gone: 'Tego komentarza już nie ma.', session_revoked: 'Sesja wygasła – zaloguj się ponownie.',
  'auth/popup-closed-by-user': '', 'auth/cancelled-popup-request': '', 'auth/popup-blocked': 'Przeglądarka zablokowała okno logowania Google. Zezwól na wyskakujące okna dla tej strony.', 'auth/account-exists-with-different-credential': 'Ten adres e-mail ma już konto z hasłem. Zaloguj się hasłem.', 'auth/operation-not-allowed': 'Logowanie przez Google nie jest jeszcze włączone w Firebase.', 'auth/unauthorized-domain': 'Ta domena nie jest dodana w Firebase (Authentication → Settings → Authorized domains).',
  readers_off: 'Komentarze są chwilowo niedostępne.', 'auth/email-already-in-use': 'Ten adres e-mail ma już konto. Zaloguj się.',
  'auth/weak-password': 'Hasło musi mieć co najmniej 6 znaków.', 'auth/invalid-email': 'Nieprawidłowy adres e-mail.',
  'auth/invalid-credential': 'Nieprawidłowy e-mail lub hasło.', 'auth/wrong-password': 'Nieprawidłowy e-mail lub hasło.', 'auth/user-not-found': 'Nieprawidłowy e-mail lub hasło.',
  'auth/too-many-requests': 'Zbyt wiele prób. Spróbuj za kilka minut.', 'auth/network-request-failed': 'Brak połączenia z internetem.',
  'auth/missing-password': 'Wpisz hasło.', 'auth/operation-not-allowed': 'Logowanie e-mailem nie jest włączone w projekcie czytelników.'
};
const readerErr = e => {
  const code = e && (e.code || e.error || e.message);
  const known = READER_ERR[code];
  if (known !== undefined) return known;
  const dbg = document.documentElement.classList.contains('is-dev') && code ? ' [dev: ' + String(code).slice(0, 140) + ']' : '';
  return 'Coś poszło nie tak. Spróbuj ponownie.' + dbg;
};

const Readers = {
  auth: null, user: null, me: null, loading: true,
  enabled() { const c = CONFIG.READER_FIREBASE; return !!(c && c.apiKey && c.projectId); },
  async init() {
    if (!this.enabled()) { this.loading = false; return; }
    try {
      const v = CONFIG.FIREBASE_SDK_VERSION;
      if (!window.firebase || !firebase.initializeApp) await Utils.loadScript(`https://www.gstatic.com/firebasejs/${v}/firebase-app-compat.js`);
      if (!firebase.auth) await Utils.loadScript(`https://www.gstatic.com/firebasejs/${v}/firebase-auth-compat.js`);
      const app = firebase.apps.find(a => a.name === 'readers') || firebase.initializeApp(CONFIG.READER_FIREBASE, 'readers');
      this.auth = app.auth();
      try { await this.auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL); } catch { /* ignoruj */ }
      this.auth.onAuthStateChanged(async u => {
        this.user = u; this.me = null;
        if (u) { await this.loadMe(); Accounts.remember(u, this.me); Push.link(); this.joinEditor(); }
        this.loading = false; this.render();
        enforceRename();
      });
    } catch (e) { console.warn('Konta czytelników niedostępne:', e); this.loading = false; this.auth = null; }
  },
  async api(path, opts = {}) {
    const headers = { 'content-type': 'application/json' };
    if (this.user) { try { headers.authorization = 'Bearer ' + await this.user.getIdToken(); } catch { /* ignoruj */ } }
    const r = await fetch(CONFIG.API_BASE + path, { ...opts, headers: { ...headers, ...(opts.headers || {}) }, cache: 'no-store' });
    let d = {}; try { d = await r.json(); } catch { /* ignoruj */ }
    if (!r.ok) { if (d.error === 'session_expired' && path !== '/me') { try { await this.auth.signOut(); toast('Sesja wygasła – zaloguj się ponownie.'); } catch { /* ignoruj */ } } const e = new Error(d.error || 'http'); e.error = d.error || 'http'; e.data = d; throw e; }
    return d;
  },
  async loadMe() {
    try { this.me = await this.api('/me'); }
    catch (e) { this.me = null; if (e && e.error === 'session_expired') { try { await this.auth.signOut(); toast('Sesja wygasła – zaloguj się ponownie.'); } catch { /* ignoruj */ } } if (e && e.error === 'session_revoked') { try { await this.auth.signOut(); toast('Zostałeś wylogowany ze wszystkich urządzeń. Zaloguj się ponownie.'); } catch { /* ignoruj */ } } }
  },
  async google() {
    const prov = new firebase.auth.GoogleAuthProvider(); prov.setCustomParameters({ prompt: 'select_account' });
    const cred = await this.auth.signInWithPopup(prov);
    this.user = cred.user;
    await this.loadMe();
    return cred;
  },
  /** „Wyloguj ze wszystkich urządzeń”: serwer unieważnia wcześniejsze sesje, potem wylogowujemy też to urządzenie. */
  async signOutEverywhere() {
    if (this.user) Accounts.forget(this.user.uid);
    await this.api('/signout-all', { method: 'POST' });
    try { await Push.unlink(); } catch { /* ignoruj */ }
    try { const cur = Auth.mode === 'firebase' && FirebaseProvider.auth && FirebaseProvider.auth.currentUser; if (cur && /^rd_/.test(cur.uid)) await FirebaseProvider.auth.signOut(); } catch { /* ignoruj */ }
    await this.auth.signOut();
  },
  loggedIn() { return !!this.user; },
  verified() { if (this.me && typeof this.me.verified === 'boolean') return this.me.verified; return !!(this.user && this.user.emailVerified); },
  hasName() { return !!(this.me && this.me.name); },
  async register(email, pw, name) {
    const cred = await this.auth.createUserWithEmailAndPassword(email, pw);
    this.user = cred.user;
    await this.sendVerify();
    try { this.me = await this.api('/me', { method: 'POST', body: JSON.stringify({ name }) }); } catch (e) { e.accountCreated = true; throw e; }
    this.render();
  },
  async login(email, pw) { await this.auth.signInWithEmailAndPassword(email, pw); },
  async logout() {
    if (this.user) Accounts.forget(this.user.uid);
    await Push.unlink();
    try { const cur = Auth.mode === 'firebase' && FirebaseProvider.auth && FirebaseProvider.auth.currentUser; if (cur && /^rd_/.test(cur.uid)) await FirebaseProvider.auth.signOut(); } catch { /* ignoruj */ }
    await this.auth.signOut();
  },
  /** Czytelnik z rolą Redaktor/Właściciel dostaje od workera token logowania do projektu redakcji (prawo pisania artykułów). */
  async joinEditor() { this.editorIssue = ''; },
  /** Własne maile z Workera; gdy Worker nie ma skonfigurowanej wysyłki (albo zawiedzie), idzie standardowy mail Firebase. */
  async sendVerify(strict) {
    try { await this.api('/mail/verify', { method: 'POST' }); return; }
    catch (e) { if (e && e.error === 'rate') { if (strict) throw e; return; } }
    try { await this.user.sendEmailVerification(); } catch { /* ignoruj */ }
  },
  async reset(email) {
    try {
      const r = await fetch(CONFIG.API_BASE + '/mail/reset', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email }), cache: 'no-store' });
      if (r.ok) return;
      if (r.status === 429) { const e = new Error('rate'); e.error = 'rate'; throw e; }
    } catch (e) { if (e && e.error === 'rate') throw e; }
    await this.auth.sendPasswordResetEmail(email);
  },
  async resend() { await this.sendVerify(true); },
  async refresh() { if (!this.user) return; await this.user.reload(); await this.user.getIdToken(true); await this.loadMe(); this.render(); await this.joinEditor(); },
  async saveName(name) { this.me = await this.api('/me', { method: 'POST', body: JSON.stringify({ name }) }); this.render(); },
  async saveBio(bio) { this.me = await this.api('/me', { method: 'POST', body: JSON.stringify({ bio }) }); this.render(); },
  async saveAvatar(dataUrl) { this.me = await this.api('/me', { method: 'POST', body: JSON.stringify({ avatar: dataUrl || null }) }); this.render(); },
  render() {
    renderReaderCard();
    updatePushButton();
    const b = $('#btn-account');
    if (b) {
      b.classList.toggle('is-on', this.loggedIn());
      b.title = this.loggedIn() ? 'Twoje konto' + (this.me && this.me.name ? ' (' + this.me.name + ')' : '') : 'Zaloguj się lub załóż konto';
    }
    if (currentRoute().name === 'account') renderAccount();
    drawComments();
  }
};

const ago = ms => {
  const m = Math.floor((Date.now() - ms) / 60000);
  if (m < 1) return 'przed chwilą';
  if (m < 60) return m + ' min temu';
  const h = Math.floor(m / 60);
  if (h < 24) return h + ' ' + plural(h, 'godzinę', 'godziny', 'godzin') + ' temu';
  const d = Math.floor(h / 24);
  if (d < 30) return d + ' ' + plural(d, 'dzień', 'dni', 'dni') + ' temu';
  return new Date(ms).toLocaleDateString('pl-PL');
};
const readerAvatar = (name, av, pub) => av ? `<img src="${CONFIG.API_BASE}/avatar/${Utils.esc(pub)}.jpg?v=${av}" alt="" loading="lazy">` : `<span>${Utils.esc((name || '?').trim().slice(0, 2).toUpperCase())}</span>`;

/* ---- komentarze pod artykułem ---- */
const Cmt = { article: null, list: [], off: false, ok: false, expanded: false, sending: false, msg: '', replyTo: null, focus: 0 };
const CMT_SHOWN = 5;
const CMT_CUT = 220;               // dłuższe komentarze są skracane do tylu znaków
const cmtOpen = new Set();

const SIDE_MQ = '(min-width: 1221px)';
/** Szeroki ekran: komentarze w prawej kolumnie nad „Pozostałymi artykułami”; wąski: pod artykułem. */
function placeComments() {
  const box = $('#comments'); if (!box) return;
  const side = $('#side-comments'), home = $('#comments-home');
  const wide = window.matchMedia(SIDE_MQ).matches;
  const to = wide ? side : home;
  if (to && box.parentElement !== to) to.appendChild(box);
  $('#side-right').hidden = wide ? false : $('#side-right').dataset.hasList !== '1';
}
window.matchMedia(SIDE_MQ).addEventListener('change', placeComments);

function commentsSectionHtml(a) {
  if (!Readers.enabled() || a.quick || !isPublished(a)) return '';
  return `<section class="comments" id="comments" data-article="${Utils.esc(a.id)}" hidden aria-label="Komentarze"></section>`;
}

async function initComments(a) {
  const box = $('#comments');
  if (!box || box.dataset.article !== a.id) return;
  placeComments();
  Cmt.article = a.id; Cmt.list = []; Cmt.off = false; Cmt.closed = false; Cmt.slow = 0; Cmt.editing = 0; Cmt.reporting = 0; Cmt.ok = false; Cmt.expanded = false; Cmt.msg = ''; Cmt.replyTo = null; Cmt.focus = currentRoute().k || 0;
  try {
    const d = await actorApi('/comments?article=' + encodeURIComponent(a.id));
    if (!$('#comments') || $('#comments').dataset.article !== a.id) return;
    Cmt.list = d.comments || []; Cmt.off = !!d.off; Cmt.closed = !!d.closed; Cmt.slow = Number(d.slow) || 0; Cmt.ok = d.enabled !== false;
  } catch { return; }          // brak API (np. tryb demonstracyjny) – sekcja zostaje ukryta
  const want = Cmt.focus; Cmt.focus = 0;
  if (want) {
    const top = cmtTree().tops, c = Cmt.list.find(x => x.id === want);
    const root = c && (c.parent && Cmt.list.some(x => x.id === c.parent) ? c.parent : c.id);
    if (root && top.findIndex(x => x.id === root) >= CMT_SHOWN) Cmt.expanded = true;
  }
  drawComments();
  if (want) {
    const el = document.getElementById('c-' + want);
    if (!el) toast('Tego komentarza już nie ma.', 'error');
    else { el.scrollIntoView({ block: 'center', behavior: 'smooth' }); el.classList.add('cmt-hl'); setTimeout(() => el.classList.remove('cmt-hl'), 3500); }
  }
}

/** Komentarze główne (od najnowszych) i odpowiedzi do nich (od najstarszych). */
function cmtTree() {
  const vis = Cmt.list.filter(c => c.status !== 'pending' || c.mine);
  const ids = new Set(vis.map(c => c.id));
  const kids = new Map();
  const tops = [];
  vis.forEach(c => {
    if (c.parent && ids.has(c.parent)) { if (!kids.has(c.parent)) kids.set(c.parent, []); kids.get(c.parent).push(c); }
    else tops.push(c);
  });
  kids.forEach(a => a.sort((x, y) => x.at - y.at));
  return { vis, tops, kids };
}

function cmtTextHtml(c) {
  const long = c.text.length > CMT_CUT, open = cmtOpen.has(c.id);
  let t = c.text;
  if (long && !open) { t = t.slice(0, CMT_CUT).replace(/\s+\S*$/, ''); t = t.replace(/[\s.,;:!?-]+$/, '') + '…'; }
  const body = Utils.esc(t).replace(/\n/g, '<br>');
  return `<p>${body}</p>${long ? `<button type="button" class="cmt-act cmt-toggle" data-cmt="toggle" data-id="${c.id}">${open ? 'Pokaż mniej' : 'Pokaż więcej'}</button>` : ''}`;
}

function commentItemHtml(c, kids) {
  const admin = Auth.isAdmin();
  const own = c.mine && !admin ? `<button type="button" class="cmt-act" data-cmt="delete" data-id="${c.id}">Usuń</button>` : '';
  const canEdit = c.mine && !Cmt.off && ['ok', 'pending'].includes(c.status) && (isOwnerRole() || Date.now() - c.at < CMT_EDIT_MS);
  const edit = canEdit ? `<button type="button" class="cmt-act" data-cmt="edit" data-id="${c.id}">Edytuj</button>` : '';
  const rep = !c.mine && Readers.loggedIn() && !isStaffActor()
    ? (Cmt.reporting === c.id
      ? `<span class="cmt-why"><em>Powód:</em>${[['spam', 'Spam'], ['obraza', 'Obraza'], ['spoiler', 'Spoiler']].map(([v, l]) => `<button type="button" class="cmt-act" data-cmt="report-do" data-id="${c.id}" data-reason="${v}">${l}</button>`).join('')}<button type="button" class="cmt-act" data-cmt="report-cancel" data-id="${c.id}">Anuluj</button></span>`
      : `<button type="button" class="cmt-act" data-cmt="report" data-id="${c.id}">Zgłoś</button>`) : '';
  const adm = admin ? `<button type="button" class="cmt-act" data-cmt="admin-delete" data-id="${c.id}">Usuń</button>` : '';
  const canReply = !Cmt.off && c.status === 'ok';
  const reply = canReply ? `<button type="button" class="cmt-act" data-cmt="reply" data-id="${c.id}">Odpowiedz</button>` : '';
  const link = c.status === 'ok' ? `<button type="button" class="cmt-act" data-cmt="link" data-id="${c.id}">Link</button>` : '';
  const sub = kids && kids.length ? `<ul class="cmt-replies">${kids.map(k => commentItemHtml(k)).join('')}</ul>` : '';
  return `<li class="cmt${c.status === 'pending' ? ' is-pending' : ''}" id="c-${c.id}">
    <div class="cmt-av avatar">${readerAvatar(c.name, c.av, c.u)}</div>
    <div class="cmt-body">
      <div class="cmt-head">${c.u ? `<a class="cmt-name" href="#/uzytkownik/${Utils.esc(c.u)}"><b>${Utils.esc(c.name)}</b></a>` : `<b>${Utils.esc(c.name)}</b>`}${roleBadge(c)}${c.to ? `<span class="cmt-to">↪ ${Utils.esc(c.to)}</span>` : ''}<time>${ago(c.at)}</time>${c.edited ? '<span class="cmt-edited">· edytowano</span>' : ''}</div>
      ${Cmt.editing === c.id ? `<div class="cmt-edit"><textarea id="cmt-edit-text" rows="3" maxlength="${isOwnerRole() ? 20000 : 600}">${Utils.esc(c.text)}</textarea><div class="cmt-row"><button type="button" class="btn btn-primary btn-sm" data-cmt="edit-save" data-id="${c.id}">Zapisz</button><button type="button" class="btn btn-sm" data-cmt="edit-cancel" data-id="${c.id}">Anuluj</button><small>Poprawki możliwe do 5 minut od publikacji.</small></div></div>` : cmtTextHtml(c)}
      ${c.status === 'pending' ? '<small class="cmt-wait">Czeka na zatwierdzenie przez redakcję</small>' : ''}
      <div class="cmt-actions">${reply}${link}${edit}${own}${rep}${adm}</div>
      ${sub}
    </div>
  </li>`;
}

function drawComments() {
  const box = $('#comments');
  if (!box || !Cmt.ok || box.dataset.article !== Cmt.article) return;
  box.hidden = false;
  placeComments();
  const { vis: visible, tops, kids } = cmtTree();
  const shown = Cmt.expanded ? tops : tops.slice(0, CMT_SHOWN);
  let form = '';
  if (Cmt.off) form = '<p class="cmt-note">Komentarze do tego artykułu są wyłączone.</p>';
  else if (Readers.loading) form = '';
  else if (Readers.loggedIn() && !isStaffActor() && !Readers.hasName()) form = '<p class="cmt-note">Ustaw nazwę użytkownika na <a href="#/konto">stronie konta</a>, żeby komentować.</p>';
  else if (Readers.loggedIn() && !isStaffActor() && !Readers.verified()) form = '<div class="cmt-note">Potwierdź adres e-mail (wysłaliśmy link), żeby komentować.<div class="cmt-row"><button type="button" class="btn btn-sm" data-cmt="resend">Wyślij link ponownie</button><button type="button" class="btn btn-sm" data-cmt="refresh">Już potwierdziłem</button></div></div>';
  else form = `<form class="cmt-form" id="cmt-form">${Cmt.replyTo ? `<div class="cmt-replying">Odpowiadasz użytkownikowi <b>${Utils.esc(Cmt.replyTo.name)}</b><button type="button" class="cmt-act" data-cmt="cancel-reply">Anuluj</button></div>` : ''}<textarea id="cmt-text" rows="3" maxlength="${isOwnerRole() ? 20000 : 600}" placeholder="${Cmt.replyTo ? 'Napisz odpowiedź' : 'Napisz komentarz'} jako ${Utils.esc(isStaffActor() ? staffName() + ' (redakcja)' : Readers.loggedIn() ? Readers.me.name : 'Niezmoczona (numer nadamy sami)')}…" aria-label="Komentarz"></textarea>
      <div class="cmt-row"><small><span id="cmt-count">0</span>${isOwnerRole() ? '' : '/600'}</small><button type="submit" class="btn btn-primary btn-sm" id="cmt-send">Opublikuj</button></div>${Cmt.slow && !isStaffActor() && !canMod() ? `<small class="cmt-slow">Tryb wolniejszej dyskusji: odstęp ${Cmt.slow >= 60 ? Cmt.slow / 60 + ' min' : Cmt.slow + ' s'} między komentarzami.</small>` : ''}${!Readers.loggedIn() && !isStaffActor() ? '<small class="cmt-guest">Piszesz jako gość. <button type="button" class="cmt-act" data-cmt="login">Zaloguj się</button>, żeby mieć własną nazwę oraz edytować i usuwać komentarze.</small>' : ''}</form>`;
  const keep = $('#cmt-text') ? $('#cmt-text').value : '';
  const closeBtn = canMod() && (Cmt.closed || !Cmt.off) ? `<button type="button" class="cmt-act cmt-close" data-cmt="close-toggle">${Cmt.closed ? 'Otwórz komentarze' : 'Zamknij komentarze'}</button>` : '';
  box.innerHTML = `<h2 class="cmt-title">Komentarze <span>${visible.length}</span>${closeBtn}</h2>
    ${form}
    ${Cmt.msg ? `<p class="cmt-msg">${Utils.esc(Cmt.msg)}</p>` : ''}
    ${visible.length ? `<ul class="cmt-list">${shown.map(c => commentItemHtml(c, kids.get(c.id))).join('')}</ul>` : (Cmt.off ? '' : '<p class="cmt-empty">Bądź pierwszy – napisz, co myślisz.</p>')}
    ${!Cmt.expanded && tops.length > CMT_SHOWN ? `<button type="button" class="btn btn-sm cmt-more" data-cmt="more">Pokaż resztę komentarzy (${tops.length - CMT_SHOWN})</button>` : ''}`;
  const t = $('#cmt-text'); if (t && keep) { t.value = keep; cmtCount(); }
}

async function sendComment(e) {
  e.preventDefault();
  if (Cmt.sending) return;
  const text = $('#cmt-text').value.trim();
  if (text.length < (isOwnerRole() ? 1 : 2)) return;
  Cmt.sending = true; const btn = $('#cmt-send'); btn.disabled = true;
  try {
    const d = await actorApi('/comments', { method: 'POST', body: JSON.stringify({ article: Cmt.article, text, replyTo: Cmt.replyTo ? Cmt.replyTo.id : undefined, staffName: staffName() }) });
    Cmt.list.unshift(d.comment); Cmt.replyTo = null;
    Cmt.msg = d.held ? 'Komentarz zawiera link lub niedozwolone słowa, więc czeka na zatwierdzenie redakcji.' : '';
    if (d.censored && !d.held) Cmt.msg = 'Opublikowano. Niektóre słowa zostały automatycznie ocenzurowane.';
    else if (!d.held && Push.supported() && Notification.permission !== 'granted') Cmt.msg = 'Opublikowano. Włącz powiadomienia (dzwonek na górze), a damy Ci znać, gdy ktoś odpowie na Twój komentarz.';
    $('#cmt-text').value = '';
  } catch (err) { Cmt.msg = err && err.error === 'slow' && err.data && err.data.wait ? `Poczekaj jeszcze ${err.data.wait} s przed kolejnym komentarzem (tryb wolniejszej dyskusji).` : readerErr(err); }
  finally { Cmt.sending = false; drawComments(); }
}

function cmtCount() {
  const t = $('#cmt-text'), n = $('#cmt-count'); if (!t || !n) return;
  const len = t.value.length;
  n.textContent = len;
  const lim = isOwnerRole() ? Infinity : 600;
  n.parentElement.classList.toggle('is-warn', len >= 540 && len < lim);
  n.parentElement.classList.toggle('is-max', len >= lim);
}

async function commentAction(act, id, btn) {
  try {
    if (act === 'more') { Cmt.expanded = true; drawComments(); return; }
    if (act === 'toggle') { cmtOpen.has(id) ? cmtOpen.delete(id) : cmtOpen.add(id); drawComments(); return; }
    if (act === 'login') { openReaderModal('login'); return; }
    if (act === 'reply') {
      const c = Cmt.list.find(x => x.id === id); if (!c) return;
      Cmt.replyTo = { id: c.id, name: c.name }; drawComments();
      const t = $('#cmt-text'); if (t) { t.focus(); t.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
      return;
    }
    if (act === 'cancel-reply') { Cmt.replyTo = null; drawComments(); return; }
    if (act === 'edit') { Cmt.editing = id; Cmt.reporting = 0; drawComments(); const t = $('#cmt-edit-text'); if (t) { t.focus(); t.setSelectionRange(t.value.length, t.value.length); } return; }
    if (act === 'edit-cancel') { Cmt.editing = 0; drawComments(); return; }
    if (act === 'edit-save') {
      const t = $('#cmt-edit-text'); const text = t ? t.value.trim() : '';
      if (text.length < 2) { toast('Komentarz jest za krótki.', 'error'); return; }
      btn.disabled = true;
      try {
        const d = await actorApi('/comments/edit', { method: 'POST', body: JSON.stringify({ id, text }) });
        const c = Cmt.list.find(x => x.id === id); if (c) { c.text = d.text; c.status = d.status; c.edited = d.edited; }
        Cmt.editing = 0; Cmt.msg = d.held ? 'Po poprawce komentarz zawiera link, więc czeka na zatwierdzenie redakcji.' : d.censored ? 'Zapisano. Niektóre słowa zostały automatycznie ocenzurowane.' : '';
        drawComments();
      } catch (ex) { btn.disabled = false; throw ex; }
      return;
    }
    if (act === 'report-cancel') { Cmt.reporting = 0; drawComments(); return; }
    if (act === 'close-toggle') {
      const want = !Cmt.closed;
      await adminApi('/admin/closed', { method: 'POST', body: JSON.stringify({ article: Cmt.article, closed: want }) });
      Cmt.closed = want; Cmt.off = want; Cmt.editing = 0; Cmt.replyTo = null;
      toast(want ? 'Komentarze pod tym artykułem zostały zamknięte.' : 'Komentarze znów są otwarte.');
      drawComments(); return;
    }
    if (act === 'link') {
      const url = `${location.origin}${location.pathname}#/artykul/${encodeURIComponent(Cmt.article)}?k=${id}`;
      try { await navigator.clipboard.writeText(url); toast('Skopiowano link do komentarza.'); }
      catch { window.prompt('Skopiuj link do komentarza:', url); }
      return;
    }
    if (act === 'resend') { await Readers.resend(); Cmt.msg = 'Wysłaliśmy link ponownie.'; drawComments(); return; }
    if (act === 'refresh') { await Readers.refresh(); if (!Readers.verified()) { Cmt.msg = 'Adres nie jest jeszcze potwierdzony. Kliknij link w wiadomości.'; drawComments(); } return; }
    if (act === 'delete') {
      if (!confirm('Usunąć Twój komentarz?')) return;
      await actorApi('/comments/delete', { method: 'POST', body: JSON.stringify({ id }) });
      Cmt.list = Cmt.list.filter(c => c.id !== id && c.parent !== id);
    } else if (act === 'report') {
      Cmt.reporting = id; Cmt.editing = 0; drawComments(); return;
    } else if (act === 'report-do') {
      await actorApi('/comments/report', { method: 'POST', body: JSON.stringify({ id, reason: btn.dataset.reason }) });
      Cmt.reporting = 0; drawComments();
      toast('Dziękujemy za zgłoszenie. Redakcja je sprawdzi.');
      return;
    } else if (act === 'admin-delete') {
      if (!confirm('Usunąć ten komentarz?')) return;
      await adminApi('/admin/comment', { method: 'POST', body: JSON.stringify({ id, action: 'delete' }) });
      Cmt.list = Cmt.list.filter(c => c.id !== id && c.parent !== id);
    }
    if (Cmt.replyTo && !Cmt.list.some(c => c.id === Cmt.replyTo.id)) Cmt.replyTo = null;
    Cmt.msg = ''; drawComments();
  } catch (err) { toast(readerErr(err), 'error'); }
}

/** Zapytania moderatora: token z projektu redakcji (altplus-news). */
async function adminApi() { throw new Error('Niedostępne w wersji publicznej.'); }

/* ---- okno logowania / rejestracji czytelnika ---- */
let readerMode = 'login';
function openReaderModal(mode) {
  readerMode = mode || 'login';
  setReaderMode();
  $('#reader-error').hidden = true;
  openModal('reader-modal');
}
function setReaderMode(m) {
  if (m) readerMode = m;
  const reg = readerMode === 'register', rst = readerMode === 'reset', nm = readerMode === 'name', login = readerMode === 'login';
  const T = {
    login: ['Witaj z powrotem', 'Zaloguj się, żeby komentować i oceniać recenzje. Redakcja loguje się tutaj tak samo.'],
    register: ['Dołącz do Śliska News', 'Konto pozwala komentować artykuły i oceniać recenzje pod własną nazwą.'],
    reset: ['Nie pamiętam hasła', 'Podaj e-mail, a wyślemy link do ustawienia nowego hasła.'],
    name: ['Wybierz nazwę użytkownika', 'Będzie widoczna przy komentarzach i ocenach.']
  }[readerMode] || ['', ''];
  $('#reader-title').textContent = T[0];
  $('#reader-sub').textContent = T[1];
  $('#reader-tabs').hidden = !(login || reg) || !Readers.enabled();
  $('#rm-tab-login').classList.toggle('is-on', login);
  $('#rm-tab-register').classList.toggle('is-on', reg);
  $('#reader-name-field').hidden = !(reg || nm);
  const gb = $('#reader-google-box'); if (gb) gb.hidden = !((login || reg) && Readers.enabled());
  $('#reader-pass-field').hidden = rst || nm;
  $('#reader-terms').hidden = !reg;
  $('#reader-submit').textContent = reg ? 'Załóż konto' : rst ? 'Wyślij link' : nm ? 'Zapisz' : 'Zaloguj się';
  $('#reader-switch').innerHTML = rst ? '<a href="#" data-rmode="login">Wróć do logowania</a>' : login ? '<a href="#" data-rmode="reset">Nie pamiętam hasła</a>' : '';
  $('#reader-email-field').hidden = nm || (login && Auth.mode === 'local' && !Readers.enabled());
  $('#reader-email-label').textContent = login ? 'E-mail lub nazwa użytkownika' : 'E-mail';
  $('#reader-email').placeholder = login ? 'e-mail albo nazwa, np. jan.kowalski' : 'np. jan@poczta.pl';
  $('#reader-pass').autocomplete = reg ? 'new-password' : 'current-password';
  $('#reader-pass').placeholder = reg ? 'Min. 6 znaków' : 'Twoje hasło';
}
/** Nazwa użytkownika: małe litery a–z, cyfry, „.” i „_”; spacje zamieniamy na kropki, polskie znaki na ich odpowiedniki. */
function fixUsername(s) {
  return String(s || '').toLowerCase().replace(/ł/g, 'l').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '.').replace(/[^a-z0-9._]/g, '').replace(/([._])[._]+/g, '$1').replace(/^[._]+/, '');
}
const usernameOk = (s, max = 20) => s.length >= 3 && s.length <= max && /^[a-z0-9]+(?:[._][a-z0-9]+)*$/.test(s);
document.addEventListener('input', e => {
  if (!['reader-name', 'acc-name', 'rn-name'].includes(e.target.id)) return;
  if (typeof isOwnerRole === 'function' && isOwnerRole()) return;          // Właściciel może mieć dowolną nazwę
  const t = e.target, pos = t.selectionStart, before = t.value, fixed = fixUsername(before);
  if (fixed !== before) { t.value = fixed; try { t.setSelectionRange(Math.min(pos, fixed.length), Math.min(pos, fixed.length)); } catch { /* ignoruj */ } }
});

/* ---- obowiązkowa zmiana nazwy dla kont, które łamią nowe zasady ---- */
function renameRequired() { return !!(typeof Readers !== 'undefined' && Readers.me && Readers.me.needsRename); }
function enforceRename() {
  const m = $('#rename-modal'); if (!m) return;
  if (!renameRequired()) { if (!m.hidden) { m.hidden = true; if (!$$('.modal').some(x => !x.hidden)) document.body.classList.remove('modal-open'); } return; }
  if (m.hidden) {
    const inp = $('#rn-name'); inp.value = fixUsername(Readers.me.name);
    $('#rn-error').hidden = true;
    $('#rn-hint').textContent = 'Aktualna nazwa: „' + Readers.me.name + '”. Proponuję: ' + (inp.value || '—') + ' – możesz ją zmienić.';
    openModal('rename-modal');
  }
}
async function submitRename(e) {
  e.preventDefault();
  const err = $('#rn-error'), name = $('#rn-name').value.trim(); err.hidden = true;
  if (!usernameOk(name, 20)) { err.textContent = READER_ERR.name_chars; err.hidden = false; return; }
  const btn = $('#rn-submit'); btn.disabled = true;
  try {
    const d = await Readers.api('/me', { method: 'POST', body: JSON.stringify({ name }) });
    Readers.me = d; const expired = !!d.expired;
    if (!d.needsRename) $('#rename-modal').hidden = true;
    if (!$$('.modal').some(x => !x.hidden)) document.body.classList.remove('modal-open');
    if (expired) { try { await Readers.auth.signOut(); } catch { /* ignoruj */ } toast('Nazwa zmieniona. Sesja wygasła – zaloguj się ponownie (możesz użyć nowej nazwy).'); }
    else toast('Nazwa zmieniona. Możesz się teraz logować także nazwą użytkownika.');
    Readers.render();
  } catch (ex) { err.textContent = readerErr(ex); err.hidden = false; }
  finally { btn.disabled = false; }
}
setInterval(() => { if (renameRequired()) enforceRename(); }, 1500);          // okna nie da się zamknąć ani ukryć

/** Jedno okno logowania: najpierw konto czytelnika (zwykłe i redaktorzy nadani z panelu), potem – jeśli nie pasuje – stare konto redakcji (projekt główny). */
async function unifiedLogin(ident, pw) {
  let email = ident;
  if (ident && !ident.includes('@')) {          // logowanie nazwą użytkownika: Worker sprawdza hasło i zwraca adres konta
    const r = await fetch(CONFIG.API_BASE + '/login-name', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: ident, password: pw }), cache: 'no-store' });
    let d = {}; try { d = await r.json(); } catch { /* ignoruj */ }
    if (!r.ok || !d.email) { const e = new Error(d.error || 'bad_login'); e.error = d.error || 'bad_login'; throw e; }
    email = d.email;
  }
  const credErr = c => /^(auth\/(invalid-credential|invalid-login-credentials|wrong-password|user-not-found|invalid-email|missing-email|too-many-requests)|app\/(wrong-password|not-editor))$/.test(c || '');
  const canEditor = Auth.mode === 'firebase' || Auth.mode === 'local';
  let first = null;
  if (Readers.auth) {
    try { await Readers.login(email, pw); return 'reader'; }
    catch (e) { first = e; if (!canEditor || !credErr(e && e.code)) throw e; }
  }
  if (canEditor) {
    try { await Auth.login(email, pw); applyAuthUI(); return 'editor'; }
    catch (e) { throw (first && /too-many-requests/.test((e && e.code) || '') ? first : e); }
  }
  throw first || { code: 'auth/invalid-credential' };
}

async function submitReader(e) {
  e.preventDefault();
  const err = $('#reader-error'); err.hidden = true;
  const email = $('#reader-email').value.trim(), pw = $('#reader-pass').value, name = $('#reader-name').value.trim();
  const btn = $('#reader-submit'); btn.disabled = true;
  try {
    if (readerMode === 'login') { const who = await unifiedLogin(email, pw); closeModal('reader-modal'); $('#reader-pass').value = ''; toast(who === 'editor' ? 'Zalogowano jako redaktor.' : 'Zalogowano.'); }
    else if (readerMode === 'reset') { await Readers.reset(email); err.hidden = false; err.className = 'form-ok'; err.textContent = 'Jeśli konto istnieje, wysłaliśmy link do zmiany hasła.'; return; }
    else if (readerMode === 'name') { await Readers.saveName(name); closeModal('reader-modal'); toast('Zapisano nazwę użytkownika.'); }
    else {
      if (!$('#reader-accept').checked) throw { code: 'terms' };
      await Readers.register(email, pw, name);
      closeModal('reader-modal');
      toast('Konto założone! Sprawdź skrzynkę i potwierdź adres e-mail.');
    }
  } catch (ex) {
    if (ex && ex.accountCreated) { setReaderMode('name'); }
    err.className = 'form-error'; err.hidden = false;
    err.textContent = ex && ex.code === 'terms' ? 'Zaakceptuj regulamin, żeby założyć konto.' : readerErr(ex);
  } finally { btn.disabled = false; }
}

/* ---- publiczny profil użytkownika ---- */
async function renderUserProfile(pub) {
  const el = $('#view-user');
  el.innerHTML = `<div class="article-top">${backBtn('#/', '← Powrót do strony głównej', 'btn')}</div><p class="muted">Ładowanie…</p>`;
  let d;
  try {
    const r = await fetch(CONFIG.API_BASE + '/profile/' + encodeURIComponent(pub), { cache: 'no-store' });
    if (!r.ok) throw new Error('gone');
    d = await r.json();
  } catch { if (currentRoute().name === 'user') el.innerHTML = notFoundHtml('Nie ma takiego użytkownika.'); return; }
  if (currentRoute().name !== 'user' || currentRoute().pub !== pub) return;
  const since = d.created ? new Date(d.created).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
  const items = (d.comments || []).map(c => {
    const a = state.articles.find(x => x.id === c.article);
    const t = c.text.length > 240 ? c.text.slice(0, 240).replace(/\s+\S*$/, '') + '…' : c.text;
    return `<li class="up-c"><a class="up-art" href="#/artykul/${encodeURIComponent(c.article)}?k=${c.id}">${Utils.esc(a ? a.title : 'Artykuł')}</a><p>${Utils.esc(t).replace(/\n/g, '<br>')}</p><time>${ago(c.at)}</time></li>`;
  }).join('');
  el.innerHTML = `<div class="article-top">${backBtn('#/', '← Powrót do strony głównej', 'btn')}</div>
    <section class="panel up-card">
      <div class="avatar up-av">${readerAvatar(d.name, d.av, d.pub)}</div>
      <div class="up-main"><h1 class="up-name">${Utils.esc(d.name)}</h1>
        <div class="up-meta">${roleBadge({ staff: d.staff, role: d.role, crown: d.crown }) || '<span class="muted">Czytelnik</span>'}${since ? `<span class="muted">Dołączył(a) ${since}</span>` : ''}<span class="muted">Komentarzy: ${d.count || 0}</span></div>
        ${d.bio ? `<p class="up-bio">${Utils.esc(d.bio)}</p>` : ''}
        ${d.staff || ['editor', 'owner', 'chief'].includes(d.role) ? `<a class="up-more" href="#/redaktor/${encodeURIComponent(d.name)}">Zobacz artykuły autora →</a>` : ''}</div>
    </section>
    ${d.banned ? '<p class="cmt-note">To konto zostało zablokowane.</p>' : `<h2 class="up-h">Komentarze</h2>${items ? `<ul class="up-list">${items}</ul>` : '<p class="muted">Ten użytkownik nie ma jeszcze komentarzy.</p>'}`}`;
}

/* ---- strona konta czytelnika ---- */
function renderAccount() {
  const el = $('#view-account');
  if (!Readers.enabled()) { el.innerHTML = notFoundHtml('Konta czytelników nie są jeszcze włączone.'); return; }
  if (Readers.loading) { el.innerHTML = '<p class="muted">Ładowanie…</p>'; return; }
  if (!Readers.loggedIn()) {
    el.innerHTML = `<div class="article-top"><a class="btn" href="#/">← Powrót do strony głównej</a></div><h1 class="panel-title">Konto czytelnika</h1>
      <div class="panel st-card"><p class="muted">Załóż konto, żeby komentować artykuły i mieć własny profil.</p><div class="cmt-row"><button type="button" class="btn btn-primary" data-cmt="login">Zaloguj się</button><button type="button" class="btn" id="acc-register">Załóż konto</button></div></div>`;
    return;
  }
  const me = Readers.me || {};
  const next = me.nextNameChange && me.nextNameChange > Date.now() ? new Date(me.nextNameChange).toLocaleDateString('pl-PL') : '';
  const rt = currentRoute().tab;
  const staff = Auth.isAdmin();
  if (rt && staff && (rt === 'komentarze' || rt === 'uzytkownicy' || rt === 'reklamy')) { setTimeout(() => goPanelTab(rt === 'komentarze' ? 'comments' : rt === 'reklamy' ? 'ads' : 'users'), 0); return; }   // moderacja mieszka teraz w Panelu
  const tab = rt === 'komentarze' && canMod() ? 'komentarze' : rt === 'uzytkownicy' && canManage() ? 'uzytkownicy' : rt === 'reklamy' && canManage() ? 'reklamy' : '';
  stashProfileBlock();
  const tabsHtml = canMod() && !staff ? `<div class="ptabs" role="tablist" aria-label="Sekcje konta"><a class="ptab ${tab ? '' : 'is-active'}" href="#/konto">Konto</a><a class="ptab ${tab === 'komentarze' ? 'is-active' : ''}" href="#/konto/komentarze">Komentarze</a>${canManage() ? `<a class="ptab ${tab === 'uzytkownicy' ? 'is-active' : ''}" href="#/konto/uzytkownicy">Użytkownicy</a><a class="ptab ${tab === 'reklamy' ? 'is-active' : ''}" href="#/konto/reklamy">Reklamy</a>` : ''}</div>` : '';
  const pubLink = Readers.me && Readers.me.pub ? `<a class="btn btn-sm" href="#/uzytkownik/${Utils.esc(Readers.me.pub)}">Zobacz profil publiczny</a>` : '';
  const vChip = Readers.verified() ? '<span class="acc-chip is-ok">E-mail potwierdzony</span>' : '<span class="acc-chip is-warn">E-mail niepotwierdzony</span>';
  el.innerHTML = `<div class="article-top"><a class="btn" href="#/">← Powrót do strony głównej</a></div>
    <h1 class="panel-title">Moje konto</h1>
    <nav class="hub-nav" data-hub="account" aria-label="Przejdź do"></nav>
    <section class="panel acc-hero">
      <div class="acc-cover" aria-hidden="true"></div>
      <div class="acc-hero-body">
        <div class="avatar avatar-lg acc-hero-av">${readerAvatar(me.name, me.avatarAt, me.pub)}</div>
        <div class="acc-hero-main"><h2 class="acc-hero-name">${Utils.esc(me.name || 'Twoje konto')}</h2>
          <div class="acc-chips"><span class="acc-chip">${Utils.esc(ROLE_LABEL[me.role] || (staff ? 'Redaktor' : 'Czytelnik'))}</span>${me.crown ? `<span class="acc-chip is-crown">${crownHtml()} Moderator</span>` : ''}${vChip}</div></div>
        <div class="acc-hero-actions">${pubLink}</div>
      </div>
    </section>
    ${tabsHtml}
    ${tab ? '<div id="acc-mod" class="panel-list"></div>' : `<div class="acc-grid">
      <div class="acc-col">
      <section class="panel st-card">
        <div class="st-head"><h2 class="st-h">Profil publiczny</h2><p class="st-sub">Nazwa i zdjęcie widoczne przy Twoich komentarzach.</p></div>
        <div class="settings-avatar"><div class="avatar avatar-lg" id="acc-avatar">${readerAvatar(me.name, me.avatarAt, me.pub)}</div>
          <div class="settings-avatar-actions"><input type="file" id="acc-avatar-file" accept="image/*">${me.hasAvatar ? '<button type="button" class="btn btn-sm btn-danger" id="acc-avatar-remove">Usuń zdjęcie</button>' : ''}</div></div>
        <label class="field"><span class="field-label">Nazwa użytkownika</span>
          <input type="text" id="acc-name" maxlength="${me.role === 'owner' ? 100 : 20}" value="${Utils.esc(me.name || '')}" placeholder="np. jan.kowalski" autocapitalize="none" spellcheck="false" ${next ? 'disabled' : ''}>
          <small class="hint">${next ? 'Następną zmianę nazwy możesz zrobić ' + next + '.' : 'Małe litery a–z, cyfry, „.” i „_” (bez spacji). Nazwa służy też do logowania; zmienisz ją raz na 30 dni.'}</small></label>
        <label class="field"><span class="field-label">Krótka biografia <small class="hint" id="acc-bio-n">${Array.from(me.bio || '').length}/150</small></span>
          <textarea id="acc-bio" rows="3" maxlength="150" placeholder="Kilka słów o sobie – zobaczą je inni na Twoim profilu publicznym.">${Utils.esc(me.bio || '')}</textarea></label>
        <div class="st-actions"><button type="button" class="btn btn-primary" id="acc-save">Zapisz profil</button></div>
        <p class="form-error" id="acc-error" hidden></p>
      </section>
      <div id="acc-editor-slot"></div>
      </div>
      <div class="acc-col">
      ${Accounts.html()}
      ${staffAdsHtml(me)}
            <section class="panel st-card">
        <div class="st-head"><h2 class="st-h">Logowanie i bezpieczeństwo</h2><p class="st-sub">Adres e-mail, hasło i aktywne sesje.</p></div>
        <div class="st-row"><span class="muted">Adres e-mail</span><strong>${Utils.esc(Readers.user.email || '')}</strong></div>
        <div class="st-row"><span class="muted">Potwierdzenie e-mail</span>${Readers.verified() ? '<strong class="ok-text">Potwierdzony</strong>' : '<span><button type="button" class="btn btn-sm" data-cmt="resend">Wyślij link</button> <button type="button" class="btn btn-sm" data-cmt="refresh">Już potwierdziłem</button></span>'}</div>
        <div class="st-row"><span class="muted">Hasło</span><button type="button" class="btn btn-sm" id="acc-reset">Wyślij link do zmiany hasła</button></div>
        <div class="st-row"><span class="muted">Sesja</span><button type="button" class="btn btn-sm" id="acc-logout">Wyloguj</button></div>
        <div class="st-row"><span class="muted">Wszystkie urządzenia</span><button type="button" class="btn btn-sm btn-danger" id="acc-signout-all">Wyloguj ze wszystkich</button></div>
      </section>
      </div>
    </div>`}`;
  if (tab === 'komentarze') renderModComments($('#acc-mod'), false);
  else if (tab === 'uzytkownicy') renderModUsersPanel($('#acc-mod'));
  else if (tab === 'reklamy') renderAdSubs($('#acc-mod'));
  else if (staff) {
    const slot = $('#acc-editor-slot'), blk = $('#st-profile-block');
    if (slot && blk) { slot.appendChild(blk); renderSettings(); }
  }
  fillHub();
}

/** Przełącznik „bez reklam na tym urządzeniu” – jedyna funkcja redakcji dostępna także na stronie publicznej (dla kont z rangą). */
const STAFF_ROLES = ['editor', 'chief', 'owner'];
function staffAdsHtml(me) {
  if (!me || !(STAFF_ROLES.includes(me.role) || me.crown)) return '';
  let on = false; try { on = localStorage.getItem('sliska_ads_off') === '1'; } catch { /* ignoruj */ }
  return `<section class="panel st-card"><div class="st-head"><h2 class="st-h">Reklamy</h2><p class="st-sub">Tylko dla kont z rangą. Czytelnicy zawsze widzą reklamy.</p></div>
    <label class="st-switch"><span><b>Wyłącz reklamy na tym urządzeniu</b><small>Dotyczy tylko tej przeglądarki.</small></span><input type="checkbox" id="acc-ads-off" ${on ? 'checked' : ''}></label></section>`;
}
document.addEventListener('change', e => {
  if (!e.target || e.target.id !== 'acc-ads-off') return;
  try { localStorage.setItem('sliska_ads_off', e.target.checked ? '1' : '0'); } catch { /* ignoruj */ }
  window.dispatchEvent(new Event('sliska:ads'));
  toast(e.target.checked ? 'Reklamy wyłączone na tym urządzeniu.' : 'Reklamy włączone.');
});

/** Blok „Profil redaktora” (zdjęcie, nazwa autora, biografia) mieszka w Moim koncie; poza nim wraca do ukrytego formularza ustawień. */
function stashProfileBlock() {
  const blk = $('#st-profile-block'), form = $('#settings-form');
  if (blk && form && !form.contains(blk)) form.prepend(blk);
}

/** Wspólna nawigacja Panel · Moje konto · Ustawienia (tylko dla redakcji). */
function fillHub() {
  const items = [['panel', '#/panel', 'Panel', 'panel'], ['account', '#/konto', 'Moje konto', 'user'], ['settings', '#/ustawienia', 'Ustawienia', 'gear']];
  const ICONS = {"panel": "<svg viewBox=\"0 0 24 24\" width=\"17\" height=\"17\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><rect x=\"3\" y=\"3\" width=\"7\" height=\"9\" rx=\"1.5\"/><rect x=\"14\" y=\"3\" width=\"7\" height=\"5\" rx=\"1.5\"/><rect x=\"14\" y=\"12\" width=\"7\" height=\"9\" rx=\"1.5\"/><rect x=\"3\" y=\"16\" width=\"7\" height=\"5\" rx=\"1.5\"/></svg>", "user": "<svg viewBox=\"0 0 24 24\" width=\"17\" height=\"17\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><circle cx=\"12\" cy=\"8\" r=\"4\"/><path d=\"M4 21a8 8 0 0 1 16 0\"/></svg>", "gear": "<svg viewBox=\"0 0 24 24\" width=\"17\" height=\"17\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><circle cx=\"12\" cy=\"12\" r=\"3\"/><path d=\"M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z\"/></svg>"};
  $$('.hub-nav').forEach(n => {
    n.hidden = !Auth.isAdmin();
    n.innerHTML = Auth.isAdmin() ? items.map(([k, href, label, ic]) => `<a class="hub-tab${n.dataset.hub === k ? ' is-active' : ''}" href="${href}"${n.dataset.hub === k ? ' aria-current="page"' : ''}>${ICONS[ic]}<span>${label}</span></a>`).join('') : '';
  });
}

/** Przejście do wskazanej zakładki Panelu (np. Moderacja). */
function goPanelTab(t) {
  try { sessionStorage.setItem('sliska_ptab', t); } catch { /* ignoruj */ }
  if (location.hash === '#/panel') { holdHeight(2500); route(); } else location.hash = '#/panel';
}

/** Kafelek profilu po lewej także dla zalogowanego czytelnika (w tym samym miejscu co u redaktora, bez funkcji redakcyjnych). */
function renderReaderCard() {
  const rd = Readers.loggedIn(), only = rd && !Auth.isAdmin();
  document.body.classList.toggle('is-reader', rd);
  document.body.classList.toggle('is-reader-only', only);
  const me = Readers.me || {};
  $('#btn-rd-mod').hidden = !canMod();
  $('#btn-rd-users').hidden = !canManage();
  ensureOwnerPanes();
  { const pu = $('#ptab-users'); if (pu) { pu.hidden = !canManage(); if (!pu.hidden && currentRoute().name === 'panel' && !$('#panel-users').children.length && ($('#view-panel .ptab.is-active') || {}).dataset?.ptab === 'users') renderModUsersPanel($('#panel-users')); } }
  let hint = $('#rd-hint');
  if (!hint) { hint = document.createElement('div'); hint.id = 'rd-hint'; hint.className = 'rd-hint'; const pa = $('#profile-card .profile-actions'); if (pa) pa.parentNode.insertBefore(hint, pa); }
  const issue = rd && ['editor', 'owner'].includes(me.role) && !Auth.isAdmin() ? Readers.editorIssue : '';
  const HINT = { verify: 'Panel redaktora czeka na potwierdzenie adresu e-mail. Kliknij link z wiadomości, a potem „Sprawdź ponownie”.', forbidden: 'Konto nie ma teraz dostępu do panelu redaktora. Skontaktuj się z Właścicielem Portalu.', server: 'Nie udało się włączyć panelu redaktora (błąd po stronie serwera). Spróbuj ponownie albo napisz do Właściciela.', signin: 'Nie udało się zalogować do panelu redaktora. Spróbuj ponownie.' };
  hint.hidden = !issue;
  hint.innerHTML = issue ? `<span>${HINT[issue] || HINT.signin}</span><button type="button" class="btn btn-sm" data-rd-retry>Sprawdź ponownie</button>` : '';
  if (only) {
    $('#profile-name').textContent = me.name || 'Twoje konto';
    $('#profile-avatar').innerHTML = readerAvatar(me.name, me.avatarAt, me.pub);
    $('#profile-role').textContent = ROLE_LABEL[me.role] || 'Czytelnik';
  } else if (rd && Auth.isAdmin() && me.role === 'owner') $('#profile-role').textContent = ROLE_LABEL.owner;
  else if (Auth.isAdmin()) $('#profile-role').textContent = 'Redaktor';
}

async function shrinkToJpeg(file, size = 1200, maxChars = 1300000) {
  const img = await loadImage(URL.createObjectURL(file), false);
  const w = img.naturalWidth, h = img.naturalHeight, side = Math.min(w, h);
  const out = Math.min(size, side);                         // bez powiększania i bez zbędnej utraty jakości
  const c = document.createElement('canvas'); c.width = c.height = out;
  const ctx = c.getContext('2d'); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, out, out);
  ctx.drawImage(img, (w - side) / 2, (h - side) / 2, side, side, 0, 0, out, out);
  let q = 0.95, data = c.toDataURL('image/jpeg', q);
  while (data.length > maxChars && q > 0.6) { q -= 0.05; data = c.toDataURL('image/jpeg', q); }
  return data;
}

function bindReaderEvents() {
  $('#btn-account').addEventListener('click', () => {
    const go = h => { if (location.hash === h) { route(); window.scrollTo({ top: 0, behavior: 'smooth' }); } else location.hash = h; };   // ten sam adres = wcześniej „nic się nie działo”
    if (Readers.loggedIn()) go('#/konto');
    else if (Auth.isAdmin()) go('#/panel');
    else openReaderModal('login');
  });
  $('#reader-error').className = 'form-error';
  $('#reader-form').addEventListener('submit', submitReader);
  $('#rename-form').addEventListener('submit', submitRename);
  $('#reader-eye').addEventListener('click', () => { const p = $('#reader-pass'), show = p.type === 'password'; p.type = show ? 'text' : 'password'; $('#reader-eye').textContent = show ? 'Ukryj' : 'Pokaż'; });
  $('#reader-modal').addEventListener('click', e => { const a = e.target.closest('[data-rmode]'); if (a) { e.preventDefault(); setReaderMode(a.dataset.rmode); $('#reader-error').hidden = true; } });
  document.addEventListener('click', async e => {
    const sw = e.target.closest('[data-acc-switch]'); if (sw) { sw.disabled = true; Accounts.switchTo(sw.dataset.accSwitch); return; }
    const fg = e.target.closest('[data-acc-forget]'); if (fg) { Accounts.forget(fg.dataset.accForget); renderAccount(); return; }
    if (e.target.id === 'acc-add') { openReaderModal('login'); return; }
    const rt = e.target.closest('[data-rd-retry]'); if (rt) { rt.disabled = true; try { await Readers.refresh(); } catch { /* ignoruj */ } renderReaderCard(); return; }
    const c = e.target.closest('[data-cmt]'); if (c) { commentAction(c.dataset.cmt, Number(c.dataset.id) || 0, c); return; }
    if (e.target.closest('[data-rm-google]')) {
      const b = e.target.closest('[data-rm-google]'); b.disabled = true; const err = $('#reader-error'); err.hidden = true;
      try {
        await Readers.google();
        if (!Readers.hasName()) {
          const dn = String((Readers.user && Readers.user.displayName) || '').replace(/[^\p{L}\p{N}_. -]/gu, '').trim().slice(0, 20);
          $('#reader-name').value = dn; setReaderMode('name');
        } else { closeModal('reader-modal'); toast('Zalogowano.'); }
      } catch (ex) { const m = ex && ex.code === 'auth/operation-not-allowed' ? 'Logowanie przez Google nie jest jeszcze włączone w Firebase (projekt czytelników): Authentication → Sign-in method → Google → Enable.' : readerErr(ex); if (m && !/^Coś poszło/.test(m) || ex.code === undefined) { err.className = 'form-error'; err.hidden = false; err.textContent = m; } }
      finally { b.disabled = false; }
      return;
    }
    if (e.target.id === 'acc-signout-all') {
      if (!confirm('Wylogować to konto ze wszystkich urządzeń? Na każdym będziesz musiał zalogować się ponownie.')) return;
      try { await Readers.signOutEverywhere(); toast('Wylogowano ze wszystkich urządzeń.'); location.hash = '#/'; } catch (ex) { toast(readerErr(ex), 'error'); }
      return;
    }
    if (e.target.id === 'acc-register') openReaderModal('register');
    else if (e.target.id === 'acc-logout') { await Readers.logout(); location.hash = '#/'; }
    else if (e.target.id === 'acc-reset') { try { await Readers.reset(Readers.user.email); toast('Wysłaliśmy link do zmiany hasła.'); } catch (ex) { toast(readerErr(ex), 'error'); } }
    else if (e.target.id === 'acc-save') {
      const er = $('#acc-error'); er.hidden = true;
      try {
        const nm = $('#acc-name'), bio = ($('#acc-bio').value || '').trim().replace(/\s+/g, ' ').slice(0, 150);
        if (nm && !nm.disabled && nm.value.trim() !== ((Readers.me && Readers.me.name) || '')) await Readers.saveName(nm.value.trim());
        if (bio !== ((Readers.me && Readers.me.bio) || '')) await Readers.saveBio(bio);
        toast('Profil zapisany.');
      } catch (ex) { er.textContent = readerErr(ex); er.hidden = false; }
    } else if (e.target.id === 'acc-avatar-remove') { try { await Readers.saveAvatar(null); toast('Zdjęcie usunięte.'); } catch (ex) { toast(readerErr(ex), 'error'); } }
  });
  document.addEventListener('submit', e => { if (e.target.id === 'cmt-form') sendComment(e); });
  document.addEventListener('input', e => { if (e.target.id === 'cmt-text') cmtCount(); if (e.target.id === 'acc-bio') { const n = $('#acc-bio-n'); if (n) n.textContent = Array.from(e.target.value).length + '/150'; } });
  document.addEventListener('change', async e => {
    if (e.target.id !== 'acc-avatar-file' || !e.target.files[0]) return;
    try { await Readers.saveAvatar(await shrinkToJpeg(e.target.files[0])); toast('Zdjęcie zapisane.'); } catch (ex) { toast(readerErr(ex), 'error'); }
  });
}


/*@staff-removed*/
/* ---- moderacja komentarzy i użytkowników (panel redaktora oraz konto właściciela / redaktora-czytelnika) ---- */
const Mod = { all: false };
const ROLE_LABEL = { owner: 'Właściciel Portalu', chief: 'Redaktor naczelny', editor: 'Redaktor', mod: 'Moderator' };
const CROWN_SVG = '<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true"><path d="M3 8l4.5 4L12 5l4.5 7L21 8l-1.6 10H4.6L3 8zm1.9 12h14.2v1.6H4.9V20z"/></svg>';
const crownHtml = () => `<span class="crown" title="Moderator" role="img" aria-label="Moderator">${CROWN_SVG}</span>`;
const MOD_ST = { pending: 'Czeka', reported: 'Zgłoszony', hidden: 'Ukryty', ok: 'Widoczny' };
const myRole = () => (Readers.me && Readers.me.role) || '';
const CMT_EDIT_MS = 5 * 60 * 1000;
const isOwnerRole = () => false;
const canMod = () => false;
const canManage = () => false;          // użytkownikami zarządza tylko Właściciel Portalu
const roleBadge = c => roleBase(c) + (!c.staff && (c.crown || c.role === 'mod') ? crownHtml() : '');
const roleBase = c => !c.staff && c.role === 'mod' ? '' : c.staff ? `<span class="cmt-badge${c.role === 'editor' || c.role === 'chief' ? ' is-' + c.role : ''}">${ROLE_LABEL[c.role] || 'Redakcja'}</span>` : ROLE_LABEL[c.role] ? `<span class="cmt-badge is-${c.role}">${ROLE_LABEL[c.role]}</span>` : '';

const MOD_REASON = { spam: 'spam', obraza: 'obraza', spoiler: 'spoiler', inne: 'inne' };
function modReasons(csv) {
  const n = {}; String(csv || '').split(',').filter(Boolean).forEach(r => { n[r] = (n[r] || 0) + 1; });
  return Object.entries(n).map(([r, k]) => (MOD_REASON[r] || r) + (k > 1 ? ' ×' + k : '')).join(', ');
}
function modItemHtml(c) {
  const a = state.articles.find(x => x.id === c.article);
  const approve = c.status === 'hidden' ? 'Przywróć' : 'Zatwierdź';
  return `<article class="mc" data-id="${c.id}" data-status="${c.status}">
    <div class="mc-head"><b>${Utils.esc(c.name || 'Użytkownik')}</b>${roleBadge(c)}<span class="mc-st is-${c.status}">${MOD_ST[c.status] || c.status}${c.reports ? ' · zgłoszeń: ' + c.reports : ''}</span><time>${ago(c.at)}</time></div>
    ${c.reasons ? `<small class="mc-why">Powody zgłoszeń: ${Utils.esc(modReasons(c.reasons))}</small>` : ''}
    <a class="mc-art" href="#/artykul/${encodeURIComponent(c.article)}?k=${c.id}">${Utils.esc(a ? a.title : c.article)}</a>
    <p class="mc-text">${Utils.esc(c.text).replace(/\n/g, '<br>')}</p>
    <div class="mc-actions">${c.status !== 'ok' ? `<button type="button" data-mod-act="approve">${approve}</button>` : '<button type="button" data-mod-act="hide">Ukryj</button>'}<button type="button" class="is-danger" data-mod-act="delete">Usuń</button></div>
  </article>`;
}

/*@staff-removed*/
/* ---------- Routing ---------- */
function showView(name) {
  ['home', 'article', 'panel', 'editor', 'settings', 'ranking', 'notfound', 'tip', 'legal', 'saved', 'quick', 'account', 'user', 'authors'].forEach(v => { $('#view-' + v).hidden = v !== name; });
  $('#layout').dataset.view = name;
}

function refreshViews() {
  if (!state.ready) return;
  renderProfileStats();
  renderBreaking();
  renderSideList();
  const route = currentRoute();
  if (route.name === 'home') renderHome();
  else if (route.name === 'article') renderArticleView(route.id);
  else if (route.name === 'ranking') renderRanking();
  else if (route.name === 'authors') renderAuthors();
  else if (route.name === 'quick') renderQuick();
  else if (route.name === 'panel') renderPanel();
}

/** Pamięta miejsce na liście: po wejściu w artykuł i cofnięciu wracasz dokładnie tam, gdzie byłeś. */
/** Utrzymuje wysokość strony na czas przeładowania zawartości zakładki (inaczej przeglądarka „zjeżdża” na górę, gdy treść na chwilę znika). */
function holdHeight(ms) {
  const y = window.scrollY; if (y < 40) return;
  const b = document.body; b.style.minHeight = (document.documentElement.scrollHeight) + 'px';
  clearTimeout(holdHeight.t);
  holdHeight.t = setTimeout(() => { b.style.minHeight = ''; }, ms || 2500);
  window.scrollTo({ top: y, behavior: 'instant' });
}
const SAME_SECTION = new Set(['account', 'panel', 'settings']);
const ScrollMemory = { cur: location.hash || '#/', prev: '', n: 0, pos: {} };
const LIST_ROUTES = /^#\/($|kategoria|tag|artysta|redaktor|redakcja|ranking|zapisane|szybkie)/;

function route() {
  const key = location.hash || '#/';
  ScrollMemory.pos[ScrollMemory.cur] = window.scrollY;
  const revisit = !!(history.state && history.state.sn);   // wejście z przycisku Wstecz/Dalej
  ScrollMemory.prev = ScrollMemory.cur;
  ScrollMemory.cur = key;
  routeCore();
  if (!history.state || !history.state.sn) { try { history.replaceState({ sn: ++ScrollMemory.n }, ''); } catch {} }
  const y = ScrollMemory.pos[key];
  if (revisit && y > 0) {
    const go = () => window.scrollTo({ top: y, behavior: 'instant' });
    requestAnimationFrame(go);
    setTimeout(() => { if (Math.abs(window.scrollY - y) > 40) go(); }, 300);
  }
}

function routeCore() {
  leaveEditor();
  const r = currentRoute();
  const sameSection = SAME_SECTION.has(r.name) && routeCore.last === r.name;      // przełączanie zakładek w koncie/panelu nie wraca na górę strony
  routeCore.last = r.name;
  if (sameSection) holdHeight(2500); else window.scrollTo({ top: 0, behavior: 'instant' });
  void document.body.offsetHeight;
  document.title = `${CONFIG.SITE_NAME} – najświeższe wiadomości`;

  if ((r.name === 'editor' || r.name === 'panel' || r.name === 'settings') && !Auth.isAdmin()) {
    location.hash = '#/';
    return;
  }

  $$('.main-nav .nav-link').forEach(l => l.classList.toggle('is-active',
    (l.id === 'nav-ranking' && r.name === 'ranking') || (l.id === 'nav-quick' && r.name === 'quick') || (l.id === 'nav-authors' && (r.name === 'authors' || (r.name === 'home' && r.author))) || (l.id === 'nav-home' && r.name === 'home' && !r.tag && !r.artist && !r.author && !r.category)));

  if (r.name === 'article') {
    showView('article');
    renderArticleView(r.id);
  } else if (r.name === 'ranking') {
    showView('ranking');
    document.title = `Ranking ocen – ${CONFIG.SITE_NAME}`;
    setMeta('Ranking ocen', 'Wszystkie recenzje Śliska News od najwyżej ocenianych.');
    renderRanking();
  } else if (r.name === 'quick') {
    showView('quick');
    document.title = `Nowinki z Poślizgiem – ${CONFIG.SITE_NAME}`;
    setMeta('Nowinki z Poślizgiem', 'Krótkie newsy ze świata muzyki i rozrywki – jedno zdanie i link do źródła.');
    renderQuick();
  } else if (r.name === 'saved') {
    showView('saved');
    document.title = `Zapisane na później – ${CONFIG.SITE_NAME}`;
    renderSaved();
  } else if (r.name === 'tip') {
    showView('tip');
    document.title = `Zgłoś temat – ${CONFIG.SITE_NAME}`;
    setMeta('Zgłoś temat', 'Masz news, temat albo wskazówkę? Podeślij ją redakcji Śliska News.');
    renderTip();
  } else if (r.name === 'legal') {
    showView('legal');
    const legalTitle = { 'o-nas': 'O nas i kontakt', regulamin: 'Regulamin', prywatnosc: 'Polityka prywatności' }[r.doc];
    document.title = `${legalTitle} – ${CONFIG.SITE_NAME}`;
    setMeta(legalTitle, r.doc === 'o-nas' ? 'Kim jesteśmy i jak skontaktować się z redakcją Śliska News.' : 'Zasady korzystania z serwisu Śliska News i informacje o przetwarzaniu danych.');
    renderLegal(r.doc);
  } else if (r.name === 'notfound') {
    showView('notfound');
    document.title = `Nie znaleziono – ${CONFIG.SITE_NAME}`;
    $('#view-notfound').innerHTML = notFoundHtml('Strona, której szukasz, nie istnieje albo adres jest nieprawidłowy.');
  } else if (r.name === 'authors') {
    showView('authors');
    document.title = `Redakcja – ${CONFIG.SITE_NAME}`;
    setMeta('Redakcja', 'Poznaj redaktorów Śliska News i przeglądaj ich artykuły.');
    renderAuthors();
  } else if (r.name === 'user') {
    showView('user');
    document.title = `Profil użytkownika – ${CONFIG.SITE_NAME}`;
    renderUserProfile(r.pub);
  } else if (r.name === 'account') {
    showView('account');
    document.title = `Twoje konto – ${CONFIG.SITE_NAME}`;
    renderAccount();
  } else if (r.name === 'settings') {
    showView('settings');
    document.title = `Ustawienia konta – ${CONFIG.SITE_NAME}`;
    renderSettings();
  } else if (r.name === 'panel') {
    showView('panel');
    document.title = `Panel redaktora – ${CONFIG.SITE_NAME}`;
    renderPanel();
  } else if (r.name === 'editor') {
    showView('editor');
    document.title = `Edytor – ${CONFIG.SITE_NAME}`;
    openEditor(r.id, r.draft);
  } else {
    showView('home');
    const wanted = r.category && CATEGORIES.includes(r.category) ? r.category : ALL;
    if (wanted !== state.category) state.visible = CONFIG.PAGE_SIZE;
    state.category = wanted;
    const collChanged = (r.tag || '') !== state.tag || (r.artist || '') !== state.artist || (r.author || '') !== state.author;
    state.tag = r.tag || '';
    state.artist = r.artist || '';
    state.author = r.author || '';
    if (collChanged) state.visible = CONFIG.PAGE_SIZE;
    updateCategoryNav();
    if (r.tag) { document.title = `#${r.tag} – ${CONFIG.SITE_NAME}`; setMeta(`#${r.tag}`, `Artykuły z tagiem ${r.tag} w Śliska News.`); }
    else if (r.artist) { document.title = `${r.artist} – ${CONFIG.SITE_NAME}`; setMeta(r.artist, `Wszystkie teksty i recenzje o ${r.artist} w Śliska News.`); }
    else if (r.author) { document.title = `${r.author} – redaktor – ${CONFIG.SITE_NAME}`; setMeta(r.author, `Artykuły redaktora ${r.author} w Śliska News.`); if (!Authors.loaded) Authors.load().then(() => { if (state.author === r.author) renderHome(); }); }
    else setMeta();
    renderHome();
  }
  renderSideList();
  updateSavedNav();
  updateScrollUi();
}

/* ---------- Kategorie ---------- */
const CAT_ICONS = {
  'Wszystkie': '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/></svg>',
  'Muzyka': '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V6l10-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="16" r="2.5"/></svg>',
  'Recenzje': '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3 2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 16.8 6.6 19.7l1.1-6.1L3.2 9.4l6.1-.8z"/></svg>',
  'Kontrowersje': '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3c1 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2 1-3.2 2-4 .3 1.5 1 2 1.8 2.2C11 8.5 11 5.5 12 3z"/></svg>',
  'Dramy': '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/><path d="M12 8v4M12 15.5v.01"/></svg>',
  'Inne': '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="18" cy="12" r="1.2"/></svg>'
};
function buildCategoryNav() {
  $('#category-nav').innerHTML = [ALL, ...CATEGORIES].map(c =>
    `<button type="button" class="chip-btn" data-category="${Utils.esc(c)}" title="${Utils.esc(c)}"><i class="cat-ico" aria-hidden="true">${CAT_ICONS[c] || CAT_ICONS.Inne}</i><span>${Utils.esc(c)}</span></button>`).join('');
  updateCategoryNav();
}

function updateCategoryNav() {
  $$('.chip-btn').forEach(b => b.classList.toggle('active', b.dataset.category === state.category));
}

function goHomeAndRender() {
  state.visible = CONFIG.PAGE_SIZE;
  if (currentRoute().name === 'home') { renderHome(); renderSideList(); }
  else location.hash = '#/';
}

/* ---------- Auth UI ---------- */
function applyAuthUI() {
  document.body.classList.toggle('is-admin', Auth.isAdmin());
  updatePushButton();
  const rn = currentRoute().name;
  // Utrata uprawnień (np. wylogowanie) w widoku dla redakcji – wróć na stronę główną
  if (state.ready && (rn === 'editor' || rn === 'panel' || rn === 'settings') && !Auth.isAdmin()) {
    location.hash = '#/';
    return;
  }
  renderReaderCard();
  if (Auth.isAdmin()) loadProfile();
  else { state.profile = EMPTY_PROFILE(); state.profileLoaded = false; state.profileUid = ''; renderProfile(); }
  refreshViews();
}

/* ---------- Profil redaktora (nazwa i zdjęcie) ---------- */
function EMPTY_PROFILE() { return ({ name: '', avatar: '', title: '', defaultCategory: '', showPhoto: true, aliases: [], quickPush: true, quickSource: '', panelTab: 'drafts', confirmDelete: true }); }
function normProfile(p) {
  p = p || {};
  return {
    name: String(p.name || '').slice(0, 60),
    avatar: p.avatar || '',
    title: String(p.title || '').slice(0, 40),
    defaultCategory: CATEGORIES.includes(p.defaultCategory) ? p.defaultCategory : '',
    showPhoto: p.showPhoto !== false,
    quickPush: p.quickPush !== false,
    quickSource: String(p.quickSource || '').slice(0, 40),
    panelTab: ['drafts', 'scheduled', 'tips'].includes(p.panelTab) ? p.panelTab : 'drafts',
    aliases: Array.isArray(p.aliases) ? p.aliases.map(x => String(x).slice(0, 60)).filter(Boolean).slice(0, 30) : []
  };
}

function avatarHtml(p) {
  if (p.avatar) return `<img src="${Utils.esc(p.avatar)}" alt="">`;
  const initials = (p.name || 'R').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
  return `<span>${Utils.esc(initials || 'R')}</span>`;
}

function renderProfile() {
  try { drawComments(); } catch { /* ignoruj */ }
  $('#profile-name').textContent = state.profile.name || 'Redaktor';
  $('#profile-avatar').innerHTML = avatarHtml(state.profile);
  renderProfileStats();
}

function renderProfileStats() {
  if (!$('#ps-mine') || !state.articles) return;
  const pub = publishedArticles();
  const sched = scheduledArticles().length;
  const me = (state.profile && state.profile.name) || '';
  $('#ps-mine').textContent = me ? pub.filter(a => authorKey(a.author) === authorKey(me)).length : pub.length;
  $('#ps-sched').textContent = sched;
  const b = $('#pa-sched'); b.hidden = !sched; b.textContent = sched;
}

/*@staff-removed*/
/* ---------- Akcje (przyciski z data-action) ---------- */
async function sendPushManual(id, btn) {
  if (!canManage()) return;
  const a = (state.articles || []).find(x => x.id === id);
  const t = a && a.title ? `„${a.title}”` : 'ten wpis';
  if (!confirm(`Wysłać powiadomienie push o: ${t} do wszystkich subskrybentów?`)) return;
  if (btn) btn.disabled = true;
  try {
    const d = await adminApi('/push/send', { method: 'POST', body: JSON.stringify({ id }) });
    toast(d.more ? 'Powiadomienie wysyłane – reszta urządzeń w ciągu minuty.' : `Powiadomienie wysłane (${d.sent || 0} urządzeń).`);
  } catch (err) {
    toast(err.message, 'error');
  }
  if (btn) setTimeout(() => { btn.disabled = false; }, 3000);
}

function handleAction(action, id, btn) {
  if (action === 'save') {
    const now = Saved.toggle(id);
    if (now === null) return;
    toast(now ? 'Zapisano na później.' : 'Usunięto z zapisanych.');
    const r = currentRoute();
    if (r.name === 'saved') renderSaved(); else if (r.name === 'article') renderArticleView(r.id);
    return;
  }
  if (action === 'toggle-new') { state.onlyNew = !state.onlyNew; state.visible = CONFIG.PAGE_SIZE; renderHome(); return; }
  if (action === 'share-image') { shareImage(id, document.activeElement && document.activeElement.dataset && document.activeElement.dataset.action === 'share-image' ? document.activeElement : null); return; }
  if (action === 'report-error') { openReportModal(id); return; }
  if (action === 'quick-share') { shareQuick(id); return; }
  if (action === 'plus-open') { openModal('plus-modal'); return; }
  if (action === 'quick-story') { shareQuickStory(id, btn); return; }
  if (action === 'quick-more') { state.quickVisible = (state.quickVisible || 30) + 30; renderQuick(); return; }
  if (action === 'share') { shareArticle(id); return; }
  if (action === 'ig-post') { openIgModal(id); return; }
  if (action === 'copy-link') { copyLink(id); return; }
  if (action === 'clear-search') {
    state.query = '';
    $('#search-input').value = '';
    goHomeAndRender();
    return;
  }
  if (!Auth.isAdmin()) return;
  if (action === 'delete-tip') { deleteTip(id); return; }
  if (action === 'tip-status') { openTipStatus(id); return; }
  if (action === 'tip-quick') { quickTipStatus(id, btn.dataset.st); return; }
  if (action === 'quick-new') { openQuickModal(); return; }
  if (action === 'quick-edit') { openQuickModal(id); return; }
  if (action === 'quick-delete') { deleteQuick(id); return; }
  if (action === 'push-send') { sendPushManual(id, btn); return; }
  if (action === 'edit') location.hash = '#/edytor/' + encodeURIComponent(id);
  else if (action === 'delete') openRemoveModal(id);
  else if (action === 'delete-draft') deleteDraft(id);
  else if (action === 'publish-now') publishNow(id);
}

/* ---------- Zdarzenia ---------- */
function bindEvents() {
  // Zastępcze zdjęcie dla zepsutych linków
  document.addEventListener('error', e => {
    const t = e.target;
    if (t.tagName === 'IMG' && !t.dataset.fallback && t.dataset.cat) {
      t.dataset.fallback = '1';
      t.src = Utils.placeholder(t.dataset.cat);
    }
  }, true);

  // Logo i „Home” – reset filtrów
  [$('#logo'), $('#nav-home')].forEach(el => el.addEventListener('click', () => {
    state.category = ALL;
    state.query = '';
    state.visible = CONFIG.PAGE_SIZE;
    $('#search-input').value = '';
    updateCategoryNav();
    if (currentRoute().name === 'home') renderHome();
    // Na stronie głównej adres się nie zmienia, więc samo nic nie przewinie – wracamy na górę ręcznie.
    // W innych widokach przewija route() po zmianie adresu (dwa równoległe przewinięcia psuły rysowanie w Safari).
    if (currentRoute().name === 'home' && (!location.hash || location.hash === '#/')) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }));

  // Podpowiedzi pod wyszukiwarką
  {
    const si = $('#search-input'), sg = $('#search-suggest');
    let cur = -1;
    const items = () => $$('.sg-item', sg);
    const mark = () => items().forEach((b, i) => b.classList.toggle('is-active', i === cur));
    si.addEventListener('input', () => { cur = -1; renderSearchSuggest(); });
    si.addEventListener('focus', () => renderSearchSuggest());
    si.addEventListener('keydown', e => {
      if (e.key === 'Escape') { hideSearchSuggest(); return; }
      if (sg.hidden) return;
      const n = items().length;
      if (e.key === 'ArrowDown') { e.preventDefault(); cur = (cur + 1) % n; mark(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); cur = (cur - 1 + n) % n; mark(); }
      else if (e.key === 'Enter' && cur >= 0) { e.preventDefault(); items()[cur].click(); }
    });
    sg.addEventListener('mousedown', e => e.preventDefault());
    sg.addEventListener('click', e => {
      const b = e.target.closest('.sg-item');
      if (!b) return;
      hideSearchSuggest();
      state.query = '';
      si.value = '';
      si.blur();
      location.hash = b.dataset.href;
    });
    document.addEventListener('click', e => { if (!e.target.closest('#search-box')) hideSearchSuggest(); });
  }
  $('#report-form').addEventListener('submit', submitReport);
  $('#quick-form').addEventListener('submit', submitQuick);
  $('#qk-delete').addEventListener('click', () => { if (state.quickId) deleteQuick(state.quickId); });
  $('#qk-text').addEventListener('input', e => { $('#qk-count').textContent = e.target.value.length; });

  // Wyszukiwarka na żywo
  $('#search-input').addEventListener('input', Utils.debounce(e => {
    state.query = e.target.value;
    goHomeAndRender();
  }, 150));

  // Filtry kategorii
  $('#category-nav').addEventListener('click', e => {
    const btn = e.target.closest('.chip-btn');
    if (!btn) return;
    const target = btn.dataset.category === ALL ? '#/' : '#/kategoria/' + encodeURIComponent(btn.dataset.category);
    state.visible = CONFIG.PAGE_SIZE;
    if (location.hash === target || (target === '#/' && !location.hash)) {
      state.category = btn.dataset.category;
      updateCategoryNav();
      renderHome();
      renderSideList();
    } else {
      location.hash = target;
    }
  });

  $('#btn-load-more').addEventListener('click', () => {
    state.visible += CONFIG.PAGE_SIZE;
    renderHome();
  });

  // Akcje (Edytuj / Usuń / Udostępnij …) + kliknięcie w cały kafel
  document.addEventListener('click', e => {
    const actionBtn = e.target.closest('[data-action]');
    if (actionBtn) {
      e.preventDefault();
      e.stopPropagation();
      handleAction(actionBtn.dataset.action, actionBtn.dataset.id, actionBtn);
      return;
    }
    const tile = e.target.closest('.card, .hero, .tile, .side-item');
    if (tile && !e.target.closest('a, button')) {
      location.hash = '#/artykul/' + encodeURIComponent(tile.dataset.id);
    }
  });

  // Przyciski nawigacji
  $('#btn-rd-account').addEventListener('click', () => { location.hash = '#/konto'; });
  $('#btn-rd-mod').addEventListener('click', () => { if (Auth.isAdmin()) goPanelTab('comments'); else location.hash = '#/konto/komentarze'; });
  $('#btn-rd-users').addEventListener('click', () => { if (Auth.isAdmin()) goPanelTab('users'); else location.hash = '#/konto/uzytkownicy'; });
  $('#btn-logout').addEventListener('click', async () => {
    if (!Auth.isAdmin() && Readers.loggedIn()) { await Readers.logout(); location.hash = '#/'; toast('Wylogowano.'); return; }
    await Auth.logout();
    if (Readers.loggedIn()) { try { await Readers.logout(); } catch { /* ignoruj */ } }
    if (['editor', 'panel', 'settings'].includes(currentRoute().name)) location.hash = '#/';
    applyAuthUI();
    toast('Wylogowano.');
  });
  $('#btn-new').addEventListener('click', () => { location.hash = '#/edytor'; });
  $('#panel-new').addEventListener('click', () => { location.hash = '#/edytor'; });
  $('#btn-push').addEventListener('click', togglePush);
  updatePushButton();
  $('#push-ask-yes').addEventListener('click', pushAskYes);
  setTimeout(maybeAskPush, 2500);
  $('#view-panel').addEventListener('click', e => {
    const b = e.target.closest('[data-ptab]'); if (b) setPanelTab(b.dataset.ptab);
    const f = e.target.closest('[data-tipfilter]'); if (f) { tipFilter = f.dataset.tipfilter; renderTipList(); }
    const kd = e.target.closest('[data-tipkind]'); if (kd) { tipKindFilter = kd.dataset.tipkind; renderTipList(); }
  });
  $('#tip-status-form').addEventListener('submit', saveTipStatus);
  $('#view-panel').addEventListener('input', e => { if (e.target.id === 'tip-search') { tipQuery = e.target.value; renderTipList(); } });
  $('#tip-status-form').addEventListener('change', updateTipStatusForm);
  const adsOff = $('#st-ads-off');
  if (adsOff) {
    try { adsOff.checked = localStorage.getItem('sliska_ads_off') === '1'; } catch { /* ignoruj */ }
    adsOff.addEventListener('change', () => {
      try { localStorage.setItem('sliska_ads_off', adsOff.checked ? '1' : '0'); } catch { /* ignoruj */ }
      window.dispatchEvent(new Event('sliska:ads'));
      toast(adsOff.checked ? 'Reklamy wyłączone na tym urządzeniu.' : 'Reklamy włączone.');
    });
  }
  $('#st-device-push').addEventListener('change', async e => {
    const on = e.target.checked; e.target.disabled = true;
    try { if (on) { await Push.enable(); toast('Powiadomienia włączone na tym urządzeniu.'); } else { await Push.disable(); toast('Powiadomienia wyłączone.'); } }
    catch (err) { toast(err.message || 'Nie udało się zmienić powiadomień.', 'error'); }
    finally { updateDevicePush(); updatePushButton(); }
  });
  $('#st-test-push').addEventListener('click', testPush);
  $('#btn-panel').addEventListener('click', () => { location.hash = '#/panel'; });
  $('#btn-settings').addEventListener('click', () => { location.hash = '#/ustawienia'; });

  // Ustawienia konta
  $('#settings-form').addEventListener('submit', saveSettings);
  ['#st-first', '#st-last'].forEach(s => $(s).addEventListener('input', () => { syncAuthorName(); updateSettingsAvatar(); }));
  $('#st-avatar-file').addEventListener('change', async e => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      settingsAvatar = await Utils.fileToSquare(file);
      updateSettingsAvatar();
    } catch (err) {
      $('#st-error').textContent = err.message;
      $('#st-error').hidden = false;
      e.target.value = '';
    }
  });
  $('#st-avatar-remove').addEventListener('click', () => { settingsAvatar = ''; $('#st-avatar-file').value = ''; updateSettingsAvatar(); });

  // Cytat (modal)
  $('#quote-form').addEventListener('submit', submitQuote);
  $('#quote-form').addEventListener('click', e => { const b = e.target.closest('[data-qm]'); if (b) qmAction(b.dataset.qm); });
  $('#qm-delete').addEventListener('click', deleteQuote);
  $('#embed-form').addEventListener('submit', submitEmbed);
  $('#em-delete').addEventListener('click', deleteEmbed);

  // Przewijany pasek PILNE – dopasowanie po zmianie rozmiaru okna
  window.addEventListener('resize', Utils.debounce(fitTicker, 150));
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitTicker);

  // Zamykanie modali
  $$('[data-close]').forEach(b => b.addEventListener('click', () => closeModal(b.dataset.close)));
  $$('.modal').forEach(m => m.addEventListener('mousedown', e => {
    if (e.target === m) closeModal(m.id);
  }));
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') $$('.modal').filter(m => !m.hidden).forEach(m => closeModal(m.id));
    // Ctrl+S / Cmd+S – zapis wersji roboczej
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's' && editor.active) {
      e.preventDefault();
      manualSaveDraft();
    }
  });

  // Formularz edytora
  const form = $('#editor-form');
  form.addEventListener('submit', saveArticle);
  form.addEventListener('input', () => { updateCounters(); updateChecklist(); onFormChange(); });
  form.addEventListener('change', () => { updateChecklist(); onFormChange(); });

  $('#editor-cancel').addEventListener('click', () => {
    location.hash = editor.articleId ? '#/artykul/' + encodeURIComponent(editor.articleId) : '#/panel';
  });
  $('#btn-save-draft').addEventListener('click', manualSaveDraft);
  $('#btn-preview').addEventListener('click', openPreview);
  $('#install-link').addEventListener('click', e => { e.preventDefault(); installApp(); });
  $$('[data-pv]').forEach(b => b.addEventListener('click', () => {
    $$('[data-pv]').forEach(x => x.classList.toggle('active', x === b));
    $('#preview-body').classList.toggle('pv-phone', b.dataset.pv === 'phone');
  }));
  $('#btn-focus').addEventListener('click', () => {
    const on = form.classList.toggle('focus-mode');
    $('#btn-focus').textContent = on ? 'Pokaż panel' : 'Tryb pisania';
  });
  $('#banner-discard').addEventListener('click', discardRestored);

  $('#f-schedule-on').addEventListener('change', updatePublishUi);
  $('#f-review-on').addEventListener('change', updateReviewUi);
  $('#f-review-cover-same').addEventListener('change', updateReviewUi);
  $('#f-review-cover-url').addEventListener('input', e => {
    const v = e.target.value.trim();
    editor.cover = v;
    const box = $('#f-review-cover-preview');
    box.hidden = !v;
    if (v) $('img', box).src = v;
  });
  $('#f-review-cover-file').addEventListener('change', async e => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      setCover(await Utils.fileToDataUrl(file, 800, 150));
      onFormChange();
      if (imageNote()) toast('Okładka dodana.' + imageNote());
    } catch (err) {
      toast(err.message, 'error');
      e.target.value = '';
    }
  });
  $('#f-review-cover-remove').addEventListener('click', () => { setCover(''); onFormChange(); });
  $('#f-review-score').addEventListener('blur', e => {
    const n = Utils.parseScore(e.target.value);
    if (n !== null) e.target.value = Utils.formatScore(n);
  });

  // Zdjęcie główne
  $('#f-image-url').addEventListener('input', e => {
    const v = e.target.value.trim();
    editor.image = v;
    const box = $('#f-image-preview');
    box.hidden = !v;
    editor.pos = defaultPos();
    if (v) $('#f-crop img').src = v;
    applyCrop();
  });
  initCropper();
  $('#f-image-file').addEventListener('change', async e => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      setMainImage(await Utils.fileToDataUrl(file, 1600, 300));
      onFormChange();
      if (imageNote()) toast('Zdjęcie dodane.' + imageNote());
    } catch (err) {
      toast(err.message, 'error');
      e.target.value = '';
    }
  });
  $('#f-image-remove').addEventListener('click', () => { setMainImage(''); onFormChange(); });

  // Zdjęcie w treści (modal)
  $('#image-form').addEventListener('submit', insertImageIntoEditor);
  $('#im-delete').addEventListener('click', deleteFigure);
  $('#im-url').addEventListener('input', e => {
    const v = e.target.value.trim();
    $('#im-file').value = '';
    setModalImage(v);
  });
  $('#im-file').addEventListener('change', async e => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      $('#im-url').value = '';
      setModalImage(await Utils.fileToDataUrl(file, 1400, 220));
      if (imageNote()) toast('Zdjęcie przygotowane.' + imageNote());
    } catch (err) {
      $('#im-error').textContent = err.message;
      $('#im-error').hidden = false;
      e.target.value = '';
    }
  });

  // Ochrona pracy przy przypadkowym wyjściu ze strony / zamknięciu karty / przełączeniu aplikacji
  const flush = () => { if (editor.active && editor.dirty) writeBuffer(); };
  window.addEventListener('beforeunload', flush);
  window.addEventListener('pagehide', flush);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      flush();
      if (editor.active && editor.dirty) saveCloudDraft(false);
    } else {
      // powrót na kartę: odśwież dane, ale zostań w tym samym miejscu strony
      const x = window.scrollX, y = window.scrollY;
      refreshViews();
      if (y > 0) {
        const back = () => { if (Math.abs(window.scrollY - y) > 4) window.scrollTo({ left: x, top: y, behavior: 'instant' }); };
        back();
        requestAnimationFrame(back);
        setTimeout(back, 150);
        setTimeout(back, 600);
      }
    }
  });

  window.addEventListener('hashchange', route);

  // Ranking: filtry rodzaju i roku
  $('#view-ranking').addEventListener('click', e => {
    const b = e.target.closest('[data-rank-kind]');
    if (!b) return;
    state.rank.kind = b.dataset.rankKind;
    renderRanking();
  });
  $('#view-ranking').addEventListener('change', e => {
    if (e.target.id !== 'rank-year') return;
    state.rank.year = e.target.value;
    renderRanking();
  });

  // Zgłoszenia: formularz jest rysowany dynamicznie
  $('#view-tip').addEventListener('submit', e => { if (e.target.id === 'tip-form') submitTip(e); });
  $('#view-tip').addEventListener('input', e => { if (e.target.id === 'tip-message') $('#tip-count').textContent = e.target.value.length; });

  $('#remove-draft').addEventListener('click', () => { const id = removeTarget; closeModal('remove-modal'); unpublishToDraft(id); });
  $('#remove-forever').addEventListener('click', () => { const id = removeTarget; closeModal('remove-modal'); deleteArticle(id); });
  // Podpowiedzi tagów: domyślnie zwinięte, wybór zapamiętany
  try { $('#tag-fold').open = localStorage.getItem('sliska_tagfold') === '1'; } catch { /* ignoruj */ }
  ['fold-ready', 'fold-publish', 'fold-settings', 'fold-image'].forEach(id => {
    const d = document.getElementById(id);
    if (!d) return;
    try { if (localStorage.getItem('sliska_' + id) === '0') d.open = false; } catch { /* ignoruj */ }
    d.addEventListener('toggle', () => { try { localStorage.setItem('sliska_' + id, d.open ? '1' : '0'); } catch { /* ignoruj */ } });
  });
  $('#tag-fold').addEventListener('toggle', () => { try { localStorage.setItem('sliska_tagfold', $('#tag-fold').open ? '1' : '0'); } catch { /* ignoruj */ } });

  // Przeciągnij i upuść plik na pole zdjęcia
  [['#main-drop', '#f-image-file'], ['#cover-drop', '#f-review-cover-file'], ['#im-drop', '#im-file']].forEach(([zone, input]) => {
    const z = $(zone);
    z.addEventListener('dragover', e => { if (e.dataTransfer && [...e.dataTransfer.types].includes('Files')) { e.preventDefault(); z.classList.add('is-over'); } });
    z.addEventListener('dragleave', () => z.classList.remove('is-over'));
    z.addEventListener('drop', e => {
      z.classList.remove('is-over');
      const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (!f || !f.type.startsWith('image/')) return;
      e.preventDefault();
      const dt = new DataTransfer();
      dt.items.add(f);
      $(input).files = dt.files;
      $(input).dispatchEvent(new Event('change', { bubbles: true }));
    });
  });

  // Płynne przechodzenie przy pisaniu: Enter w tytule → lead → treść; lead rośnie razem z tekstem
  $('#f-title').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); $('#f-lead').focus(); } });
  $('#f-lead').addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); if (editor.quill) editor.quill.focus(); }
  });
  const growLead = () => { const t = $('#f-lead'); t.style.height = 'auto'; t.style.height = Math.min(t.scrollHeight + 2, 260) + 'px'; };
  $('#f-lead').addEventListener('input', growLead);
  window.growLead = growLead;

  // Galeria, „Zobacz też”, okno grafiki na Instagram
  $('#gallery-form').addEventListener('submit', submitGallery);
  $('#gal-delete').addEventListener('click', deleteGallery);
  $('#gal-add-url').addEventListener('click', addGalleryUrl);
  $('#gal-url').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); addGalleryUrl(); } });
  $('#gal-file').addEventListener('change', e => addGalleryFiles(e.target.files));
  $('#gal-items').addEventListener('click', e => {
    const b = e.target.closest('[data-gal]');
    if (!b) return;
    const i = Number(b.closest('.gal-item').dataset.i);
    const items = editor.gallery.items;
    if (b.dataset.gal === 'del') items.splice(i, 1);
    else if (b.dataset.gal === 'left' && i > 0) [items[i - 1], items[i]] = [items[i], items[i - 1]];
    else if (b.dataset.gal === 'right' && i < items.length - 1) [items[i + 1], items[i]] = [items[i], items[i + 1]];
    renderGalleryItems();
  });
  {
    const z = $('#gal-drop');
    z.addEventListener('dragover', e => { if (e.dataTransfer && [...e.dataTransfer.types].includes('Files')) { e.preventDefault(); z.classList.add('is-over'); } });
    z.addEventListener('dragleave', () => z.classList.remove('is-over'));
    z.addEventListener('drop', e => { z.classList.remove('is-over'); if (e.dataTransfer && e.dataTransfer.files.length) { e.preventDefault(); addGalleryFiles(e.dataTransfer.files); } });
  }
  document.addEventListener('click', galleryClick);

  $('#f-status').addEventListener('change', onFormChange);
  $('#rel-search').addEventListener('input', renderRelatedPicker);
  $('#fold-related').addEventListener('click', e => {
    const add = e.target.closest('[data-rel-add]');
    const del = e.target.closest('[data-rel-del]');
    if (add && editor.related.length < 3) { editor.related.push(add.dataset.relAdd); $('#rel-search').value = ''; }
    else if (del) editor.related = editor.related.filter(id => id !== del.dataset.relDel);
    else return;
    renderRelatedPicker();
    onFormChange();
  });

  $$('input[name="ig-format"]').forEach(r => r.addEventListener('change', updateIgUi));
  $('#ig-slide-grid').addEventListener('click', e => {
    const tg = e.target.closest('.ig-bgtoggle');
    if (tg) {
      e.stopPropagation(); e.preventDefault();
      const kk = tg.dataset.bg, at = editor.igBgKinds.indexOf(kk);
      if (at >= 0) editor.igBgKinds.splice(at, 1); else editor.igBgKinds.push(kk);
      refreshIgGrid(); return;
    }
    const b = e.target.closest('.ig-slide');
    if (!b || b.disabled) return;
    const k = b.dataset.slide, i = editor.igPick.indexOf(k);
    if (i >= 0) editor.igPick.splice(i, 1); else editor.igPick.push(k);
    $('#ig-error').hidden = true;
    refreshIgGrid();
  });
  $('#ig-photo-list').addEventListener('click', e => {
    const b = e.target.closest('.ig-photo'); if (!b) return;
    const i = Number(b.dataset.i);
    editor.igPhoto = i === 0 ? '' : (editor.igImages[i] || '');
    $$('.ig-photo', $('#ig-photo-list')).forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    igThumbCache.clear();
    if (igFormat() === 'carousel') refreshIgGrid();
  });
  $('#ig-bgmode').addEventListener('change', () => { $('#ig-grid-hint').hidden = igBgMode() !== 'pick'; if (igFormat() === 'carousel') refreshIgGrid(); });
  $('#ig-quote-pick').addEventListener('change', () => {
    const q = editor.igQuotes[Number($('#ig-quote-pick').value)];
    if (q) { $('#ig-quote-text').value = q.text; $('#ig-quote-author').value = q.author; }
  });
  $('#ig-form').addEventListener('submit', e => {
    e.preventDefault();
    const format = igFormat();
    const quote = { text: $('#ig-quote-text').value.trim(), author: $('#ig-quote-author').value.trim() };
    if (format === 'quote' && !quote.text) { $('#ig-error').textContent = 'Wpisz lub wybierz cytat.'; $('#ig-error').hidden = false; return; }
    try { localStorage.setItem('sliska_igformat', format); } catch { /* ignoruj */ }
    if (format === 'carousel' && !editor.igPick.length) { $('#ig-error').textContent = 'Kliknij slajdy, które chcesz mieć w karuzeli.'; $('#ig-error').hidden = false; return; }
    makeInstagramPost(editor.igId, $('#ig-submit'), { format, quote, summary: $('#ig-summary').value.trim(), slides: format === 'carousel' ? [...editor.igPick] : undefined, photo: editor.igPhoto || '', bgMode: format === 'carousel' ? igBgMode() : 'none', bgKinds: [...(editor.igBgKinds || [])] });
  });

  $('#tag-chips').addEventListener('click', e => {
    if (e.target.closest('[data-tag-more]')) { moreTags = !moreTags; renderTagChips(); return; }
    if (e.target.closest('[data-tag-all]')) {
      const cur = Utils.parseTags($('#f-tags').value);
      suggestedTags().forEach(t => { if (!cur.some(x => Utils.same(x, t))) cur.push(t); });
      $('#f-tags').value = cur.slice(0, 12).join(', ');
      renderTagChips();
      onFormChange();
      return;
    }
    const b = e.target.closest('[data-tag]');
    if (b) toggleTag(b.dataset.tag);
  });
  $('#backup-export').addEventListener('click', exportBackup);
  $('#og-refresh').addEventListener('click', e => refreshAllOg(e.currentTarget));
  $('#backup-import').addEventListener('click', () => $('#backup-file').click());
  $('#backup-file').addEventListener('change', async e => {
    await importBackup(e.target.files[0]);
    e.target.value = '';
  });

  // Motyw jasny/ciemny
  $('#btn-theme').addEventListener('click', Theme.toggle);

  // Pasek postępu czytania i przycisk „do góry”
  window.addEventListener('scroll', updateScrollUi, { passive: true });
  $('#to-top').addEventListener('click', () => window.scrollTo({ top: 0 }));

  // Link „Przejdź do treści” (hash jest zajęty przez router, więc bez zmiany adresu)
  $('#skip-link').addEventListener('click', e => {
    e.preventDefault();
    const app = $('#app');
    app.setAttribute('tabindex', '-1');
    app.focus();
  });

  // „← Powrót do strony głównej” w artykule: jeśli przyszliśmy z listy, cofnij historię (wracamy w to samo miejsce)
  document.addEventListener('click', e => {
    const a = e.target.closest && e.target.closest('.article-top a[href="#/"]');
    if (!a || e.ctrlKey || e.metaKey || e.shiftKey || e.button) return;
    if (history.length > 1 && LIST_ROUTES.test(ScrollMemory.prev || '') ) { e.preventDefault(); history.back(); }
  });

  // „← Wróć do artykułu” na profilu redaktora / wykonawcy / użytkownika: cofnięcie historii zachowuje miejsce w artykule
  document.addEventListener('click', e => {
    const a = e.target.closest && e.target.closest('[data-smartback]');
    if (!a || e.ctrlKey || e.metaKey || e.shiftKey || e.button) return;
    if (history.length > 1) { e.preventDefault(); history.back(); }
  });

  // Skrót: „/” ustawia kursor w wyszukiwarce
  document.addEventListener('keydown', e => {
    if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey) return;
    const t = e.target;
    if (t.matches && t.matches('input, textarea, select, [contenteditable="true"]')) return;
    if ($$('.modal').some(m => !m.hidden) || !$('#view-home').offsetParent && currentRoute().name === 'editor') return;
    e.preventDefault();
    $('#search-input').focus();
  });
}

const Theme = {
  isDark() {
    const t = document.documentElement.getAttribute('data-theme');
    return t ? t === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
  },
  toggle() {
    const next = Theme.isDark() ? 'light' : 'dark';
    const system = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    const root = document.documentElement;
    try {
      if (next === system) {      // wybór zgodny z systemem = wracamy do automatycznego
        root.removeAttribute('data-theme');
        localStorage.removeItem('sliska_theme');
      } else {
        root.setAttribute('data-theme', next);
        localStorage.setItem('sliska_theme', next);
      }
    } catch { root.setAttribute('data-theme', next); }
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = Theme.isDark() ? '#121212' : '#d6001c';
  }
};

function setMeta(title, description) {
  const desc = description || 'Śliska News – wiadomości z muzyki, kontrowersji i dram. Codziennie najświeższe informacje.';
  const set = (sel, val) => { const m = document.querySelector(sel); if (m) m.setAttribute('content', val); };
  set('meta[name="description"]', desc.slice(0, 200));
  set('meta[property="og:title"]', title ? `${title} – ${CONFIG.SITE_NAME}` : CONFIG.SITE_NAME);
  set('meta[property="og:description"]', desc.slice(0, 200));
}

function updateScrollUi() {
  const y = window.scrollY || document.documentElement.scrollTop || 0;
  $('#to-top').hidden = y < 600;
  const bar = $('#read-progress');
  const isArticle = currentRoute().name === 'article';
  bar.hidden = !isArticle;
  if (isArticle) {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.width = (max > 0 ? Math.min(100, (y / max) * 100) : 0) + '%';
  }
}

async function manualSaveDraft() {
  if (!editor.active) return;
  writeBuffer();
  const ok = await saveCloudDraft(true);
  if (ok) toast('Wersja robocza zapisana.');
  else if (!isEmptyData(collectData())) toast('Nie udało się zapisać w bazie – kopia jest w tej przeglądarce.', 'error');
}

/* ---------- Start ---------- */
async function main() {
  $('#year').textContent = new Date().getFullYear();
  updateInstallLink();
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
  renderCatPicker([]);
  buildCategoryNav();
  bindEvents();
  bindReaderEvents();
  document.body.classList.toggle('is-admin', Auth.isAdmin());

  await DataService.init();
  Auth.mode = 'offline';
  $('#login-email-field').hidden = Auth.mode !== 'firebase';
  document.body.classList.toggle('is-admin', Auth.isAdmin());

  if (DataService.mode === 'offline') state.loadError = true;

  try {
    // Jeden nasłuch: pierwsza lista wraca tutaj, kolejne zmiany trafiają do funkcji poniżej
    setArticles(await DataService.watch(list => {
      setArticles(list);
      refreshViews();
    }));
  } catch (err) {
    console.error(err);
    state.loadError = true;
    state.loadErrCode = (err && (err.code || err.message)) || 'błąd';
  }
  state.ready = true;
  if (Auth.isAdmin()) loadProfile();
  Auth.onChange(() => applyAuthUI());
  Readers.init();

  // Informacja o trybie danych widoczna tylko dla zalogowanej redakcji
  $('#data-mode').textContent = DataService.mode === 'firebase'
    ? 'Baza danych: Firebase Firestore'
    : DataService.mode === 'local'
      ? 'Tryb demonstracyjny: dane tylko w tej przeglądarce'
      : 'Brak połączenia z bazą danych';

  renderBreaking();
  initRail();
  initStickyVars();
  route();

  // Zaplanowane artykuły pojawiają się same, gdy nadejdzie ich czas
  setInterval(() => {
    const now = Date.now();
    const crossed = state.articles.some(a => {
      const t = Date.parse(a.createdAt);
      return t > state.lastTick && t <= now;
    });
    state.lastTick = now;
    if (crossed) refreshViews();
  }, 15000);
}

/** Wysokości przyklejonych pasków (nagłówek, tytuł edytora) → zmienne CSS, żeby pasek formatowania
 *  w edytorze zawsze zatrzymywał się dokładnie pod nimi i nie znikał podczas przewijania. */

/* ---------- Pasek boczny (komputer): zwijanie do ikon, profil jako avatar z okienkiem ---------- */
function initRail() {
  const top = $('.site-header .header-top'), auth = $('.site-header .auth'), logo = $('#logo');
  if (!top || !auth || !logo || $('#rail-toggle') || document.documentElement.classList.contains('is-mac-app')) return;
  document.documentElement.classList.add('rail-on');
  try { if (localStorage.getItem('sliska_rail') === 'c') document.body.classList.add('rail-c'); } catch { /* ignoruj */ }
  logo.insertAdjacentHTML('beforeend', '<img class="logo-mini" src="favicon.svg" alt="" aria-hidden="true">');
  $$('.main-nav .nav-link').forEach(a => { a.title = a.textContent.trim(); });
  const t = document.createElement('button'); t.type = 'button'; t.id = 'rail-toggle'; t.className = 'rail-toggle';
  t.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 6-6 6 6 6"/></svg><span>Zwiń menu</span>';
  const label = () => { const c = document.body.classList.contains('rail-c'); t.title = c ? 'Rozwiń menu' : 'Zwiń menu'; t.setAttribute('aria-label', t.title); };
  t.addEventListener('click', () => { const c = document.body.classList.toggle('rail-c'); try { localStorage.setItem('sliska_rail', c ? 'c' : 'e'); } catch { /* ignoruj */ } label(); });
  top.appendChild(t); label();
  /* kategorie i „Masz temat?” przenosimy na pasek (tylko szeroki ekran) */
  const nav = $('.main-nav'), cats = $('#category-nav') && $('#category-nav').closest('.side-card'), tip = $('#side-left .tip-card'), aside = $('#side-left');
  if (nav && cats && tip && aside) {
    const sc = document.createElement('div'); sc.className = 'rail-scroll';
    nav.parentNode.insertBefore(sc, nav); sc.appendChild(nav);
    const mq = matchMedia('(min-width:1100px)');
    const place = () => { if (mq.matches) { sc.append(cats, tip); } else { aside.append(cats, tip); } };
    place(); (mq.addEventListener ? mq.addEventListener('change', place) : mq.addListener(place));
  }
  const pb = document.createElement('button'); pb.type = 'button'; pb.id = 'rail-profile'; pb.className = 'rail-profile avatar'; pb.title = 'Profil'; pb.setAttribute('aria-label', 'Profil i skróty');
  auth.appendChild(pb);
  const src = $('#profile-avatar'), sync = () => { pb.innerHTML = src.innerHTML; };
  if (src) { new MutationObserver(sync).observe(src, { childList: true, subtree: true }); sync(); }
  const closePop = () => document.body.classList.remove('pp-open');
  pb.addEventListener('click', e => { e.stopPropagation(); document.body.classList.toggle('pp-open'); });
  document.addEventListener('click', e => {
    if (!document.body.classList.contains('pp-open')) return;
    if (e.target.closest('#rail-profile')) return;
    if (e.target.closest('#profile-card')) { if (e.target.closest('button, a')) setTimeout(closePop, 0); return; }
    closePop();
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closePop(); });
  window.addEventListener('hashchange', closePop);
  const si = $('#search-input');
  if (si) si.addEventListener('focus', () => { if (document.body.classList.contains('rail-c') && matchMedia('(min-width:1100px)').matches) { document.body.classList.remove('rail-c'); try { localStorage.setItem('sliska_rail', 'e'); } catch { /* ignoruj */ } label(); } });
}

function initStickyVars() {
  const root = document.documentElement;
  const header = $('.site-header');
  const head = $('.editor-head');
  const update = () => {
    root.style.setProperty('--hdr-h', (matchMedia('(min-width:1100px)').matches ? 0 : Math.round(header ? header.getBoundingClientRect().height : 64)) + 'px');
    root.style.setProperty('--edhead-h', Math.round(head ? head.getBoundingClientRect().height : 0) + 'px');
  };
  update();
  window.addEventListener('resize', update);
  window.addEventListener('hashchange', () => requestAnimationFrame(update));
  if (window.ResizeObserver) {
    const ro = new ResizeObserver(update);
    if (header) ro.observe(header);
    if (head) ro.observe(head);
  }
}

document.addEventListener('DOMContentLoaded', main);
