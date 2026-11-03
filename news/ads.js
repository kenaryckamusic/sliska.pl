/* Śliska News – własne reklamy (bez sieci reklamowych, bez śledzenia).
   Trzy formaty: popup (środek), box (róg, lewo/prawo) i pasek (pod nagłówkiem).
   Edytuj listę CREATIVES poniżej: tytuł, wykonawca, przycisk, link i wygląd każdej reklamy. */
(function () {
  'use strict';
  var LABEL = 'Sponsorowane';                 // etykieta na reklamie (jeśli ktoś płaci, zmień na 'Reklama')
  var DEFAULT_LINK = 'https://sliska.pl/news/';
  var CFG = { enabled: true, popupDelay: 8000, boxDelay: 35000, boxMax: 12, boxGap: 180000, avoid: 2, rotateMs: 10000, closeAfterMs: 3000, clickChance: 0.125, clickGap: 60000, clickMax: 4, inlineMax: 4, inlineChance: 0.6, houseChance: 0.15 };

  /* ====== REKLAMY GRAFICZNE ======
     Dodanie reklamy = wrzucenie 5 plików do folderu ads/ + jedna pozycja na liście ADS poniżej.
     3 formaty. Nazwy plików: <id>-long.jpg (728×90: góra strony, paski w artykule i na końcu list), <id>-box.jpg (300×250: okienko w rogu i popup), <id>-card.jpg (450×500: kafelek w siatce)
     – rysuj w 2×. Cała grafika jest linkiem. Reklama pojawia się dopiero, gdy są wszystkie 3 pliki.
     Pliki o dowolnych nazwach: podaj files: ['a.jpg', ...] – format dobierze się sam po wymiarach (proporcjach) obrazka. */
  var ADS = [
    { id: 'tk-pozydziwka-spotify', link: 'https://open.spotify.com/album/7ChdgFtVCenTb0vnm4fSyH', alt: 'Tamara Kenarycka – singiel „POZYDZ!WKA” już dostępny na Spotify' },
    { id: 'tk-pozydziwka-ytmusic', link: 'https://music.youtube.com/playlist?list=OLAK5uy_k1n4VTUaG3hjh7yQhF_ljjTzi-JvddRqM', alt: 'Tamara Kenarycka – singiel „POZYDZ!WKA” już dostępny na YouTube Music' }
  ];
  var FORMATS = ['long', 'box', 'card'];
  function byRatio(w, h) { var r = w / h; return r > 3 ? 'long' : r > 1.05 ? 'box' : 'card'; }
  var CREATIVES = [];
  ADS.forEach(function (a) {
    var c = { id: a.id, group: a.group || a.id, link: a.link, alt: a.alt || '', img: {} };
    if (!a.files) {      // dodajemy dopiero, gdy wszystkie 3 pliki naprawdę się wczytają (brak plików = zostaje „Miejsce na reklamę”)
      var okN = 0;
      FORMATS.forEach(function (f) { var im = new Image(); im.onload = function () { c.img[f] = 'ads/' + a.id + '-' + f + '.jpg'; if (++okN === FORMATS.length) CREATIVES.push(c); }; im.src = 'ads/' + a.id + '-' + f + '.jpg'; });
      return;
    }
    var added = false;
    a.files.forEach(function (file) {
      var im = new Image();
      im.onload = function () { c.img[byRatio(im.naturalWidth, im.naturalHeight)] = 'ads/' + file; if (!added && FORMATS.every(function (f) { return c.img[f]; })) { added = true; CREATIVES.push(c); } };
      im.src = 'ads/' + file;
    });
  });

  /* ====== „REKLAMA TUTAJ" – zaproszenie dla reklamodawców ======
     Gdy nie ma żadnej reklamy graficznej (CREATIVES puste), wszędzie pokazuje się to. Gdy są – tylko od czasu do czasu (CFG.houseChance).
     Kliknięcie prowadzi do formularza reklama.html. Teksty: t = hasło, s = dopisek przy strzałce. Dopisuj własne. */
  var HOUSE_LINK = 'reklama.html';
  var HOUSE_TEXTS = [
    { t: 'Niech wielka Knaga smyra Twój ekran!', s: 'Wyślij swoją reklamę już teraz' },
    { t: 'Twoja reklama może tu nabrzmieć.', s: 'Wyślij ją, zanim ktoś ją wyprzedzi' },
    { t: 'U nas jest ślisko od kliknięć.', s: 'Wrzuć reklamę i daj się ponieść' },
    { t: 'Rozmiar ma znaczenie. U nas: 1456×180.', s: 'Sprawdź, czy twoja się zmieści' },
    { t: 'Pieść oczy czytelników swoją reklamą.', s: 'Wyślij ją. Delikatnie.' },
    { t: 'Wsuń tu swoją reklamę. Przyjmiemy.', s: 'Formularz zajmie ci 2 minuty' },
    { t: 'Tu wchodzą tylko twarde grafiki.', s: 'Pokaż, co masz w pliku' },
    { t: 'Zrób z tego miejsca coś gorącego.', s: 'Wyślij swoją reklamę' },
    { t: 'Dłużej nie wytrzymasz bez własnej reklamy.', s: 'Dokończ to w formularzu' },
    { t: 'Gdy owoce są deptane, pora na Twoją reklamę.', s: 'Podeślij nam swój blok reklamacyjny w formularzu' },
    { t: 'Wsadź mi w mordę, nie spodenki, Tu wypromuj swe piosenki!', s: 'Formularz do przesyłania reklam już otwarty' },
    { t: 'Niech Twój baner ostro się Maca,', s: 'Wyślij go bo się opłaca' },
    { t: 'Mamy tu szparę o wymiarze 1456 na 180.', s: 'Wsuń swoją grafikę, nim inni Cię wyprzedzą' },
    { t: 'Zanim Ci opadnie zapał do roboty,', s: 'Prześlij w formularzu swoje pieszczoty' },
    { t: 'To miejsce aż prosi się o ostre pchnięcie.', s: 'Prześlij swój baner przez formularz' },
    { t: 'Zaspokój ciekawość naszych użytkowników swoim rozmiarem.', s: 'Formularz jest otwarty całą dobę' },
    { t: 'Twój baner może tu wisieć naprawdę długo i sztywno.', s: 'Prześlij zgłoszenie już teraz' },
    { t: 'Nie czekaj, aż opadnie Ci zapał do promocji.', s: 'Wejdź w formularz i załatw to szybko' },
    { t: 'Dotknij naszych czytelników w najbardziej czułe miejsce.', s: 'Wyślij reklamę, która robi robotę' },
    { t: 'Zróbmy to na oczach wszystkich odwiedzających.', s: 'Twoja reklama na samej górze strony' }
  ];
  var HOUSE = HOUSE_TEXTS.map(function (h, i) { return { id: 'house-' + i, group: 'house', house: true, t: h.t, s: h.s, link: HOUSE_LINK, alt: h.t + ' ' + h.s }; });
  function houseHtml(fmt, c) {
    var map = { top: 'long', strip: 'long', box: 'box', popup: 'box', card: 'card' }, f = map[fmt];
    var inner = '<span class="adv-house-in"><span class="ah-box" data-f="' + f + '" data-l="' + (c.t.length > 52 ? 2 : c.t.length > 40 ? 1 : 0) + '"><span class="ah-txt"><strong class="ah-t">' + esc(c.t) + '</strong><span class="ah-s">' + esc(c.s) + '</span></span><span class="ah-go">Wyślij reklamę <b aria-hidden="true">→</b></span></span></span>';
    var hit = '<a class="adv-hit" href="' + esc(c.link) + '" aria-label="' + esc(c.alt) + '"></a>';
    var lab = '<span class="adv-label">Miejsce na reklamę</span>';
    var x = STATIC[fmt] || fmt === 'card' ? '' : '<button type="button" class="adv-x" aria-label="Zamknij">×</button>';
    if (fmt === 'card') return '<article class="card adv-card adv-img-card adv-house" data-ad="' + c.id + '">' + inner + hit + lab + '</article>';
    return '<div class="adv adv-' + fmt + ' adv-img adv-house" data-ad="' + c.id + '">' + inner + hit + lab + x + '</div>';
  }
  var STATIC = { top: 1, mini: 1, strip: 1 };   // reklamy stałe na górze: bez przycisku zamknięcia, zmieniają się same
  var HK = 'sliska_ads_hist', SK = 'sliska_ads_sess';
  function ls(get, k, v) { try { return get ? localStorage.getItem(k) : localStorage.setItem(k, v); } catch (e) { return null; } }
  function ss(get, k, v) { try { return get ? sessionStorage.getItem(k) : sessionStorage.setItem(k, v); } catch (e) { return null; } }
  function sess() { try { return JSON.parse(ss(true, SK) || '{}'); } catch (e) { return {}; } }
  function saveSess(s) { ss(false, SK, JSON.stringify(s)); }
  function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  /** Losowa reklama inna niż dwie ostatnie pokazane. */
  function pick() {
    var hist = []; try { hist = JSON.parse(ls(true, HK) || '[]'); } catch (e) {}
    var recent = hist.slice(-CFG.avoid), groups = recent.map(function (id) { var c = CREATIVES.concat(HOUSE).filter(function (x) { return x.id === id; })[0]; return c && c.group; });
    var base = (!CREATIVES.length || Math.random() < CFG.houseChance) ? HOUSE : CREATIVES;
    var pool = base.filter(function (c) { return recent.indexOf(c.id) < 0 && groups.indexOf(c.group) < 0; });   // ani ta sama reklama, ani to samo zdjęcie w dwóch ostatnich
    var c = pool[Math.floor(Math.random() * pool.length)];
    if (!c) { var alt = base.filter(function (x) { return x.id !== recent[recent.length - 1]; }); c = alt[Math.floor(Math.random() * alt.length)] || base[0]; }   // mało grafik: byle nie ta sama pod rząd
    hist.push(c.id); ls(false, HK, JSON.stringify(hist.slice(-6)));
    return c;
  }
  function inkFor(hex) { var n = parseInt(String(hex).replace('#', ''), 16), r = n >> 16 & 255, g = n >> 8 & 255, b = n & 255; return (r * 299 + g * 587 + b * 114) / 1000 > 150 ? '#1b1230' : '#ffffff'; }
  function art(c) { return '<span class="adv-art" data-deco="' + c.deco + '" aria-hidden="true"></span>'; }
  function imgHtml(fmt, c) {
    var map = { top: 'long', strip: 'long', box: 'box', popup: 'box', card: 'card' }, src = c.img[map[fmt]];
    var pic = (fmt === 'top' || fmt === 'strip')
      ? '<img src="' + esc(src) + '" alt="' + esc(c.alt) + '" decoding="async">'
      : '<img src="' + esc(src) + '" alt="' + esc(c.alt) + '" decoding="async"' + (fmt === 'card' ? ' loading="lazy"' : '') + '>';
    var badge = '';
    var hit = '<a class="adv-hit" href="' + esc(c.link) + '" target="_blank" rel="noopener sponsored" aria-label="' + esc(c.alt) + '"></a>';
    var x = STATIC[fmt] || fmt === 'card' ? '' : '<button type="button" class="adv-x" aria-label="Zamknij">×</button>';
    var lab = '<span class="adv-label">' + esc(LABEL) + '</span>';
    if (fmt === 'card') return '<article class="card adv-card adv-img-card" data-ad="' + c.id + '">' + pic + hit + badge + lab + '</article>';
    return '<div class="adv adv-' + fmt + ' adv-img" data-ad="' + c.id + '">' + pic + hit + badge + lab + x + '</div>';
  }
  function html(fmt, c) {
    if (c.house) return houseHtml(fmt, c);
    if (c.img) return imgHtml(fmt, c);
    var style = '--adv-bg:' + c.bg + ';--adv-ink:' + c.ink + ';--adv-acc:' + c.accent + ';--adv-cta-ink:' + inkFor(c.accent);
    var cta = '<a class="adv-cta" href="' + esc(c.link) + '" target="_blank" rel="noopener sponsored"' + (fmt === 'mini' ? ' aria-label="' + esc(c.cta) + '"' : '') + '>' + (fmt === 'mini' ? '›' : esc(c.cta)) + '</a>';
    if (fmt === 'card') {
      return '<article class="card adv-card" style="' + style + '" data-ad="' + c.id + '"><div class="card-media adv-card-media">' + art(c) + '<span class="adv-card-kicker">' + esc(c.kicker) + '</span><span class="adv-label">' + esc(LABEL) + '</span></div>' +
        '<div class="card-body adv-card-body"><h3 class="card-title">' + esc(c.title) + '</h3><p class="card-lead">' + esc(c.artist) + ' · ' + esc(c.kicker) + '</p><div class="card-meta">' + cta + '</div></div></article>';
    }
    var inner = fmt === 'popup' || fmt === 'box';
    var fixed = fmt === 'strip' || fmt === 'mini' || fmt === 'inline' ? '' : '';
    var text = '<span class="adv-text"><small class="adv-kicker">' + esc(c.kicker) + '</small><strong class="adv-title">' + esc(c.title) + '</strong><span class="adv-artist">' + esc(c.artist) + '</span>' + (inner ? cta : '') + '</span>';
    return '<div class="adv adv-' + fmt + '" style="' + style + '" data-ad="' + c.id + '"><span class="adv-label">' + esc(LABEL) + '</span>' +
      (STATIC[fmt] ? '' : '<button type="button" class="adv-x" aria-label="Zamknij">×</button>') + art(c) + text + (inner ? '' : cta) + '</div>';
  }

  var OFF_KEY = 'sliska_ads_off';
  /** Redaktorzy i Właściciel mogą wyłączyć reklamy na swoim urządzeniu (Ustawienia). Czytelników to nie dotyczy. */
  function off() { return document.body.classList.contains('is-admin') && ls(true, OFF_KEY) === '1'; }
  function blocked() {
    var h = location.hash || '';
    return !CFG.enabled || off() || /^#\/(panel|edytor|szkic|ustawienia|konto)/.test(h) || document.body.classList.contains('modal-open');
  }
  function bindClose(el, done) {
    var x = el.querySelector('.adv-x');
    if (x) x.addEventListener('click', function () { el.classList.add('is-out'); setTimeout(function () { el.remove(); if (done) done(); }, 220); });
    var a = el.querySelector('.adv-cta');
    if (a) a.addEventListener('click', function (e) { if (/^#?$/.test(this.getAttribute('href'))) e.preventDefault(); });
  }

  /* ---- Górny rząd: długa + krótka reklama, bez X, zmieniają się co 10 s ---- */
  var rot = [], rotTimer = null;
  function swap(slot, fmt) {
    if (!slot.isConnected) return;
    var n = document.createElement('div'); n.innerHTML = html(fmt, pick()); var el = n.firstChild;
    var old = slot.firstChild; if (old) { old.classList.add('is-out'); setTimeout(function () { if (old.parentNode === slot) slot.removeChild(old); }, 200); }
    setTimeout(function () { slot.appendChild(el); bindClose(el); }, old ? 200 : 0);
  }
  function topRow() {
    var host = document.getElementById('ad-top'); if (!host || host.firstChild) return;
    host.innerHTML = '<div class="ad-slot ad-slot-long"></div><div class="ad-slot ad-slot-short"></div>';
    var l = host.firstChild, s = host.lastChild;
    swap(l, 'top'); swap(s, 'top');
    rotTimer = setInterval(function () { if (document.hidden || blocked()) return; swap(l, 'top'); setTimeout(function () { swap(s, 'top'); }, 2500); }, CFG.rotateMs);
    host.hidden = blocked();
  }
  function applyTop() { var h = document.getElementById('ad-top'); if (h) { h.hidden = blocked(); if (!h.hidden && !h.firstChild) topRow(); } }

  /* ---- Popup na środku; zamknąć można dopiero po 5 s ---- */
  function popup(c, opts) {
    opts = opts || {};
    var s = sess();
    if (!c) { if (blocked() || document.querySelector('.adv-overlay')) return false; if (!opts.fromClick && s.popup) return false; }
    if (!opts.fromClick) s.popup = 1; saveSess(s);
    var wrap = document.createElement('div'); wrap.className = 'adv-overlay'; wrap.setAttribute('role', 'dialog'); wrap.setAttribute('aria-label', LABEL);
    wrap.innerHTML = html('popup', c || pick()); document.body.appendChild(wrap);
    if (opts.big) wrap.firstChild.classList.add('adv-big');
    var x = wrap.querySelector('.adv-x'), ready = !!opts.instant, left = Math.ceil(CFG.closeAfterMs / 1000);
    if (!ready) { x.classList.add('is-wait'); x.textContent = left; x.disabled = true; x.setAttribute('aria-label', 'Zamknij za ' + left + ' s'); }
    var tick = ready ? 0 : setInterval(function () {
      left--; if (left > 0) { x.textContent = left; x.setAttribute('aria-label', 'Zamknij za ' + left + ' s'); return; }
      clearInterval(tick); ready = true; x.disabled = false; x.classList.remove('is-wait'); x.textContent = '×'; x.setAttribute('aria-label', 'Zamknij');
    }, 1000);
    function close() { if (!ready) return; wrap.classList.add('is-out'); document.removeEventListener('keydown', key); setTimeout(function () { wrap.remove(); var q = sess(); q.popupAt = Date.now(); saveSess(q); if (opts.after) opts.after(); }, 220); }
    function key(e) { if (e.key === 'Escape') close(); }
    document.addEventListener('keydown', key);
    wrap.addEventListener('click', function (e) { if (e.target === wrap) close(); });
    x.addEventListener('click', close);
    return true;
  }

  /* ---- Box w rogu (300×250), raz z lewej, raz z prawej ---- */
  function box(c, side) {
    var s = sess();
    if (!c) {
      if (blocked() || (s.boxN || 0) >= CFG.boxMax) return;
      if (s.boxAt && Date.now() - s.boxAt < CFG.boxGap) return;
      if (s.popupAt && Date.now() - s.popupAt < 30000) return;
      if (document.querySelector('.adv-overlay')) return;
      if (window.scrollY < document.documentElement.scrollHeight * 0.25) return;
    }
    side = side || ((ls(true, 'sliska_ads_side') === 'l') ? 'r' : 'l'); ls(false, 'sliska_ads_side', side);
    s.boxN = (s.boxN || 0) + 1; s.boxAt = Date.now(); saveSess(s);
    var el = document.createElement('div'); el.className = 'adv-dock adv-dock-' + side; el.innerHTML = html('box', c || pick());
    document.body.appendChild(el); bindClose(el.firstChild, function () { el.remove(); });
  }

  /* ---- Reklama w połowie artykułu: wskakuje, gdy czytelnik dojeżdża do środka tekstu ---- */
  var inlineDone = '';
  function inlineAd() {
    var m = /^#\/(artykul|a)\//.exec(location.hash || ''); if (!m || blocked() || inlineDone === location.hash) return;
    var body = document.querySelector('.article-body'); if (!body) return;
    if (body.__advRoll !== inlineDone + location.hash) { body.__advRoll = inlineDone + location.hash; body.__advGo = Math.random() < CFG.inlineChance; }
    if (!body.__advGo) return;
    var ps = [].filter.call(body.children, function (e) { return e.tagName === 'P' && e.textContent.trim().length > 40; });
    if (ps.length < 4) return;
    var s = sess(); if ((s.inlineN || 0) >= CFG.inlineMax) return;
    var mid = ps[Math.floor(ps.length / 2)], r = mid.getBoundingClientRect();
    if (r.bottom < 0 || r.top > window.innerHeight * 0.85) return;       // wstawiamy tylko poniżej widocznego fragmentu, żeby tekst nie skakał
    if (r.top < window.innerHeight * 0.3) return;
    inlineDone = location.hash; s.inlineN = (s.inlineN || 0) + 1; saveSess(s);
    var el = document.createElement('div'); el.className = 'adv-inline'; el.innerHTML = html('strip', pick());
    mid.parentNode.insertBefore(el, mid); bindClose(el.firstChild, function () { el.remove(); });
  }

  /* ---- Czasem (1/8) kliknięcie najpierw pokazuje dużą reklamę (zamykaną od razu), a dopiero potem wykonuje się to, w co kliknięto ---- */
  var bypass = false;
  function onClick(e) {
    if (bypass || !e.isTrusted) return;
    var t = e.target.closest ? e.target.closest('a[href], button') : null;
    if (!t || t.closest('.adv, .adv-overlay, .adv-card, form, .modal, [contenteditable], .ql-toolbar')) return;
    if (t.tagName === 'A' && (t.target === '_blank' || /^(mailto|tel):/.test(t.getAttribute('href') || '') || e.metaKey || e.ctrlKey || e.shiftKey)) return;
    if (t.type === 'submit' || blocked() || document.querySelector('.adv-overlay')) return;
    var s = sess(); if ((s.clickN || 0) >= CFG.clickMax || (s.clickAt && Date.now() - s.clickAt < CFG.clickGap)) return;
    if (Date.now() - T0 < 15000 || Math.random() >= CFG.clickChance) return;
    var href = t.tagName === 'A' ? t.getAttribute('href') : '';
    e.preventDefault(); e.stopPropagation();
    s.clickN = (s.clickN || 0) + 1; s.clickAt = Date.now(); saveSess(s);
    var ok = popup(null, { fromClick: true, instant: true, big: true, after: function () {
      if (t.isConnected) { bypass = true; try { t.click(); } finally { bypass = false; } }
      else if (href) location.href = href;
    } });
    if (!ok) { bypass = true; try { t.click(); } finally { bypass = false; } }
  }

  /* ---- Reklamy wstawiane w treść: kafelek w siatce, wiersz w Nowinkach, pasek na końcu list i artykułów ---- */
  var cache = {};
  function once(k, fmt) { return cache[k] || (cache[k] = html(fmt, pick())); }
  /** Losuje k miejsc w siatce o długości L tak, żeby reklamy nie sąsiadowały ze sobą (ani obok, ani nad sobą w 3 kolumnach). */
  function spread(L, k) {
    for (var tries = 0; tries < 80; tries++) {
      var ps = [];
      for (var i = 0; i < k; i++) ps.push(1 + Math.floor(Math.random() * (L - 1)));
      ps.sort(function (x, y) { return x - y; });
      var ok = true; for (var j = 1; j < ps.length; j++) if (ps[j] - ps[j - 1] < 4) ok = false;
      if (ok) return ps;
    }
    var out = []; for (var q = 0; q < k; q++) out.push(Math.min(L - 1, Math.round((q + 0.5) * L / k)));
    return out;
  }
  function inject() {
    if (blocked() || document.getElementById('ads-gallery')) return;
    var h = location.hash || '', root = document.getElementById('app'); if (!root) return;
    var grid = document.getElementById('news-grid');
    if (grid && grid.offsetParent && !grid.querySelector('.adv-card')) {
      var cards = grid.querySelectorAll(':scope > .card'), n = cards.length;
      if (n >= 1 && !/^#\/(szybkie|zapisane|ranking)/.test(h)) {
        var k = n < 15 ? 1 : n < 33 ? 2 : 3 + Math.floor((n - 33) / 10);   // 1–14: 1 reklama, 15–32: 2, 33–42: 3, 43–52: 4…
        var pk = 'cardpos' + h + ':' + n;
        if (!cache[pk]) cache[pk] = spread(n + k, k);
        cache[pk].forEach(function (p, j) {
          var t = document.createElement('div'); t.innerHTML = once('card' + h + ':' + j, 'card'); var el = t.firstChild;
          grid.insertBefore(el, grid.children[p] || null); bindClose(el);
        });
      }
    }
    if (grid && grid.offsetParent && !document.querySelector('.adv-end') && grid.children.length >= 6) {
      var e2 = document.createElement('div'); e2.className = 'adv-end'; e2.innerHTML = once('end' + h, 'strip'); grid.parentNode.insertBefore(e2, grid.nextSibling); bindClose(e2.firstChild, function () { e2.remove(); });
    }
    var list = root.querySelector('.quick-day .quick-list');
    if (list && !list.querySelector('.quick-ad') && list.children.length >= 5) {
      var li = document.createElement('li'); li.className = 'quick-ad'; li.innerHTML = once('quick' + h, 'strip'); list.insertBefore(li, list.children[3]); bindClose(li.firstChild, function () { li.remove(); });
    }
    var rel = root.querySelector('.related');
    if (rel && /^#\/(artykul|a)\//.test(h) && !root.querySelector('.adv-end')) {
      var e3 = document.createElement('div'); e3.className = 'adv-end'; e3.innerHTML = once('aend' + h, 'strip'); rel.parentNode.insertBefore(e3, rel.nextSibling); bindClose(e3.firstChild, function () { e3.remove(); });
    }
  }
  var raf = 0;
  function schedule() { if (raf) return; raf = requestAnimationFrame(function () { raf = 0; inject(); }); }

  function start() {
    if (document.getElementById('ads-gallery')) return;
    setTimeout(applyTop, 1200);
    setTimeout(function () { popup(); }, CFG.popupDelay);
    var t = setInterval(function () { var s = sess(); if ((s.boxN || 0) >= CFG.boxMax) return clearInterval(t); if (Date.now() - T0 > CFG.boxDelay) box(); }, 5000);
    window.addEventListener('scroll', inlineAd, { passive: true });
    document.addEventListener('click', onClick, true);
    window.addEventListener('hashchange', function () { inlineDone = ''; cache = {}; applyTop(); setTimeout(inlineAd, 400); });
    var root = document.getElementById('app'); if (root) new MutationObserver(schedule).observe(root, { childList: true, subtree: true });
    schedule();
    window.addEventListener('sliska:ads', function () {      // przełącznik w Ustawieniach
      if (blocked()) { document.querySelectorAll('.adv-overlay, .adv-dock, .adv-inline, .adv-end, .quick-ad, .adv-card').forEach(function (e) { e.remove(); }); }
      applyTop();
    });
  }
  var T0 = Date.now();

  window.SliskaAds = {
    creatives: CREATIVES, house: HOUSE, html: html, config: CFG, pick: pick,
    show: function (fmt, i, side) { var c = CREATIVES[(i || 0) % CREATIVES.length]; if (fmt === 'popup') popup(c); else if (fmt === 'box') box(c, side || 'r'); },
    reset: function () { ss(false, SK, '{}'); ls(false, HK, '[]'); }
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
