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
  // Osobny podgląd linku dla każdego artykułu (Facebook, Messenger, X, Threads…).
  // Ustaw na true dopiero po wdrożeniu og-worker.js w Cloudflare (patrz INSTRUKCJA.md).
  OG_WORKER: true,
  FIREBASE_OG_COLLECTION: 'og',
  // Oceny czytelników i powiadomienia push – działają przez Cloudflare Worker (patrz INSTRUKCJA.md)
  API_BASE: '/news/api',

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
    authDomain: 'sliska-users.firebaseapp.com',
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
    CONTACT_EMAIL: 'sliska10@wp.pl',
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
  async updateTip(id, patch) {
    this._set(CONFIG.LOCAL_TIPS_KEY, this._get(CONFIG.LOCAL_TIPS_KEY).map(t => t.id === id ? { ...t, ...patch } : t));
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

    // Zalogowany redaktor zostaje zalogowany, dopóki sam się nie wyloguje
    try {
      await this.auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
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

  async saveProfile(p) {
    if (!this.auth.currentUser) throw new Error('Zaloguj się, aby zapisać ustawienia.');
    try {
      await this.db.collection('meta').doc('profile_' + this.auth.currentUser.uid).set(p);
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

  async saveOg(id, img) {
    if (!this.auth.currentUser) return;
    await this.db.collection(CONFIG.FIREBASE_OG_COLLECTION).doc(id).set({ img, updatedAt: new Date().toISOString() });
  },
  async removeOg(id) {
    if (!this.auth.currentUser) return;
    await this.db.collection(CONFIG.FIREBASE_OG_COLLECTION).doc(id).delete();
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
    try { return localStorage.getItem(CONFIG.SESSION_KEY) === '1'; } catch { return false; }
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
    try { localStorage.setItem(CONFIG.SESSION_KEY, '1'); } catch { /* ignoruj */ }
  },

  async logout() {
    if (this.mode === 'firebase') {
      try { await FirebaseProvider.auth.signOut(); } catch (e) { console.warn(e); }
      return;
    }
    try { localStorage.removeItem(CONFIG.SESSION_KEY); sessionStorage.removeItem(CONFIG.SESSION_KEY); } catch { /* ignoruj */ }
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
const isStaffActor = () => !(typeof Readers !== 'undefined' && Readers.user) && Auth.isAdmin() && !!(FirebaseProvider.auth && FirebaseProvider.auth.currentUser);
const staffName = () => isStaffActor() ? ((state.profile && state.profile.name) || 'Redakcja') : undefined;
async function actorApi(path, opts = {}) {
  const r = await fetch(CONFIG.API_BASE + path, { ...opts, headers: { 'content-type': 'application/json', ...(await actorAuth()), ...(opts.headers || {}) }, cache: 'no-store' });
  let d = {}; try { d = await r.json(); } catch { /* ignoruj */ }
  if (!r.ok) { const e = new Error(d.error || 'http'); e.error = d.error || 'http'; e.data = d; throw e; }
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
  supported() { return location.protocol === 'https:' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window; },
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

async function updatePushButton() {
  const b = $('#btn-push');
  if (!b) return;
  const usable = Push.supported() || (Push.isIos() && !Push.standalone());
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
  if (parts[0] === 'kategoria' && parts[1]) return { name: 'home', category: decodeURIComponent(parts[1]) };
  if (parts[0] === 'tag' && parts[1]) return { name: 'home', tag: decodeURIComponent(parts[1]) };
  if (parts[0] === 'artysta' && parts[1]) return { name: 'home', artist: decodeURIComponent(parts[1]) };
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

function filteredArticles() {
  const q = state.query.trim();
  return publishedArticles().filter(a => {
    if (state.category !== ALL && !Utils.catsOf(a).includes(state.category)) return false;
    if (state.tag && !Utils.tagsOf(a).some(t => Utils.same(t, state.tag))) return false;
    if (state.artist && !(a.review && Utils.same(a.review.artist, state.artist)) && !Utils.tagsOf(a).some(t => Utils.same(t, state.artist))) return false;
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

function heroHtml(a, useCover) {
  const id = encodeURIComponent(a.id);
  return `<section class="hero" data-id="${Utils.esc(a.id)}" aria-label="Temat dnia">
    <img class="hero-img" fetchpriority="high" decoding="async" src="${Utils.esc(thumbFor(a, useCover))}"${imgFocus(a, thumbFor(a, useCover))} alt="" data-cat="${Utils.esc(Utils.catsOf(a)[0] || '')}">
    <div class="hero-tags"><span class="hero-flag">Temat dnia</span>${Utils.chipsHtml(a)}</div>
    <div class="hero-content">
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
    status.innerHTML = '<div class="empty-state">Nie udało się wczytać wiadomości. Odśwież stronę za chwilę.</div>';
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
  const coll = r.name === 'home' && (state.tag || state.artist);
  const onCategory = r.name === 'home' && (state.category !== ALL || coll) && !state.query.trim();
  const visibleHere = r.name === 'article' || onCategory;
  // Pomijamy artykuły z kategorii, w której jesteśmy (i bieżący artykuł)
  const ctx = (r.name === 'article' || r.name === 'home') ? state.category : ALL;
  const list = publishedArticles()
    .filter(a => a.id !== current && (ctx === ALL || !Utils.catsOf(a).includes(ctx)))
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
  if (!photo && state.profile.avatar && state.profile.showPhoto !== false && a.author && a.author === state.profile.name) photo = state.profile.avatar;
  return `<span class="avatar avatar-sm" aria-hidden="true">${avatarHtml({ name: a.author, avatar: photo })}</span>`;
}

/** Zmniejsza zdjęcie profilowe do miniatury (żeby nie obciążać każdego artykułu). */
function shrinkAvatar(src, size = 96) {
  return new Promise(resolve => {
    if (!src) { resolve(''); return; }
    const img = new Image();
    img.onload = () => {
      try {
        const c = document.createElement('canvas');
        c.width = c.height = size;
        const s = Math.min(img.naturalWidth, img.naturalHeight) || size;
        c.getContext('2d').drawImage(img, (img.naturalWidth - s) / 2, (img.naturalHeight - s) / 2, s, s, 0, 0, size, size);
        resolve(c.toDataURL('image/jpeg', 0.8));
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
          <span class="author-line">${authorAvatarHtml(a)}<strong>${Utils.esc(a.author)}</strong></span>
          <time datetime="${Utils.esc(a.createdAt)}">${Utils.formatDate(a.createdAt)}</time>
          <span>${minutes} min czytania</span>
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
    ${pagerHtml}
    ${relatedHtml}`;
  enhanceGalleries(el);
  $('#side-comments').innerHTML = '';
  initReaderVote(a);
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
  try { await Promise.all([document.fonts.load(`800 80px ${family}`), document.fonts.load(`700 30px ${family}`)]); } catch {}
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
  try { await Promise.all([document.fonts.load(`800 80px ${family}`), document.fonts.load(`700 30px ${family}`)]); } catch {}
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


/* ---------- Karuzela: katalog slajdów do wyboru ---------- */
const IG_SLIDES = [
  { k: 'cover',    name: 'Okładka',        desc: 'zdjęcie + tytuł',     file: 'okladka' },
  { k: 'title',    name: 'Sam tytuł',      desc: 'wielka typografia',   file: 'tytul' },
  { k: 'photo',    name: 'Zdjęcie',        desc: 'bez tekstu',          file: 'zdjecie' },
  { k: 'photoquote', name: 'Cytat na zdjęciu', desc: 'zdjęcie + cytat',   file: 'cytat-zdjecie' },
  { k: 'photolead', name: 'Zajawka na zdjęciu', desc: 'zdjęcie + skrót', file: 'zajawka-zdjecie' },
  { k: 'lead',     name: 'W skrócie',      desc: 'zajawka artykułu',    file: 'w-skrocie' },
  { k: 'sentence', name: 'Kluczowe zdanie', desc: 'z treści artykułu',  file: 'zdanie' },
  { k: 'quote',    name: 'Cytat',          desc: 'z artykułu',          file: 'cytat' },
  { k: 'score',    name: 'Ocena',          desc: 'recenzja z punktami', file: 'ocena', need: a => !!(a.review && a.review.score != null), why: 'to nie recenzja' },
  { k: 'author',   name: 'Autor',          desc: 'kto napisał',         file: 'autor' },
  { k: 'ask',      name: 'Pytanie',        desc: 'do komentarzy',       file: 'pytanie' },
  { k: 'link',     name: 'Link',           desc: 'całość na stronie',   file: 'link' }
];

function keySentence(a) {
  const plain = (state.plain && state.plain.get(a.id)) || Utils.stripHtml(a.content || '');
  const sents = (plain.match(/[^.!?\n]+[.!?]/g) || []).map(s => s.replace(/\s+/g, ' ').trim());
  const lead = String(a.lead || '').trim();
  const pick = sents.find(s => s.length >= 55 && s.length <= 150 && !lead.startsWith(s.slice(0, 40)));
  return pick || lead || a.title;
}

function fitText(ctx, family, text, maxW, maxH, start, min, weight = 800, k = 1.15) {
  let size = start, lines = [];
  for (; size >= min; size -= 2) {
    ctx.font = `${weight} ${size}px ${family}`;
    lines = String(text).split(/\n+/).flatMap(p => wrapLines(ctx, p, maxW));
    if (lines.length * size * k <= maxH && lines.every(l => ctx.measureText(l).width <= maxW)) break;
  }
  return { size, lines, lh: Math.round(size * k) };
}

/** Faktura tła slajdów tekstowych: rozmyte zdjęcie artykułu (przesuwa się z numerem slajdu), gwiazda i ukośne linie. */
async function slideTexture(ctx, a, W, H, red, o) {
  const idx = Math.max(0, (o.idx || 1) - 1);
  try {
    const src = getImage(a);
    const img = await loadImage(src, !src.startsWith('data:'));
    const sw = 32, sh = Math.round(32 * H / W);
    const sm = document.createElement('canvas'); sm.width = sw; sm.height = sh;
    const sx = sm.getContext('2d');
    const iw = img.naturalWidth || sw, ih = img.naturalHeight || sh;
    const k = Math.max(sw / iw, sh / ih) * 1.7, dw = iw * k, dh = ih * k;
    sx.drawImage(img, -(dw - sw) * ((idx * 0.29 + 0.1) % 1), -(dh - sh) * 0.35, dw, dh);
    ctx.save();
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    ctx.globalAlpha = red ? 0.30 : 0.42; ctx.globalCompositeOperation = red ? 'soft-light' : 'screen';
    ctx.drawImage(sm, 0, 0, W, H);
    ctx.restore();
  } catch { /* bez zdjęcia: tylko gradient */ }
  // ukośne linie
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,.055)'; ctx.lineWidth = 2;
  for (let x = -H; x < W + H; x += 64) { ctx.beginPath(); ctx.moveTo(x, H); ctx.lineTo(x + H * 0.55, 0); ctx.stroke(); }
  ctx.restore();
  // duża gwiazda z logo – w innym rogu na każdym slajdzie
  const spots = [[W * .92, H * .78, .18], [W * .08, H * .62, -.25], [W * .88, H * .52, .1], [W * .15, H * .84, -.1]];
  const [sxp, syp, rot] = spots[idx % spots.length];
  ctx.save();
  ctx.translate(sxp, syp); ctx.rotate(rot); ctx.fillStyle = 'rgba(255,255,255,.075)';
  ctx.beginPath();
  for (let i = 0; i < 10; i++) { const r = i % 2 ? 190 : 470, ang = -Math.PI / 2 + i * Math.PI / 5; ctx.lineTo(Math.cos(ang) * r, Math.sin(ang) * r); }
  ctx.closePath(); ctx.fill();
  ctx.restore();
}

/** Rysuje jeden slajd karuzeli. theme: 'red' | 'dark'. Zwraca { canvas, photoOk }. */
async function drawSlide(a, kind, theme, o = {}) {
  const W = 1080, H = 1350, PAD = 72, red = theme === 'red';
  const ac = red ? '#fff' : '#d6001c', on = red ? '#d6001c' : '#fff';
  let canvas, ctx, family, photoOk = true;
  if (kind === 'cover' || kind === 'photo' || kind === 'photoquote' || kind === 'photolead') {
    const bd = await igBackdrop(a, W, H, null);
    ({ canvas, ctx, family, photoOk } = bd);
    const g = ctx.createLinearGradient(0, 0, 0, H);
    // zdjęcie zawsze z neutralnym, ciemnym przyciemnieniem (bez czerwonej poświaty)
    g.addColorStop(0, 'rgba(0,0,0,.55)'); g.addColorStop(.45, 'rgba(0,0,0,.18)'); g.addColorStop(1, 'rgba(0,0,0,.93)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  } else {
    family = getComputedStyle(document.body).fontFamily;
    try { await Promise.all([document.fonts.load(`800 80px ${family}`), document.fonts.load(`700 30px ${family}`)]); } catch {}
    canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H;
    ctx = canvas.getContext('2d');
    if (red) {
      const g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#f2002a'); g.addColorStop(1, '#6d000e');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      const r = ctx.createRadialGradient(W * .9, 0, 0, W * .9, 0, 760); r.addColorStop(0, 'rgba(255,60,80,.55)'); r.addColorStop(1, 'rgba(255,60,80,0)');
      ctx.fillStyle = r; ctx.fillRect(0, 0, W, H);
    } else {
      const g = ctx.createLinearGradient(0, 0, W * .3, H); g.addColorStop(0, '#1b1030'); g.addColorStop(1, '#0b0b10');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      const r = ctx.createRadialGradient(W, 0, 0, W, 0, 800); r.addColorStop(0, 'rgba(88,40,160,.7)'); r.addColorStop(1, 'rgba(88,40,160,0)');
      ctx.fillStyle = r; ctx.fillRect(0, 0, W, H);
    }
    if (o.bgPhoto && a.image) {
      try {
        const im = await loadImage(a.image, !String(a.image).startsWith('data:'));
        const iw = im.naturalWidth || W, ih = im.naturalHeight || H, k = Math.max(W / iw, H / ih);
        ctx.drawImage(im, (W - iw * k) / 2, (H - ih * k) / 2, iw * k, ih * k);
        ctx.fillStyle = red ? 'rgba(150,0,18,.66)' : 'rgba(8,8,12,.74)'; ctx.fillRect(0, 0, W, H);
      } catch { /* zostaje płaski kolor */ }
    }
    // wielka obrysowa cyfra numeru slajdu jako faktura (zamiast gradientów)
    if (o.idx) {
      ctx.save();
      ctx.font = `900 760px ${family}`; ctx.textAlign = 'right'; ctx.textBaseline = 'alphabetic';
      ctx.lineWidth = 4; ctx.strokeStyle = red ? 'rgba(255,255,255,.16)' : 'rgba(255,255,255,.10)';
      ctx.strokeText(String(o.idx).padStart(2, '0'), W + 40, H - 120);
      ctx.restore();
    }
  }
  await drawLogoWhite(ctx, PAD, PAD, 330, family);

  const chip = (text, y = 250) => drawKicker(ctx, text, PAD, y, { family, line: ac });
  const bar = (y, h) => { ctx.fillStyle = ac; ctx.fillRect(PAD, y, 8, h); };
  const top = 350, bottom = H - 150, maxW = W - PAD * 2;
  const cat = (Utils.catsOf(a)[0] || 'News').toUpperCase();
  const centerBlock = (lh, n) => top + Math.max(0, ((bottom - top) - lh * n) / 2);

  if (kind === 'cover') {
    const f = fitText(ctx, family, a.title, maxW, 560, 96, 52, 800, 1.1);
    const tTop = bottom - f.lines.length * f.lh;
    ctx.fillStyle = '#fff'; ctx.textBaseline = 'top'; ctx.font = `800 ${f.size}px ${family}`;
    f.lines.forEach((l, i) => ctx.fillText(l, PAD, tTop + i * f.lh));
    chip(cat, tTop - 28 - 56);
  } else if (kind === 'photoquote' || kind === 'photolead') {
    const isQ = kind === 'photoquote';
    chip(isQ ? 'CYTAT' : 'W SKRÓCIE');
    const text = isQ ? ((o.quote && o.quote.text) || keySentence(a)) : ((o.summary || '').trim() || a.lead || a.title);
    const f = fitText(ctx, family, isQ ? '„' + text.replace(/^„|”$/g, '') + '”' : text, maxW - 36, 640, isQ ? 70 : 60, 34, isQ ? 800 : 700, 1.22);
    const hasAu = isQ && o.quote && o.quote.author;
    const y0 = bottom - f.lines.length * f.lh - (hasAu ? 56 : 0);
    bar(y0 - 4, f.lines.length * f.lh + 4 + (hasAu ? 50 : 0));
    ctx.fillStyle = '#fff'; ctx.textBaseline = 'top'; ctx.font = `${isQ ? 800 : 700} ${f.size}px ${family}`;
    f.lines.forEach((l, i) => ctx.fillText(l, PAD + 36, y0 + i * f.lh));
    if (isQ && o.quote && o.quote.author) {
      ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.font = `700 34px ${family}`; ctx.fillText('— ' + o.quote.author, PAD + 36, y0 + f.lines.length * f.lh + 18);
    }
  } else if (kind === 'title') {
    chip(cat);
    const f = fitText(ctx, family, a.title, maxW, bottom - top - 120, 128, 56, 900, 1.06);
    const y0 = centerBlock(f.lh, f.lines.length) - 30;
    ctx.fillStyle = '#fff'; ctx.textBaseline = 'top'; ctx.font = `900 ${f.size}px ${family}`;
    f.lines.forEach((l, i) => ctx.fillText(l, PAD, y0 + i * f.lh));
    ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.font = `700 36px ${family}`;
    ctx.fillText([a.author, Utils.formatDate(a.createdAt)].filter(Boolean).join('  ·  '), PAD, y0 + f.lines.length * f.lh + 40);
  } else if (kind === 'photo') {
    // samo zdjęcie
  } else if (kind === 'lead' || kind === 'sentence') {
    chip(kind === 'lead' ? 'W SKRÓCIE' : 'WARTO WIEDZIEĆ');
    const text = kind === 'lead' ? ((o.summary || '').trim() || a.lead || a.title) : keySentence(a);
    const f = fitText(ctx, family, text, maxW - 40, bottom - top, kind === 'lead' ? 62 : 78, 30, kind === 'lead' ? 700 : 800, 1.28);
    const y0 = centerBlock(f.lh, f.lines.length);
    bar(y0 - 4, f.lines.length * f.lh + 4);
    ctx.fillStyle = '#fff'; ctx.textBaseline = 'top'; ctx.font = `${kind === 'lead' ? 700 : 800} ${f.size}px ${family}`;
    f.lines.forEach((l, i) => ctx.fillText(l, PAD + 36, y0 + i * f.lh));
  } else if (kind === 'quote') {
    chip('CYTAT');
    const text = (o.quote && o.quote.text) || keySentence(a), author = (o.quote && o.quote.author) || '';
    const f = fitText(ctx, family, text, maxW - 20, bottom - top - 260, 72, 34, 800, 1.22);
    const y0 = centerBlock(f.lh + 0, f.lines.length) + 40;
    ctx.fillStyle = ac; ctx.font = `800 300px ${family}`; ctx.textBaseline = 'alphabetic'; ctx.fillText('“', PAD - 6, y0 - 10);
    ctx.fillStyle = '#fff'; ctx.textBaseline = 'top'; ctx.font = `800 ${f.size}px ${family}`;
    f.lines.forEach((l, i) => ctx.fillText(l, PAD + 4, y0 + i * f.lh));
    if (author) {
      const ay = y0 + f.lines.length * f.lh + 36;
      ctx.fillStyle = ac; ctx.fillRect(PAD + 4, ay + 22, 64, 6);
      ctx.fillStyle = '#fff'; ctx.font = `700 42px ${family}`; ctx.fillText(author, PAD + 88, ay);
    }
  } else if (kind === 'score') {
    chip('OCENA');
    const r = a.review || {};
    const cx = W / 2, cy = 640, R0 = 190;
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.35)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 18;
    ctx.fillStyle = red ? '#fff' : '#d6001c'; ctx.beginPath(); ctx.arc(cx, cy, R0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    ctx.fillStyle = red ? '#d6001c' : '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `900 190px ${family}`; ctx.fillText(String(r.score).replace('.', ','), cx, cy + 8);
    const f = fitText(ctx, family, r.work || a.title, maxW, 200, 72, 40, 800, 1.1);
    ctx.fillStyle = '#fff'; ctx.textBaseline = 'top'; ctx.font = `800 ${f.size}px ${family}`;
    f.lines.slice(0, 2).forEach((l, i) => ctx.fillText(l, cx, 905 + i * f.lh));
    ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.font = `700 36px ${family}`;
    ctx.fillText([r.artist, r.kind, r.year].filter(Boolean).join('  ·  '), cx, 905 + Math.min(2, f.lines.length) * f.lh + 18);
    ctx.textAlign = 'left';
  } else if (kind === 'tags') {
    chip('O KIM MOWA');
    const tags = Utils.tagsOf(a).slice(0, 10);
    ctx.font = `800 52px ${family}`; ctx.textBaseline = 'middle';
    const hgt = 100;
    let rowsN = 1, xx = PAD;
    tags.forEach(t => { const w = ctx.measureText('#' + t.replace(/\s+/g, '')).width + 60; if (xx + w > W - PAD) { xx = PAD; rowsN++; } xx += w + 20; });
    const blockH = rowsN * hgt + (rowsN - 1) * 24;
    let x = PAD, y = top + Math.max(0, Math.round(((bottom - top) - blockH) / 2));
    tags.forEach(t => {
      const label = '#' + t.replace(/\s+/g, '');
      const w = ctx.measureText(label).width + 60;
      if (x + w > W - PAD) { x = PAD; y += hgt + 24; }
      ctx.fillStyle = 'rgba(255,255,255,.14)'; roundRect(ctx, x, y, w, hgt, hgt / 2); ctx.fill();
      ctx.strokeStyle = ac; ctx.lineWidth = 3; roundRect(ctx, x, y, w, hgt, hgt / 2); ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.fillText(label, x + 30, y + hgt / 2 + 2);
      x += w + 20;
    });
  } else if (kind === 'author') {
    chip('AUTOR');
    const cx = W / 2, cy = 560, r = 150;
    let drew = false;
    const photo = a.authorPhoto || (state.profile && state.profile.avatar && a.author === state.profile.name ? state.profile.avatar : '');
    if (photo) {
      try {
        const im = await loadImage(photo, !photo.startsWith('data:'));
        ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.clip();
        const k = Math.max(2 * r / im.naturalWidth, 2 * r / im.naturalHeight);
        ctx.drawImage(im, cx - im.naturalWidth * k / 2, cy - im.naturalHeight * k / 2, im.naturalWidth * k, im.naturalHeight * k);
        ctx.restore(); drew = true;
      } catch { /* inicjały */ }
    }
    if (!drew) {
      ctx.fillStyle = ac; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
      const ini = String(a.author || 'ŚN').split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
      ctx.fillStyle = on; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = `900 120px ${family}`; ctx.fillText(ini, cx, cy + 6);
    }
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    const f = fitText(ctx, family, a.author || 'Redakcja', maxW, 130, 84, 44, 900, 1.1);
    ctx.fillStyle = '#fff'; ctx.font = `900 ${f.size}px ${family}`; ctx.fillText(f.lines[0], cx, 770);
    ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.font = `700 38px ${family}`;
    ctx.fillText('autor tekstu w Śliska News', cx, 880);
    ctx.fillText(`${Utils.formatDate(a.createdAt)}  ·  ${Math.max(1, Math.round(((state.plain.get(a.id) || '').split(/\s+/).length) / 200))} min czytania`, cx, 940);
    ctx.textAlign = 'left';
  } else if (kind === 'ask') {
    chip('DYSKUSJA');
    const f = fitText(ctx, family, 'A Ty co o tym sądzisz?', maxW, 480, 120, 60, 900, 1.05);
    const t0 = fitText(ctx, family, '„' + a.title + '”', maxW - 40, 220, 44, 30, 600, 1.25);
    const askH = f.lines.length * f.lh + 50 + t0.lines.length * t0.lh + 70 + 96;
    const y0 = top + Math.max(0, Math.round(((bottom - top) - askH) / 2));
    ctx.fillStyle = '#fff'; ctx.textBaseline = 'top'; ctx.font = `900 ${f.size}px ${family}`;
    f.lines.forEach((l, i) => ctx.fillText(l, PAD, y0 + i * f.lh));
    const sy = y0 + f.lines.length * f.lh + 50;
    const t = fitText(ctx, family, '„' + a.title + '”', maxW - 40, 220, 44, 30, 600, 1.25);
    bar(sy - 4, t.lines.length * t.lh + 4);
    ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.font = `600 ${t.size}px ${family}`;
    t.lines.forEach((l, i) => ctx.fillText(l, PAD + 36, sy + i * t.lh));
    const py = Math.min(bottom - 96, sy + t.lines.length * t.lh + 70);
    ctx.font = `800 40px ${family}`; const pt = 'Napisz w komentarzu ↓'; const pw = ctx.measureText(pt).width + 80;
    ctx.fillStyle = ac; roundRect(ctx, PAD, py, pw, 96, 48); ctx.fill();
    ctx.fillStyle = on; ctx.textBaseline = 'middle'; ctx.fillText(pt, PAD + 40, py + 50);
  } else if (kind === 'app') {
    chip('APLIKACJA');
    try { const ic = await loadImage(APP_BASE + 'icons/icon-512.png'); ctx.save(); roundRect(ctx, PAD, top, 180, 180, 42); ctx.clip(); ctx.drawImage(ic, PAD, top, 180, 180); ctx.restore(); } catch {}
    ctx.fillStyle = '#fff'; ctx.textBaseline = 'top'; ctx.font = `900 84px ${family}`;
    ctx.fillText('Mamy aplikację!', PAD, top + 230);
    ctx.font = `600 40px ${family}`; ctx.fillStyle = 'rgba(255,255,255,.9)';
    wrapLines(ctx, 'Dodaj Śliska News do ekranu głównego telefonu – bez sklepu, w kilka sekund.', maxW).forEach((l, i) => ctx.fillText(l, PAD, top + 345 + i * 52));
    [['iPhone', 'Udostępnij → Do ekranu początkowego'], ['Android', 'Menu ⋮ → Zainstaluj aplikację']].forEach(([t1, t2], i) => {
      const y = top + 520 + i * 140;
      ctx.fillStyle = 'rgba(255,255,255,.14)'; roundRect(ctx, PAD, y, maxW, 116, 28); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = `800 34px ${family}`; ctx.fillText(t1, PAD + 30, y + 16);
      ctx.font = `600 32px ${family}`; ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.fillText(t2, PAD + 30, y + 62);
    });
  } else if (kind === 'save') {
    chip('ZAPISZ');
    const bx = PAD, by = top + Math.max(0, Math.round(((bottom - top) - 700) / 2));
    ctx.fillStyle = ac; ctx.beginPath();
    ctx.moveTo(bx, by); ctx.lineTo(bx + 200, by); ctx.lineTo(bx + 200, by + 280); ctx.lineTo(bx + 100, by + 210); ctx.lineTo(bx, by + 280); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.textBaseline = 'top'; ctx.font = `900 100px ${family}`;
    ctx.fillText('Zapisz', PAD, by + 330); ctx.fillText('ten post', PAD, by + 330 + 108);
    ctx.font = `600 42px ${family}`; ctx.fillStyle = 'rgba(255,255,255,.9)';
    wrapLines(ctx, 'Wróć do niego później albo wyślij znajomemu, który musi to zobaczyć.', maxW).forEach((l, i) => ctx.fillText(l, PAD, by + 330 + 250 + i * 56));
  } else if (kind === 'link') {
    chip('CAŁOŚĆ NA STRONIE');
    const f = fitText(ctx, family, a.title, maxW, 460, 84, 44, 800, 1.1);
    ctx.fillStyle = '#fff'; ctx.textBaseline = 'top'; ctx.font = `800 ${f.size}px ${family}`;
    const lh0 = f.lines.length * f.lh + 60 + 96;
    const ty = top + Math.max(0, Math.round(((bottom - top) - lh0) / 2));
    f.lines.forEach((l, i) => ctx.fillText(l, PAD, ty + i * f.lh));
    const y = ty + f.lines.length * f.lh + 60;
    ctx.font = `800 44px ${family}`; if ('letterSpacing' in ctx) ctx.letterSpacing = '4px';
    const pill = 'LINK W BIO', pw = ctx.measureText(pill).width + 90;
    ctx.fillStyle = ac; roundRect(ctx, PAD, y, pw, 96, 48); ctx.fill();
    ctx.fillStyle = on; ctx.textBaseline = 'middle'; ctx.fillText(pill, PAD + 45, y + 50);
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
  }
  // rama + licznik w prawym górnym rogu + zachęta do przesuwania
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,.2)'; ctx.lineWidth = 2;
  roundRect(ctx, 26, 26, W - 52, H - 52, 36); ctx.stroke();
  if (o.idx) {
    ctx.fillStyle = '#fff'; ctx.font = `800 34px ${family}`; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    if ('letterSpacing' in ctx) ctx.letterSpacing = '2px';
    ctx.fillText(`${String(o.idx).padStart(2, '0')} / ${String(o.total).padStart(2, '0')}`, W - PAD, PAD + 29);
  }
  ctx.restore();
  drawFooterStd(ctx, W, H, family, o.idx ? (o.idx < o.total ? 'Przesuń →' : 'Link w bio') : '');
  return { canvas, photoOk };
}

/** Prosty ZIP bez kompresji (obrazy PNG i tak są skompresowane). */
async function makeZip(files) {
  const enc = new TextEncoder();
  const table = [];
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; table[n] = c >>> 0; }
  const crc32 = data => { let c = 0xFFFFFFFF; for (let i = 0; i < data.length; i++) c = table[(c ^ data[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
  const parts = [], central = [];
  let offset = 0;
  const d = new Date();
  const dosTime = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
  const dosDate = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  for (const f of files) {
    const data = new Uint8Array(await f.blob.arrayBuffer());
    const name = enc.encode(f.name);
    const crc = crc32(data);
    const lh = new DataView(new ArrayBuffer(30));
    lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true); lh.setUint16(8, 0, true);
    lh.setUint16(10, dosTime, true); lh.setUint16(12, dosDate, true); lh.setUint32(14, crc, true);
    lh.setUint32(18, data.length, true); lh.setUint32(22, data.length, true); lh.setUint16(26, name.length, true); lh.setUint16(28, 0, true);
    parts.push(new Uint8Array(lh.buffer), name, data);
    const ch = new DataView(new ArrayBuffer(46));
    ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0x0800, true); ch.setUint16(10, 0, true);
    ch.setUint16(12, dosTime, true); ch.setUint16(14, dosDate, true); ch.setUint32(16, crc, true);
    ch.setUint32(20, data.length, true); ch.setUint32(24, data.length, true); ch.setUint16(28, name.length, true);
    ch.setUint32(42, offset, true);
    central.push(new Uint8Array(ch.buffer), name);
    offset += 30 + name.length + data.length;
  }
  const cdSize = central.reduce((s, p) => s + p.length, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true);
  end.setUint32(12, cdSize, true); end.setUint32(16, offset, true);
  return new Blob([...parts, ...central, new Uint8Array(end.buffer)], { type: 'application/zip' });
}

/** Opis do wklejenia – dla X krótszy, z linkiem do artykułu. */
function captionFor(a, format) {
  if (format !== 'x') return instagramCaption(a);
  const tags = Utils.tagsOf(a).slice(0, 2).map(t => '#' + t.replace(/[^\p{L}\p{N}]+/gu, '')).filter(t => t.length > 1);
  return `${a.title}\n\n${articleUrl(a)}${tags.length ? '\n\n' + tags.join(' ') : ''}`;
}

/** Tworzy grafiki dla wybranego formatu (karuzela = kilka plików). */
async function renderSocialSet(a, opts) {
  const slug = Utils.slugify(a.title).slice(0, 50) || a.id;
  const one = async (format, suffix, extra = {}) => {
    const r = await renderInstagramImage(a, { ...opts, ...extra, format });
    return { blob: r.blob, photoOk: r.photoOk, name: `sliska-news-${slug}${suffix}.png` };
  };
  if (opts.format !== 'carousel') {
    const suffix = { story: '-story', quote: '-cytat', x: '-x', review: '-recenzja' }[opts.format] || '';
    const r = await one(opts.format, suffix);
    return { files: [r], photoOk: r.photoOk, zipName: '' };
  }
  const kinds = (opts.slides && opts.slides.length) ? opts.slides : ['cover', 'lead', 'link'];
  const slides = [];
  for (let i = 0; i < kinds.length; i++) {
    const def = IG_SLIDES.find(s => s.k === kinds[i]);
    const r = await drawSlide(a, kinds[i], i % 2 === 0 ? 'red' : 'dark', { idx: i + 1, total: kinds.length, quote: opts.quote, summary: opts.summary, bgPhoto: igBgFor(kinds[i], opts.bgMode, opts.bgKinds) });
    const blob = await canvasBlob(r.canvas);
    slides.push({ blob, photoOk: r.photoOk, name: `sliska-news-${slug}-${String(i + 1).padStart(2, '0')}-${def ? def.file : kinds[i]}.png` });
  }
  return { files: slides, photoOk: slides.every(s => s.photoOk), zipName: `sliska-news-${slug}-karuzela.zip` };
}

async function makeInstagramPost(id, btn, opts = {}) {
  const a = state.articles.find(x => x.id === id);
  if (!a) return;
  // opis kopiujemy od razu (w momencie kliknięcia), zanim przeglądarka zdąży wycofać zgodę na schowek
  let copied = false;
  const caption = captionFor(a, opts.format);
  const copyPromise = (navigator.clipboard && navigator.clipboard.writeText)
    ? navigator.clipboard.writeText(caption).then(() => { copied = true; }, () => {})
    : Promise.resolve();
  const label = btn ? btn.textContent : '';
  if (btn) { btn.disabled = true; btn.textContent = 'Tworzę…'; }
  try {
    const set = await renderSocialSet(opts.photo ? { ...a, image: opts.photo, _origImage: a.image } : a, opts);
    await copyPromise;
    const files = set.files.map(f => new File([f.blob], f.name, { type: 'image/png' }));
    let shared = false;
    if (window.matchMedia && matchMedia('(pointer: coarse)').matches && navigator.canShare && navigator.canShare({ files })) {
      try { await navigator.share({ files }); shared = true; } catch (e) { if (e && e.name === 'AbortError') shared = true; }
    }
    if (!shared) {
      const blob = files.length > 1 ? await makeZip(set.files) : set.files[0].blob;
      const name = files.length > 1 ? set.zipName : set.files[0].name;
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url; link.download = name;
      document.body.appendChild(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
    }
    closeModal('ig-modal');
    toast((shared ? 'Grafika gotowa' : files.length > 1 ? 'Karuzela pobrana (ZIP)' : 'Grafika pobrana') + (copied ? ', opis skopiowany do schowka.' : '. Nie udało się skopiować opisu – skopiuj go ręcznie.')
      + (set.photoOk ? '' : ' Zdjęcia z innej strony nie dało się wczytać, użyto tła zastępczego.'));
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
  return `<div class="tip-hist is-${st}"><b>${TIP_STATUS[st].label}</b>${when ? ' · ' + when : ''}${art ? ` · artykuł: <a href="#/artykul/${encodeURIComponent(art.id)}">${Utils.esc(art.title)}</a>` : ''}${t.statusNote ? `<br><span>${Utils.esc(t.statusNote)}</span>` : ''}</div>`;
}

function renderTipList() {
  const el = $('#panel-tips');
  const all = state.tips || [];
  const cnt = { open: 0, done: 0, rejected: 0, all: all.length };
  all.forEach(t => { const st = tipStatus(t); if (TIP_OPEN.includes(st)) cnt.open++; else cnt[st]++; });
  const chips = [['open', 'Do rozpatrzenia'], ['done', 'Zrealizowane'], ['rejected', 'Odrzucone'], ['all', 'Archiwum – wszystkie']]
    .map(([k, l]) => `<button type="button" class="tip-filter${tipFilter === k ? ' is-active' : ''}" data-tipfilter="${k}">${l} <i>${cnt[k]}</i></button>`).join('');
  const list = all.filter(t => { const st = tipStatus(t); return tipFilter === 'all' || (tipFilter === 'open' ? TIP_OPEN.includes(st) : st === tipFilter); });
  const empty = { open: 'Nic nie czeka na rozpatrzenie.', done: 'Żaden temat nie został jeszcze zrealizowany.', rejected: 'Brak odrzuconych tematów.', all: 'Brak zgłoszeń od czytelników.' }[tipFilter];
  el.innerHTML = `<div class="tip-filters">${chips}</div>` + (list.length
    ? list.map(t => { const st = tipStatus(t); return `<div class="panel-item tip-item">
          <div class="panel-item-main">
            <span class="tip-status ${TIP_STATUS[st].cls}">${TIP_STATUS[st].label}</span>
            <strong>${Utils.esc(t.title)}</strong>
            <span class="tip-msg">${Utils.esc(t.message)}</span>
            <span class="muted">${Utils.formatDate(t.createdAt)}${t.email ? ' · ' + Utils.esc(t.email) : ''}</span>
            ${tipHistory(t)}
          </div>
          <div class="panel-item-actions">
            <button type="button" class="btn btn-sm btn-primary" data-action="tip-status" data-id="${Utils.esc(t.id)}">Status</button>
            ${t.link ? `<a class="btn btn-sm" href="${Utils.esc(t.link)}" target="_blank" rel="noopener noreferrer">Źródło</a>` : ''}
            ${t.email ? `<a class="btn btn-sm" href="mailto:${Utils.esc(t.email)}?subject=${encodeURIComponent('Re: ' + t.title)}">Odpisz</a>` : ''}
            <button type="button" class="btn btn-sm btn-danger" data-action="delete-tip" data-id="${Utils.esc(t.id)}">Usuń</button>
          </div>
        </div>`; }).join('')
    : `<p class="muted">${empty}</p>`);
  updatePanelCounts();
}

async function renderTips() {
  const el = $('#panel-tips');
  el.innerHTML = '<p class="muted">Ładowanie…</p>';
  try {
    const ovr = tipOverrides();
    const list = (await DataService.getTips()).map(t => ovr[t.id] ? { ...t, ...ovr[t.id] } : t);
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
  let local = false;
  try {
    await DataService.updateTip(id, patch);
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
      <h2>4. Konta i komentarze</h2>
      <p>Konto czytelnika jest bezpłatne i dobrowolne; pozwala komentować artykuły (poza szybkimi newsami) oraz ustawić nazwę użytkownika i zdjęcie profilowe. Nazwę możesz zmienić raz na 30 dni. Komentujesz pod własną nazwą i odpowiadasz za treść swoich wpisów.</p>
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

function setPanelTab(t) {
  $$('#view-panel .ptab').forEach(b => { const on = b.dataset.ptab === t; b.classList.toggle('is-active', on); b.setAttribute('aria-selected', on); });
  $$('#view-panel .ptab-pane').forEach(p => { p.hidden = p.dataset.pane !== t; });
  try { sessionStorage.setItem('sliska_ptab', t); } catch { /* ignoruj */ }
  if (t === 'comments') renderModeration(false);
}

function updatePanelCounts() {
  const n = id => { const el = $('#' + id); return el ? el.querySelectorAll('.panel-item').length : 0; };
  const me = (state.profile && state.profile.name) || '';
  const set = (id, v) => { const el = $('#' + id); if (el) el.textContent = v; };
  const tipsOpen = (state.tips || []).filter(t => TIP_OPEN.includes(tipStatus(t))).length;
  set('kpi-drafts', n('panel-drafts')); set('kpi-sched', n('panel-scheduled')); set('kpi-tips', tipsOpen);
  set('kpi-mine', me ? publishedArticles().filter(a => a.author === me).length : publishedArticles().length);
  const tabs = { drafts: n('panel-drafts'), scheduled: n('panel-scheduled'), tips: tipsOpen };
  $$('#view-panel .ptab').forEach(b => { const c = tabs[b.dataset.ptab]; b.dataset.count = c ? c : ''; });
}

async function renderPanel() {
  const h = new Date().getHours();
  const hi = h < 5 ? 'Dobranoc' : h < 12 ? 'Dzień dobry' : h < 18 ? 'Cześć' : 'Dobry wieczór';
  const first = (state.profile.name || '').split(/\s+/)[0];
  $('#panel-hello').textContent = `${hi}${first ? ', ' + first : ''}. Oto Twoje materiały i narzędzia redakcji.`;
  let t = state.profile.panelTab || 'drafts'; try { t = sessionStorage.getItem('sliska_ptab') || t; } catch { /* ignoruj */ }
  setPanelTab(t);
  renderTips().then(updatePanelCounts);
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
  updatePanelCounts();

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
  updatePanelCounts();
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
    DataService.removeOg(id).catch(() => {});
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
  try { last = localStorage.getItem(CONFIG.AUTHOR_KEY + '_' + Auth.uid()) || ''; } catch { /* ignoruj */ }
  return state.profile.name || last;
}

function emptyData() {
  return {
    title: '', lead: '', categories: state.profile.defaultCategory ? [state.profile.defaultCategory] : [], author: defaultAuthor(),
    image: '', imagePos: null, imageCaption: '', imageSource: '', urgent: false, featured: false, commentsOff: false, status: '', related: [], content: '',
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
    imagePos: o.imagePos && typeof o.imagePos === 'object' ? { x: Number(o.imagePos.x) || 50, y: Number(o.imagePos.y) || 50, z: Number(o.imagePos.z) || 1 } : null,
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
    commentsOff: !!o.commentsOff,
    status: Utils.STATUSES[o.status] ? o.status : '',
    related: Array.isArray(o.related) ? o.related.filter(x => typeof x === 'string').slice(0, 3) : [],
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
    author: editor.author || state.profile.name || 'Redaktor',
    image: editor.image,
    imagePos: editor.image ? { ...editor.pos } : null,
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
    commentsOff: $('#f-comments-off').checked,
    status: $('#f-status').value,
    related: editor.related.slice(),
    content: contentHtml(),
    scheduleOn: $('#f-schedule-on').checked,
    scheduleAt: $('#f-schedule-at').value
  };
}

function isEmptyData(d) {
  return !d.title.trim() && !d.lead.trim() && !d.content && !d.image && !d.reviewOn;
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

const defaultPos = () => ({ x: 50, y: 50, z: 1 });
function applyCrop() {
  const img = $('#f-crop img'); if (!img) return;
  const { x, y, z } = editor.pos;
  img.style.objectPosition = `${x}% ${y}%`;
  img.style.transformOrigin = `${x}% ${y}%`;
  img.style.scale = z > 1 ? String(z) : '';
  $('#f-crop-zoom').value = z;
}
function setMainImage(src, pos) {
  editor.image = src || '';
  editor.pos = pos && src ? { x: Number(pos.x) || 50, y: Number(pos.y) || 50, z: Math.min(3, Math.max(1, Number(pos.z) || 1)) } : defaultPos();
  const box = $('#f-image-preview');
  box.hidden = !editor.image;
  updateChecklist();
  if (editor.image) $('#f-crop img').src = editor.image;
  applyCrop();
  // pole URL pokazuje tylko zwykły link (nie Base64)
  $('#f-image-url').value = editor.image && !editor.image.startsWith('data:') ? editor.image : '';
  if (!editor.image) $('#f-image-file').value = '';
}

/** Kadrowanie zdjęcia głównego: przeciąganie ustawia punkt ostrości, suwak – przybliżenie (podgląd 16:9 = to, co zobaczą czytelnicy). */
function initCropper() {
  const frame = $('#f-crop'); if (!frame) return;
  const img = $('img', frame);
  let drag = null;
  frame.addEventListener('pointerdown', e => {
    if (!editor.image) return;
    drag = { sx: e.clientX, sy: e.clientY, x: editor.pos.x, y: editor.pos.y };
    frame.setPointerCapture(e.pointerId); frame.classList.add('is-drag'); e.preventDefault();
  });
  frame.addEventListener('pointermove', e => {
    if (!drag) return;
    const r = frame.getBoundingClientRect(), nw = img.naturalWidth, nh = img.naturalHeight;
    if (!nw || !nh) return;
    const k = Math.max(r.width / nw, r.height / nh), wi = nw * k, hi = nh * k, z = editor.pos.z;
    const sx = (z - 1) * r.width + z * (wi - r.width), sy = (z - 1) * r.height + z * (hi - r.height);   // piksele przesunięcia na 1% zmiany punktu ostrości (×100)
    if (sx > 0.5) editor.pos.x = Math.min(100, Math.max(0, drag.x - (e.clientX - drag.sx) * 100 / sx));
    if (sy > 0.5) editor.pos.y = Math.min(100, Math.max(0, drag.y - (e.clientY - drag.sy) * 100 / sy));
    applyCrop();
  });
  const end = () => { if (!drag) return; drag = null; frame.classList.remove('is-drag'); onFormChange(); };
  frame.addEventListener('pointerup', end); frame.addEventListener('pointercancel', end);
  $('#f-crop-zoom').addEventListener('input', e => { editor.pos.z = Number(e.target.value) || 1; applyCrop(); });
  $('#f-crop-zoom').addEventListener('change', () => onFormChange());
  $('#f-crop-reset').addEventListener('click', () => { editor.pos = defaultPos(); applyCrop(); onFormChange(); });
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
  // znane tagi i wykonawcy, o których jest mowa w tekście (bez względu na polskie znaki i odmianę końcówki)
  const ftext = ' ' + Utils.fold(text).replace(/[^a-z0-9]+/g, ' ') + ' ';
  [...tagStats().values()].sort((a, b) => b.n - a.n).forEach(e => {
    const ft = Utils.fold(e.tag).replace(/[^a-z0-9]+/g, ' ').trim();
    if (ft.length < 3) return;
    const stem = ft.length > 5 ? ft.slice(0, -1) : ft;      // „Taco Hemingway” znajdzie też „Taco Hemingwaya”
    if (ftext.includes(' ' + stem)) put(e.tag);
  });
  // nazwy własne z kilku wyrazów (np. „Elizka Sztos”), jeśli są w tytule albo pojawiają się 2+ razy
  const re = /[A-ZĄĆĘŁŃÓŚŹŻ][\p{L}'’-]+(?:\s+[A-ZĄĆĘŁŃÓŚŹŻ][\p{L}'’-]+)+/gu;
  const counts = new Map();
  (text.match(re) || []).forEach(n => counts.set(n, (counts.get(n) || 0) + 1));
  [...counts.entries()].sort((a, b) => b[1] - a[1]).forEach(([n, c]) => {
    if (c >= 2 || title.includes(n)) put(n);
  });
  // pojedyncze nazwy własne, które padają w tekście co najmniej 3 razy
  const STOP = new Set(['Instagram', 'Spotify', 'YouTube', 'Facebook', 'TikTok', 'Polska', 'Polsce', 'Polski', 'Twitter', 'Google', 'Netflix', 'Internet', 'Zobacz', 'Jednak', 'Według', 'Dlatego', 'Wczoraj', 'Dzisiaj', 'Również', 'Ponadto', 'Natomiast']);
  const single = new Map();
  (text.match(/(?<![.!?]\s)(?<!^)\b[A-ZĄĆĘŁŃÓŚŹŻ][\p{L}]{3,}\b/gu) || []).forEach(w => { if (!STOP.has(w)) single.set(w, (single.get(w) || 0) + 1); });
  [...single.entries()].filter(([, n]) => n >= 3).sort((a, b) => b[1] - a[1]).forEach(([w]) => put(w));
  return [...out.values()].slice(0, 10);
}

let moreTags = false;
function renderTagChips() {
  const box = $('#tag-chips');
  if (!box) return;
  const chosen = new Set(Utils.parseTags($('#f-tags').value).map(t => t.toLowerCase()));
  const used = new Set();
  const group = (label, tags) => {
    const items = tags.filter(t => t && !used.has(t.toLowerCase()));
    items.forEach(t => used.add(t.toLowerCase()));
    if (!items.length) return '';
    return `<div class="tag-group"><span class="tag-group-label">${label}${label === 'Proponowane' ? ' <button type="button" class="tag-add-all" data-tag-all>dodaj wszystkie</button>' : ''}</span><span class="tag-group-chips">${items.map(t =>
      `<button type="button" class="tag-chip${chosen.has(t.toLowerCase()) ? ' on' : ''}" data-tag="${Utils.esc(t)}" aria-pressed="${chosen.has(t.toLowerCase())}">${Utils.esc(t)}</button>`).join('')}</span></div>`;
  };
  const popular = [...tagStats().values()].sort((a, b) => b.n - a.n || a.tag.localeCompare(b.tag, 'pl')).slice(0, 14).map(e => e.tag);
  box.innerHTML =
    group('Proponowane', suggestedTags()) +
    (moreTags ? `<div class="tag-more">${group('Ostatnio używane', recentTags().slice(0, 10))}${group('Popularne', popular)}</div>` : '') +
    (`<button type="button" class="tag-more-btn" data-tag-more aria-expanded="${moreTags}">${moreTags ? 'Mniej' : 'Więcej tagów'}</button>`);
  const pending = suggestedTags().filter(t => !chosen.has(t.toLowerCase())).length;
  const sum = $('#tag-fold summary');
  if (sum) { sum.textContent = pending ? `Podpowiedzi tagów (${pending})` : 'Podpowiedzi tagów'; sum.classList.toggle('has-new', pending > 0); }
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
  if (window.growLead) setTimeout(window.growLead, 0);
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
  $('#fold-review').open = !!d.reviewOn;
  // autor: nowy artykuł = nazwa z profilu; edycja = autor zostaje taki, jaki był
  editor.author = editor.mode === 'new' ? (state.profile.name || 'Redaktor') : (d.author || state.profile.name || 'Redaktor');
  $('#editor-author').textContent = 'Autor: ' + editor.author;
  $('#f-urgent').checked = d.urgent;
  $('#f-featured').checked = d.featured;
  $('#f-comments-off').checked = !!d.commentsOff;
  $('#f-status').value = d.status || '';
  editor.related = (d.related || []).slice(0, 3);
  renderRelatedPicker();
  $('#fold-related').open = editor.related.length > 0;
  $('#f-schedule-on').checked = d.scheduleOn;
  $('#f-schedule-at').value = d.scheduleAt;

  setMainImage(d.image, d.imagePos);

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
    { ok: !!editor.image, text: 'Zdjęcie główne (zalecane)', req: false }
  ];
  if ($('#f-review-on').checked) {
    items.push({ ok: Utils.parseScore($('#f-review-score').value) !== null && !!$('#f-review-work').value.trim(), text: 'Recenzja: ocena i tytuł dzieła', req: true });
    items.push({ ok: $('#f-review-cover-same').checked ? !!editor.image : !!editor.cover, text: 'Recenzja: okładka', req: true });
  }
  $('#checklist').innerHTML = items.map(i =>
    `<li class="${i.ok ? 'ok' : (i.req ? 'todo' : 'opt')}"><span class="ck" aria-hidden="true">${i.ok ? '✓' : (i.req ? '○' : '–')}</span>${Utils.esc(i.text)}</li>`).join('');
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


/* ---------- Galeria zdjęć ---------- */
const GALLERY_MAX = 12;

function openGalleryModal(edit) {
  const isEdit = !!edit && typeof edit.index === 'number';
  editor.gallery = { items: isEdit ? (edit.images || []).map(i => i.src) : [], editing: isEdit ? edit.index : null };
  editor.range = isEdit ? null : editor.quill.getSelection(true);
  $('#gallery-title').textContent = isEdit ? 'Edytuj galerię' : 'Galeria zdjęć';
  $('#gal-submit').textContent = isEdit ? 'Zapisz' : 'Wstaw';
  $('#gal-delete').hidden = !isEdit;
  $('#gal-caption').value = isEdit ? edit.caption || '' : '';
  $('#gal-url').value = '';
  $('#gal-file').value = '';
  $('#gal-error').hidden = true;
  renderGalleryItems();
  openModal('gallery-modal');
}

function galleryError(msg) {
  const el = $('#gal-error');
  el.textContent = msg || '';
  el.hidden = !msg;
}

function renderGalleryItems() {
  const items = editor.gallery.items;
  $('#gal-items').innerHTML = items.map((src, i) => `<div class="gal-item" data-i="${i}">
      <img src="${Utils.esc(src)}" alt="">
      <span class="gal-num">${i + 1}</span>
      <span class="gal-btns">
        <button type="button" class="icon-mini" data-gal="left" aria-label="Przesuń wcześniej"${i === 0 ? ' disabled' : ''}>←</button>
        <button type="button" class="icon-mini" data-gal="right" aria-label="Przesuń później"${i === items.length - 1 ? ' disabled' : ''}>→</button>
        <button type="button" class="icon-mini" data-gal="del" aria-label="Usuń zdjęcie">×</button>
      </span>
    </div>`).join('');
}

async function addGalleryFiles(files) {
  const list = Array.from(files || []).filter(f => f.type.startsWith('image/'));
  if (!list.length) return;
  galleryError('');
  for (const f of list) {
    if (editor.gallery.items.length >= GALLERY_MAX) { galleryError(`Maksymalnie ${GALLERY_MAX} zdjęć w galerii.`); break; }
    try {
      editor.gallery.items.push(await Utils.fileToDataUrl(f, 1200, 150));
      renderGalleryItems();
    } catch (err) { galleryError(err.message); }
  }
  $('#gal-file').value = '';
}

function addGalleryUrl() {
  const v = $('#gal-url').value.trim();
  if (!v) return;
  if (!/^https?:\/\//i.test(v)) { galleryError('Adres zdjęcia musi zaczynać się od http:// lub https://'); return; }
  if (editor.gallery.items.length >= GALLERY_MAX) { galleryError(`Maksymalnie ${GALLERY_MAX} zdjęć w galerii.`); return; }
  galleryError('');
  editor.gallery.items.push(v);
  $('#gal-url').value = '';
  renderGalleryItems();
}

function submitGallery(e) {
  e.preventDefault();
  if ($('#gal-url').value.trim()) addGalleryUrl();
  const images = editor.gallery.items.map(src => ({ src }));
  if (images.length < 2) { galleryError('Dodaj co najmniej 2 zdjęcia (pojedyncze zdjęcie wstaw zwykłym przyciskiem).'); return; }
  const value = { images, caption: $('#gal-caption').value.trim() };
  if (editor.gallery.editing !== null) {
    const index = editor.gallery.editing;
    editor.quill.deleteText(index, 1, 'user');
    editor.quill.insertEmbed(index, 'gallery', value, 'user');
  } else {
    const index = editor.range ? editor.range.index : Math.max(0, editor.quill.getLength() - 1);
    editor.quill.insertEmbed(index, 'gallery', value, 'user');
    editor.quill.setSelection(index + 1, 0, 'silent');
  }
  closeModal('gallery-modal');
}

function deleteGallery() {
  if (editor.gallery.editing !== null) editor.quill.deleteText(editor.gallery.editing, 1, 'user');
  closeModal('gallery-modal');
}


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
    const stage = fig.querySelector('.gx-stage'), img = fig.querySelector('.gx-img'), bg = fig.querySelector('.gx-bg');
    const count = fig.querySelector('.gx-count'), thumbs = Array.from(fig.querySelectorAll('.gx-thumb'));
    let cur = 0, busy = 0;
    const show = (n, instant) => {
      cur = (n + srcs.length) % srcs.length;
      const token = ++busy;
      const apply = () => {
        if (token !== busy) return;
        img.src = srcs[cur]; img.alt = caption || `Zdjęcie ${cur + 1} z ${srcs.length}`;
        bg.style.backgroundImage = `url("${srcs[cur].replace(/"/g, '%22')}")`;
        stage.classList.remove('is-swap');
      };
      if (instant) apply(); else { stage.classList.add('is-swap'); setTimeout(apply, 130); }
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

/* ---------- „Zobacz też” – ręczny wybór ---------- */
function renderRelatedPicker() {
  const chosen = editor.related.map(id => state.articles.find(a => a.id === id)).filter(Boolean);
  $('#rel-chosen').innerHTML = chosen.map(a =>
    `<span class="rel-chip">${Utils.esc(a.title)}<button type="button" data-rel-del="${Utils.esc(a.id)}" aria-label="Usuń z listy">×</button></span>`).join('');
  const full = editor.related.length >= 3;
  $('#rel-search').disabled = full;
  $('#rel-search').placeholder = full ? 'Wybrano maksymalnie 3 artykuły' : 'Szukaj artykułu po tytule…';
  const q = $('#rel-search').value.trim().toLowerCase();
  let list = [];
  if (!full) {
    list = state.articles
      .filter(a => !a.quick && a.id !== editor.articleId && !editor.related.includes(a.id) && (!q || a.title.toLowerCase().includes(q)))
      .sort((p, r) => Date.parse(r.createdAt) - Date.parse(p.createdAt))
      .slice(0, q ? 6 : 4);
  }
  $('#rel-results').innerHTML = list.map(a =>
    `<button type="button" class="rel-result" data-rel-add="${Utils.esc(a.id)}">${Utils.esc(a.title)}</button>`).join('');
}

/* ---------- Grafika na Instagram: okno wyboru formatu ---------- */
function articleQuotes(a) {
  const doc = new DOMParser().parseFromString(`<body>${Sanitizer.upgradeQuotes(a.content || '')}</body>`, 'text/html');
  return Array.from(doc.querySelectorAll('aside.article-quote')).map(q => {
    const t = q.querySelector('.q-text');
    const au = q.querySelector('.q-author');
    return { text: t ? t.textContent.trim() : '', author: au ? au.textContent.trim() : '' };
  }).filter(q => q.text);
}

function articleImages(a) {
  const out = [];
  const add = s => { s = String(s || '').trim(); if (s && !out.includes(s)) out.push(s); };
  add(a.image);
  try {
    const doc = new DOMParser().parseFromString(a.content || '', 'text/html');
    doc.querySelectorAll('img[src]').forEach(im => add(im.getAttribute('src')));
  } catch { /* ignoruj */ }
  if (a.review && a.review.cover) add(a.review.cover);
  return out.slice(0, 14);
}

function buildIgPhotos() {
  const a = state.articles.find(x => x.id === editor.igId);
  const imgs = a ? articleImages(a) : [];
  editor.igImages = imgs;
  const box = $('#ig-photo-box');
  box.hidden = imgs.length < 2;
  $('#ig-photo-list').innerHTML = imgs.map((src, i) => `<button type="button" class="ig-photo" data-i="${i}" aria-pressed="${i === 0}" title="Użyj tego zdjęcia"><img src="${Utils.esc(src)}" alt="" loading="lazy">${i === 0 ? '<b>główne</b>' : ''}</button>`).join('');
  editor.igPhoto = '';
}

function openIgModal(id) {
  const a = state.articles.find(x => x.id === id);
  if (!a) return;
  editor.igId = id;
  editor.igQuotes = articleQuotes(a);
  let fmt = 'post';
  try { fmt = localStorage.getItem('sliska_igformat') || 'post'; } catch { /* ignoruj */ }
  if (!['post', 'story', 'quote', 'carousel', 'x', 'review'].includes(fmt)) fmt = 'post';
  if (fmt === 'review' && !a.review) fmt = 'post';
  $('#ig-review-fmt').hidden = !a.review;
  $$('input[name="ig-format"]').forEach(r => { r.checked = r.value === fmt; });
  const sel = $('#ig-quote-pick');
  sel.innerHTML = editor.igQuotes.map((q, i) => `<option value="${i}">${Utils.esc(q.text.length > 70 ? q.text.slice(0, 70) + '…' : q.text)}</option>`).join('');
  $('#ig-quote-pick-wrap').hidden = editor.igQuotes.length < 2;
  const first = editor.igQuotes[0] || { text: '', author: '' };
  $('#ig-quote-text').value = first.text;
  $('#ig-quote-author').value = first.author;
  // slajd „W skrócie”: domyślnie zajawka artykułu (można zmienić lub wyczyścić = bez tego slajdu)
  $('#ig-summary').value = String(a.lead || '').trim().slice(0, 400);
  $('#ig-error').hidden = true;
  editor.igPick = [];
  buildIgPhotos();
  editor.igBgKinds = [];
  $('#ig-bgmode').value = 'none';
  updateIgUi();
  openModal('ig-modal');
}

function igFormat() {
  const r = $('input[name="ig-format"]:checked');
  return r ? r.value : 'post';
}

let igThumbJob = 0;
const igThumbCache = new Map();

const IG_TEXT_KINDS = ['title', 'lead', 'sentence', 'quote', 'score', 'author', 'ask', 'link'];
function igBgFor(kind, mode, kinds) { return mode === 'all' ? IG_TEXT_KINDS.includes(kind) : (mode === 'pick' && (kinds || []).includes(kind)); }
function igBgMode() { const el = $('#ig-bgmode'); return el ? el.value : 'none'; }

function igSlideTheme(i) { return i % 2 === 0 ? 'red' : 'dark'; }

function buildIgGrid() {
  const a = state.articles.find(x => x.id === editor.igId);
  if (!a) return;
  editor.igPick = editor.igPick || [];
  $('#ig-slide-grid').innerHTML = IG_SLIDES.map(s => {
    const off = s.need && !s.need(a);
    return `<button type="button" class="ig-slide${off ? ' is-off' : ''}" data-slide="${s.k}" ${off ? 'disabled' : ''} aria-pressed="false">
      <span class="ig-thumb"><canvas width="216" height="270"></canvas><i class="ig-num"></i>${IG_TEXT_KINDS.includes(s.k) && !off ? '<span class="ig-bgtoggle" role="button" tabindex="0" data-bg="' + s.k + '" title="Zdjęcie w tle tego slajdu">Zdjęcie w tle</span>' : ''}</span>
      <b>${Utils.esc(s.name)}</b><small>${Utils.esc(off ? s.why : s.desc)}</small></button>`;
  }).join('');
  refreshIgGrid();
}

function refreshIgGrid() {
  const a = state.articles.find(x => x.id === editor.igId);
  if (!a) return;
  const job = ++igThumbJob;
  const todo = [];
  $$('#ig-slide-grid .ig-slide').forEach(btn => {
    const k = btn.dataset.slide, pos = editor.igPick.indexOf(k);
    btn.classList.toggle('is-on', pos >= 0);
    btn.setAttribute('aria-pressed', String(pos >= 0));
    const tg = $('.ig-bgtoggle', btn);
    if (tg) { tg.hidden = igBgMode() !== 'pick'; tg.classList.toggle('is-on', (editor.igBgKinds || []).includes(k)); }
    $('.ig-num', btn).textContent = pos >= 0 ? String(pos + 1) : '';
    if (!btn.disabled) todo.push({ btn, k, theme: pos >= 0 ? igSlideTheme(pos) : 'dark' });
  });
  const n = editor.igPick.length;
  const sub = $('#ig-submit');
  if (igFormat() === 'carousel') sub.textContent = n ? `Pobierz ZIP (${n})` : 'Wybierz slajdy';
  (async () => {
    for (const t of todo) {
      if (job !== igThumbJob) return;
      const bg = igBgFor(t.k, igBgMode(), editor.igBgKinds);
      const art = editor.igPhoto ? { ...a, image: editor.igPhoto, _origImage: a.image } : a;
      const key = `${editor.igId}|${t.k}|${t.theme}|${editor.igPhoto || ''}|${bg ? 1 : 0}`;
      let src = igThumbCache.get(key);
      if (!src) {
        try {
          const r = await drawSlide(art, t.k, t.theme, { bgPhoto: bg, quote: { text: $('#ig-quote-text').value.trim(), author: $('#ig-quote-author').value.trim() }, summary: $('#ig-summary').value.trim() });
          const th = document.createElement('canvas'); th.width = 216; th.height = 270;
          th.getContext('2d').drawImage(r.canvas, 0, 0, 216, 270);
          src = th; igThumbCache.set(key, th);
        } catch { continue; }
      }
      if (job !== igThumbJob) return;
      const cv = $('canvas', t.btn);
      if (cv) cv.getContext('2d').drawImage(src, 0, 0);
    }
  })();
}

function updateIgUi() {
  const f = igFormat();
  const car = f === 'carousel';
  $('#ig-carousel-box').hidden = !car;
  $('#ig-texts').hidden = !(car || f === 'quote');
  $('#ig-summary-box').hidden = !car;
  $('#ig-bgphoto-wrap').hidden = !car;
  $('#ig-grid-hint').hidden = !(car && igBgMode() === 'pick');
  if (f === 'quote') $('#ig-texts').open = true;
  $('#ig-texts-title').textContent = car ? 'Teksty slajdów (opcjonalnie)' : 'Cytat';
  $('#ig-quote-label').textContent = 'Treść cytatu';
  $('.modal-box', $('#ig-modal')).classList.toggle('ig-wide', car);
  const sub = $('#ig-submit');
  if (car) { buildIgGrid(); } else sub.textContent = 'Pobierz i skopiuj opis';
}


/* ---------- Instalacja jako aplikacja ---------- */
let deferredInstall = null;
function isStandalone() { return (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true; }
function isIos() { return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); }
function updateInstallLink() {
  const l = $('#install-link');
  if (l) l.hidden = isStandalone() || !(deferredInstall || isIos());
}
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredInstall = e; updateInstallLink(); });
window.addEventListener('appinstalled', () => { deferredInstall = null; updateInstallLink(); toast('Aplikacja zainstalowana.'); });
async function installApp() {
  if (deferredInstall) {
    deferredInstall.prompt();
    try { await deferredInstall.userChoice; } catch { /* ignoruj */ }
    deferredInstall = null;
    updateInstallLink();
  } else if (isIos()) {
    toast('Na iPhonie: dotknij Udostępnij (kwadrat ze strzałką), potem „Do ekranu początkowego”.');
  }
}

/* ---------- Wklejanie z Worda / Google Docs: czyszczenie formatowania ---------- */
function cleanPastedHtml(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  doc.querySelectorAll('style,script,meta,link,title,xml,img,svg,iframe,object,form,button').forEach(n => n.remove());
  const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const BLOCK = new Set(['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'UL', 'OL', 'LI', 'BLOCKQUOTE', 'TABLE', 'TR', 'TD', 'TH', 'TBODY', 'THEAD', 'SECTION', 'ARTICLE', 'PRE', 'FIGURE']);
  const hasBlock = el => !!el.querySelector('p,div,h1,h2,h3,h4,h5,h6,ul,ol,li,blockquote,table,tr,pre');
  const weight = v => (v === 'bold' || v === 'bolder' || Number(v) >= 600);

  function inline(node, inLink) {
    if (node.nodeType === Node.TEXT_NODE) return esc(node.nodeValue.replace(/ /g, ' ').replace(/[ \t\r\n]+/g, ' '));
    if (node.nodeType !== Node.ELEMENT_NODE) return '';
    const tag = node.tagName;
    if (tag === 'BR') return '<br>';
    const st = node.style || {};
    let inner = Array.from(node.childNodes).map(ch => inline(ch, inLink || tag === 'A')).join('');
    if (!inner.trim() && !inner.includes('<br>')) return inner;
    if (tag === 'A') {
      const href = node.getAttribute('href') || '';
      return /^(https?:|mailto:)/i.test(href) ? `<a href="${esc(href)}">${inner}</a>` : inner;
    }
    const bold = (tag === 'B' || tag === 'STRONG') ? !(st.fontWeight === 'normal' || st.fontWeight === '400') : weight(st.fontWeight);
    const ital = (tag === 'I' || tag === 'EM') ? st.fontStyle !== 'normal' : st.fontStyle === 'italic';
    const td = (st.textDecorationLine || st.textDecoration || '');
    const und = !inLink && (tag === 'U' || /underline/.test(td));
    const strike = tag === 'S' || tag === 'STRIKE' || tag === 'DEL' || /line-through/.test(td);
    if (bold) inner = `<strong>${inner}</strong>`;
    if (ital) inner = `<em>${inner}</em>`;
    if (und) inner = `<u>${inner}</u>`;
    if (strike) inner = `<s>${inner}</s>`;
    return inner;
  }
  const tidy = s => s.replace(/(<br>\s*)+$/g, '').replace(/^(\s*<br>)+/g, '').trim();
  const plain = s => s.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();

  const out = [];
  function pushList(items) {
    // items: [{ordered, level, html}] → kolejne <ul>/<ol> (zagnieżdżenie jako klasa wcięcia Quilla)
    let i = 0;
    while (i < items.length) {
      const ordered = items[i].ordered;
      let chunk = '';
      while (i < items.length && items[i].ordered === ordered) {
        chunk += `<li${items[i].level ? ` class="ql-indent-${Math.min(items[i].level, 5)}"` : ''}>${items[i].html}</li>`;
        i++;
      }
      out.push(`<${ordered ? 'ol' : 'ul'}>${chunk}</${ordered ? 'ol' : 'ul'}>`);
    }
  }
  function listItems(list, level, acc) {
    const ordered = list.tagName === 'OL';
    Array.from(list.children).forEach(li => {
      if (li.tagName === 'UL' || li.tagName === 'OL') { listItems(li, level + 1, acc); return; }
      if (li.tagName !== 'LI') return;
      const own = Array.from(li.childNodes).filter(n => !(n.nodeType === 1 && (n.tagName === 'UL' || n.tagName === 'OL')));
      const html = tidy(own.map(n => inline(n, false)).join(''));
      if (plain(html)) acc.push({ ordered, level, html });
      Array.from(li.children).filter(n => n.tagName === 'UL' || n.tagName === 'OL').forEach(sub => listItems(sub, level + 1, acc));
    });
  }

  let pendingList = [];
  const flushList = () => { if (pendingList.length) { pushList(pendingList); pendingList = []; } };

  function blocks(parent) {
    let run = '';
    const flushRun = () => { const t = tidy(run); if (plain(t)) { flushList(); out.push(`<p>${t}</p>`); } run = ''; };
    Array.from(parent.childNodes).forEach(node => {
      if (node.nodeType === Node.TEXT_NODE) { run += inline(node, false); return; }
      if (node.nodeType !== Node.ELEMENT_NODE) return;
      const tag = node.tagName;
      const isBlock = BLOCK.has(tag) || (hasBlock(node) && !['A'].includes(tag));
      if (!isBlock) { run += inline(node, false); return; }
      flushRun();
      if (tag === 'UL' || tag === 'OL') { flushList(); const acc = []; listItems(node, 0, acc); pushList(acc); return; }
      if (/^H[1-6]$/.test(tag)) {
        const t = tidy(Array.from(node.childNodes).map(n => inline(n, false)).join('').replace(/<\/?(strong|em|u|s)>/g, ''));
        if (plain(t)) { flushList(); out.push(`<${tag === 'H1' || tag === 'H2' ? 'h2' : 'h3'}>${t}</${tag === 'H1' || tag === 'H2' ? 'h2' : 'h3'}>`); }
        return;
      }
      if (tag === 'P' || tag === 'LI') {
        const cls = node.getAttribute('class') || '';
        const style = node.getAttribute('style') || '';
        const head = /MsoHeading(\d)|MsoTitle/.exec(cls);
        if (head && !hasBlock(node)) {
          const t = tidy(Array.from(node.childNodes).map(n => inline(n, false)).join('').replace(/<\/?(strong|em|u|s)>/g, ''));
          if (plain(t)) { flushList(); const lvl = head[1] ? Number(head[1]) : 1; out.push(lvl <= 2 ? `<h2>${t}</h2>` : `<h3>${t}</h3>`); }
          return;
        }
        if (/MsoList/.test(cls) || /mso-list/.test(style)) {
          let t = tidy(Array.from(node.childNodes).map(n => inline(n, false)).join(''));
          const txt = plain(t);
          const ordered = /^(\d+|[a-zA-Z])[.)]\s/.test(txt);
          t = t.replace(/^(\s|&nbsp;)*(?:<[^>]+>)*(?:[·•o§▪●○\-–]|\d+[.)]|[a-zA-Z][.)])(?:\s|&nbsp;)+(?:<\/[^>]+>)*/, '');
          const lv = /level(\d)/.exec(style);
          if (plain(t)) pendingList.push({ ordered, level: lv ? Math.max(0, Number(lv[1]) - 1) : 0, html: t });
          return;
        }
        if (hasBlock(node)) { blocks(node); return; }
        const t = tidy(Array.from(node.childNodes).map(n => inline(n, false)).join(''));
        if (plain(t)) { flushList(); out.push(`<p>${t}</p>`); }
        return;
      }
      if (tag === 'BLOCKQUOTE') {
        const t = tidy(Array.from(node.childNodes).map(n => inline(n, false)).join(''));
        if (plain(t)) { flushList(); out.push(`<blockquote>${t}</blockquote>`); }
        return;
      }
      if (tag === 'TD' || tag === 'TH') {
        const t = tidy(Array.from(node.childNodes).map(n => inline(n, false)).join(''));
        if (plain(t)) { flushList(); out.push(`<p>${t}</p>`); }
        return;
      }
      blocks(node);     // div, section, table, tr… – tylko przechodzimy głębiej
    });
    flushRun();
  }
  blocks(doc.body);
  flushList();
  return out.join('');
}

function handleRichPaste(e) {
  const dt = e.clipboardData;
  if (!dt) return false;
  const html = dt.getData('text/html');
  if (!html || !editor.quill) return false;
  // wklejanie z samego edytora (zdjęcia, cytaty, filmy, galerie) zostawiamy Quillowi
  if (/article-(figure|quote|embed|gallery)|class="ql-/.test(html)) return false;
  const cleaned = cleanPastedHtml(html);
  if (!cleaned) return false;
  e.preventDefault();
  e.stopPropagation();
  const q = editor.quill;
  const y = window.scrollY;
  const sel = q.getSelection(true);
  if (sel.length) q.deleteText(sel.index, sel.length, 'user');
  const before = q.getLength();
  q.clipboard.dangerouslyPasteHTML(sel.index, cleaned, 'user');
  const added = q.getLength() - before;
  q.setSelection(sel.index + added, 0, 'silent');
  requestAnimationFrame(() => { if (Math.abs(window.scrollY - y) > 400) window.scrollTo(window.scrollX, y); });
  toast('Wklejono tekst z oczyszczonym formatowaniem.');
  return true;
}


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
  pub.forEach(a => Utils.tagsOf(a).forEach(t => {
    const k = Utils.fold(t);
    const e = names.get(k) || { label: t, type: 'tag', n: 0 };
    e.n++; names.set(k, e);
  }));
  const scored = [];
  names.forEach((e, k) => {
    const ws = k.split(/\s+/);
    let s = null;
    if (k.startsWith(fq)) s = 0;
    else if (ws.some(w => w.startsWith(fq))) s = 1;
    else if (k.includes(fq)) s = 2;
    else if (fq.length >= 4) { const max = fq.length <= 6 ? 1 : 2; if (ws.some(w => editDistance(fq, w, max) <= max)) s = 3; }
    if (s !== null) scored.push({ ...e, s });
  });
  scored.sort((a, b) => a.s - b.s || b.n - a.n);
  return { names: scored.slice(0, 5), arts: pub.filter(a => SearchIndex.matches(a, q)).slice(0, 3) };
}

function renderSearchSuggest() {
  const input = $('#search-input'), box = $('#search-suggest');
  const { names, arts } = searchSuggestions(input.value);
  if (!names.length && !arts.length) { box.hidden = true; input.setAttribute('aria-expanded', 'false'); return; }
  const nameHtml = names.map(n => `<button type="button" class="sg-item" role="option" data-href="${n.type === 'artist' ? '#/artysta/' : '#/tag/'}${encodeURIComponent(n.label)}"><span class="sg-ico">${n.type === 'artist' ? '♪' : '#'}</span><span class="sg-text">${Utils.esc(n.label)}</span><small>${n.n} ${plural(n.n, 'artykuł', 'artykuły', 'artykułów')}</small></button>`).join('');
  const artHtml = arts.map(a => `<button type="button" class="sg-item" role="option" data-href="#/artykul/${encodeURIComponent(a.id)}"><span class="sg-ico">→</span><span class="sg-text">${Utils.esc(a.title)}</span></button>`).join('');
  box.innerHTML = (nameHtml ? `<div class="sg-head">Wykonawcy i tagi</div>${nameHtml}` : '') + (artHtml ? `<div class="sg-head">Artykuły</div>${artHtml}` : '');
  box.hidden = false;
  input.setAttribute('aria-expanded', 'true');
}

function hideSearchSuggest() {
  const box = $('#search-suggest');
  if (box) box.hidden = true;
  const input = $('#search-input');
  if (input) input.setAttribute('aria-expanded', 'false');
}


/* ---------- Szybkie Newsy ---------- */
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
    ? `<span class="admin-actions"><button type="button" class="btn btn-sm" data-action="quick-edit" data-id="${Utils.esc(a.id)}">Edytuj</button><button type="button" class="btn btn-sm btn-danger" data-action="quick-delete" data-id="${Utils.esc(a.id)}">Usuń</button></span>` : '';
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
  if (!list.length && !Auth.isAdmin()) return '';
  return `<section class="quick-strip" aria-label="Szybkie Newsy">
    <div class="quick-head"><h2 class="section-title">Szybkie Newsy</h2>
      <span><button type="button" class="btn btn-sm admin-only" data-action="quick-new">+ Dodaj</button> <a class="quick-all" href="#/szybkie">Wszystkie →</a></span></div>
    ${list.length ? `<ul class="quick-list">${list.map(a => quickItemHtml(a, false)).join('')}</ul>` : '<p class="muted">Nie ma jeszcze szybkich newsów.</p>'}
  </section>`;
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
      <div class="top-actions"><button type="button" class="btn btn-primary admin-only" data-action="quick-new">+ Dodaj szybki news</button></div></div>
    <header class="rank-head">
      <span class="rank-eyebrow">Krótko i na temat</span>
      <h1 class="rank-title">Szybkie Newsy</h1>
    </header>
    ${groups.length ? groups.map(g => `<section class="quick-day"><h2 class="quick-day-title">${g.label}</h2><ul class="quick-list">${g.items.map(a => quickItemHtml(a, true)).join('')}</ul></section>`).join('')
      : '<div class="empty-state"><p>Nie ma jeszcze szybkich newsów. Zajrzyj tu niedługo.</p></div>'}
    ${list.length > shown.length ? '<div class="load-more"><button type="button" class="btn" data-action="quick-more">Pokaż starsze</button></div>' : ''}`;
}

function openQuickModal(id) {
  const a = id ? state.articles.find(x => x.id === id) : null;
  state.quickId = a ? a.id : null;
  $('#quick-title').textContent = a ? 'Edytuj szybki news' : 'Nowy szybki news';
  $('#qk-submit').textContent = a ? 'Zapisz' : 'Opublikuj';
  $('#qk-delete').hidden = !a;
  $('#qk-text').value = a ? a.title : '';
  $('#qk-link').value = a ? a.link || '' : '';
  $('#qk-source').value = a ? a.sourceName || '' : (state.profile.quickSource || '');
  $('#qk-push').checked = a ? false : state.profile.quickPush !== false;
  $('#qk-push-row').hidden = !!a;
  $('#qk-count').textContent = $('#qk-text').value.length;
  $('#qk-error').hidden = true;
  openModal('quick-modal');
}

async function submitQuick(e) {
  e.preventDefault();
  if (!Auth.isAdmin()) { toast('Sesja wygasła – zaloguj się ponownie.', 'error'); return; }
  const err = msg => { const el = $('#qk-error'); el.textContent = msg; el.hidden = !msg; };
  const text = $('#qk-text').value.replace(/\s+/g, ' ').trim();
  let link = $('#qk-link').value.trim();
  if (text.length < 8) { err('Wpisz treść newsa (min. 8 znaków).'); return; }
  if (link && !/^https?:\/\//i.test(link)) link = 'https://' + link;
  if (link && !/^https?:\/\/[^\s]+\.[^\s]+$/i.test(link)) { err('Link wygląda niepoprawnie.'); return; }
  const existing = state.quickId ? state.articles.find(x => x.id === state.quickId) : null;
  const now = new Date().toISOString();
  const article = {
    id: existing ? existing.id : Utils.uid(),
    quick: true,
    title: text, lead: text, content: '',
    category: 'Inne', categories: ['Inne'], tags: [],
    author: (existing && existing.author) || state.profile.name || 'Redaktor',
    image: '', imageCaption: '', imageSource: '', review: null,
    urgent: false, featured: false,
    link, sourceName: $('#qk-source').value.trim().slice(0, 40),
    createdAt: existing ? existing.createdAt : now,
    updatedAt: now,
    noPush: existing ? !!existing.noPush : !$('#qk-push').checked
  };
  const btn = $('#qk-submit');
  btn.disabled = true;
  try {
    await DataService.save(article);
    upsertLocalState(article);
    closeModal('quick-modal');
    toast(existing ? 'Szybki news zapisany.' : 'Szybki news opublikowany.');
    refreshViews();
  } catch (ex) {
    err(ex.message || 'Nie udało się zapisać.');
  } finally {
    btn.disabled = false;
  }
}

async function deleteQuick(id) {
  if (!confirm('Usunąć ten szybki news?')) return;
  try {
    await DataService.remove(id);
    setArticles(state.articles.filter(x => x.id !== id));
    closeModal('quick-modal');
    toast('Szybki news usunięty.');
    refreshViews();
  } catch (ex) { toast(ex.message || 'Nie udało się usunąć.', 'error'); }
}

async function shareQuick(id) {
  const a = state.articles.find(x => x.id === id);
  if (!a) return;
  const url = a.link || (location.href.split('#')[0] + '#/szybkie');
  if (navigator.share) {
    try { await navigator.share({ title: 'Śliska News', text: a.title, url }); return; } catch (e) { if (e && e.name === 'AbortError') return; }
  }
  try { await navigator.clipboard.writeText(`${a.title} ${url}`); toast('Skopiowano do schowka.'); } catch { toast('Nie udało się skopiować.', 'error'); }
}

/** Story (1080×1920): tło marki + logo + treść newsa + zwykły napis „sliska.pl” – bez linku i naklejek. */
async function renderQuickStory(a) {
  const W = 1080, H = 1920, PAD = 72, topY = 230, footY = H - 520;
  const family = getComputedStyle(document.body).fontFamily;
  try { await Promise.all([document.fonts.load(`900 80px ${family}`), document.fonts.load(`800 80px ${family}`), document.fonts.load(`700 40px ${family}`)]); } catch {}
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  // tło: ciemne z czerwoną poświatą (bez zmian)
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#1a1a1a'); bg.addColorStop(1, '#070707');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(W * .85, H * .1, 0, W * .85, H * .1, 900);
  glow.addColorStop(0, 'rgba(214,0,28,.55)'); glow.addColorStop(1, 'rgba(214,0,28,0)');
  ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);

  // ta sama rama, logo, kicker i stopka co w pozostałych grafikach
  drawFrame(ctx, W, H, { a, family, dateY: topY + 28, dateSize: 34, padRight: PAD });
  await drawLogoWhite(ctx, PAD, topY, 330, family);
  drawKicker(ctx, 'SZYBKI NEWS', PAD, topY + 120, { family });

  const maxH = footY - 120 - (topY + 260);
  const t = fitText(ctx, family, a.title, W - PAD * 2, maxH, 92, 46, 900, 1.16);
  const total = t.lines.length * t.lh;
  let y = Math.round((topY + 260 + footY - 120 - total) / 2);
  ctx.fillStyle = '#fff'; ctx.textBaseline = 'top'; ctx.textAlign = 'left';
  ctx.font = `900 ${t.size}px ${family}`;
  for (const l of t.lines) { ctx.fillText(l, PAD, y); y += t.lh; }

  // stopka jak w pozostałych grafikach: linia + zwykły napis sliska.pl
  ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(PAD, footY - 56, W - PAD * 2, 2);
  ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.font = `700 32px ${family}`; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
  ctx.fillText('sliska.pl', PAD, footY);
  return canvasBlob(canvas);
}

async function shareQuickStory(id, btn) {
  const a = state.articles.find(x => x.id === id);
  if (!a) return;
  const label = btn ? btn.textContent : '';
  if (btn) { btn.disabled = true; btn.textContent = 'Tworzę…'; }
  try {
    const blob = await renderQuickStory(a);
    const name = `sliska-story-${Utils.slugify(a.title).slice(0, 40) || a.id}.png`;
    const file = new File([blob], name, { type: 'image/png' });
    if (navigator.canShare && navigator.canShare({ files: [file] }) && window.matchMedia && matchMedia('(pointer: coarse)').matches) {
      try { await navigator.share({ files: [file] }); return; } catch (e) { if (e && e.name === 'AbortError') return; }
    }
    const obj = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = obj; link.download = name;
    document.body.appendChild(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(obj), 4000);
    toast('Story pobrane.');
  } catch (e) {
    toast('Nie udało się utworzyć grafiki.', 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = label; }
  }
}

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
    await DataService.addTip({
      id: Utils.uid('t_'),
      title: ('Błąd w artykule: ' + a.title).slice(0, 120),
      message: text.slice(0, 1700) + '\n\nArtykuł: ' + articleUrl(a),
      link: articleUrl(a).slice(0, 300),
      email,
      createdAt: new Date().toISOString()
    });
    try { localStorage.setItem(TIP_LOG_KEY, JSON.stringify([...log, Date.now()])); } catch { /* ignoruj */ }
    closeModal('report-modal');
    toast('Dziękujemy! Zgłoszenie trafiło do redakcji.');
  } catch (ex) {
    err(ex.message || 'Nie udało się wysłać zgłoszenia. Spróbuj później.');
  } finally {
    btn.disabled = false;
  }
}

/* ---------- Podgląd linku (og:image) osobny dla każdego artykułu ---------- */
async function ogJpegDataUrl(a) {
  const { blob } = await renderInstagramImage(a, { format: 'share' });
  const bmp = await createImageBitmap(blob);
  const cv = document.createElement('canvas');
  cv.width = 1200; cv.height = 630;
  cv.getContext('2d').drawImage(bmp, 0, 0, 1200, 630);
  for (const q of [0.86, 0.76, 0.66, 0.55]) {
    const url = cv.toDataURL('image/jpeg', q);
    if (url.length < 380000) return url;
  }
  return cv.toDataURL('image/jpeg', 0.45);
}

async function publishOg(a) {
  if (DataService.mode !== 'firebase' || !Auth.isAdmin() || a.quick) return false;
  try {
    await DataService.saveOg(a.id, await ogJpegDataUrl(a));
    return true;
  } catch (e) {
    console.warn('Podgląd linku nie został zapisany:', e);
    return false;
  }
}

async function refreshAllOg(btn) {
  const list = state.articles.filter(a => !a.quick);
  const label = btn.textContent;
  btn.disabled = true;
  let ok = 0;
  for (let i = 0; i < list.length; i++) {
    btn.textContent = `Generuję ${i + 1}/${list.length}…`;
    if (await publishOg(list[i])) ok++;
  }
  btn.disabled = false; btn.textContent = label;
  toast(ok ? `Podglądy linków zapisane: ${ok}/${list.length}.` : 'Nie udało się zapisać podglądów (tryb demo lub brak uprawnień w regułach Firestore).', ok ? undefined : 'error');
}

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
      try { await navigator.share({ files: [file], title: a.title, text: `${a.title}\n${url}`, url }); return; } catch (e) { if (e && e.name === 'AbortError') return; }
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
  class GalleryBlot extends BlockEmbed {
    static create(value) {
      const node = super.create();
      node.setAttribute('contenteditable', 'false');
      const track = document.createElement('div');
      track.className = 'gallery-track';
      (value.images || []).forEach(im => {
        const img = document.createElement('img');
        img.setAttribute('src', im.src);
        img.setAttribute('alt', value.caption || '');
        track.appendChild(img);
      });
      node.appendChild(track);
      if ((value.images || []).length > 1) {
        const n = document.createElement('span');
        n.className = 'gallery-count';
        n.textContent = value.images.length + ' zdjęć';
        node.appendChild(n);
      }
      if (value.caption) {
        const cap = document.createElement('figcaption');
        cap.textContent = value.caption;
        node.appendChild(cap);
      }
      return node;
    }
    static value(node) {
      const cap = node.querySelector('figcaption');
      return {
        images: Array.from(node.querySelectorAll('.gallery-track img')).map(i => ({ src: i.getAttribute('src') || '' })),
        caption: cap ? cap.textContent : ''
      };
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

  GalleryBlot.blotName = 'gallery';
  GalleryBlot.tagName = 'figure';
  GalleryBlot.className = 'article-gallery';
  Quill.register(GalleryBlot);

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
    formats: ['header', 'bold', 'italic', 'underline', 'strike', 'blockquote', 'list', 'indent', 'link', 'image', 'figure', 'pullquote', 'embed', 'gallery'],
    modules: {
      toolbar: {
        container: [
          [{ header: [2, 3, false] }],
          ['bold', 'italic', 'underline', 'strike'],
          ['pullquote', 'embed', 'gallery'],
          [{ list: 'ordered' }, { list: 'bullet' }, { indent: '-1' }, { indent: '+1' }],
          ['link', 'image'],
          ['clean']
        ],
        handlers: { image() { openImageModal(); }, gallery() { openGalleryModal(); }, pullquote() { openQuoteModal(); }, embed() { openEmbedModal(); } }
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
  // Zmiana formatu (np. nagłówek) nie może przerzucać strony na górę – pilnujemy pozycji przez chwilę po kliknięciu w pasek
  let scrollLock = null;
  const armLock = () => { scrollLock = { x: window.scrollX, y: window.scrollY, until: Date.now() + 900 }; };
  ['pointerdown', 'mousedown', 'touchstart', 'click', 'change'].forEach(ev => toolbar.addEventListener(ev, armLock, true));
  window.addEventListener('scroll', () => {
    if (scrollLock && Date.now() < scrollLock.until && scrollLock.y - window.scrollY > 40) window.scrollTo(scrollLock.x, scrollLock.y);
  }, { passive: true });
  editor.quill.root.addEventListener('keydown', e => { if (e.key === ' ') armLock(); }, true);
  const titles = {
    '.ql-bold': 'Pogrubienie (Ctrl+B)',
    '.ql-italic': 'Kursywa (Ctrl+I)',
    '.ql-underline': 'Podkreślenie (Ctrl+U)',
    '.ql-strike': 'Przekreślenie',
    '.ql-pullquote': 'Cytat (ze źródłem i autorem)',
    '.ql-embed': 'Wstaw film z YouTube lub odtwarzacz Spotify',
    '.ql-gallery': 'Galeria zdjęć (kilka zdjęć do przewijania)',
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
  const galBtn = toolbar.querySelector('.ql-gallery');
  if (galBtn) galBtn.innerHTML = '<svg viewBox="0 0 18 18"><rect class="ql-stroke" x="4.5" y="2.5" width="11" height="9" rx="1.6" fill="none" stroke-width="1.5"/><path class="ql-stroke" d="M2.5 5.5v7.2c0 .9.7 1.6 1.6 1.6h8.4" fill="none" stroke-width="1.5" stroke-linecap="round"/><circle class="ql-fill" cx="8" cy="5.8" r="1.1"/><path class="ql-stroke" d="M5.5 10.5l2.7-2.6 2 1.8 2-2 2 2.2" fill="none" stroke-width="1.3" stroke-linejoin="round"/></svg>';
  Object.entries(titles).forEach(([sel, title]) => {
    const b = toolbar.querySelector(sel);
    if (b) b.title = title;
  });

  // Wklejanie / przeciąganie zdjęć (nasłuch na kontenerze, żeby uprzedzić obsługę Quilla)
  const imgFiles = dt => Array.from((dt && dt.files) || []).filter(f => f.type.startsWith('image/'));
  editor.quill.container.addEventListener('paste', e => {
    const files = imgFiles(e.clipboardData);
    if (!files.length) { handleRichPaste(e); return; }
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
    const gl = e.target.closest && e.target.closest('figure.article-gallery');
    if (gl) {
      const gb = Quill.find(gl);
      if (gb) openGalleryModal({ index: editor.quill.getIndex(gb), ...gb.constructor.value(gb.domNode) });
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
    openReaderModal('login');
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
  const author = (d.author || '').trim() || 'Redaktor';
  if (!Utils.parseTags(d.tags).length) {
    const sug = suggestedTags();
    if (sug.length && confirm(`Artykuł nie ma tagów. Dodać proponowane: ${sug.slice(0, 5).join(', ')}?`)) {
      $('#f-tags').value = sug.slice(0, 5).join(', ');
      d.tags = $('#f-tags').value;
      renderTagChips();
    }
  }

  if (!title) { toast('Podaj tytuł artykułu.', 'error'); $('#f-title').focus(); return; }
  if (!lead) { toast('Uzupełnij lead (zajawkę).', 'error'); $('#f-lead').focus(); return; }
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

  const ownProfile = author === state.profile.name && state.profile.avatar && state.profile.showPhoto !== false;
  const authorPhoto = ownProfile ? await shrinkAvatar(state.profile.avatar) : ((editor.existing && editor.existing.authorPhoto) || '');

  const article = {
    id: editor.articleId || Utils.uid(),
    title,
    lead,
    category: d.categories[0],
    categories: d.categories,
    tags: Utils.parseTags(d.tags),
    author,
    authorUid: Auth.uid(),
    authorPhoto,
    image: d.image,
    imagePos: d.image && d.imagePos ? d.imagePos : null,
    imageCaption: d.imageCaption.trim(),
    imageSource: d.imageSource.trim(),
    review,
    urgent: d.urgent,
    featured: d.featured,
    commentsOff: !!d.commentsOff,
    status: d.status,
    related: d.related,
    content: d.content,
    createdAt,
    updatedAt: new Date().toISOString()
  };

  const buttons = [$('#editor-save'), $('#btn-save-draft')];
  buttons.forEach(b => { b.disabled = true; });
  try {
    await DataService.save(article);
    upsertLocalState(article);
    publishOg(article);
    try { localStorage.setItem(CONFIG.AUTHOR_KEY + '_' + Auth.uid(), author); } catch { /* ignoruj */ }

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
    authorPhoto: (d.author.trim() === state.profile.name && state.profile.avatar) || '',
    image: d.image,
    imagePos: d.image && d.imagePos ? d.imagePos : null,
    imageCaption: d.imageCaption.trim(),
    imageSource: d.imageSource.trim(),
    review: d.reviewOn && Utils.parseScore(d.reviewScore) !== null
      ? { score: Utils.parseScore(d.reviewScore), coverSame: d.reviewCoverSame, cover: d.reviewCoverSame ? '' : d.reviewCover, kind: d.reviewKind.trim(), work: d.reviewWork.trim() || '(tytuł)', artist: d.reviewArtist.trim(), year: d.reviewYear.trim() }
      : null,
    urgent: d.urgent,
    featured: d.featured,
    commentsOff: !!d.commentsOff,
    status: d.status,
    related: d.related,
    content: d.content,
    createdAt: created,
    updatedAt: created
  };
  $('#preview-body').innerHTML = articleHtml(preview, Utils.stripHtml(d.content));
  enhanceGalleries($('#preview-body'));
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


/* =========================================================
   Konta czytelników i komentarze
   ========================================================= */
const READER_ERR = {
  name_len: 'Nazwa użytkownika musi mieć od 3 do 20 znaków.', name_chars: 'W nazwie dozwolone są litery, cyfry, spacja oraz _ . -',
  name_bad: 'Ta nazwa jest niedozwolona. Wybierz inną.', name_taken: 'Ta nazwa jest już zajęta.',
  name_cooldown: 'Nazwę użytkownika możesz zmieniać raz na 30 dni.', verify: 'Potwierdź adres e-mail (link w wiadomości od nas), żeby komentować.',
  banned: 'Twoje konto zostało zablokowane.', rate: 'Za dużo prób – spróbuj ponownie później.', dup: 'Taki komentarz już dodałeś.',
  off: 'Komentarze do tego artykułu są wyłączone.', short: 'Komentarz jest za krótki.', long: 'Komentarz jest za długi (maks. 600 znaków).',
  no_profile: 'Najpierw ustaw nazwę użytkownika na stronie konta.', avatar: 'Nie udało się zapisać zdjęcia.', auth: 'Zaloguj się ponownie.',
  readers_off: 'Komentarze są chwilowo niedostępne.', 'auth/email-already-in-use': 'Ten adres e-mail ma już konto. Zaloguj się.',
  'auth/weak-password': 'Hasło musi mieć co najmniej 6 znaków.', 'auth/invalid-email': 'Nieprawidłowy adres e-mail.',
  'auth/invalid-credential': 'Nieprawidłowy e-mail lub hasło.', 'auth/wrong-password': 'Nieprawidłowy e-mail lub hasło.', 'auth/user-not-found': 'Nieprawidłowy e-mail lub hasło.',
  'auth/too-many-requests': 'Zbyt wiele prób. Spróbuj za kilka minut.', 'auth/network-request-failed': 'Brak połączenia z internetem.',
  'auth/missing-password': 'Wpisz hasło.', 'auth/operation-not-allowed': 'Logowanie e-mailem nie jest włączone w projekcie czytelników.'
};
const readerErr = e => READER_ERR[(e && (e.code || e.error || e.message))] || 'Coś poszło nie tak. Spróbuj ponownie.';

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
        if (u) { await this.loadMe(); Push.link(); this.joinEditor(); }
        this.loading = false; this.render();
      });
    } catch (e) { console.warn('Konta czytelników niedostępne:', e); this.loading = false; this.auth = null; }
  },
  async api(path, opts = {}) {
    const headers = { 'content-type': 'application/json' };
    if (this.user) { try { headers.authorization = 'Bearer ' + await this.user.getIdToken(); } catch { /* ignoruj */ } }
    const r = await fetch(CONFIG.API_BASE + path, { ...opts, headers: { ...headers, ...(opts.headers || {}) }, cache: 'no-store' });
    let d = {}; try { d = await r.json(); } catch { /* ignoruj */ }
    if (!r.ok) { const e = new Error(d.error || 'http'); e.error = d.error || 'http'; e.data = d; throw e; }
    return d;
  },
  async loadMe() { try { this.me = await this.api('/me'); } catch { this.me = null; } },
  loggedIn() { return !!this.user; },
  verified() { return !!(this.user && this.user.emailVerified); },
  hasName() { return !!(this.me && this.me.name); },
  async register(email, pw, name) {
    const cred = await this.auth.createUserWithEmailAndPassword(email, pw);
    this.user = cred.user;
    try { await cred.user.sendEmailVerification(); } catch { /* ignoruj */ }
    try { this.me = await this.api('/me', { method: 'POST', body: JSON.stringify({ name }) }); } catch (e) { e.accountCreated = true; throw e; }
    this.render();
  },
  async login(email, pw) { await this.auth.signInWithEmailAndPassword(email, pw); },
  async logout() {
    await Push.unlink();
    try { const cur = Auth.mode === 'firebase' && FirebaseProvider.auth && FirebaseProvider.auth.currentUser; if (cur && /^rd_/.test(cur.uid)) await FirebaseProvider.auth.signOut(); } catch { /* ignoruj */ }
    await this.auth.signOut();
  },
  /** Czytelnik z rolą Redaktor/Właściciel dostaje od workera token logowania do projektu redakcji (prawo pisania artykułów). */
  async joinEditor() {
    try {
      if (Auth.mode !== 'firebase' || !FirebaseProvider.auth || this._joining) return;
      const cur = FirebaseProvider.auth.currentUser, role = this.me && this.me.role;
      if (!['editor', 'owner'].includes(role)) { if (cur && /^rd_/.test(cur.uid)) await FirebaseProvider.auth.signOut(); return; }   // odebrana rola = koniec sesji redaktora
      if (cur) return;
      this._joining = true;
      const d = await this.api('/editor-token', { method: 'POST' });
      await FirebaseProvider.auth.signInWithCustomToken(d.token);
    } catch (e) { if (e && e.error !== 'no_sa' && e.error !== 'forbidden') console.warn('Logowanie redaktora nie powiodło się:', e); }
    finally { this._joining = false; }
  },
  async reset(email) { await this.auth.sendPasswordResetEmail(email); },
  async resend() { await this.user.sendEmailVerification(); },
  async refresh() { if (!this.user) return; await this.user.reload(); await this.user.getIdToken(true); await this.loadMe(); this.render(); this.joinEditor(); },
  async saveName(name) { this.me = await this.api('/me', { method: 'POST', body: JSON.stringify({ name }) }); this.render(); },
  async saveAvatar(dataUrl) { this.me = await this.api('/me', { method: 'POST', body: JSON.stringify({ avatar: dataUrl || null }) }); this.render(); },
  render() {
    renderReaderCard();
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
  Cmt.article = a.id; Cmt.list = []; Cmt.off = false; Cmt.ok = false; Cmt.expanded = false; Cmt.msg = ''; Cmt.replyTo = null; Cmt.focus = currentRoute().k || 0;
  try {
    const d = await actorApi('/comments?article=' + encodeURIComponent(a.id));
    if (!$('#comments') || $('#comments').dataset.article !== a.id) return;
    Cmt.list = d.comments || []; Cmt.off = !!d.off; Cmt.ok = d.enabled !== false;
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
  const rep = !c.mine && Readers.loggedIn() && !isStaffActor() ? `<button type="button" class="cmt-act" data-cmt="report" data-id="${c.id}">Zgłoś</button>` : '';
  const adm = admin ? `<button type="button" class="cmt-act" data-cmt="admin-delete" data-id="${c.id}">Usuń</button>` : '';
  const canReply = !Cmt.off && c.status === 'ok';
  const reply = canReply ? `<button type="button" class="cmt-act" data-cmt="reply" data-id="${c.id}">Odpowiedz</button>` : '';
  const link = c.status === 'ok' ? `<button type="button" class="cmt-act" data-cmt="link" data-id="${c.id}">Link</button>` : '';
  const sub = kids && kids.length ? `<ul class="cmt-replies">${kids.map(k => commentItemHtml(k)).join('')}</ul>` : '';
  return `<li class="cmt${c.status === 'pending' ? ' is-pending' : ''}" id="c-${c.id}">
    <div class="cmt-av avatar">${readerAvatar(c.name, c.av, c.u)}</div>
    <div class="cmt-body">
      <div class="cmt-head"><b>${Utils.esc(c.name)}</b>${roleBadge(c)}${c.to ? `<span class="cmt-to">↪ ${Utils.esc(c.to)}</span>` : ''}<time>${ago(c.at)}</time></div>
      ${cmtTextHtml(c)}
      ${c.status === 'pending' ? '<small class="cmt-wait">Czeka na zatwierdzenie przez redakcję</small>' : ''}
      <div class="cmt-actions">${reply}${link}${own}${rep}${adm}</div>
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
  else if (!Readers.loggedIn() && !isStaffActor()) form = '<button type="button" class="btn btn-primary cmt-login" data-cmt="login">Zaloguj się, żeby skomentować</button>';
  else if (!isStaffActor() && !Readers.hasName()) form = '<p class="cmt-note">Ustaw nazwę użytkownika na <a href="#/konto">stronie konta</a>, żeby komentować.</p>';
  else if (!isStaffActor() && !Readers.verified()) form = '<div class="cmt-note">Potwierdź adres e-mail (wysłaliśmy link), żeby komentować.<div class="cmt-row"><button type="button" class="btn btn-sm" data-cmt="resend">Wyślij link ponownie</button><button type="button" class="btn btn-sm" data-cmt="refresh">Już potwierdziłem</button></div></div>';
  else form = `<form class="cmt-form" id="cmt-form">${Cmt.replyTo ? `<div class="cmt-replying">Odpowiadasz użytkownikowi <b>${Utils.esc(Cmt.replyTo.name)}</b><button type="button" class="cmt-act" data-cmt="cancel-reply">Anuluj</button></div>` : ''}<textarea id="cmt-text" rows="3" maxlength="600" placeholder="${Cmt.replyTo ? 'Napisz odpowiedź' : 'Napisz komentarz'} jako ${Utils.esc(isStaffActor() ? staffName() + ' (redakcja)' : Readers.me.name)}…" aria-label="Komentarz"></textarea>
      <div class="cmt-row"><small><span id="cmt-count">0</span>/600</small><button type="submit" class="btn btn-primary btn-sm" id="cmt-send">Opublikuj</button></div></form>`;
  const keep = $('#cmt-text') ? $('#cmt-text').value : '';
  box.innerHTML = `<h2 class="cmt-title">Komentarze <span>${visible.length}</span></h2>
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
  if (text.length < 2) return;
  Cmt.sending = true; const btn = $('#cmt-send'); btn.disabled = true;
  try {
    const d = await actorApi('/comments', { method: 'POST', body: JSON.stringify({ article: Cmt.article, text, replyTo: Cmt.replyTo ? Cmt.replyTo.id : undefined, staffName: staffName() }) });
    Cmt.list.unshift(d.comment); Cmt.replyTo = null;
    Cmt.msg = d.held ? 'Komentarz zawiera link lub niedozwolone słowa, więc czeka na zatwierdzenie redakcji.' : '';
    if (d.censored && !d.held) Cmt.msg = 'Opublikowano. Niektóre słowa zostały automatycznie ocenzurowane.';
    else if (!d.held && Push.supported() && Notification.permission !== 'granted') Cmt.msg = 'Opublikowano. Włącz powiadomienia (dzwonek na górze), a damy Ci znać, gdy ktoś odpowie na Twój komentarz.';
    $('#cmt-text').value = '';
  } catch (err) { Cmt.msg = readerErr(err); }
  finally { Cmt.sending = false; drawComments(); }
}

function cmtCount() {
  const t = $('#cmt-text'), n = $('#cmt-count'); if (!t || !n) return;
  const len = t.value.length;
  n.textContent = len;
  n.parentElement.classList.toggle('is-warn', len >= 540 && len < 600);
  n.parentElement.classList.toggle('is-max', len >= 600);
}

async function commentAction(act, id, btn) {
  try {
    if (act === 'more') { Cmt.expanded = true; drawComments(); return; }
    if (act === 'toggle') { cmtOpen.has(id) ? cmtOpen.delete(id) : cmtOpen.add(id); drawComments(); return; }
    if (act === 'login') { openReaderModal('login'); return; }
    if (act === 'reply') {
      if (!Readers.loggedIn() && !isStaffActor()) { openReaderModal('login'); return; }
      const c = Cmt.list.find(x => x.id === id); if (!c) return;
      Cmt.replyTo = { id: c.id, name: c.name }; drawComments();
      const t = $('#cmt-text'); if (t) { t.focus(); t.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
      return;
    }
    if (act === 'cancel-reply') { Cmt.replyTo = null; drawComments(); return; }
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
      await actorApi('/comments/report', { method: 'POST', body: JSON.stringify({ id }) });
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
async function adminApi(path, opts = {}) {
  const h = await actorAuth();
  if (!h.authorization) throw new Error('Moderacja działa po zalogowaniu.');
  const r = await fetch(CONFIG.API_BASE + path, { ...opts, headers: { 'content-type': 'application/json', ...h }, cache: 'no-store' });
  let d = {}; try { d = await r.json(); } catch { /* ignoruj */ }
  if (!r.ok) throw new Error(d.error === 'forbidden' ? 'Brak uprawnień moderatora.' : (READER_ERR[d.error] || 'Nie udało się wykonać akcji.'));
  return d;
}

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
  $('#reader-pass-field').hidden = rst || nm;
  $('#reader-terms').hidden = !reg;
  $('#reader-submit').textContent = reg ? 'Załóż konto' : rst ? 'Wyślij link' : nm ? 'Zapisz' : 'Zaloguj się';
  $('#reader-switch').innerHTML = rst ? '<a href="#" data-rmode="login">Wróć do logowania</a>' : login ? '<a href="#" data-rmode="reset">Nie pamiętam hasła</a>' : '';
  $('#reader-email-field').hidden = nm || (login && Auth.mode === 'local' && !Readers.enabled());
  $('#reader-pass').autocomplete = reg ? 'new-password' : 'current-password';
  $('#reader-pass').placeholder = reg ? 'Min. 6 znaków' : 'Twoje hasło';
}
/** Jedno okno logowania: najpierw konto redaktora (projekt główny), potem konto czytelnika. */
async function unifiedLogin(email, pw) {
  const credErr = c => /^(auth\/(invalid-credential|wrong-password|user-not-found|invalid-email|missing-email)|app\/(wrong-password|not-editor))$/.test(c || '');
  if (Auth.mode === 'firebase' || Auth.mode === 'local') {
    try { await Auth.login(email, pw); applyAuthUI(); return 'editor'; }
    catch (e) { if (!Readers.auth || !credErr(e && e.code)) throw e; }
  }
  if (!Readers.auth) throw { code: 'auth/invalid-credential' };
  await Readers.login(email, pw);
  return 'reader';
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
  const tab = rt === 'komentarze' && canMod() ? 'komentarze' : rt === 'uzytkownicy' && canManage() ? 'uzytkownicy' : '';
  const tabsHtml = canMod() ? `<div class="ptabs" role="tablist" aria-label="Sekcje konta"><a class="ptab ${tab ? '' : 'is-active'}" href="#/konto">Konto</a><a class="ptab ${tab === 'komentarze' ? 'is-active' : ''}" href="#/konto/komentarze">Komentarze</a>${canManage() ? `<a class="ptab ${tab === 'uzytkownicy' ? 'is-active' : ''}" href="#/konto/uzytkownicy">Użytkownicy</a>` : ''}</div>` : '';
  el.innerHTML = `<div class="article-top"><a class="btn" href="#/">← Powrót do strony głównej</a></div>
    <h1 class="panel-title">Twoje konto</h1>
    <p class="panel-sub">${Utils.esc(me.name || '')}${ROLE_LABEL[me.role] ? ' · ' + ROLE_LABEL[me.role] : ''}</p>
    ${tabsHtml}
    ${tab ? '<div id="acc-mod" class="panel-list"></div>' : `<div class="settings-form">
      <section class="panel st-card">
        <div class="st-head"><h2 class="st-h">Profil</h2><p class="st-sub">Tak widzą Cię inni w komentarzach.</p></div>
        <div class="settings-avatar"><div class="avatar avatar-lg" id="acc-avatar">${readerAvatar(me.name, me.avatarAt, me.pub)}</div>
          <div class="settings-avatar-actions"><input type="file" id="acc-avatar-file" accept="image/*">${me.hasAvatar ? '<button type="button" class="btn btn-sm btn-danger" id="acc-avatar-remove">Usuń zdjęcie</button>' : ''}</div></div>
        <label class="field"><span class="field-label">Nazwa użytkownika</span>
          <input type="text" id="acc-name" maxlength="20" value="${Utils.esc(me.name || '')}" placeholder="3–20 znaków" ${next ? 'disabled' : ''}>
          <small class="hint">${next ? 'Następną zmianę nazwy możesz zrobić ' + next + '.' : 'Nazwę możesz zmienić raz na 30 dni.'}</small></label>
        ${next ? '' : '<div class="st-actions"><button type="button" class="btn btn-primary" id="acc-save">Zapisz nazwę</button></div>'}
        <p class="form-error" id="acc-error" hidden></p>
      </section>
      <section class="panel st-card">
        <div class="st-head"><h2 class="st-h">Konto</h2></div>
        <div class="st-row"><span class="muted">Adres e-mail</span><strong>${Utils.esc(Readers.user.email || '')}</strong></div>
        <div class="st-row"><span class="muted">Potwierdzenie e-mail</span>${Readers.verified() ? '<strong class="ok-text">Potwierdzony</strong>' : '<span><button type="button" class="btn btn-sm" data-cmt="resend">Wyślij link</button> <button type="button" class="btn btn-sm" data-cmt="refresh">Już potwierdziłem</button></span>'}</div>
        <div class="st-row"><span class="muted">Hasło</span><button type="button" class="btn btn-sm" id="acc-reset">Wyślij link do zmiany hasła</button></div>
        <div class="st-row"><span class="muted">Sesja</span><button type="button" class="btn btn-sm" id="acc-logout">Wyloguj</button></div>
      </section>
    </div>`}`;
  if (tab === 'komentarze') renderModComments($('#acc-mod'), false);
  else if (tab === 'uzytkownicy') renderModUsersPanel($('#acc-mod'));
}

/** Kafelek profilu po lewej także dla zalogowanego czytelnika (w tym samym miejscu co u redaktora, bez funkcji redakcyjnych). */
function renderReaderCard() {
  const rd = Readers.loggedIn(), only = rd && !Auth.isAdmin();
  document.body.classList.toggle('is-reader', rd);
  document.body.classList.toggle('is-reader-only', only);
  const me = Readers.me || {};
  $('#btn-rd-mod').hidden = !canMod();
  $('#btn-rd-users').hidden = !canManage();
  if (only) {
    $('#profile-name').textContent = me.name || 'Twoje konto';
    $('#profile-avatar').innerHTML = readerAvatar(me.name, me.avatarAt, me.pub);
    $('#profile-role').textContent = ROLE_LABEL[me.role] || 'Czytelnik';
  } else if (rd && Auth.isAdmin() && me.role === 'owner') $('#profile-role').textContent = ROLE_LABEL.owner;
  else if (Auth.isAdmin()) $('#profile-role').textContent = 'Redaktor';
}

async function shrinkToJpeg(file, size = 160) {
  const img = await loadImage(URL.createObjectURL(file), false);
  const c = document.createElement('canvas'); c.width = c.height = size;
  const ctx = c.getContext('2d');
  const k = Math.max(size / img.naturalWidth, size / img.naturalHeight);
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, size, size);
  ctx.drawImage(img, (size - img.naturalWidth * k) / 2, (size - img.naturalHeight * k) / 2, img.naturalWidth * k, img.naturalHeight * k);
  return c.toDataURL('image/jpeg', 0.82);
}

function bindReaderEvents() {
  $('#btn-account').addEventListener('click', () => { if (Readers.loggedIn()) location.hash = '#/konto'; else openReaderModal('login'); });
  $('#reader-error').className = 'form-error';
  $('#reader-form').addEventListener('submit', submitReader);
  $('#reader-modal').addEventListener('click', e => { const a = e.target.closest('[data-rmode]'); if (a) { e.preventDefault(); setReaderMode(a.dataset.rmode); $('#reader-error').hidden = true; } });
  document.addEventListener('click', async e => {
    const c = e.target.closest('[data-cmt]'); if (c) { commentAction(c.dataset.cmt, Number(c.dataset.id) || 0, c); return; }
    if (e.target.id === 'acc-register') openReaderModal('register');
    else if (e.target.id === 'acc-logout') { await Readers.logout(); location.hash = '#/'; }
    else if (e.target.id === 'acc-reset') { try { await Readers.reset(Readers.user.email); toast('Wysłaliśmy link do zmiany hasła.'); } catch (ex) { toast(readerErr(ex), 'error'); } }
    else if (e.target.id === 'acc-save') {
      const er = $('#acc-error'); er.hidden = true;
      try { await Readers.saveName($('#acc-name').value.trim()); toast('Zapisano nazwę użytkownika.'); } catch (ex) { er.textContent = readerErr(ex); er.hidden = false; }
    } else if (e.target.id === 'acc-avatar-remove') { try { await Readers.saveAvatar(null); toast('Zdjęcie usunięte.'); } catch (ex) { toast(readerErr(ex), 'error'); } }
  });
  document.addEventListener('submit', e => { if (e.target.id === 'cmt-form') sendComment(e); });
  document.addEventListener('input', e => { if (e.target.id === 'cmt-text') cmtCount(); });
  document.addEventListener('change', async e => {
    if (e.target.id !== 'acc-avatar-file' || !e.target.files[0]) return;
    try { await Readers.saveAvatar(await shrinkToJpeg(e.target.files[0])); toast('Zdjęcie zapisane.'); } catch (ex) { toast(readerErr(ex), 'error'); }
  });
}

/* ---- moderacja komentarzy i użytkowników (panel redaktora oraz konto właściciela / redaktora-czytelnika) ---- */
const Mod = { all: false };
const ROLE_LABEL = { owner: 'Właściciel Portalu', chief: 'Redaktor naczelny', editor: 'Redaktor' };
const MOD_ST = { pending: 'Czeka', reported: 'Zgłoszony', hidden: 'Ukryty', ok: 'Widoczny' };
const myRole = () => (Readers.me && Readers.me.role) || '';
const canMod = () => Auth.isAdmin() || myRole() === 'owner' || myRole() === 'editor';
const canManage = () => myRole() === 'owner';          // użytkownikami zarządza tylko Właściciel Portalu
const roleBadge = c => c.staff ? `<span class="cmt-badge${c.role === 'editor' || c.role === 'chief' ? ' is-' + c.role : ''}">${ROLE_LABEL[c.role] || 'Redakcja'}</span>` : ROLE_LABEL[c.role] ? `<span class="cmt-badge is-${c.role}">${ROLE_LABEL[c.role]}</span>` : '';

function modItemHtml(c) {
  const a = state.articles.find(x => x.id === c.article);
  const approve = c.status === 'hidden' ? 'Przywróć' : 'Zatwierdź';
  return `<article class="mc" data-id="${c.id}" data-status="${c.status}">
    <div class="mc-head"><b>${Utils.esc(c.name || 'Użytkownik')}</b>${roleBadge(c)}<span class="mc-st is-${c.status}">${MOD_ST[c.status] || c.status}${c.reports ? ' · zgłoszeń: ' + c.reports : ''}</span><time>${ago(c.at)}</time></div>
    <a class="mc-art" href="#/artykul/${encodeURIComponent(c.article)}?k=${c.id}">${Utils.esc(a ? a.title : c.article)}</a>
    <p class="mc-text">${Utils.esc(c.text).replace(/\n/g, '<br>')}</p>
    <div class="mc-actions">${c.status !== 'ok' ? `<button type="button" data-mod-act="approve">${approve}</button>` : '<button type="button" data-mod-act="hide">Ukryj</button>'}<button type="button" class="is-danger" data-mod-act="delete">Usuń</button></div>
  </article>`;
}

async function renderModComments(el, all) {
  if (!el) return;
  Mod.all = !!all; el.dataset.modroot = '1';
  el.innerHTML = '<p class="muted">Ładowanie…</p>';
  try {
    const d = await adminApi('/admin/comments?status=' + (all ? 'all' : 'attention'));
    el.innerHTML = `<div class="mod-bar"><b>${all ? 'Ostatnie komentarze' : 'Do sprawdzenia'}</b><button type="button" class="mc-link" data-mod="${all ? 'attention' : 'all'}">${all ? 'Tylko do sprawdzenia' : 'Pokaż ostatnie'}</button></div>
      <div class="mod-list">${d.comments.length ? d.comments.map(modItemHtml).join('') : '<p class="muted mod-empty">Brak komentarzy do sprawdzenia.</p>'}</div>`;
  } catch (ex) { el.innerHTML = `<p class="form-error">${Utils.esc(ex.message || 'Nie udało się pobrać komentarzy.')}</p>`; }
}

/** Zmiana bez przeładowania listy: pozycja przewijania zostaje, znika albo zmienia się tylko ta jedna pozycja. */
function modApply(item, act) {
  const status = act === 'delete' ? null : act === 'hide' ? 'hidden' : 'ok';
  const list = item.parentElement;
  if (!status || (!Mod.all && !['pending', 'reported'].includes(status))) {
    item.classList.add('is-out');
    setTimeout(() => { item.remove(); if (!list.querySelector('.mc')) list.innerHTML = '<p class="muted mod-empty">Brak komentarzy do sprawdzenia.</p>'; }, 190);
    return;
  }
  item.dataset.status = status;
  const st = item.querySelector('.mc-st'); st.className = 'mc-st is-' + status; st.textContent = MOD_ST[status];
  const first = item.querySelector('.mc-actions button');
  first.dataset.modAct = status === 'ok' ? 'hide' : 'approve';
  first.textContent = status === 'ok' ? 'Ukryj' : 'Przywróć';
  first.disabled = false;
}

function modUserHtml(u) {
  const staff = !!u.staff;
  const isOwner = u.role === 'owner';
  const opts = isOwner ? [['owner', 'Właściciel Portalu']] : staff ? [['', 'Redakcja'], ['editor', 'Redaktor'], ['chief', 'Redaktor naczelny']] : [['', 'Czytelnik'], ['editor', 'Redaktor (pisze artykuły)']];
  const sel = `<select data-mod-role ${isOwner ? 'disabled' : ''} aria-label="Rola">${opts.map(([v, l]) => `<option value="${v}" ${u.role === v ? 'selected' : ''}>${l}</option>`).join('')}</select>`;
  const av = `<label class="mu-file">Zmień zdjęcie<input type="file" accept="image/*" data-mod-avatar hidden></label>${u.avatar_at ? '<button type="button" data-mod-user="avatar-remove">Usuń zdjęcie</button>' : ''}`;
  return `<div class="mu" data-uid="${Utils.esc(u.uid)}" data-staff="${staff ? 1 : 0}" data-name="${Utils.esc(u.name)}">
    <div class="avatar mu-av">${readerAvatar(u.name, u.avatar_at, u.pub)}</div>
    <div class="mu-main"><b>${Utils.esc(u.name)}</b>${roleBadge({ staff, role: u.role })}<small>komentarzy: ${u.comments}${u.banned ? ' · <span class="mu-ban">zablokowany</span>' : ''}</small></div>
    <div class="mu-actions">${sel}${av}<button type="button" data-mod-user="rename">Zmień nazwę</button><button type="button" data-mod-user="cooldown">Zdejmij limit 30 dni</button><button type="button" class="${u.banned ? '' : 'is-danger'}" data-mod-user="${u.banned ? 'unban' : 'ban'}">${u.banned ? 'Odblokuj' : 'Zablokuj'}</button></div>
  </div>`;
}

async function loadModUsers(el) {
  const list = $('.mu-list', el); if (!list) return;
  const y = window.scrollY;
  try {
    const d = await adminApi('/admin/users?q=' + encodeURIComponent($('.mod-q', el).value.trim()));
    list.innerHTML = d.users.length ? d.users.map(modUserHtml).join('') : '<p class="muted">Brak użytkowników.</p>';
    window.scrollTo(0, y);
  } catch (ex) { list.innerHTML = `<p class="form-error">${Utils.esc(ex.message)}</p>`; }
}
function renderModUsersPanel(el) {
  if (!el) return;
  el.dataset.modusers = '1';
  el.innerHTML = `<div class="mod-bar"><b>Użytkownicy</b></div><input type="search" class="mod-q" placeholder="Szukaj po nazwie…" aria-label="Szukaj użytkownika"><div class="mu-list"><p class="muted">Ładowanie…</p></div>`;
  loadModUsers(el);
}
/** Zakładka „Komentarze” w panelu redaktora: moderacja + (dla uprawnionych) użytkownicy. */
function renderModeration(all) {
  const el = $('#panel-comments'); if (!el) return;
  el.innerHTML = '<div id="mod-c"></div>' + (canManage() ? '<div id="mod-u" class="mod-users"></div>' : '');
  renderModComments($('#mod-c'), all);
  if (canManage()) renderModUsersPanel($('#mod-u'));
}

document.addEventListener('click', async e => {
  const m = e.target.closest('[data-mod]'), a = e.target.closest('[data-mod-act]'), u = e.target.closest('[data-mod-user]');
  try {
    if (m) { renderModComments(m.closest('[data-modroot]'), m.dataset.mod === 'all'); }
    else if (a) {
      const item = a.closest('.mc'); if (!item || a.disabled) return;
      a.disabled = true;
      try { await adminApi('/admin/comment', { method: 'POST', body: JSON.stringify({ id: Number(item.dataset.id), action: a.dataset.modAct }) }); modApply(item, a.dataset.modAct); }
      catch (ex) { a.disabled = false; throw ex; }
    } else if (u) {
      const row = u.closest('.mu'), body = { uid: row.dataset.uid }, k = u.dataset.modUser;
      if (k === 'rename') { const n = prompt('Nowa nazwa użytkownika:', row.dataset.name); if (!n) return; body.name = n; }
      else if (k === 'cooldown') body.resetCooldown = true;
      else if (k === 'avatar-remove') { if (!confirm('Usunąć zdjęcie profilowe tego użytkownika?')) return; body.avatar = null; }
      else if (k === 'ban' || k === 'unban') { if (k === 'ban' && !confirm('Zablokować tego użytkownika?')) return; body.banned = k === 'ban'; }
      await adminApi('/admin/user', { method: 'POST', body: JSON.stringify(body) }); toast('Zapisano.'); loadModUsers(row.closest('[data-modusers]'));
    }
  } catch (ex) { toast(ex.message || 'Nie udało się.', 'error'); }
});
document.addEventListener('change', async e => {
  const sel = e.target.closest('[data-mod-role]'); if (!sel) return;
  const row = sel.closest('.mu'), box = row.closest('[data-modusers]');
  try {
    const d = await adminApi('/admin/user', { method: 'POST', body: JSON.stringify({ uid: row.dataset.uid, role: sel.value }) });
    if (row.dataset.staff === '1') toast('Rola zapisana. Konto redakcji ma dostęp z reguł Firestore – rola zmienia tylko tytuł przy komentarzach.');
    else if (sel.value === 'editor' && d.editorSync === null) toast('Rola zapisana (plakietka i moderacja). Prawo pisania artykułów wymaga konta serwisowego w workerze – patrz instrukcja.');
    else if (d.editorSync === false) toast('Rola zapisana, ale synchronizacja z Firebase się nie udała. Sprawdź konto serwisowe w workerze.', 'error');
    else toast('Rola zapisana.');
  } catch (ex) { toast(ex.message || 'Nie udało się.', 'error'); }
  loadModUsers(box);
});
document.addEventListener('change', async e => {
  const f = e.target.closest('[data-mod-avatar]'); if (!f || !f.files[0]) return;
  const row = f.closest('.mu'), box = row.closest('[data-modusers]');
  try { const data = await shrinkToJpeg(f.files[0]); await adminApi('/admin/user', { method: 'POST', body: JSON.stringify({ uid: row.dataset.uid, avatar: data }) }); toast('Zdjęcie zmienione.'); }
  catch (ex) { toast(ex.message || 'Nie udało się zmienić zdjęcia.', 'error'); }
  loadModUsers(box);
});
let modQTimer = 0;
document.addEventListener('input', e => { if (e.target.matches('.mod-q')) { clearTimeout(modQTimer); const box = e.target.closest('[data-modusers]'); modQTimer = setTimeout(() => loadModUsers(box), 300); } });

/* ---------- Routing ---------- */
function showView(name) {
  ['home', 'article', 'panel', 'editor', 'settings', 'ranking', 'notfound', 'tip', 'legal', 'saved', 'quick', 'account'].forEach(v => { $('#view-' + v).hidden = v !== name; });
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
  else if (route.name === 'quick') renderQuick();
  else if (route.name === 'panel') renderPanel();
}

/** Pamięta miejsce na liście: po wejściu w artykuł i cofnięciu wracasz dokładnie tam, gdzie byłeś. */
const ScrollMemory = { cur: location.hash || '#/', prev: '', n: 0, pos: {} };
const LIST_ROUTES = /^#\/($|kategoria|tag|artysta|ranking|zapisane|szybkie)/;

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
    openReaderModal('login');
    return;
  }

  $$('.main-nav .nav-link').forEach(l => l.classList.toggle('is-active',
    (l.id === 'nav-ranking' && r.name === 'ranking') || (l.id === 'nav-quick' && r.name === 'quick') || (l.id === 'nav-home' && r.name === 'home' && !r.tag && !r.artist && !r.category)));

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
    document.title = `Szybkie Newsy – ${CONFIG.SITE_NAME}`;
    setMeta('Szybkie Newsy', 'Krótkie newsy ze świata muzyki i rozrywki – jedno zdanie i link do źródła.');
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
  $('#ps-mine').textContent = me ? pub.filter(a => a.author === me).length : pub.length;
  $('#ps-sched').textContent = sched;
  const b = $('#pa-sched'); b.hidden = !sched; b.textContent = sched;
}

async function loadProfile() {
  const uid = Auth.uid();
  if (state.profileUid !== uid) { state.profile = EMPTY_PROFILE(); state.profileLoaded = false; state.profileUid = uid; }   // inne konto = inny profil
  if (state.profileLoaded) { renderProfile(); return; }
  state.profileLoaded = true;
  const cached = readLocalProfile();
  if (cached) state.profile = normProfile(cached);
  renderProfile();
  try {
    const remote = await DataService.getProfile();
    if (remote) {
      state.profile = normProfile(remote);
      writeLocalProfile(state.profile);
      renderProfile();
    } else if (/^rd_/.test(uid) && Readers.me && Readers.me.name && !state.profile.name) {     // nowy redaktor z konta czytelnika: zacznij od jego nazwy
      state.profile.name = Readers.me.name;
      renderProfile();
    }
  } catch (err) {
    console.warn('Nie udało się pobrać profilu:', err);
  }
}

let settingsAvatar = '';

/** Autorzy występujący w artykułach, których nazwa różni się od aktualnej nazwy i nie jest znanym aliasem. */
function otherAuthors() {
  const me = state.profile.name, known = new Set(state.profile.aliases || []);
  const m = new Map();
  state.articles.forEach(a => {
    const n = (a.author || '').trim();
    if (!n || n === me || known.has(n)) return;
    m.set(n, (m.get(n) || 0) + 1);
  });
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}

function renderSettings() {
  settingsAvatar = state.profile.avatar || '';
  $('#st-name').value = state.profile.name || '';
  $('#st-photo').checked = state.profile.showPhoto !== false;
  const sel = $('#st-cat');
  sel.innerHTML = '<option value="">Brak (wybieram za każdym razem)</option>' + CATEGORIES.map(c => `<option value="${Utils.esc(c)}">${Utils.esc(c)}</option>`).join('');
  sel.value = state.profile.defaultCategory || '';
  $('#st-quick-push').checked = state.profile.quickPush !== false;
  $('#st-quick-source').value = state.profile.quickSource || '';
  $('#st-panel-tab').value = state.profile.panelTab || 'drafts';
  updateDevicePush();
  $('#st-error').hidden = true;
  $('#st-avatar-file').value = '';
  const authors = otherAuthors();
  $('#st-authors-card').hidden = !authors.length;
  $('#st-authors').innerHTML = authors.map(([n, c], i) =>
    `<label class="check-row"><input type="checkbox" name="st-author" value="${Utils.esc(n)}"><span><b>${Utils.esc(n)}</b> <em class="muted">· ${c} ${plural(c, 'artykuł', 'artykuły', 'artykułów')}</em></span></label>`).join('');
  let email = '';
  try { const u = FirebaseProvider.auth && FirebaseProvider.auth.currentUser; email = (Auth.useFirebase && u && u.email) || ''; } catch { /* ignoruj */ }
  $('#st-email').textContent = email || (Auth.useFirebase ? '—' : 'tryb lokalny (bez konta e-mail)');
  updateSettingsAvatar();
}

async function testPush() {
  const out = $('#st-diag'); out.hidden = false; out.className = 'st-diag'; out.textContent = 'Sprawdzam…';
  const bad = t => { out.className = 'st-diag is-bad'; out.textContent = t; };
  try {
    if (!Push.supported()) return bad('Ta przeglądarka nie obsługuje powiadomień' + (Push.isIos() ? ' – na iPhonie otwórz stronę z ikony na ekranie głównym.' : '.'));
    if (Notification.permission !== 'granted') return bad('Powiadomienia nie są dozwolone – włącz je w ustawieniach przeglądarki/systemu dla tej strony i wróć tutaj.');
    const sub = await Push.sub();
    if (!sub) return bad('To urządzenie nie ma subskrypcji. Wyłącz i włącz przełącznik powiadomień powyżej.');
    const r = await fetch(`${CONFIG.API_BASE}/push/test`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ endpoint: sub.endpoint }) });
    const d = await r.json().catch(() => ({}));
    const cron = d.cronAge == null ? ' Cron jeszcze nigdy nie ruszył – sprawdź w Cloudflare: Worker → Settings → Trigger Events (co 5 minut).' : d.cronAge > 15 ? ` Cron ostatnio działał ${d.cronAge} min temu – powinien co 5 min, sprawdź Trigger Events.` : '';
    if (d.error === 'not_subscribed') { try { await Push.post('subscribe', sub.endpoint); } catch { /* ignoruj */ } return bad('Serwer nie znał tej subskrypcji (dopisałem ją). Kliknij test jeszcze raz.' + cron); }
    if (d.error === 'rate') return bad('Za dużo testów – spróbuj za godzinę.');
    if (d.error === 'no_vapid') return bad('Worker nie ma kluczy VAPID_PUBLIC / VAPID_PRIVATE.');
    if (r.status === 404 || r.status === 503 || r.status >= 500 && !d.status) return bad('Worker nie odpowiada na /news/api/push/test – wgraj najnowszy kod Workera (Edit code → Deploy).');
    if (d.ok) { out.className = 'st-diag is-ok'; out.textContent = 'Serwer wysłał test (kod ' + d.status + '). Powiadomienie powinno pojawić się w kilka sekund. Jeśli go nie ma, to blokuje je system: tryb „Nie przeszkadzać”, wyciszone powiadomienia przeglądarki/aplikacji.' + cron; return; }
    if (d.status === 401 || d.status === 403) return bad('Serwer powiadomień odrzucił klucze (kod ' + d.status + '). Wyłącz i włącz powiadomienia na tym urządzeniu; jeśli nie pomoże, VAPID_PUBLIC w Workerze różni się od klucza, którym zapisano subskrypcję.');
    if (d.status === 404 || d.status === 410) return bad('Subskrypcja wygasła i została usunięta. Wyłącz i włącz powiadomienia ponownie.');
    bad('Nie udało się wysłać (kod ' + (d.status || r.status) + ').' + cron);
  } catch (err) { bad('Błąd: ' + (err.message || err)); }
}

async function updateDevicePush() {
  const el = $('#st-device-push'); if (!el) return;
  const usable = Push.supported();
  el.disabled = !usable;
  el.checked = usable && Notification.permission === 'granted' && !!(await Push.sub());
  $('#st-device-hint').textContent = usable ? 'Dotyczy tylko tego urządzenia i przeglądarki.' : (Push.isIos() ? 'Na iPhonie dodaj stronę do ekranu głównego i otwórz ją z ikony.' : 'Ta przeglądarka nie obsługuje powiadomień.');
}

function updateSettingsAvatar() {
  $('#st-avatar').innerHTML = avatarHtml({ name: $('#st-name').value || state.profile.name, avatar: settingsAvatar });
  $('#st-avatar-remove').hidden = !settingsAvatar;
}

/** Zmienia autora we wszystkich artykułach (i wersjach roboczych) należących do redaktora. */
async function reassignAuthor(claim, nextName, avatar, showPhoto) {
  const uid = Auth.uid();
  const names = new Set(claim);
  let all = [];
  try { all = await DataService.getAllArticles(); } catch { all = state.articles; }
  const photo = avatar && showPhoto ? await shrinkAvatar(avatar) : '';
  const todo = all.filter(a => a && ((a.authorUid && a.authorUid === uid) || names.has((a.author || '').trim()))
    && ((a.author || '') !== nextName || (a.authorPhoto || '') !== photo || a.authorUid !== uid));
  let done = 0;
  for (const a of todo) {
    const upd = { ...a, author: nextName, authorUid: uid, authorPhoto: photo };
    await DataService.save(upd);
    upsertLocalState(upd);
    done++;
  }
  try {
    const drafts = await DataService.getDrafts();
    for (const d of drafts) if (names.has((d.author || '').trim())) await DataService.saveDraft({ ...d, author: nextName });
  } catch (e) { console.warn('Wersje robocze – pominięto zmianę autora:', e); }
  return done;
}

async function saveSettings(e) {
  e.preventDefault();
  const err = $('#st-error');
  err.hidden = true;
  const prev = state.profile;
  const name = $('#st-name').value.trim().slice(0, 60);
  const picked = $$('input[name="st-author"]:checked', $('#settings-form')).map(i => i.value);
  const next = normProfile({
    name, avatar: settingsAvatar,
    defaultCategory: $('#st-cat').value, showPhoto: $('#st-photo').checked,
    quickPush: $('#st-quick-push').checked, quickSource: $('#st-quick-source').value.trim(), panelTab: $('#st-panel-tab').value,
    aliases: [...new Set([...(prev.aliases || []), ...(prev.name && prev.name !== name ? [prev.name] : []), ...picked])].filter(n => n && n !== name)
  });
  const claim = [...new Set([prev.name, ...(prev.aliases || []), ...picked])].filter(n => n && n !== name);
  const photoChanged = (prev.avatar || '') !== (next.avatar || '') || prev.showPhoto !== next.showPhoto;
  const btn = $('#st-save');
  btn.disabled = true;
  try {
    await DataService.saveProfile(next);
    state.profile = next;
    writeLocalProfile(next);
    renderProfile();
    let n = 0;
    if (name && (claim.length || photoChanged)) {
      btn.textContent = 'Aktualizuję artykuły…';
      n = await reassignAuthor(claim, name, next.avatar, next.showPhoto);
    }
    toast(n ? `Zapisano. Zaktualizowano ${n} ${plural(n, 'artykuł', 'artykuły', 'artykułów')}.` : 'Ustawienia zapisane.');
    renderSettings();
    refreshViews();
  } catch (ex) {
    console.error(ex);
    err.textContent = ex.message || 'Nie udało się zapisać ustawień.';
    err.hidden = false;
  } finally {
    btn.disabled = false;
    btn.textContent = 'Zapisz ustawienia';
  }
}

/* ---------- Akcje (przyciski z data-action) ---------- */
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
  if (action === 'quick-new') { openQuickModal(); return; }
  if (action === 'quick-edit') { openQuickModal(id); return; }
  if (action === 'quick-delete') { deleteQuick(id); return; }
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
  $('#btn-rd-mod').addEventListener('click', () => { location.hash = '#/konto/komentarze'; });
  $('#btn-rd-users').addEventListener('click', () => { location.hash = '#/konto/uzytkownicy'; });
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
  });
  $('#tip-status-form').addEventListener('submit', saveTipStatus);
  $('#tip-status-form').addEventListener('change', updateTipStatusForm);
  $('#st-device-push').addEventListener('change', async e => {
    const on = e.target.checked; e.target.disabled = true;
    try { if (on) { await Push.enable(); toast('Powiadomienia włączone na tym urządzeniu.'); } else { await Push.disable(); toast('Powiadomienia wyłączone.'); } }
    catch (err) { toast(err.message || 'Nie udało się zmienić powiadomień.', 'error'); }
    finally { updateDevicePush(); updatePushButton(); }
  });
  $('#st-test-push').addEventListener('click', testPush);
  $('#st-logout').addEventListener('click', () => $('#btn-logout').click());
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
  Readers.init();

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
