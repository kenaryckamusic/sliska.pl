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
    CONTACT_EMAIL: 'sliska10@wp.pl',
    UPDATED: '30 października 2026'
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

  chipsHtml(a) {
    return '<span class="chips">' + this.catsOf(a).map(c =>
      `<a class="chip" href="#/kategoria/${encodeURIComponent(c)}">${this.esc(c)}</a>`).join('') + '</span>';
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

  /** Zdjęcie profilowe: kadruje do kwadratu i zmniejsza (mały rozmiar zapisu). */
  async fileToSquare(file, size = 160) {
    const raw = await this.fileToDataUrl(file, 1200, 600);
    const img = await new Promise((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error('Nie udało się wczytać obrazu.'));
      i.src = raw;
    });
    const side = Math.min(img.naturalWidth, img.naturalHeight);
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    canvas.getContext('2d').drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, size, size);
    return canvas.toDataURL('image/jpeg', 0.82);
  },

  placeholder(category) {
    const hues = { 'Muzyka': 265, 'Kontrowersje': 8, 'Dramy': 330, 'Recenzje': 45, 'Inne': 205 };
    const hue = hues[category] ?? 200;
    // Bez napisu na obrazku (kategoria jest już w chipie) – tylko gradient i delikatny wzór
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">` +
      `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
      `<stop offset="0" stop-color="hsl(${hue},58%,38%)"/><stop offset="1" stop-color="hsl(${hue + 40},62%,16%)"/>` +
      `</linearGradient><pattern id="p" width="48" height="48" patternUnits="userSpaceOnUse" patternTransform="rotate(30)">` +
      `<rect width="2" height="48" fill="rgba(255,255,255,.05)"/></pattern></defs>` +
      `<rect width="1280" height="720" fill="url(#g)"/><rect width="1280" height="720" fill="url(#p)"/>` +
      `<circle cx="1060" cy="140" r="260" fill="rgba(255,255,255,.06)"/></svg>`;
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
      infobox: [
        { label: 'Rodzaj', value: 'Artykuł demonstracyjny' },
        { label: 'Edytor', value: 'Quill.js (WYSIWYG)' },
        { label: 'Źródło', value: 'Redakcja' }
      ],
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
      infobox: [],
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
      infobox: [{ label: 'Miejsce', value: 'Polska' }],
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
      infobox: [],
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
function readLocalProfile() {
  try { return JSON.parse(localStorage.getItem(PROFILE_KEY)); } catch { return null; }
}
function writeLocalProfile(p) {
  try { localStorage.setItem(PROFILE_KEY, JSON.stringify(p)); } catch { /* ignoruj */ }
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

  async save(article) {
    const list = this._get(CONFIG.LOCAL_KEY);
    const idx = list.findIndex(a => a.id === article.id);
    if (idx >= 0) list[idx] = article; else list.push(article);
    this._set(CONFIG.LOCAL_KEY, list);
    this._emit();
  },

  async remove(id) {
    this._set(CONFIG.LOCAL_KEY, this._get(CONFIG.LOCAL_KEY).filter(a => a.id !== id));
    this._emit();
  },

  async getProfile() { return readLocalProfile(); },
  async saveProfile(p) { writeLocalProfile(p); },

  async getAllArticles() { return this._get(CONFIG.LOCAL_KEY); },

  async addTip(tip) {
    const list = this._get(CONFIG.LOCAL_TIPS_KEY);
    list.push(tip);
    this._set(CONFIG.LOCAL_TIPS_KEY, list);
  },
  async getTips() {
    return this._get(CONFIG.LOCAL_TIPS_KEY).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  },
  async removeTip(id) {
    this._set(CONFIG.LOCAL_TIPS_KEY, this._get(CONFIG.LOCAL_TIPS_KEY).filter(t => t.id !== id));
  },

  async getDrafts() {
    return this._get(CONFIG.LOCAL_DRAFTS_KEY).sort((a, b) => String(b.savedAt).localeCompare(String(a.savedAt)));
  },

  async getDraft(id) {
    return this._get(CONFIG.LOCAL_DRAFTS_KEY).find(d => d.id === id) || null;
  },

  async saveDraft(draft) {
    const list = this._get(CONFIG.LOCAL_DRAFTS_KEY);
    const idx = list.findIndex(d => d.id === draft.id);
    if (idx >= 0) list[idx] = draft; else list.push(draft);
    this._set(CONFIG.LOCAL_DRAFTS_KEY, list);
  },

  async removeDraft(id) {
    this._set(CONFIG.LOCAL_DRAFTS_KEY, this._get(CONFIG.LOCAL_DRAFTS_KEY).filter(d => d.id !== id));
  },

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
    await Utils.loadScript(`https://www.gstatic.com/firebasejs/${v}/firebase-auth-compat.js`);
    await Utils.loadScript(`https://www.gstatic.com/firebasejs/${v}/firebase-firestore-compat.js`);

    if (!firebase.apps.length) firebase.initializeApp(cfg);
    this.db = firebase.firestore();
    this.auth = firebase.auth();

    // Sesja logowania trwa tylko tak długo, jak karta przeglądarki
    try {
      await this.auth.setPersistence(firebase.auth.Auth.Persistence.SESSION);
    } catch (e) {
      console.warn('Nie udało się ustawić trwałości sesji logowania:', e.code || e);
    }

    // Poczekaj, aż Firebase ustali, czy ktoś jest zalogowany (z limitem czasu)
    await Promise.race([
      new Promise(resolve => {
        const off = this.auth.onAuthStateChanged(() => { off(); resolve(); });
      }),
      new Promise(resolve => setTimeout(resolve, 4000))
    ]);
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
  async removeTip(id) {
    if (!this.auth.currentUser) throw new Error('Zaloguj się, aby usuwać zgłoszenia.');
    try { await this.db.collection(CONFIG.FIREBASE_TIPS_COLLECTION).doc(id).delete(); } catch (err) { throw this._wrap(err); }
  },

  async getProfile() {
    const snap = await this.db.collection('meta').doc('profile').get();
    return snap.exists ? snap.data() : null;
  },

  async saveProfile(p) {
    if (!this.auth.currentUser) throw new Error('Zaloguj się, aby zapisać ustawienia.');
    try {
      await this.db.collection('meta').doc('profile').set(p);
    } catch (err) {
      throw this._wrap(err);
    }
  },

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
  async removeTip() { throw new Error('Brak połączenia z bazą danych.'); }
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
  getAllArticles() { return this.provider.getAllArticles(); },
  addTip(t) { return this.provider.addTip(t); },
  getTips() { return this.provider.getTips(); },
  removeTip(id) { return this.provider.removeTip(id); }
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
  mode: 'local',

  /** Identyfikator zalogowanego redaktora – wersje robocze są przypisane do niego. */
  uid() {
    if (this.mode === 'firebase') {
      const user = FirebaseProvider.auth && FirebaseProvider.auth.currentUser;
      return user ? user.uid : '';
    }
    return 'local';
  },

  get useFirebase() { return this.mode === 'firebase'; },

  isAdmin() {
    if (this.mode === 'firebase') {
      const user = FirebaseProvider.auth && FirebaseProvider.auth.currentUser;
      if (!user) return false;
      return !CONFIG.ADMIN_UID || user.uid === CONFIG.ADMIN_UID;
    }
    if (this.mode === 'offline') return false;
    try { return sessionStorage.getItem(CONFIG.SESSION_KEY) === '1'; } catch { return false; }
  },

  async login(email, password) {
    if (this.mode === 'offline') throw authError('app/offline');
    if (this.mode === 'firebase') {
      await FirebaseProvider.auth.signInWithEmailAndPassword(email, password);
      if (!this.isAdmin()) {
        await FirebaseProvider.auth.signOut();
        throw authError('app/not-editor');
      }
      return;
    }
    if (password !== CONFIG.ADMIN_PASSWORD) throw authError('app/wrong-password');
    try { sessionStorage.setItem(CONFIG.SESSION_KEY, '1'); } catch { /* ignoruj */ }
  },

  async logout() {
    if (this.mode === 'firebase') {
      try { await FirebaseProvider.auth.signOut(); } catch (e) { console.warn(e); }
      return;
    }
    try { sessionStorage.removeItem(CONFIG.SESSION_KEY); } catch { /* ignoruj */ }
  },

  // Wywołuje funkcję przy każdej zmianie stanu logowania (tylko tryb Firebase)
  onChange(cb) {
    if (this.mode === 'firebase') FirebaseProvider.auth.onAuthStateChanged(cb);
  },

  explain(err) {
    const code = (err && err.code) || '';
    switch (code) {
      case 'app/wrong-password':
        return 'Nieprawidłowe hasło.';
      case 'app/offline':
        return 'Brak połączenia z bazą danych. Spróbuj ponownie za chwilę.';
      case 'auth/invalid-credential':
      case 'auth/wrong-password':
      case 'auth/user-not-found':
        return 'Nieprawidłowy e-mail lub hasło.';
      case 'auth/invalid-email':
        return 'Nieprawidłowy adres e-mail.';
      case 'auth/missing-password':
        return 'Wpisz hasło.';
      case 'auth/too-many-requests':
        return 'Zbyt wiele prób logowania. Spróbuj ponownie za kilka minut.';
      case 'auth/operation-not-allowed':
        return 'Logowanie e-mailem nie jest włączone w Firebase (Authentication → Sign-in method).';
      case 'auth/operation-not-supported-in-this-environment':
        return 'Logowanie wymaga adresu http(s). Uruchom stronę przez lokalny serwer lub hosting, a nie przez dwuklik na plik.';
      case 'auth/network-request-failed':
        return 'Brak połączenia z internetem.';
      case 'auth/unauthorized-domain':
        return 'Ta domena nie jest dodana w Firebase (Authentication → Settings → Authorized domains).';
      case 'app/not-editor':
        return 'To konto nie ma uprawnień redaktora.';
      default:
        return 'Nie udało się zalogować.' + (code ? ' (' + code + ')' : '');
    }
  }
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
  rank: { kind: 'Wszystkie', year: 'Wszystkie' },
  tips: [],
  query: '',
  visible: CONFIG.PAGE_SIZE,
  profile: { name: '', avatar: '' },
  profileLoaded: false,
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
  cover: '',            // własna okładka recenzji (URL lub Base64)
  modalImage: '',       // zdjęcie wstawiane do treści
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

function publishedArticles() { return sortedArticles().filter(isPublished); }

function scheduledArticles() {
  return state.articles.filter(a => !isPublished(a)).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
}

function setArticles(list) {
  state.articles = Array.isArray(list) ? list : [];
  state.plain = new Map(state.articles.map(a => [a.id, Utils.stripHtml(a.content)]));
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
  const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  if (parts[0] === 'artykul' && parts[1]) return { name: 'article', id: decodeURIComponent(parts[0 + 1]) };
  if (parts[0] === 'edytor') return { name: 'editor', id: parts[1] ? decodeURIComponent(parts[1]) : null, draft: null };
  if (parts[0] === 'szkic' && parts[1]) return { name: 'editor', id: null, draft: decodeURIComponent(parts[1]) };
  if (parts[0] === 'panel') return { name: 'panel' };
  if (parts[0] === 'ustawienia') return { name: 'settings' };
  if (parts[0] === 'kategoria' && parts[1]) return { name: 'home', category: decodeURIComponent(parts[1]) };
  if (parts[0] === 'tag' && parts[1]) return { name: 'home', tag: decodeURIComponent(parts[1]) };
  if (parts[0] === 'artysta' && parts[1]) return { name: 'home', artist: decodeURIComponent(parts[1]) };
  if (parts[0] === 'ranking') return { name: 'ranking' };
  if (parts[0] === 'zglos') return { name: 'tip' };
  if (parts[0] === 'prywatnosc' || parts[0] === 'regulamin') return { name: 'legal', doc: parts[0] };
  if (parts[0] === 'o-nas' || parts[0] === 'kontakt') return { name: 'legal', doc: 'o-nas' };
  if (parts[0] === 'zapisane') return { name: 'saved' };
  if (parts.length) return { name: 'notfound' };
  return { name: 'home' };
}

function adminButtons(id) {
  if (!Auth.isAdmin()) return '';
  const safe = Utils.esc(id);
  return `<span class="admin-actions">
    <button type="button" class="btn btn-sm" data-action="edit" data-id="${safe}">Edytuj</button>
    <button type="button" class="btn btn-sm" data-action="ig-post" data-id="${safe}" title="Pobierz grafikę na Instagrama i skopiuj opis posta">Post IG</button>
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
function collectionHeadHtml(list) {
  const isArtist = !!state.artist;
  const name = isArtist ? state.artist : state.tag;
  const reviews = list.filter(a => a.review && a.review.score !== null && a.review.score !== undefined && (!isArtist || Utils.same(a.review.artist, name)));
  const avg = reviews.length ? reviews.reduce((n, a) => n + a.review.score, 0) / reviews.length : null;
  const plural = (n, one, few, many) => n === 1 ? one : (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? few : many);
  const stats = [`${list.length} ${plural(list.length, 'artykuł', 'artykuły', 'artykułów')}`];
  if (reviews.length) stats.push(`${reviews.length} ${plural(reviews.length, 'recenzja', 'recenzje', 'recenzji')}`);
  if (avg !== null) stats.push(`średnia ocena ${Utils.formatScore(avg)}`);
  return `<header class="collection-head">
    <a class="btn btn-sm" href="#/">← Wszystkie artykuły</a>
    <span class="collection-kind">${isArtist ? 'Wykonawca' : 'Tag'}</span>
    <h1 class="collection-name${isArtist ? '' : ' is-tag'}">${isArtist ? '' : '#'}${Utils.esc(name)}</h1>
    <p class="collection-stats">${stats.map(Utils.esc).join(' · ')}</p>
  </header>`;
}

/* ---------- Strona główna ---------- */
function filteredArticles() {
  const q = state.query.trim().toLowerCase();
  return publishedArticles().filter(a => {
    if (state.category !== ALL && !Utils.catsOf(a).includes(state.category)) return false;
    if (state.tag && !Utils.tagsOf(a).some(t => Utils.same(t, state.tag))) return false;
    if (state.artist && !(a.review && Utils.same(a.review.artist, state.artist)) && !Utils.tagsOf(a).some(t => Utils.same(t, state.artist))) return false;
    if (!q) return true;
    const rv = a.review ? `${a.review.work || ''} ${a.review.artist || ''}` : '';
    const haystack = `${a.title} ${a.lead} ${Utils.tagsOf(a).join(' ')} ${rv} ${state.plain.get(a.id) || ''}`.toLowerCase();
    return haystack.includes(q);
  });
}

function cardHtml(a, opts = {}) {
  const id = encodeURIComponent(a.id);
  return `<article class="card" data-id="${Utils.esc(a.id)}">
    <a class="card-media" href="#/artykul/${id}" tabindex="-1" aria-hidden="true">
      <img src="${Utils.esc(thumbFor(a, opts.cover))}" alt="" data-cat="${Utils.esc(Utils.catsOf(a)[0] || '')}" loading="lazy" decoding="async">
    </a>
    <div class="card-body">
      <div class="card-tags">
        ${Utils.chipsHtml(a)}
        ${a.urgent ? '<span class="badge-urgent">PILNE</span>' : ''}
      </div>
      <h3 class="card-title"><a href="#/artykul/${id}">${Utils.esc(a.title)}</a></h3>
      <p class="card-lead">${Utils.esc(a.lead)}</p>
      <div class="card-meta">
        <time datetime="${Utils.esc(a.createdAt)}">${Utils.formatDate(a.createdAt)}</time>
        ${opts.noAdmin ? '' : adminButtons(a.id)}
      </div>
    </div>
  </article>`;
}

function heroHtml(a, useCover) {
  const id = encodeURIComponent(a.id);
  return `<section class="hero" data-id="${Utils.esc(a.id)}" aria-label="Temat dnia">
    <img class="hero-img" fetchpriority="high" decoding="async" src="${Utils.esc(thumbFor(a, useCover))}" alt="" data-cat="${Utils.esc(Utils.catsOf(a)[0] || '')}">
    <div class="hero-content">
      <div class="hero-tags"><span class="hero-flag">Temat dnia</span>${Utils.chipsHtml(a)}</div>
      <h2 class="hero-title"><a href="#/artykul/${id}">${Utils.esc(a.title)}</a></h2>
      <p class="hero-lead">${Utils.esc(a.lead)}</p>
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
    <img class="tile-img" src="${Utils.esc(getImage(a))}" alt="" data-cat="${Utils.esc(Utils.catsOf(a)[0] || '')}" loading="lazy" decoding="async">
    <div class="tile-content">
      <div>${Utils.chipsHtml(a)}</div>
      <h3 class="tile-title"><a href="#/artykul/${id}">${Utils.esc(a.title)}</a></h3>
      <time class="tile-time" datetime="${Utils.esc(a.createdAt)}">${Utils.formatDate(a.createdAt)}</time>
    </div>
  </article>`;
}

function renderHome() {
  const status = $('#home-status');

  if (state.loadError) {
    status.innerHTML = '<div class="empty-state">Nie udało się wczytać wiadomości. Odśwież stronę za chwilę.</div>';
    $('#hero-slot').innerHTML = '';
    $('#news-grid').innerHTML = '';
    $('#grid-title').hidden = true;
    $('#load-more').hidden = true;
    return;
  }

  const list = filteredArticles();
  const isReviews = state.category === 'Recenzje';
  // Blok na górze: Temat dnia (lub najnowszy) + 2 kafle – tylko na „Wszystkie” bez wyszukiwania
  const coll = state.tag || state.artist;
  const showTop = state.category === ALL && !coll && !state.query.trim() && list.length > 0;
  const hero = showTop ? (list.find(a => a.featured) || list[0]) : null;
  const tiles = showTop ? list.filter(a => a !== hero).slice(0, 2) : [];
  const top = hero ? [hero, ...tiles] : [];
  const rest = list.filter(a => !top.includes(a));
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
    ? `<div class="home-top${tiles.length ? '' : ' single'}">${heroHtml(hero, false)}${tiles.length ? `<div class="home-tiles">${tiles.map(tileHtml).join('')}</div>` : ''}</div>`
    : coll ? collectionHeadHtml(list) : '';
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
  const coll = r.name === 'home' && (state.tag || state.artist);
  const onCategory = r.name === 'home' && (state.category !== ALL || coll) && !state.query.trim();
  const visibleHere = r.name === 'article' || onCategory;
  // Pomijamy artykuły z kategorii, w której jesteśmy (i bieżący artykuł)
  const ctx = (r.name === 'article' || r.name === 'home') ? state.category : ALL;
  const list = publishedArticles()
    .filter(a => a.id !== current && (ctx === ALL || !Utils.catsOf(a).includes(ctx)))
    .slice(0, 6);
  const show = visibleHere && list.length > 0;
  layout.dataset.cat = r.name === 'home' && (state.category !== ALL || coll) ? '1' : '0';
  layout.dataset.right = show ? '1' : '0';
  side.hidden = !show;
  $('#side-title').textContent = 'Pozostałe artykuły';
  $('#side-list').innerHTML = list.map(a => {
    const id = encodeURIComponent(a.id);
    return `<article class="side-item" data-id="${Utils.esc(a.id)}">
      <a class="side-media" href="#/artykul/${id}" tabindex="-1" aria-hidden="true"><img src="${Utils.esc(getImage(a))}" alt="" data-cat="${Utils.esc(Utils.catsOf(a)[0] || '')}" loading="lazy" decoding="async"></a>
      <div class="side-body">
        <div class="card-tags">${Utils.chipsHtml(a)}${a.urgent ? '<span class="badge-urgent">PILNE</span>' : ''}</div>
        <h3 class="side-item-title"><a href="#/artykul/${id}">${Utils.esc(a.title)}</a></h3>
        <time class="side-time" datetime="${Utils.esc(a.createdAt)}">${Utils.formatDate(a.createdAt)}</time>
      </div>
    </article>`;
  }).join('');
}

/* ---------- Widok artykułu ---------- */
function articleHtml(a, plain) {
  const info = (a.infobox || []).filter(r => r && r.label && r.value);
  const minutes = Utils.readingTime(a, plain);
  const hasReview = !!(a.review && a.review.score !== null && a.review.score !== undefined);
  // Przy recenzji z osobną okładką zdjęcie główne też jest widoczne; gdy okładka = zdjęcie główne, pokazujemy je tylko w ramce oceny
  const showHero = !hasReview || !!a.image;
  const heroFig = showHero
    ? `<figure class="article-hero">
        <div class="media-wrap"><img src="${Utils.esc(getImage(a))}" alt="${Utils.esc(a.title)}" data-cat="${Utils.esc(Utils.catsOf(a)[0] || '')}">${sourceTag(a.imageSource)}</div>
        ${a.imageCaption ? `<figcaption>${Utils.esc(a.imageCaption)}</figcaption>` : ''}
      </figure>`
    : '';
  const edited = a.updatedAt && Math.abs(new Date(a.updatedAt) - new Date(a.createdAt)) > 60000 && isPublished(a);

  const infobox = info.length
    ? `<aside class="infobox" aria-label="Szybkie fakty">
         <h2 class="infobox-title">Szybkie fakty</h2>
         <table><tbody>${info.map(r =>
           `<tr><th scope="row">${Utils.esc(r.label)}</th><td>${Utils.esc(r.value)}</td></tr>`).join('')}
         </tbody></table>
       </aside>`
    : '';

  return `<article class="article">
      <header class="article-header">
        <div class="card-tags">
          ${Utils.chipsHtml(a)}
          ${a.urgent ? '<span class="badge-urgent">PILNE</span>' : ''}
        </div>
        <h1>${Utils.esc(a.title)}</h1>
        <div class="article-meta">
          <span>Autor: <strong>${Utils.esc(a.author)}</strong></span>
          <span>Opublikowano: <time datetime="${Utils.esc(a.createdAt)}">${Utils.formatDate(a.createdAt)}</time></span>
          ${edited ? `<span>Zaktualizowano: ${Utils.formatDate(a.updatedAt)}</span>` : ''}
          <span>Czas czytania: ${minutes} min</span>
        </div>
      </header>
      ${heroFig}
      <div class="article-layout ${info.length ? 'has-infobox' : ''}">
        <div class="article-main">
          <p class="article-lead">${Utils.esc(a.lead)}</p>
          <div class="article-body">${Sanitizer.render(a.content)}</div>
          ${hasReview ? reviewHtml(a) : ''}
          ${tagsBlockHtml(a)}
          ${shareBarHtml(a)}
        </div>
        ${infobox}
      </div>
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
  return location.href.split('#')[0] + '#/artykul/' + encodeURIComponent(a.id);
}

function shareBarHtml(a) {
  const url = encodeURIComponent(articleUrl(a));
  const text = encodeURIComponent(a.title);
  const link = (href, label) => `<a class="share-btn" href="${href}" target="_blank" rel="noopener noreferrer">${label}</a>`;
  return `<div class="share-bar" aria-label="Udostępnij artykuł">
    <span class="share-label">Udostępnij</span>
    ${link('https://www.facebook.com/sharer/sharer.php?u=' + url, 'Facebook')}
    ${link('https://twitter.com/intent/tweet?url=' + url + '&text=' + text, 'X')}
    ${link('https://wa.me/?text=' + text + '%20' + url, 'WhatsApp')}
    <button type="button" class="share-btn" data-action="copy-link" data-id="${Utils.esc(a.id)}">Kopiuj link</button>
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

function renderArticleView(id) {
  const el = $('#view-article');
  const a = state.articles.find(x => x.id === id);
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

  const rel = relatedArticles(a);
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
    ? `<section class="related" aria-label="Czytaj dalej"><h2 class="section-title">Czytaj dalej</h2><div class="related-grid">${rel.map(x => cardHtml(x, { noAdmin: true })).join('')}</div></section>`
    : '';

  el.innerHTML = `
    <div class="article-top">
      <a class="btn" href="#/">← Powrót do strony głównej</a>
      <div class="top-actions">
        <button type="button" class="btn" data-action="save" data-id="${Utils.esc(a.id)}" aria-pressed="${Saved.has(a.id)}">${Saved.has(a.id) ? '★ Zapisano' : '☆ Zapisz'}</button>
        <button type="button" class="btn" data-action="share" data-id="${Utils.esc(a.id)}">Udostępnij</button>
        ${adminButtons(a.id)}
      </div>
    </div>
    ${notice}
    ${articleHtml(a, state.plain.get(a.id))}
    ${pagerHtml}
    ${relatedHtml}`;
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

async function renderInstagramImage(a) {
  const W = 1080, H = 1350, PAD = 72;
  const family = getComputedStyle(document.body).fontFamily;
  try { await Promise.all([document.fonts.load(`800 80px ${family}`), document.fonts.load(`700 30px ${family}`)]); } catch {}

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

  // logo (białe) w lewym górnym rogu
  try {
    const logo = await loadImage(APP_BASE + 'logo-biale.svg');
    const lw = 330, lh = lw * 128 / 732;
    ctx.drawImage(logo, PAD, PAD, lw, lh);
  } catch {
    ctx.fillStyle = '#fff'; ctx.font = `800 44px ${family}`; ctx.textBaseline = 'top'; ctx.fillText('śliska news', PAD, PAD);
  }

  // ocena w kółku (recenzje) – prawy górny róg
  if (a.review && a.review.score != null) {
    const r = 82, cx = W - PAD - r, cy = PAD + r - 6;
    ctx.fillStyle = '#d6001c';
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `800 74px ${family}`;
    ctx.fillText(String(a.review.score).replace('.', ','), cx, cy + 3);
    ctx.textAlign = 'left';
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
  const bottomY = H - 150;
  const titleTop = bottomY - lines.length * lh;
  ctx.fillStyle = '#fff';
  ctx.textBaseline = 'top';
  lines.forEach((l, i) => ctx.fillText(l, PAD, titleTop + i * lh));

  const cat = (Utils.catsOf(a)[0] || 'News').toUpperCase();
  ctx.font = `800 30px ${family}`;
  if ('letterSpacing' in ctx) ctx.letterSpacing = '3px';
  const cw = ctx.measureText(cat).width + 44;
  const chipY = titleTop - 28 - 56;
  ctx.fillStyle = '#d6001c';
  roundRect(ctx, PAD, chipY, cw, 56, 28); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.textBaseline = 'middle';
  ctx.fillText(cat, PAD + 22, chipY + 29);
  if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';

  ctx.fillStyle = 'rgba(255,255,255,.35)';
  ctx.fillRect(PAD, H - 108, maxW, 2);
  ctx.fillStyle = 'rgba(255,255,255,.85)';
  ctx.font = `700 32px ${family}`;
  ctx.textBaseline = 'middle';
  ctx.fillText('sliska.pl/news', PAD, H - 66);
  ctx.textAlign = 'right';
  ctx.fillText('Link w bio →', W - PAD, H - 66);
  ctx.textAlign = 'left';

  const blob = await new Promise((res, rej) => canvas.toBlob(b => (b ? res(b) : rej(new Error('toBlob'))), 'image/png'));
  return { blob, photoOk };
}

async function makeInstagramPost(id, btn) {
  const a = state.articles.find(x => x.id === id);
  if (!a) return;
  // opis kopiujemy od razu (w momencie kliknięcia), zanim przeglądarka zdąży wycofać zgodę na schowek
  let copied = false;
  const caption = instagramCaption(a);
  const copyPromise = (navigator.clipboard && navigator.clipboard.writeText)
    ? navigator.clipboard.writeText(caption).then(() => { copied = true; }, () => {})
    : Promise.resolve();
  const label = btn ? btn.textContent : '';
  if (btn) { btn.disabled = true; btn.textContent = 'Tworzę…'; }
  try {
    const { blob, photoOk } = await renderInstagramImage(a);
    await copyPromise;
    const name = `sliska-news-${Utils.slugify(a.title).slice(0, 50) || a.id}.png`;
    const file = new File([blob], name, { type: 'image/png' });
    let shared = false;
    if (window.matchMedia && matchMedia('(pointer: coarse)').matches && navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file] }); shared = true; } catch (e) { if (e && e.name === 'AbortError') shared = true; }
    }
    if (!shared) {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url; link.download = name;
      document.body.appendChild(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
    }
    toast((shared ? 'Grafika gotowa' : 'Grafika pobrana') + (copied ? ', opis skopiowany do schowka.' : '. Nie udało się skopiować opisu – skopiuj go ręcznie.')
      + (photoOk ? '' : ' Zdjęcia z innej strony nie dało się wczytać, użyto tła zastępczego.'));
    if (!copied) prompt('Opis posta (skopiuj):', caption);
  } catch (e) {
    toast('Nie udało się utworzyć grafiki: ' + (e && e.message ? e.message : 'błąd'));
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = label; }
  }
}

async function shareArticle(id) {
  const a = state.articles.find(x => x.id === id);
  if (!a) return;
  const url = articleUrl(a);
  if (navigator.share) {
    try {
      await navigator.share({ title: a.title, text: a.lead, url });
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
    await navigator.clipboard.writeText(articleUrl(a));
    toast('Link skopiowany do schowka.');
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
    return `<li class="rank-row${best ? ' is-best' : ''}">
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
    await DataService.addTip({ id: Utils.uid('t_'), title, message, link, email, createdAt: new Date().toISOString() });
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

async function renderTips() {
  const el = $('#panel-tips');
  el.innerHTML = '<p class="muted">Ładowanie…</p>';
  try {
    const list = await DataService.getTips();
    state.tips = list;
    if (currentRoute().name !== 'panel') return;
    el.innerHTML = list.length
      ? list.map(t => `<div class="panel-item tip-item">
          <div class="panel-item-main">
            <strong>${Utils.esc(t.title)}</strong>
            <span class="tip-msg">${Utils.esc(t.message)}</span>
            <span class="muted">${Utils.formatDate(t.createdAt)}${t.email ? ' · ' + Utils.esc(t.email) : ''}</span>
          </div>
          <div class="panel-item-actions">
            ${t.link ? `<a class="btn btn-sm" href="${Utils.esc(t.link)}" target="_blank" rel="noopener noreferrer">Źródło</a>` : ''}
            ${t.email ? `<a class="btn btn-sm" href="mailto:${Utils.esc(t.email)}?subject=${encodeURIComponent('Re: ' + t.title)}">Odpisz</a>` : ''}
            <button type="button" class="btn btn-sm btn-danger" data-action="delete-tip" data-id="${Utils.esc(t.id)}">Usuń</button>
          </div>
        </div>`).join('')
      : '<p class="muted">Brak zgłoszeń od czytelników.</p>';
  } catch (err) {
    console.warn(err);
    el.innerHTML = '<p class="form-error">Nie udało się wczytać zgłoszeń. Sprawdź reguły Firestore dla kolekcji „tips”.</p>';
  }
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
  if (doc === 'o-nas') {
    const cats = CATEGORIES.map(c => `<a class="chip" href="#/kategoria/${encodeURIComponent(c)}">${Utils.esc(c)}</a>`).join(' ');
    return `<h1>O nas i kontakt</h1>
      <p class="legal-date">Śliska News – serwis o muzyce, kontrowersjach i dramach ze świata rozrywki</p>
      <h2>Czym jest Śliska News</h2>
      <p>Piszemy o tym, co dzieje się w muzyce i wokół niej: o nowych płytach i recenzjach, o kontrowersjach i o dramach, które rozgrzewają internet. Staramy się podawać informacje rzetelnie, z podaniem źródeł, a opinie – oznaczać jako opinie.</p>
      <p>Znajdziesz u nas: ${cats}. Oceny płyt zbieramy w <a href="#/ranking">rankingu ocen</a>.</p>
      <h2>Masz temat albo wskazówkę?</h2>
      <p>Skorzystaj z formularza <a href="#/zglos">Zgłoś temat</a>. Czytamy każde zgłoszenie, choć nie możemy obiecać odpowiedzi ani publikacji.</p>
      <h2>Sprostowania</h2>
      <p>Jeśli zauważysz błąd w artykule, napisz do nas na ${mail}. Poprawiamy pomyłki i w razie potrzeby publikujemy sprostowanie.</p>
      <h2>Kontakt z redakcją</h2>
      <p>E-mail: ${mail}<br>Instagram: <a href="https://instagram.com/sliska.pl" target="_blank" rel="noopener noreferrer">@sliska.pl</a><br>Wydawca: ${admin}<br>Adres: ${addr}</p>`;
  }
  if (doc === 'regulamin') {
    return `<h1>Regulamin serwisu Śliska News</h1>
      <p class="legal-date">Obowiązuje od: ${Utils.esc(L.UPDATED)}</p>
      <h2>1. Postanowienia ogólne</h2>
      <p>Serwis „Śliska News” (dalej: Serwis) to serwis informacyjny o muzyce, kontrowersjach i dramach ze świata rozrywki, prowadzony przez ${admin}, ${addr}. Kontakt z redakcją: ${mail}.</p>
      <p>Korzystanie z Serwisu jest bezpłatne. Do korzystania z Serwisu potrzebna jest przeglądarka internetowa z włączoną obsługą JavaScript.</p>
      <h2>2. Treści Serwisu</h2>
      <p>Artykuły, zdjęcia, grafiki, logo i inne treści w Serwisie są chronione prawem autorskim. Kopiowanie i rozpowszechnianie ich w całości lub w części wymaga zgody redakcji, z wyjątkiem przypadków dozwolonych przez prawo (np. prawo cytatu, z podaniem źródła i linkiem do Serwisu).</p>
      <p>Recenzje i oceny liczbowe wyrażają subiektywną opinię autora. Teksty mają charakter informacyjny i publicystyczny. Dokładamy starań, aby informacje były rzetelne, ale nie możemy zagwarantować, że są wolne od błędów. O pomyłkach prosimy informować pod adresem ${mail} – poprawiamy je i w razie potrzeby publikujemy sprostowanie.</p>
      <h2>3. Zgłaszanie tematów</h2>
      <p>Każdy może przesłać redakcji zgłoszenie przez formularz „Zgłoś temat”. Wysyłając zgłoszenie, oświadczasz, że masz prawo przekazać zawarte w nim informacje i materiały oraz że nie naruszają one praw osób trzecich ani przepisów prawa. Prosimy nie przesyłać treści bezprawnych, obraźliwych ani danych wrażliwych.</p>
      <p>Redakcja nie gwarantuje odpowiedzi ani publikacji. Nadesłane informacje mogą posłużyć jako inspiracja do własnych tekstów. Przekazanie zgłoszenia nie oznacza przeniesienia autorskich praw majątkowych, a ewentualne wykorzystanie nadesłanych materiałów wymaga odrębnej zgody ich autora.</p>
      <h2>4. Odpowiedzialność</h2>
      <p>Redakcja nie odpowiada za treść zewnętrznych stron, do których prowadzą linki w Serwisie, ani za przerwy w działaniu Serwisu wynikające z przyczyn niezależnych od niej.</p>
      <h2>5. Reklamacje i kontakt</h2>
      <p>Uwagi i reklamacje dotyczące działania Serwisu można zgłaszać na adres ${mail}. Odpowiadamy w rozsądnym terminie, zwykle do 14 dni.</p>
      <h2>6. Zmiany regulaminu</h2>
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
    </ul>
    <p>Podanie danych jest dobrowolne.</p>
    <h2>3. Komu przekazujemy dane</h2>
    <p>Dane przetwarzają w naszym imieniu dostawcy usług: Google (usługa Firebase – baza danych oraz dostarczanie skryptów strony) oraz dostawca hostingu strony. Dane mogą być przetwarzane poza Europejskim Obszarem Gospodarczym na podstawie standardowych klauzul umownych lub innych zabezpieczeń przewidzianych w RODO. Nie sprzedajemy danych i nie przekazujemy ich reklamodawcom.</p>
    <h2>4. Pliki cookies i pamięć przeglądarki</h2>
    <p>Serwis nie używa własnych plików cookies reklamowych ani analitycznych. W pamięci Twojej przeglądarki (localStorage) zapisujemy wyłącznie dane techniczne potrzebne do działania strony: wybrany motyw jasny/ciemny oraz licznik ograniczający liczbę zgłoszeń. Zapisane na później artykuły również pamiętamy tylko w Twojej przeglądarce. Niektóre artykuły zawierają osadzone odtwarzacze YouTube (w trybie rozszerzonej prywatności youtube-nocookie.com) lub Spotify; po ich uruchomieniu dane przetwarza odpowiednio Google lub Spotify na własnych zasadach. Możesz je usunąć w ustawieniach przeglądarki. Jeśli w przyszłości dodamy narzędzia analityczne, zaktualizujemy tę politykę.</p>
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

/* ---------- Kopia zapasowa ---------- */
async function exportBackup() {
  const btn = $('#backup-export');
  btn.disabled = true;
  try {
    const [articles, cloudDrafts, profile, tips] = await Promise.all([
      DataService.getAllArticles(),
      DataService.getDrafts().catch(() => []),
      DataService.getProfile().catch(() => null),
      DataService.getTips().catch(() => [])
    ]);
    // do kopii trafiają też robocze kopie z tej przeglądarki, których nie ma jeszcze w bazie
    const cloudIds = new Set(cloudDrafts.map(d => d.id));
    const localDrafts = Object.entries(Buffers.all())
      .filter(([id, b]) => !cloudIds.has(id) && b && b.data)
      .map(([id, b]) => ({ id, articleId: b.articleId || null, savedAt: b.savedAt, ...b.data }));
    const drafts = [...cloudDrafts, ...localDrafts];
    const data = { app: 'sliska-news', version: 1, exportedAt: new Date().toISOString(), articles, drafts, profile, tips };
    downloadFile('sliska-kopia-' + new Date().toISOString().slice(0, 10) + '.json', JSON.stringify(data), 'application/json');
    toast(`Kopia zapisana: ${articles.length} art., ${drafts.length} rob.`);
  } catch (err) {
    console.error(err);
    toast(err.message || 'Nie udało się przygotować kopii.', 'error');
  } finally {
    btn.disabled = false;
  }
}

async function importBackup(file) {
  if (!file) return;
  let data;
  try {
    data = JSON.parse(await file.text());
  } catch {
    toast('To nie jest poprawny plik kopii zapasowej.', 'error');
    return;
  }
  const valid = data && data.app === 'sliska-news' && Array.isArray(data.articles)
    ? data.articles.filter(a => a && /^[\w-]{1,100}$/.test(String(a.id)) && typeof a.title === 'string' && a.createdAt).slice(0, 500)
    : null;
  if (!valid) { toast('To nie jest plik kopii zapasowej Śliska News.', 'error'); return; }
  const draftsIn = Array.isArray(data.drafts)
    ? data.drafts.filter(d => d && /^[\w-]{1,100}$/.test(String(d.id))).slice(0, 200)
    : [];
  if (!confirm(`Przywrócić z kopii: ${valid.length} artykułów i ${draftsIn.length} wersji roboczych?\nElementy o tych samych identyfikatorach zostaną nadpisane.`)) return;
  let done = 0;
  let failed = 0;
  for (const a of valid) {
    try { await DataService.save(a); done++; } catch (err) { console.warn(err); failed++; }
  }
  let draftsDone = 0;
  for (const d of draftsIn) {
    try { await DataService.saveDraft(d); draftsDone++; } catch (err) { console.warn(err); failed++; }
  }
  toast(`Przywrócono: ${done} artykułów, ${draftsDone} roboczych${failed ? `, błędy: ${failed}` : ''}.`, failed ? 'error' : 'info');
}

/* ---------- Panel redakcji: wersje robocze i zaplanowane ---------- */
/** Id wersji roboczej edytowanego artykułu – osobne dla każdego redaktora. */
function editDraftId(articleId) { return `edit_${Auth.uid() || 'anon'}_${articleId}`; }
/** Wskaźnik „ostatni nowy artykuł w trakcie pisania” – osobny dla każdego redaktora. */
function newPointerKey() { return `${CONFIG.NEW_POINTER_KEY}_${Auth.uid() || 'anon'}`; }

/** Kopie robocze w tej przeglądarce: każdy wpis ma właściciela, cudzych nie widać (wpisy sprzed tej zmiany są widoczne dla wszystkich). */
const Buffers = {
  _raw() {
    try { return JSON.parse(localStorage.getItem(CONFIG.BUFFER_KEY)) || {}; } catch { return {}; }
  },
  _mine(e) { return !!e && (!e.ownerUid || e.ownerUid === Auth.uid()); },
  _all() {
    const raw = this._raw();
    const out = {};
    for (const k of Object.keys(raw)) if (this._mine(raw[k])) out[k] = raw[k];
    return out;
  },
  get(id) { return this._all()[id] || null; },
  set(id, entry) {
    const all = this._raw();
    entry = { ...entry, ownerUid: Auth.uid() };
    all[id] = entry;
    try {
      localStorage.setItem(CONFIG.BUFFER_KEY, JSON.stringify(all));
      return true;
    } catch {
      // Za duże (zdjęcia) – spróbuj bez zdjęcia głównego w formie Base64
      try {
        const slim = JSON.parse(JSON.stringify(entry));
        if (slim.data && String(slim.data.image).startsWith('data:')) slim.data.image = '';
        all[id] = slim;
        localStorage.setItem(CONFIG.BUFFER_KEY, JSON.stringify(all));
        return true;
      } catch { return false; }
    }
  },
  remove(id) {
    const all = this._raw();
    if (id in all && this._mine(all[id])) {
      delete all[id];
      try { localStorage.setItem(CONFIG.BUFFER_KEY, JSON.stringify(all)); } catch { /* ignoruj */ }
    }
  },
  all() { return this._all(); }
};

function clearPointer(draftId) {
  try {
    if (localStorage.getItem(newPointerKey()) === draftId) localStorage.removeItem(newPointerKey());
  } catch { /* ignoruj */ }
}

async function renderPanel() {
  renderTips();
  const dEl = $('#panel-drafts');
  const sEl = $('#panel-scheduled');

  const scheduled = scheduledArticles();
  sEl.innerHTML = scheduled.length
    ? scheduled.map(a => `<div class="panel-item">
        <div class="panel-item-main">
          <strong>${Utils.esc(a.title)}</strong>
          <span class="muted">${Utils.esc(Utils.catsOf(a).join(', '))} · publikacja: ${Utils.formatDate(a.createdAt)}</span>
        </div>
        <div class="panel-item-actions">
          <a class="btn btn-sm" href="#/artykul/${encodeURIComponent(a.id)}">Zobacz</a>
          <a class="btn btn-sm" href="#/edytor/${encodeURIComponent(a.id)}">Edytuj</a>
          <button type="button" class="btn btn-sm btn-primary" data-action="publish-now" data-id="${Utils.esc(a.id)}">Opublikuj teraz</button>
          <button type="button" class="btn btn-sm btn-danger" data-action="delete" data-id="${Utils.esc(a.id)}">Usuń</button>
        </div>
      </div>`).join('')
    : '<p class="muted">Brak zaplanowanych publikacji. W edytorze zaznacz „Zaplanuj publikację na później”.</p>';

  dEl.innerHTML = '<p class="muted">Ładowanie…</p>';
  let drafts = [];
  try {
    drafts = await DataService.getDrafts();
  } catch (err) {
    console.warn(err);
    dEl.innerHTML = '<p class="form-error">Nie udało się wczytać wersji roboczych z bazy. Sprawdź reguły Firestore dla kolekcji „drafts”.</p>';
    return;
  }
  if (currentRoute().name !== 'panel') return;

  // Kopie z tej przeglądarki, których nie ma jeszcze w bazie (np. po nagłym zamknięciu karty)
  const cloudIds = new Set(drafts.map(d => d.id));
  const localOnly = Object.entries(Buffers.all())
    .filter(([id, b]) => !cloudIds.has(id) && b && b.data)
    .map(([id, b]) => ({ id, articleId: b.articleId || null, savedAt: b.savedAt, local: true, ...b.data }));

  const items = [...localOnly, ...drafts].sort((a, b) => String(b.savedAt).localeCompare(String(a.savedAt)));

  dEl.innerHTML = items.length
    ? items.map(d => `<div class="panel-item">
        <div class="panel-item-main">
          <strong>${Utils.esc(d.title || '(bez tytułu)')}</strong>
          <span class="muted">${Utils.esc(Utils.catsOf(d).join(', '))} · zapisano ${Utils.formatDate(d.savedAt)}${d.articleId ? ' · zmiany w opublikowanym artykule' : ''}${d.local ? ' · kopia z tej przeglądarki' : ''}</span>
        </div>
        <div class="panel-item-actions">
          <a class="btn btn-sm btn-primary" href="#/szkic/${encodeURIComponent(d.id)}">Kontynuuj</a>
          <button type="button" class="btn btn-sm btn-danger" data-action="delete-draft" data-id="${Utils.esc(d.id)}">Usuń</button>
        </div>
      </div>`).join('')
    : '<p class="muted">Brak wersji roboczych. Wszystko, co zaczniesz pisać, zapisuje się tu automatycznie.</p>';
}

async function deleteDraft(id) {
  if (!confirm('Usunąć tę wersję roboczą? Tej operacji nie można cofnąć.')) return;
  try {
    await DataService.removeDraft(id);
    Buffers.remove(id);
    clearPointer(id);
    toast('Wersja robocza usunięta.');
    renderPanel();
  } catch (err) {
    console.error(err);
    toast(err.message || 'Nie udało się usunąć wersji roboczej.', 'error');
  }
}

async function publishNow(id) {
  const a = state.articles.find(x => x.id === id);
  if (!a) return;
  if (!confirm(`Opublikować teraz artykuł:\n„${a.title}”?`)) return;
  const nowIso = new Date().toISOString();
  const updated = { ...a, createdAt: nowIso, updatedAt: nowIso };
  try {
    await DataService.save(updated);
    upsertLocalState(updated);
    toast('Artykuł opublikowany.');
    refreshViews();
  } catch (err) {
    console.error(err);
    toast(err.message || 'Nie udało się opublikować artykułu.', 'error');
  }
}

function upsertLocalState(article) {
  const idx = state.articles.findIndex(a => a.id === article.id);
  const next = [...state.articles];
  if (idx >= 0) next[idx] = article; else next.push(article);
  setArticles(next);
}

let removeTarget = null;

function openRemoveModal(id) {
  const a = state.articles.find(x => x.id === id);
  if (!a) return;
  removeTarget = id;
  $('#remove-name').textContent = `„${a.title}”`;
  openModal('remove-modal');
}

/** Zdejmuje artykuł ze strony i zapisuje go jako nową wersję roboczą. */
async function unpublishToDraft(id) {
  const a = state.articles.find(x => x.id === id);
  if (!a) return;
  try {
    const draft = { id: Utils.uid('d_'), articleId: null, ...dataFromArticle(a), savedAt: new Date().toISOString() };
    await DataService.saveDraft(draft);
    await DataService.remove(id);
    setArticles(state.articles.filter(x => x.id !== id));
    DataService.removeDraft(editDraftId(id)).catch(() => {});
    Buffers.remove(editDraftId(id));
    toast('Artykuł schowany do wersji roboczych.');
    if (currentRoute().name === 'article') location.hash = '#/panel';
    else refreshViews();
  } catch (err) {
    console.error(err);
    toast(err.message || 'Nie udało się przenieść artykułu do roboczych.', 'error');
  }
}

async function deleteArticle(id) {
  const a = state.articles.find(x => x.id === id);
  if (!a) return;
  try {
    await DataService.remove(id);
    setArticles(state.articles.filter(x => x.id !== id));
    DataService.removeDraft(editDraftId(id)).catch(() => {});
    Buffers.remove(editDraftId(id));
    toast('Artykuł został usunięty.');
    if (currentRoute().name === 'article') location.hash = '#/';
    else refreshViews();
  } catch (err) {
    console.error(err);
    toast(err.message || 'Nie udało się usunąć artykułu.', 'error');
  }
}

/* ---------- Edytor: dane formularza ---------- */
function defaultAuthor() {
  let last = '';
  try { last = localStorage.getItem(CONFIG.AUTHOR_KEY) || ''; } catch { /* ignoruj */ }
  return state.profile.name || last;
}

function emptyData() {
  return {
    title: '', lead: '', categories: [], author: defaultAuthor(),
    image: '', imageCaption: '', imageSource: '', urgent: false, featured: false, infobox: [], content: '',
    tags: '',
    reviewOn: false, reviewScore: '', reviewKind: 'Albumy', reviewCoverSame: false, reviewCover: '', reviewWork: '', reviewArtist: '', reviewYear: '',
    scheduleOn: false, scheduleAt: ''
  };
}

function normalizeData(obj) {
  const base = emptyData();
  const o = obj || {};
  return {
    title: o.title ?? base.title,
    lead: o.lead ?? base.lead,
    categories: Utils.catsOf(o),
    tags: Array.isArray(o.tags) ? o.tags.join(', ') : (typeof o.tags === 'string' ? o.tags : ''),
    author: o.author ?? base.author,
    image: o.image || '',
    imageCaption: o.imageCaption || '',
    imageSource: o.imageSource || '',
    reviewOn: !!o.reviewOn,
    reviewScore: o.reviewScore || '',
    reviewKind: o.reviewKind || 'Albumy',
    reviewCoverSame: !!o.reviewCoverSame,
    reviewCover: o.reviewCover || '',
    reviewWork: o.reviewWork || '',
    reviewArtist: o.reviewArtist || '',
    reviewYear: o.reviewYear || '',
    urgent: !!o.urgent,
    featured: !!o.featured,
    infobox: Array.isArray(o.infobox) ? o.infobox.map(r => ({ label: r.label || '', value: r.value || '' })) : [],
    content: o.content || '',
    scheduleOn: !!o.scheduleOn,
    scheduleAt: o.scheduleAt || ''
  };
}

function dataFromArticle(a) {
  const future = !isPublished(a);
  const r = a.review;
  return normalizeData({
    ...a,
    reviewOn: !!(r && r.score !== null && r.score !== undefined),
    reviewScore: r && r.score !== null && r.score !== undefined ? Utils.formatScore(r.score) : '',
    reviewKind: r ? r.kind || 'Albumy' : 'Albumy',
    // starsze recenzje (bez osobnej okładki) używały zdjęcia głównego
    reviewCoverSame: r ? !!(r.coverSame || !r.cover) : false,
    reviewCover: r ? r.cover || '' : '',
    reviewWork: r ? r.work || '' : '',
    reviewArtist: r ? r.artist || '' : '',
    reviewYear: r ? r.year || '' : '',
    scheduleOn: future,
    scheduleAt: future ? Utils.toLocalInput(a.createdAt) : ''
  });
}

function contentHtml() {
  if (!editor.quill || editor.quill.getLength() <= 1) return '';
  return Sanitizer.clean(editor.quill.root.innerHTML);
}

function collectData() {
  return {
    title: $('#f-title').value,
    lead: $('#f-lead').value,
    categories: $$('#f-categories input:checked').map(i => i.value),
    tags: $('#f-tags').value,
    author: $('#f-author').value,
    image: editor.image,
    imageCaption: $('#f-image-caption').value,
    imageSource: $('#f-image-source').value,
    reviewOn: $('#f-review-on').checked,
    reviewScore: $('#f-review-score').value,
    reviewKind: $('#f-review-kind').value,
    reviewCoverSame: $('#f-review-cover-same').checked,
    reviewCover: editor.cover,
    reviewWork: $('#f-review-work').value,
    reviewArtist: $('#f-review-artist').value,
    reviewYear: $('#f-review-year').value,
    urgent: $('#f-urgent').checked,
    featured: $('#f-featured').checked,
    infobox: $$('.info-row').map(row => ({
      label: $('.info-label', row).value,
      value: $('.info-value', row).value
    })).filter(r => r.label.trim() || r.value.trim()),
    content: contentHtml(),
    scheduleOn: $('#f-schedule-on').checked,
    scheduleAt: $('#f-schedule-at').value
  };
}

function isEmptyData(d) {
  return !d.title.trim() && !d.lead.trim() && !d.content && !d.image && d.infobox.length === 0 && !d.reviewOn;
}

function renderCatPicker(selected = []) {
  const cats = [...CATEGORIES, ...selected.filter(c => !CATEGORIES.includes(c))];
  $('#f-categories').innerHTML = cats.map(c =>
    `<label class="cat-option"><input type="checkbox" value="${Utils.esc(c)}"${selected.includes(c) ? ' checked' : ''}><span>${Utils.esc(c)}</span></label>`).join('');
}

function updateReviewUi() {
  $('#review-fields').hidden = !$('#f-review-on').checked;
  $('#cover-fields').hidden = $('#f-review-cover-same').checked;
}

function setCover(src) {
  editor.cover = src || '';
  const box = $('#f-review-cover-preview');
  box.hidden = !editor.cover;
  if (editor.cover) $('img', box).src = editor.cover;
  $('#f-review-cover-url').value = editor.cover && !editor.cover.startsWith('data:') ? editor.cover : '';
  if (!editor.cover) $('#f-review-cover-file').value = '';
}

function addInfoRow(label = '', value = '') {
  const row = document.createElement('div');
  row.className = 'info-row';
  row.innerHTML =
    '<input type="text" class="info-label" placeholder="Nagłówek (np. Miejsce)" maxlength="60" aria-label="Nagłówek">' +
    '<input type="text" class="info-value" placeholder="Wartość (np. Warszawa)" maxlength="200" aria-label="Wartość">' +
    '<button type="button" class="btn btn-sm btn-ghost info-remove" aria-label="Usuń wiersz">✕</button>';
  row.querySelector('.info-label').value = label;
  row.querySelector('.info-value').value = value;
  $('#infobox-rows').appendChild(row);
}

function setMainImage(src) {
  editor.image = src || '';
  const box = $('#f-image-preview');
  box.hidden = !editor.image;
  updateChecklist();
  if (editor.image) $('img', box).src = editor.image;
  // pole URL pokazuje tylko zwykły link (nie Base64)
  $('#f-image-url').value = editor.image && !editor.image.startsWith('data:') ? editor.image : '';
  if (!editor.image) $('#f-image-file').value = '';
}

/** Podpowiedzi tagów: istniejące tagi i wykonawcy z recenzji. */
function updateTagSuggest() {
  const set = new Map();
  state.articles.forEach(a => {
    Utils.tagsOf(a).forEach(t => set.set(t.toLowerCase(), t));
    if (a.review && a.review.artist) set.set(a.review.artist.toLowerCase(), a.review.artist);
  });
  $('#tag-suggest').innerHTML = [...set.values()].sort((p, q) => p.localeCompare(q, 'pl')).map(t => `<option value="${Utils.esc(t)}">`).join('');
}

/* ---------- Propozycje tagów ---------- */
const RECENT_TAGS_KEY = 'sliska_recent_tags';

function recentTags() {
  try { return (JSON.parse(localStorage.getItem(RECENT_TAGS_KEY)) || []).filter(t => typeof t === 'string'); } catch { return []; }
}

function rememberTags(tags) {
  if (!tags.length) return;
  const list = [...tags, ...recentTags()];
  const seen = new Set();
  const out = list.filter(t => { const k = t.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, 14);
  try { localStorage.setItem(RECENT_TAGS_KEY, JSON.stringify(out)); } catch { /* ignoruj */ }
}

/** Wszystkie znane tagi z liczbą użyć (tagi artykułów + wykonawcy z recenzji). */
function tagStats() {
  const map = new Map();
  const add = t => { const k = t.toLowerCase(); const e = map.get(k) || { tag: t, n: 0 }; e.n++; map.set(k, e); };
  state.articles.forEach(a => {
    Utils.tagsOf(a).forEach(add);
    if (a.review && a.review.artist) add(a.review.artist.trim());
  });
  return map;
}

function suggestedTags() {
  const title = $('#f-title').value;
  const text = `${title} ${$('#f-lead').value} ${editor.quill ? editor.quill.getText() : ''}`;
  const low = text.toLowerCase();
  const out = new Map();
  const put = t => { const k = t.toLowerCase(); if (!out.has(k) && t.length >= 3) out.set(k, t); };
  const artist = $('#f-review-artist').value.trim();
  if ($('#f-review-on').checked && artist) put(artist);
  // znane tagi i wykonawcy, o których jest mowa w tekście
  [...tagStats().values()].sort((a, b) => b.n - a.n).forEach(e => { if (low.includes(e.tag.toLowerCase())) put(e.tag); });
  // nazwy własne z kilku wyrazów (np. „Elizka Sztos”), jeśli są w tytule albo pojawiają się 2+ razy
  const re = /[A-ZĄĆĘŁŃÓŚŹŻ][\p{L}'’-]+(?:\s+[A-ZĄĆĘŁŃÓŚŹŻ][\p{L}'’-]+)+/gu;
  const counts = new Map();
  (text.match(re) || []).forEach(n => counts.set(n, (counts.get(n) || 0) + 1));
  [...counts.entries()].sort((a, b) => b[1] - a[1]).forEach(([n, c]) => {
    if (c >= 2 || title.includes(n)) put(n);
  });
  return [...out.values()].slice(0, 10);
}

function renderTagChips() {
  const box = $('#tag-chips');
  if (!box) return;
  const chosen = new Set(Utils.parseTags($('#f-tags').value).map(t => t.toLowerCase()));
  const used = new Set();
  const group = (label, tags) => {
    const items = tags.filter(t => t && !used.has(t.toLowerCase()));
    items.forEach(t => used.add(t.toLowerCase()));
    if (!items.length) return '';
    return `<div class="tag-group"><span class="tag-group-label">${label}</span><span class="tag-group-chips">${items.map(t =>
      `<button type="button" class="tag-chip${chosen.has(t.toLowerCase()) ? ' on' : ''}" data-tag="${Utils.esc(t)}" aria-pressed="${chosen.has(t.toLowerCase())}">${Utils.esc(t)}</button>`).join('')}</span></div>`;
  };
  const popular = [...tagStats().values()].sort((a, b) => b.n - a.n || a.tag.localeCompare(b.tag, 'pl')).slice(0, 14).map(e => e.tag);
  box.innerHTML =
    group('Proponowane', suggestedTags()) +
    group('Ostatnio używane', recentTags().slice(0, 10)) +
    group('Popularne', popular);
}
const renderTagChipsSoon = Utils.debounce(renderTagChips, 400);

function toggleTag(tag) {
  const cur = Utils.parseTags($('#f-tags').value);
  const i = cur.findIndex(t => Utils.same(t, tag));
  if (i >= 0) cur.splice(i, 1); else cur.push(tag);
  $('#f-tags').value = cur.slice(0, 12).join(', ');
  renderTagChips();
  onFormChange();
}

function applyData(d) {
  editor.restoring = true;
  renderCatPicker(d.categories);
  $('#f-tags').value = d.tags;
  updateTagSuggest();
  $('#f-title').value = d.title;
  $('#f-lead').value = d.lead;
  $('#f-image-caption').value = d.imageCaption;
  $('#f-image-source').value = d.imageSource;
  $('#f-review-on').checked = d.reviewOn;
  $('#f-review-score').value = d.reviewScore;
  $('#f-review-kind').value = d.reviewKind;
  $('#f-review-cover-same').checked = d.reviewCoverSame;
  setCover(d.reviewCover);
  $('#f-review-work').value = d.reviewWork;
  $('#f-review-artist').value = d.reviewArtist;
  $('#f-review-year').value = d.reviewYear;
  updateReviewUi();
  $('#f-author').value = d.author;
  $('#f-urgent').checked = d.urgent;
  $('#f-featured').checked = d.featured;
  $('#f-schedule-on').checked = d.scheduleOn;
  $('#f-schedule-at').value = d.scheduleAt;

  $('#infobox-rows').innerHTML = '';
  d.infobox.forEach(r => addInfoRow(r.label, r.value));
  setMainImage(d.image);

  if (d.content) {
    editor.quill.setContents(editor.quill.clipboard.convert(Sanitizer.upgradeQuotes(d.content)), 'silent');
  } else {
    editor.quill.setText('', 'silent');
  }
  editor.restoring = false;
  updateCounters();
  updateStats();
  updatePublishUi();
  renderTagChips();
  setTimeout(updateSizeMeter, 50);
}

function updateCounters() {
  const t = $('#f-title').value.length;
  const l = $('#f-lead').value.length;
  $('#c-title').textContent = `${t}/200`;
  $('#c-lead').textContent = `${l}/400`;
  $('#c-title').classList.toggle('warn', t > 180);
  $('#c-lead').classList.toggle('warn', l > 360);
}

function updateChecklist() {
  if (!editor.quill) return;
  const words = Utils.countWords(editor.quill.getText());
  const items = [
    { ok: $('#f-title').value.trim().length >= 10, text: 'Tytuł (min. 10 znaków)', req: true },
    { ok: $('#f-lead').value.trim().length >= 40, text: 'Lead (min. 40 znaków)', req: true },
    { ok: $$('#f-categories input:checked').length > 0, text: 'Kategoria', req: true },
    { ok: words >= 30, text: 'Treść (min. 30 słów)', req: true },
    { ok: !!$('#f-author').value.trim(), text: 'Autor', req: true },
    { ok: !!editor.image, text: 'Zdjęcie główne (zalecane)', req: false }
  ];
  if ($('#f-review-on').checked) {
    items.push({ ok: Utils.parseScore($('#f-review-score').value) !== null && !!$('#f-review-work').value.trim(), text: 'Recenzja: ocena i tytuł dzieła', req: true });
    items.push({ ok: $('#f-review-cover-same').checked ? !!editor.image : !!editor.cover, text: 'Recenzja: okładka', req: true });
  }
  $('#checklist').innerHTML = items.map(i =>
    `<li class="${i.ok ? 'ok' : (i.req ? 'todo' : 'opt')}"><span class="ck" aria-hidden="true">${i.ok ? '✓' : (i.req ? '○' : '–')}</span>${Utils.esc(i.text)}</li>`).join('');
}

const LEAD_STOP = new Set('i oraz a ale w we z ze na do od po za o u że to jest są był była było były się nie jak jako przez dla czy tak już tylko też także jego jej ich który która które którzy ten ta te tym tego tej tych mu go ją im co gdy gdzie bo więc lecz'.split(' '));

const leadMemory = { key: '', used: new Set() };

function leadSentences(plain) {
  return (plain.match(/[^.!?…]+(?:[.!?…]+|$)/g) || [])
    .map(x => x.trim())
    .filter(x => x.length > 25);
}

function leadTrim(text, max = 280) {
  text = text.replace(/\s+/g, ' ').trim();
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const end = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('! '), cut.lastIndexOf('? '));
  if (end > max * 0.5) return cut.slice(0, end + 1);
  return cut.replace(/[\s,;:–-]+\S*$/, '') + '…';
}

function leadCandidates(title, plain) {
  const sents = leadSentences(plain);
  const words = w => (w.toLowerCase().match(/[a-ząćęłńóśźż0-9]{4,}/g) || []).filter(x => !LEAD_STOP.has(x));
  const freq = new Map();
  words(plain).forEach(w => freq.set(w.slice(0, 5), (freq.get(w.slice(0, 5)) || 0) + 1));
  const titleKeys = new Set(words(title).map(w => w.slice(0, 5)));
  const scored = sents.map((t, i) => {
    const ws = words(t);
    const base = ws.reduce((n, w) => n + (freq.get(w.slice(0, 5)) || 0), 0) / Math.sqrt(ws.length + 3);
    const bonus = ws.filter(w => titleKeys.has(w.slice(0, 5))).length * 3;
    return { t, i, score: base + bonus + (i === 0 ? 2 : 0) };
  });
  const byScore = [...scored].sort((a, b) => b.score - a.score);
  const inOrder = list => [...list].sort((a, b) => a.i - b.i).map(x => x.t).join(' ');
  const out = [];
  if (sents.length) {
    out.push(sents.slice(0, 2).join(' '));
    out.push(sents[0]);
    out.push(inOrder(byScore.slice(0, 2)));
    out.push(inOrder(byScore.slice(0, 1)));
    if (byScore.length > 2) out.push(inOrder([scored[0], byScore.find(x => x.i !== 0) || byScore[1]]));
    const withFacts = scored.filter(x => /\d|„|"/.test(x.t));
    if (withFacts.length) out.push(inOrder([scored[0], withFacts[0]]));
    if (sents.length > 3) out.push(inOrder(byScore.slice(1, 3)));
    // losowe pary zdań – gdy zabraknie gotowych wariantów
    for (let k = 0; k < 6 && sents.length > 2; k++) {
      const a = Math.floor(Math.random() * Math.min(sents.length, 8));
      let b = Math.floor(Math.random() * Math.min(sents.length, 8));
      if (b === a) b = (b + 1) % Math.min(sents.length, 8);
      out.push(inOrder([scored[Math.min(a, b)], scored[Math.max(a, b)]]));
    }
  }
  // zawsze dostępne: różne długości początku tekstu
  [140, 190, 240, 300].forEach(n => out.push(leadTrim(plain, n)));
  return [...new Set(out.map(x => leadTrim(x)))].filter(x => x.length >= 30);
}

function generateLead() {
  const title = $('#f-title').value.trim();
  const plain = editor.quill.getText().replace(/\s+/g, ' ').trim();
  if (!plain && !title) { toast('Wpisz tytuł i trochę tekstu artykułu.'); return; }
  const key = title + '|' + plain.length;
  if (leadMemory.key !== key) { leadMemory.key = key; leadMemory.used = new Set(); }
  const current = $('#f-lead').value.trim();
  leadMemory.used.add(current);
  let pool = leadCandidates(title, plain).filter(x => !leadMemory.used.has(x));
  if (!pool.length) {            // wszystkie warianty już były – zaczynamy od nowa
    leadMemory.used = new Set([current]);
    pool = leadCandidates(title, plain).filter(x => x !== current);
  }
  const pick = pool.length ? pool[Math.floor(Math.random() * pool.length)] : (plain ? leadTrim(plain) : title);
  leadMemory.used.add(pick);
  $('#f-lead').value = pick.slice(0, 400);
  $('#btn-gen-lead').textContent = 'Wygeneruj inny';
  updateCounters();
  updateChecklist();
  onFormChange();
}

/** Wklejone lub przeciągnięte zdjęcia trafiają prosto do tekstu (bez okna dialogowego). */
async function insertImageFiles(files, index) {
  try {
    for (const file of files) {
      const src = await Utils.fileToDataUrl(file, 1400, 220);
      editor.quill.insertEmbed(index, 'figure', { src, caption: '', source: '' }, 'user');
      index += 1;
    }
    editor.quill.setSelection(index, 0, 'silent');
    toast('Zdjęcie wstawione – kliknij je w tekście, aby dodać podpis i źródło.' + imageNote());
  } catch (err) {
    toast(err.message || 'Nie udało się wstawić zdjęcia.', 'error');
  }
}

function updateStats() {
  if (!editor.quill) return;
  updateChecklist();
  const words = Utils.countWords(editor.quill.getText()) + Utils.countWords($('#f-lead').value);
  const minutes = Math.max(1, Math.ceil(words / 200));
  $('#editor-stats').textContent = `${words} słów · ok. ${minutes} min czytania`;
}

/** Miernik rozmiaru artykułu względem limitu dokumentu w bazie (ok. 1 MB). */
const SIZE_LIMIT_KB = 900;
function updateSizeMeter() {
  const el = $('#editor-size');
  if (!el || !editor.quill || !editor.active) return;
  const kb = Math.round(JSON.stringify(collectData()).length / 1024);
  const pct = Math.min(100, Math.round(kb / SIZE_LIMIT_KB * 100));
  el.className = 'editor-size' + (pct >= 90 ? ' is-full' : pct >= 70 ? ' is-warn' : '');
  el.innerHTML = `<span>Rozmiar artykułu: <strong>${kb} KB</strong> z ok. ${SIZE_LIMIT_KB} KB</span><span class="size-bar"><i style="width:${pct}%"></i></span>${pct >= 90 ? '<span>Za dużo – usuń część zdjęć albo wstaw je linkiem.</span>' : ''}`;
}
const updateSizeMeterSoon = Utils.debounce(updateSizeMeter, 700);

function updatePublishUi() {
  const on = $('#f-schedule-on').checked;
  $('#schedule-field').hidden = !on;
  const at = $('#f-schedule-at');
  at.min = Utils.toLocalInput(Date.now());
  if (on && !at.value) {
    // domyślnie jutro o 9:00
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(9, 0, 0, 0);
    at.value = Utils.toLocalInput(d);
  }
  const existingPublished = editor.existing && isPublished(editor.existing);
  $('#editor-save').textContent = on ? 'Zaplanuj publikację' : (existingPublished ? 'Zapisz zmiany' : 'Opublikuj');
  $('#publish-hint').textContent = on
    ? 'Artykuł pojawi się na stronie automatycznie o wskazanej godzinie.'
    : existingPublished
      ? `Artykuł jest opublikowany od ${Utils.formatDate(editor.existing.createdAt)}. Zmiany będą widoczne od razu.`
      : 'Artykuł zostanie opublikowany od razu po kliknięciu „Opublikuj”.';
}

function setStatus(text, kind = '') {
  const el = $('#save-status');
  el.textContent = text;
  el.className = 'save-status' + (kind ? ' ' + kind : '');
}

/* ---------- Edytor: autozapis (kopia w przeglądarce + wersja robocza w bazie) ---------- */
function captureContext() {
  return { session: editor.session, draftId: editor.draftId, articleId: editor.articleId, data: collectData() };
}

function writeBuffer() {
  if (!editor.active) return;
  clearTimeout(editor.bufferTimer);
  const ctx = captureContext();
  if (isEmptyData(ctx.data)) {
    Buffers.remove(ctx.draftId);
    clearPointer(ctx.draftId);
    return;
  }
  Buffers.set(ctx.draftId, { data: ctx.data, articleId: ctx.articleId, savedAt: new Date().toISOString() });
  if (!ctx.articleId) {
    try { localStorage.setItem(newPointerKey(), ctx.draftId); } catch { /* ignoruj */ }
  }
}

/** Zapisuje wersję roboczą w bazie. Zwraca true/false. */
async function persistDraft(ctx) {
  const draft = { id: ctx.draftId, articleId: ctx.articleId, ...ctx.data, savedAt: new Date().toISOString() };
  await DataService.saveDraft(draft);
  return draft;
}

async function saveCloudDraft(manual = false) {
  clearTimeout(editor.cloudTimer);
  editor.cloudTimer = null;
  if (!editor.active || !Auth.isAdmin()) return false;

  const ctx = captureContext();
  if (isEmptyData(ctx.data)) {
    if (manual) toast('Nie ma jeszcze czego zapisać.');
    return false;
  }
  const snap = JSON.stringify(ctx.data);
  if (!manual && snap === editor.lastCloud) { editor.dirty = false; return true; }

  try {
    const draft = await persistDraft(ctx);
    if (editor.session === ctx.session) {
      editor.lastCloud = snap;
      editor.dirty = JSON.stringify(collectData()) !== snap;
      setStatus('Wersja robocza zapisana o ' + Utils.formatTime(draft.savedAt), 'ok');
      if (!editor.dirty) Buffers.remove(ctx.draftId);
      else writeBuffer();
    }
    return true;
  } catch (err) {
    console.warn('Zapis wersji roboczej nie powiódł się:', err);
    if (editor.session === ctx.session) {
      writeBuffer();
      setStatus('Kopia zapisana w tej przeglądarce. Zapis w bazie nie powiódł się: ' + (err.message || 'błąd'), 'warn');
    }
    return false;
  }
}

function onFormChange() {
  if (!editor.active || editor.restoring) return;
  renderTagChipsSoon();
  updateSizeMeterSoon();
  editor.dirty = true;
  setStatus('Niezapisane zmiany…');
  clearTimeout(editor.bufferTimer);
  editor.bufferTimer = setTimeout(writeBuffer, CONFIG.BUFFER_DELAY);
  if (!editor.cloudTimer) editor.cloudTimer = setTimeout(() => saveCloudDraft(false), CONFIG.CLOUD_DRAFT_DELAY);
}

/** Wyjście z edytora (zmiana widoku): zapisuje to, co zostało napisane, jako wersję roboczą. */
function leaveEditor() {
  if (!editor.active) return;
  clearTimeout(editor.bufferTimer);
  clearTimeout(editor.cloudTimer);
  editor.cloudTimer = null;

  const ctx = captureContext();
  const needsSave = editor.dirty;
  editor.active = false;
  editor.dirty = false;

  if (isEmptyData(ctx.data)) {
    Buffers.remove(ctx.draftId);
    clearPointer(ctx.draftId);
    return;
  }
  if (!needsSave) {
    Buffers.remove(ctx.draftId);
    clearPointer(ctx.draftId);
    return;
  }

  // Najpierw kopia lokalna (synchronicznie), potem zapis w bazie
  Buffers.set(ctx.draftId, { data: ctx.data, articleId: ctx.articleId, savedAt: new Date().toISOString() });
  if (!Auth.isAdmin()) return;
  persistDraft(ctx)
    .then(() => {
      Buffers.remove(ctx.draftId);
      clearPointer(ctx.draftId);
      toast('Zapisano w wersjach roboczych.');
    })
    .catch(err => {
      console.warn('Nie udało się zapisać wersji roboczej przy wyjściu:', err);
      toast('Kopia zapisana tylko w tej przeglądarce. Sprawdź połączenie i reguły bazy.', 'error');
    });
}

/* ---------- Edytor: Quill ---------- */
function registerFigureBlot() {
  if (registerFigureBlot.done) return;
  const BlockEmbed = Quill.import('blots/block/embed');

  class FigureBlot extends BlockEmbed {
    static create(value) {
      const node = super.create();
      const wrap = document.createElement('div');
      wrap.className = 'fig-media';
      const img = document.createElement('img');
      img.setAttribute('src', value.src);
      img.setAttribute('alt', value.caption || '');
      wrap.appendChild(img);
      if (value.source) {
        const src = document.createElement('span');
        src.className = 'img-source';
        src.textContent = value.source;
        wrap.appendChild(src);
      }
      node.appendChild(wrap);
      if (value.caption) {
        const cap = document.createElement('figcaption');
        cap.textContent = value.caption;
        node.appendChild(cap);
      }
      return node;
    }
    static value(node) {
      const img = node.querySelector('img');
      const cap = node.querySelector('figcaption');
      const src = node.querySelector('.img-source');
      return { src: img ? img.getAttribute('src') : '', caption: cap ? cap.textContent : '', source: src ? src.textContent : '' };
    }
  }
  class QuoteBlot extends BlockEmbed {
    static create(value) {
      const node = super.create();
      const text = document.createElement('p');
      text.className = 'q-text';
      text.textContent = value.text || '';
      node.appendChild(text);
      if (value.author || value.source) {
        const by = document.createElement('p');
        by.className = 'q-by';
        if (value.author) {
          const a = document.createElement('span');
          a.className = 'q-author';
          a.textContent = value.author;
          by.appendChild(a);
        }
        if (value.source) {
          const src = document.createElement('span');
          src.className = 'q-source';
          src.textContent = value.source;
          by.appendChild(src);
        }
        node.appendChild(by);
      }
      return node;
    }
    static value(node) {
      const q = node.querySelector('.q-text');
      const a = node.querySelector('.q-author');
      const src = node.querySelector('.q-source');
      return { text: q ? q.textContent : '', author: a ? a.textContent : '', source: src ? src.textContent : '' };
    }
  }
  class EmbedBlot extends BlockEmbed {
    static create(value) {
      const node = super.create();
      node.setAttribute('data-kind', value.kind);
      node.setAttribute('data-id', value.id);
      node.setAttribute('contenteditable', 'false');
      const label = document.createElement('span');
      label.className = 'embed-label';
      label.textContent = (value.kind === 'youtube' ? '▶ Film z YouTube' : '♫ Odtwarzacz Spotify') + ' – kliknij, aby zmienić lub usunąć';
      node.appendChild(label);
      return node;
    }
    static value(node) { return { kind: node.getAttribute('data-kind') || '', id: node.getAttribute('data-id') || '' }; }
  }
  EmbedBlot.blotName = 'embed';
  EmbedBlot.tagName = 'aside';
  EmbedBlot.className = 'article-embed';
  Quill.register(EmbedBlot);

  QuoteBlot.blotName = 'pullquote';
  QuoteBlot.tagName = 'aside';
  QuoteBlot.className = 'article-quote';
  Quill.register(QuoteBlot);

  FigureBlot.blotName = 'figure';
  FigureBlot.tagName = 'figure';
  FigureBlot.className = 'article-figure';
  Quill.register(FigureBlot);
  registerFigureBlot.done = true;
}

/** Skróty w stylu Markdown: wpisanie znaczników na początku linii i spacji formatuje linię. */
function markdownLine(format, value) {
  return function (range, context) {
    const len = context.prefix.length;
    const start = range.index - len;
    this.quill.deleteText(start, len, 'user');
    this.quill.formatLine(start, 1, format, value, 'user');
  };
}

function initQuill() {
  if (editor.quill) return true;
  if (typeof Quill === 'undefined') {
    toast('Nie udało się załadować edytora (Quill). Sprawdź połączenie z internetem.', 'error');
    return false;
  }
  registerFigureBlot();
  editor.quill = new Quill('#quill', {
    theme: 'snow',
    placeholder: 'Zacznij pisać artykuł…',
    // Wklejany tekst (np. z Worda czy innej strony) zachowuje tylko prosty, wspólny wygląd
    formats: ['header', 'bold', 'italic', 'underline', 'strike', 'blockquote', 'list', 'indent', 'link', 'image', 'figure', 'pullquote', 'embed'],
    modules: {
      toolbar: {
        container: [
          [{ header: [2, 3, false] }],
          ['bold', 'italic', 'underline', 'strike'],
          ['pullquote', 'embed'],
          [{ list: 'ordered' }, { list: 'bullet' }, { indent: '-1' }, { indent: '+1' }],
          ['link', 'image'],
          ['clean']
        ],
        handlers: { image() { openImageModal(); }, pullquote() { openQuoteModal(); }, embed() { openEmbedModal(); } }
      },
      keyboard: {
        bindings: {
          markdownH2: { key: 32, collapsed: true, prefix: /^##$/, handler: markdownLine('header', 2) },
          markdownH3: { key: 32, collapsed: true, prefix: /^###$/, handler: markdownLine('header', 3) },
          markdownQuote: {
            key: 32, collapsed: true, prefix: /^>$/,
            handler(range, context) {
              this.quill.deleteText(range.index - context.prefix.length, context.prefix.length, 'user');
              openQuoteModal();
            }
          },
          markdownBullet: { key: 32, collapsed: true, prefix: /^[-*]$/, handler: markdownLine('list', 'bullet') },
          markdownOrdered: { key: 32, collapsed: true, prefix: /^1\.$/, handler: markdownLine('list', 'ordered') },
          // Enter na pustej linii cytatu kończy cytat (kolejne Entery wewnątrz cytatu go kontynuują)
          quoteExit: {
            key: 13, collapsed: true, empty: true, format: ['blockquote'],
            handler(range) { this.quill.formatLine(range.index, 1, 'blockquote', false, 'user'); }
          }
        }
      }
    }
  });

  const toolbar = editor.quill.getModule('toolbar').container;
  const titles = {
    '.ql-bold': 'Pogrubienie (Ctrl+B)',
    '.ql-italic': 'Kursywa (Ctrl+I)',
    '.ql-underline': 'Podkreślenie (Ctrl+U)',
    '.ql-strike': 'Przekreślenie',
    '.ql-pullquote': 'Cytat (ze źródłem i autorem)',
    '.ql-embed': 'Wstaw film z YouTube lub odtwarzacz Spotify',
    '.ql-list[value="ordered"]': 'Lista numerowana',
    '.ql-list[value="bullet"]': 'Lista punktowana',
    '.ql-indent[value="-1"]': 'Zmniejsz wcięcie',
    '.ql-indent[value="+1"]': 'Zwiększ wcięcie',
    '.ql-link': 'Wstaw link (Ctrl+K)',
    '.ql-image': 'Wstaw zdjęcie z podpisem',
    '.ql-clean': 'Wyczyść formatowanie'
  };
  const quoteBtn = toolbar.querySelector('.ql-pullquote');
  if (quoteBtn) {
    quoteBtn.innerHTML = '<svg viewBox="0 0 18 18"><path class="ql-fill" d="M3 4h5v5c0 2.5-1.4 4-4 4v-1.6c1.2-.2 1.9-1 1.9-2.4H3zM10 4h5v5c0 2.5-1.4 4-4 4v-1.6c1.2-.2 1.9-1 1.9-2.4H10z"/></svg>';
  }
  const embedBtn = toolbar.querySelector('.ql-embed');
  if (embedBtn) embedBtn.innerHTML = '<svg viewBox="0 0 18 18"><rect class="ql-stroke" x="2" y="3.5" width="14" height="11" rx="2.5" fill="none" stroke-width="1.6"/><path class="ql-fill" d="M7.5 6.6v4.8L11.6 9z"/></svg>';
  Object.entries(titles).forEach(([sel, title]) => {
    const b = toolbar.querySelector(sel);
    if (b) b.title = title;
  });

  // Wklejanie / przeciąganie zdjęć (nasłuch na kontenerze, żeby uprzedzić obsługę Quilla)
  const imgFiles = dt => Array.from((dt && dt.files) || []).filter(f => f.type.startsWith('image/'));
  editor.quill.container.addEventListener('paste', e => {
    const files = imgFiles(e.clipboardData);
    if (!files.length) return;
    e.preventDefault();
    e.stopPropagation();
    const sel = editor.quill.getSelection(true);
    insertImageFiles(files, sel ? sel.index : editor.quill.getLength() - 1);
  }, true);
  editor.quill.container.addEventListener('drop', e => {
    const files = imgFiles(e.dataTransfer);
    if (!files.length) return;
    e.preventDefault();
    e.stopPropagation();
    let index = editor.quill.getLength() - 1;
    const pos = document.caretRangeFromPoint ? document.caretRangeFromPoint(e.clientX, e.clientY) : null;
    if (pos) {
      const blot = Quill.find(pos.startContainer, true);
      if (blot) index = editor.quill.getIndex(blot) + (blot.length ? Math.min(pos.startOffset, blot.length() - 1) : 0);
    }
    insertImageFiles(files, index);
  }, true);

  editor.quill.on('text-change', () => {
    if (editor.restoring) return;
    updateStats();
    onFormChange();
  });

  // Kliknięcie zdjęcia w tekście: zmiana podpisu lub usunięcie
  editor.quill.root.addEventListener('click', e => {
    const qt = e.target.closest && e.target.closest('aside.article-quote');
    if (qt) {
      const qb = Quill.find(qt);
      if (qb) openQuoteModal({ index: editor.quill.getIndex(qb), ...qb.constructor.value(qb.domNode) });
      return;
    }
    const em = e.target.closest && e.target.closest('aside.article-embed');
    if (em) {
      const eb = Quill.find(em);
      if (eb) openEmbedModal({ index: editor.quill.getIndex(eb), ...eb.constructor.value(eb.domNode) });
      return;
    }
    const fig = e.target.closest && e.target.closest('figure.article-figure');
    if (!fig) return;
    const blot = Quill.find(fig);
    if (!blot) return;
    const val = blot.constructor.value(blot.domNode);
    openImageModal({ index: editor.quill.getIndex(blot), src: val.src, caption: val.caption, source: val.source });
  });

  return true;
}

/* ---------- Edytor: otwieranie ---------- */
async function openEditor(articleId, draftParam) {
  if (!Auth.isAdmin()) {
    location.hash = '#/';
    openModal('login-modal');
    return;
  }
  if (!initQuill()) { location.hash = '#/'; return; }

  const session = ++editor.session;
  editor.active = false;
  const form = $('#editor-form');
  form.classList.add('is-loading');

  let mode;
  let draftId;
  let base = null;
  const candidates = [];

  try {
    if (draftParam) {
      mode = 'draft';
      draftId = draftParam;
      const cloud = await DataService.getDraft(draftId).catch(() => null);
      const buf = Buffers.get(draftId);
      if (!cloud && !buf) throw new Error('not-found');
      articleId = (cloud && cloud.articleId) || (buf && buf.articleId) || null;
      if (cloud) candidates.push({ kind: 'cloud', savedAt: cloud.savedAt || '', data: normalizeData(cloud) });
      if (buf) candidates.push({ kind: 'buffer', savedAt: buf.savedAt || '', data: normalizeData(buf.data) });
      base = articleId ? state.articles.find(a => a.id === articleId) || null : null;
    } else if (articleId) {
      mode = 'edit';
      base = state.articles.find(a => a.id === articleId) || null;
      if (!base) throw new Error('not-found');
      draftId = editDraftId(articleId);
      const cloud = await DataService.getDraft(draftId).catch(() => null);
      const buf = Buffers.get(draftId);
      const baseTime = base.updatedAt || base.createdAt || '';
      if (cloud && String(cloud.savedAt) > baseTime) candidates.push({ kind: 'cloud', savedAt: cloud.savedAt, data: normalizeData(cloud) });
      if (buf && String(buf.savedAt) > baseTime) candidates.push({ kind: 'buffer', savedAt: buf.savedAt, data: normalizeData(buf.data) });
    } else {
      mode = 'new';
      let pointer = null;
      try { pointer = localStorage.getItem(newPointerKey()); } catch { /* ignoruj */ }
      const buf = pointer ? Buffers.get(pointer) : null;
      if (buf && !buf.articleId) {
        draftId = pointer;
        candidates.push({ kind: 'buffer', savedAt: buf.savedAt || '', data: normalizeData(buf.data) });
      } else {
        draftId = Utils.uid('d_');
      }
    }
  } catch (err) {
    if (session !== editor.session) return;
    form.classList.remove('is-loading');
    toast(err.message === 'not-found' ? 'Nie znaleziono artykułu lub wersji roboczej.' : 'Nie udało się otworzyć edytora.', 'error');
    location.hash = '#/panel';
    return;
  }
  if (session !== editor.session) return;

  candidates.sort((a, b) => String(b.savedAt).localeCompare(String(a.savedAt)));
  const chosen = candidates[0] || null;

  editor.mode = mode;
  editor.draftId = draftId;
  editor.articleId = articleId || null;
  editor.existing = base;

  applyData(chosen ? chosen.data : (base ? dataFromArticle(base) : emptyData()));

  editor.lastCloud = chosen && chosen.kind === 'cloud' ? JSON.stringify(collectData()) : '';
  editor.dirty = !!(chosen && chosen.kind === 'buffer');

  // Baner informujący o przywróceniu pracy
  const banner = $('#editor-banner');
  const discardBtn = $('#banner-discard');
  banner.hidden = true;
  if (chosen && chosen.kind === 'buffer') {
    $('#banner-text').textContent = `Przywrócono niezapisane zmiany z ${Utils.formatDate(chosen.savedAt)}.`;
    discardBtn.textContent = mode === 'draft' ? 'Odrzuć niezapisane zmiany' : (mode === 'edit' ? 'Wróć do opublikowanej wersji' : 'Zacznij od nowa');
    banner.hidden = false;
  } else if (chosen && chosen.kind === 'cloud' && mode === 'edit') {
    $('#banner-text').textContent = `Wczytano wersję roboczą zmian z ${Utils.formatDate(chosen.savedAt)}.`;
    discardBtn.textContent = 'Wróć do opublikowanej wersji';
    banner.hidden = false;
  }

  $('#editor-heading').textContent = mode === 'new' ? 'Nowy artykuł' : (articleId ? 'Edycja artykułu' : 'Wersja robocza');
  setStatus(chosen && chosen.kind === 'cloud' ? 'Wersja robocza zapisana o ' + Utils.formatTime(chosen.savedAt) : '');

  editor.active = true;
  form.classList.remove('is-loading');
  if (mode === 'new' && !chosen) $('#f-title').focus();
}

async function discardRestored() {
  if (!confirm('Odrzucić przywrócone zmiany? Tej operacji nie można cofnąć.')) return;
  const id = editor.draftId;
  Buffers.remove(id);
  clearPointer(id);

  let data;
  if (editor.mode === 'draft') {
    const cloud = await DataService.getDraft(id).catch(() => null);
    data = cloud ? normalizeData(cloud) : (editor.existing ? dataFromArticle(editor.existing) : emptyData());
  } else {
    await DataService.removeDraft(id).catch(() => {});
    data = editor.existing ? dataFromArticle(editor.existing) : emptyData();
  }
  applyData(data);
  editor.dirty = false;
  editor.lastCloud = editor.mode === 'draft' ? JSON.stringify(collectData()) : '';
  $('#editor-banner').hidden = true;
  setStatus('');
}

/* ---------- Edytor: publikacja, podgląd, zdjęcia ---------- */
async function saveArticle(e) {
  e.preventDefault();
  if (!editor.active) return;
  if (!Auth.isAdmin()) { toast('Sesja wygasła – zaloguj się ponownie.', 'error'); return; }

  const d = collectData();
  const title = d.title.trim();
  const lead = d.lead.trim();
  const author = d.author.trim();

  if (!title) { toast('Podaj tytuł artykułu.', 'error'); $('#f-title').focus(); return; }
  if (!lead) { toast('Uzupełnij lead (zajawkę).', 'error'); $('#f-lead').focus(); return; }
  if (!author) { toast('Podaj autora.', 'error'); $('#f-author').focus(); return; }
  if (!d.content) { toast('Treść artykułu jest pusta.', 'error'); editor.quill.focus(); return; }
  if (!d.categories.length) { toast('Wybierz co najmniej jedną kategorię.', 'error'); return; }

  let review = null;
  if (d.reviewOn) {
    const score = Utils.parseScore(d.reviewScore);
    if (score === null) { toast('Ocena musi być liczbą od 0 do 10 (np. 6,4).', 'error'); $('#f-review-score').focus(); return; }
    if (!d.reviewWork.trim()) { toast('Podaj tytuł ocenianego dzieła.', 'error'); $('#f-review-work').focus(); return; }
    if (d.reviewCoverSame && !d.image) { toast('Zaznaczono okładkę jak zdjęcie główne, ale artykuł nie ma zdjęcia głównego.', 'error'); return; }
    if (!d.reviewCoverSame && !d.reviewCover) { toast('Dodaj okładkę recenzji albo zaznacz, że ma być taka jak zdjęcie główne.', 'error'); $('#f-review-cover-url').focus(); return; }
    review = {
      score,
      coverSame: d.reviewCoverSame,
      cover: d.reviewCoverSame ? '' : d.reviewCover,
      kind: d.reviewKind.trim(),
      work: d.reviewWork.trim(),
      artist: d.reviewArtist.trim(),
      year: d.reviewYear.trim()
    };
  }

  let createdAt;
  if (d.scheduleOn) {
    const when = new Date(d.scheduleAt);
    if (!d.scheduleAt || isNaN(when)) { toast('Wybierz datę i godzinę publikacji.', 'error'); $('#f-schedule-at').focus(); return; }
    if (when.getTime() <= Date.now() + 30000) {
      toast('Data publikacji musi być w przyszłości. Odznacz planowanie, aby opublikować od razu.', 'error');
      $('#f-schedule-at').focus();
      return;
    }
    createdAt = when.toISOString();
  } else if (editor.existing && isPublished(editor.existing)) {
    createdAt = editor.existing.createdAt;
  } else {
    createdAt = new Date().toISOString();
  }

  const article = {
    id: editor.articleId || Utils.uid(),
    title,
    lead,
    category: d.categories[0],
    categories: d.categories,
    tags: Utils.parseTags(d.tags),
    author,
    image: d.image,
    imageCaption: d.imageCaption.trim(),
    imageSource: d.imageSource.trim(),
    review,
    urgent: d.urgent,
    featured: d.featured,
    infobox: d.infobox.map(r => ({ label: r.label.trim(), value: r.value.trim() })).filter(r => r.label && r.value),
    content: d.content,
    createdAt,
    updatedAt: new Date().toISOString()
  };

  const buttons = [$('#editor-save'), $('#btn-save-draft')];
  buttons.forEach(b => { b.disabled = true; });
  try {
    await DataService.save(article);
    upsertLocalState(article);
    try { localStorage.setItem(CONFIG.AUTHOR_KEY, author); } catch { /* ignoruj */ }

    rememberTags(article.tags);

    // Tylko jeden artykuł może być Tematem dnia – poprzedni zostaje automatycznie odznaczony
    let unfeatured = 0;
    if (article.featured && isPublished(article)) {
      for (const other of state.articles.filter(x => x.id !== article.id && x.featured && isPublished(x))) {
        try {
          const cleared = { ...other, featured: false };
          await DataService.save(cleared);
          upsertLocalState(cleared);
          unfeatured++;
        } catch (err) {
          console.warn('Nie udało się odznaczyć poprzedniego Tematu dnia:', err);
        }
      }
    }

    // Artykuł jest zapisany – wersja robocza nie jest już potrzebna
    const draftId = editor.draftId;
    clearTimeout(editor.bufferTimer);
    clearTimeout(editor.cloudTimer);
    editor.cloudTimer = null;
    editor.active = false;
    editor.dirty = false;
    Buffers.remove(draftId);
    clearPointer(draftId);
    DataService.removeDraft(draftId).catch(() => {});

    if (d.scheduleOn) {
      toast('Publikacja zaplanowana na ' + Utils.formatDate(createdAt) + '.');
      location.hash = '#/panel';
    } else {
      toast((editor.existing ? 'Zmiany zapisane.' : 'Artykuł opublikowany.') + (unfeatured ? ' Poprzedni Temat dnia został odznaczony.' : ''));
      location.hash = '#/artykul/' + encodeURIComponent(article.id);
    }
  } catch (err) {
    console.error(err);
    toast(err.message || 'Nie udało się zapisać artykułu.', 'error');
  } finally {
    buttons.forEach(b => { b.disabled = false; });
  }
}

function openPreview() {
  if (!editor.active) return;
  const d = collectData();
  const when = d.scheduleOn && d.scheduleAt ? new Date(d.scheduleAt) : null;
  const created = when && !isNaN(when)
    ? when.toISOString()
    : (editor.existing && isPublished(editor.existing) ? editor.existing.createdAt : new Date().toISOString());
  const preview = {
    id: 'preview',
    title: d.title.trim() || '(bez tytułu)',
    lead: d.lead.trim(),
    category: d.categories[0] || '',
    categories: d.categories,
    author: d.author.trim() || '(autor)',
    image: d.image,
    imageCaption: d.imageCaption.trim(),
    imageSource: d.imageSource.trim(),
    review: d.reviewOn && Utils.parseScore(d.reviewScore) !== null
      ? { score: Utils.parseScore(d.reviewScore), coverSame: d.reviewCoverSame, cover: d.reviewCoverSame ? '' : d.reviewCover, kind: d.reviewKind.trim(), work: d.reviewWork.trim() || '(tytuł)', artist: d.reviewArtist.trim(), year: d.reviewYear.trim() }
      : null,
    urgent: d.urgent,
    featured: d.featured,
    infobox: d.infobox.map(r => ({ label: r.label.trim(), value: r.value.trim() })),
    content: d.content,
    createdAt: created,
    updatedAt: created
  };
  $('#preview-body').innerHTML = articleHtml(preview, Utils.stripHtml(d.content));
  openModal('preview-modal');
}

function openImageModal(edit) {
  const isEdit = !!edit && typeof edit.index === 'number';
  editor.editingFigure = isEdit ? edit.index : null;
  editor.range = isEdit ? null : editor.quill.getSelection(true);

  const src = isEdit ? edit.src : '';
  $('#image-title').textContent = isEdit ? 'Zdjęcie w tekście' : 'Wstaw zdjęcie do tekstu';
  $('#im-submit').textContent = isEdit ? 'Zapisz' : 'Wstaw';
  $('#im-delete').hidden = !isEdit;
  $('#im-url').value = src && !src.startsWith('data:') ? src : '';
  $('#im-file').value = '';
  $('#im-caption').value = isEdit ? edit.caption : '';
  $('#im-source').value = isEdit ? edit.source || '' : '';
  $('#im-error').hidden = true;
  setModalImage(src);
  openModal('image-modal');
}

function setModalImage(src) {
  editor.modalImage = src || '';
  const box = $('#im-preview');
  box.hidden = !editor.modalImage;
  if (editor.modalImage) $('img', box).src = editor.modalImage;
}

function insertImageIntoEditor(e) {
  e.preventDefault();
  const src = editor.modalImage || $('#im-url').value.trim();
  const err = $('#im-error');
  if (!src) {
    err.textContent = 'Podaj adres URL lub wybierz plik ze zdjęciem.';
    err.hidden = false;
    return;
  }
  const caption = $('#im-caption').value.trim();
  const source = $('#im-source').value.trim();
  if (editor.editingFigure !== null) {
    const index = editor.editingFigure;
    editor.quill.deleteText(index, 1, 'user');
    editor.quill.insertEmbed(index, 'figure', { src, caption, source }, 'user');
  } else {
    const index = editor.range ? editor.range.index : Math.max(0, editor.quill.getLength() - 1);
    editor.quill.insertEmbed(index, 'figure', { src, caption, source }, 'user');
    editor.quill.setSelection(index + 1, 0, 'silent');
  }
  closeModal('image-modal');
}

function openQuoteModal(edit) {
  const isEdit = !!edit && typeof edit.index === 'number';
  editor.editingQuote = isEdit ? edit.index : null;
  editor.range = isEdit ? null : editor.quill.getSelection(true);
  $('#quote-title').textContent = isEdit ? 'Edytuj cytat' : 'Wstaw cytat';
  $('#qm-submit').textContent = isEdit ? 'Zapisz' : 'Wstaw';
  $('#qm-delete').hidden = !isEdit;
  $('#qm-text').value = isEdit ? edit.text : '';
  $('#qm-source').value = isEdit ? edit.source : '';
  $('#qm-author').value = isEdit ? edit.author : '';
  $('#qm-error').hidden = true;
  openModal('quote-modal');
}

function submitQuote(e) {
  e.preventDefault();
  const text = $('#qm-text').value.trim();
  if (!text) {
    $('#qm-error').textContent = 'Wpisz treść cytatu.';
    $('#qm-error').hidden = false;
    return;
  }
  const value = { text, source: $('#qm-source').value.trim(), author: $('#qm-author').value.trim() };
  if (editor.editingQuote !== null) {
    const index = editor.editingQuote;
    editor.quill.deleteText(index, 1, 'user');
    editor.quill.insertEmbed(index, 'pullquote', value, 'user');
  } else {
    const index = editor.range ? editor.range.index : Math.max(0, editor.quill.getLength() - 1);
    editor.quill.insertEmbed(index, 'pullquote', value, 'user');
    editor.quill.setSelection(index + 1, 0, 'silent');
  }
  closeModal('quote-modal');
}

function openEmbedModal(edit) {
  const isEdit = !!edit && typeof edit.index === 'number';
  editor.editingEmbed = isEdit ? edit.index : null;
  editor.range = isEdit ? null : editor.quill.getSelection(true);
  $('#em-submit').textContent = isEdit ? 'Zapisz' : 'Wstaw';
  $('#em-delete').hidden = !isEdit;
  $('#em-url').value = isEdit ? Embeds.link(edit.kind, edit.id) : '';
  $('#em-error').hidden = true;
  openModal('embed-modal');
}

function submitEmbed(e) {
  e.preventDefault();
  const v = Embeds.parse($('#em-url').value);
  if (!v) {
    $('#em-error').textContent = 'To nie wygląda na link do YouTube ani Spotify. Wklej adres filmu, utworu, albumu, playlisty lub odcinka.';
    $('#em-error').hidden = false;
    return;
  }
  if (editor.editingEmbed !== null) {
    const index = editor.editingEmbed;
    editor.quill.deleteText(index, 1, 'user');
    editor.quill.insertEmbed(index, 'embed', v, 'user');
  } else {
    const index = editor.range ? editor.range.index : Math.max(0, editor.quill.getLength() - 1);
    editor.quill.insertEmbed(index, 'embed', v, 'user');
    editor.quill.setSelection(index + 1, 0, 'silent');
  }
  closeModal('embed-modal');
}

function deleteEmbed() {
  if (editor.editingEmbed === null) return;
  editor.quill.deleteText(editor.editingEmbed, 1, 'user');
  closeModal('embed-modal');
}

function deleteQuote() {
  if (editor.editingQuote === null) return;
  editor.quill.deleteText(editor.editingQuote, 1, 'user');
  closeModal('quote-modal');
}

function deleteFigure() {
  if (editor.editingFigure === null) return;
  editor.quill.deleteText(editor.editingFigure, 1, 'user');
  closeModal('image-modal');
}

/* ---------- Routing ---------- */
function showView(name) {
  ['home', 'article', 'panel', 'editor', 'settings', 'ranking', 'notfound', 'tip', 'legal', 'saved'].forEach(v => { $('#view-' + v).hidden = v !== name; });
  $('#layout').dataset.view = name;
}

function refreshViews() {
  if (!state.ready) return;
  renderBreaking();
  renderSideList();
  const route = currentRoute();
  if (route.name === 'home') renderHome();
  else if (route.name === 'article') renderArticleView(route.id);
  else if (route.name === 'ranking') renderRanking();
  else if (route.name === 'panel') renderPanel();
}

/** Pamięta miejsce na liście: po wejściu w artykuł i cofnięciu wracasz dokładnie tam, gdzie byłeś. */
const ScrollMemory = { cur: location.hash || '#/', prev: '', n: 0, pos: {} };
const LIST_ROUTES = /^#\/($|kategoria|tag|artysta|ranking|zapisane)/;

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
  window.scrollTo({ top: 0, behavior: 'instant' });
  void document.body.offsetHeight;
  document.title = `${CONFIG.SITE_NAME} – najświeższe wiadomości`;

  if ((r.name === 'editor' || r.name === 'panel' || r.name === 'settings') && !Auth.isAdmin()) {
    location.hash = '#/';
    openModal('login-modal');
    return;
  }

  $$('.main-nav .nav-link').forEach(l => l.classList.toggle('is-active',
    (l.id === 'nav-ranking' && r.name === 'ranking') || (l.id === 'nav-home' && r.name === 'home' && !r.tag && !r.artist && !r.category)));

  if (r.name === 'article') {
    showView('article');
    renderArticleView(r.id);
  } else if (r.name === 'ranking') {
    showView('ranking');
    document.title = `Ranking ocen – ${CONFIG.SITE_NAME}`;
    setMeta('Ranking ocen', 'Wszystkie recenzje Śliska News od najwyżej ocenianych.');
    renderRanking();
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
  } else if (r.name === 'settings') {
    showView('settings');
    document.title = `Ustawienia konta – ${CONFIG.SITE_NAME}`;
    renderSettings();
  } else if (r.name === 'panel') {
    showView('panel');
    document.title = `Robocze i zaplanowane – ${CONFIG.SITE_NAME}`;
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
    const collChanged = (r.tag || '') !== state.tag || (r.artist || '') !== state.artist;
    state.tag = r.tag || '';
    state.artist = r.artist || '';
    if (collChanged) state.visible = CONFIG.PAGE_SIZE;
    updateCategoryNav();
    if (r.tag) { document.title = `#${r.tag} – ${CONFIG.SITE_NAME}`; setMeta(`#${r.tag}`, `Artykuły z tagiem ${r.tag} w Śliska News.`); }
    else if (r.artist) { document.title = `${r.artist} – ${CONFIG.SITE_NAME}`; setMeta(r.artist, `Wszystkie teksty i recenzje o ${r.artist} w Śliska News.`); }
    else setMeta();
    renderHome();
  }
  renderSideList();
  updateSavedNav();
  updateScrollUi();
}

/* ---------- Kategorie ---------- */
function buildCategoryNav() {
  $('#category-nav').innerHTML = [ALL, ...CATEGORIES].map(c =>
    `<button type="button" class="chip-btn" data-category="${Utils.esc(c)}">${Utils.esc(c)}</button>`).join('');
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
  const rn = currentRoute().name;
  // Utrata uprawnień (np. wylogowanie) w widoku dla redakcji – wróć na stronę główną
  if (state.ready && (rn === 'editor' || rn === 'panel' || rn === 'settings') && !Auth.isAdmin()) {
    location.hash = '#/';
    return;
  }
  if (Auth.isAdmin()) loadProfile(); else renderProfile();
  refreshViews();
}

/* ---------- Profil redaktora (nazwa i zdjęcie) ---------- */
function avatarHtml(p) {
  if (p.avatar) return `<img src="${Utils.esc(p.avatar)}" alt="">`;
  const initials = (p.name || 'R').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
  return `<span>${Utils.esc(initials || 'R')}</span>`;
}

function renderProfile() {
  $('#profile-name').textContent = state.profile.name || 'Redaktor';
  $('#profile-avatar').innerHTML = avatarHtml(state.profile);
}

async function loadProfile() {
  if (state.profileLoaded) { renderProfile(); return; }
  state.profileLoaded = true;
  const cached = readLocalProfile();
  if (cached) state.profile = { name: cached.name || '', avatar: cached.avatar || '' };
  renderProfile();
  try {
    const remote = await DataService.getProfile();
    if (remote) {
      state.profile = { name: remote.name || '', avatar: remote.avatar || '' };
      writeLocalProfile(state.profile);
      renderProfile();
    }
  } catch (err) {
    console.warn('Nie udało się pobrać profilu:', err);
  }
}

let settingsAvatar = '';
function renderSettings() {
  settingsAvatar = state.profile.avatar || '';
  $('#st-name').value = state.profile.name || '';
  $('#st-error').hidden = true;
  $('#st-avatar-file').value = '';
  updateSettingsAvatar();
}

function updateSettingsAvatar() {
  $('#st-avatar').innerHTML = avatarHtml({ name: $('#st-name').value || state.profile.name, avatar: settingsAvatar });
  $('#st-avatar-remove').hidden = !settingsAvatar;
}

async function saveSettings(e) {
  e.preventDefault();
  const err = $('#st-error');
  err.hidden = true;
  const next = { name: $('#st-name').value.trim().slice(0, 60), avatar: settingsAvatar };
  const btn = $('#st-save');
  btn.disabled = true;
  try {
    await DataService.saveProfile(next);
    state.profile = next;
    writeLocalProfile(next);
    renderProfile();
    toast('Ustawienia zapisane.');
  } catch (ex) {
    console.error(ex);
    err.textContent = ex.message || 'Nie udało się zapisać ustawień.';
    err.hidden = false;
  } finally {
    btn.disabled = false;
  }
}

/* ---------- Akcje (przyciski z data-action) ---------- */
function handleAction(action, id) {
  if (action === 'save') {
    const now = Saved.toggle(id);
    if (now === null) return;
    toast(now ? 'Zapisano na później.' : 'Usunięto z zapisanych.');
    const r = currentRoute();
    if (r.name === 'saved') renderSaved(); else if (r.name === 'article') renderArticleView(r.id);
    return;
  }
  if (action === 'share') { shareArticle(id); return; }
  if (action === 'ig-post') { makeInstagramPost(id, document.activeElement && document.activeElement.dataset && document.activeElement.dataset.action === 'ig-post' ? document.activeElement : null); return; }
  if (action === 'copy-link') { copyLink(id); return; }
  if (action === 'clear-search') {
    state.query = '';
    $('#search-input').value = '';
    goHomeAndRender();
    return;
  }
  if (!Auth.isAdmin()) return;
  if (action === 'delete-tip') { deleteTip(id); return; }
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
      handleAction(actionBtn.dataset.action, actionBtn.dataset.id);
      return;
    }
    const tile = e.target.closest('.card, .hero, .tile, .side-item');
    if (tile && !e.target.closest('a, button')) {
      location.hash = '#/artykul/' + encodeURIComponent(tile.dataset.id);
    }
  });

  // Przyciski nawigacji
  $('#btn-login').addEventListener('click', () => {
    $('#login-error').hidden = true;
    $('#login-password').value = '';
    openModal('login-modal');
  });
  $('#btn-logout').addEventListener('click', async () => {
    await Auth.logout();
    if (['editor', 'panel', 'settings'].includes(currentRoute().name)) location.hash = '#/';
    applyAuthUI();
    toast('Wylogowano.');
  });
  $('#btn-new').addEventListener('click', () => { location.hash = '#/edytor'; });
  $('#panel-new').addEventListener('click', () => { location.hash = '#/edytor'; });
  $('#btn-panel').addEventListener('click', () => { location.hash = '#/panel'; });
  $('#btn-settings').addEventListener('click', () => { location.hash = '#/ustawienia'; });

  // Ustawienia konta
  $('#settings-form').addEventListener('submit', saveSettings);
  $('#st-name').addEventListener('input', updateSettingsAvatar);
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
  $('#qm-delete').addEventListener('click', deleteQuote);
  $('#embed-form').addEventListener('submit', submitEmbed);
  $('#em-delete').addEventListener('click', deleteEmbed);

  // Przewijany pasek PILNE – dopasowanie po zmianie rozmiaru okna
  window.addEventListener('resize', Utils.debounce(fitTicker, 150));
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitTicker);

  // Logowanie
  $('#login-form').addEventListener('submit', async e => {
    e.preventDefault();
    const emailInput = $('#login-email');
    const input = $('#login-password');
    const errEl = $('#login-error');
    const submit = $('button[type="submit"]', $('#login-form'));
    errEl.hidden = true;
    submit.disabled = true;
    try {
      await Auth.login(emailInput.value.trim(), input.value);
      closeModal('login-modal');
      input.value = '';
      applyAuthUI();
      toast('Zalogowano jako redaktor.');
    } catch (err) {
      console.warn('Logowanie nieudane:', err.code || err);
      errEl.textContent = Auth.explain(err);
      errEl.hidden = false;
      input.select();
    } finally {
      submit.disabled = false;
    }
  });

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
  $('#btn-gen-lead').addEventListener('click', generateLead);

  $('#editor-cancel').addEventListener('click', () => {
    location.hash = editor.articleId ? '#/artykul/' + encodeURIComponent(editor.articleId) : '#/panel';
  });
  $('#btn-save-draft').addEventListener('click', manualSaveDraft);
  $('#btn-preview').addEventListener('click', openPreview);
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

  $('#infobox-add').addEventListener('click', () => { addInfoRow(); onFormChange(); });
  $('#infobox-rows').addEventListener('click', e => {
    const rm = e.target.closest('.info-remove');
    if (rm) { rm.closest('.info-row').remove(); onFormChange(); }
  });

  // Zdjęcie główne
  $('#f-image-url').addEventListener('input', e => {
    const v = e.target.value.trim();
    editor.image = v;
    const box = $('#f-image-preview');
    box.hidden = !v;
    if (v) $('img', box).src = v;
  });
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
      refreshViews();
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
  $('#tag-chips').addEventListener('click', e => {
    const b = e.target.closest('[data-tag]');
    if (b) toggleTag(b.dataset.tag);
  });
  $('#backup-export').addEventListener('click', exportBackup);
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
  renderCatPicker([]);
  buildCategoryNav();
  bindEvents();
  document.body.classList.toggle('is-admin', Auth.isAdmin());

  await DataService.init();
  Auth.mode = DataService.mode;
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
  }
  state.ready = true;
  if (Auth.isAdmin()) loadProfile();
  Auth.onChange(() => applyAuthUI());

  // Informacja o trybie danych widoczna tylko dla zalogowanej redakcji
  $('#data-mode').textContent = DataService.mode === 'firebase'
    ? 'Baza danych: Firebase Firestore'
    : DataService.mode === 'local'
      ? 'Tryb demonstracyjny: dane tylko w tej przeglądarce'
      : 'Brak połączenia z bazą danych';

  renderBreaking();
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
function initStickyVars() {
  const root = document.documentElement;
  const header = $('.site-header');
  const head = $('.editor-head');
  const update = () => {
    root.style.setProperty('--hdr-h', Math.round(header ? header.getBoundingClientRect().height : 64) + 'px');
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
