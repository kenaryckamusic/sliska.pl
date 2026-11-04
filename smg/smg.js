/* Śliska Music Group – wspólny skrypt podstron: menu, artyści, pokaz zdjęć, najnowsze ze Śliska News, formularz, spis treści. */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var esc = function (v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var fold = function (s) { return String(s || '').toLowerCase().replace(/ł/g, 'l').normalize('NFD').replace(/[̀-ͯ]/g, ''); };
  var DATA = window.SMG || { artists: [], featured: [] };

  var ICON = {
    menu: '<svg viewBox="0 0 24 24" class="ic"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
    x: '<svg viewBox="0 0 24 24" class="ic"><path d="M6 6l12 12M18 6L6 18"/></svg>'
  };

  /* ---------- menu na telefonie ---------- */
  var burger = $('.burger'), sheet = $('.sheet');
  if (burger && sheet) {
    var set = function (open) {
      sheet.classList.toggle('is-open', open); sheet.inert = !open;
      burger.setAttribute('aria-expanded', String(open));
      burger.innerHTML = open ? ICON.x : ICON.menu;
      document.documentElement.style.overflow = open ? 'hidden' : '';
    };
    set(false);
    burger.addEventListener('click', function () { set(!sheet.classList.contains('is-open')); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') set(false); });
    matchMedia('(min-width: 861px)').addEventListener('change', function (m) { if (m.matches) set(false); });
  }

  /* ---------- jasny / ciemny motyw (wybór zapamiętany w przeglądarce) ---------- */
  var root = document.documentElement, dark = matchMedia('(prefers-color-scheme: dark)');
  var isDark = function () { return root.dataset.theme ? root.dataset.theme === 'dark' : dark.matches; };
  var syncTheme = function () {
    $$('[data-theme-toggle]').forEach(function (b) { b.setAttribute('aria-pressed', String(isDark())); b.setAttribute('aria-label', isDark() ? 'Włącz jasny motyw' : 'Włącz ciemny motyw'); });
  };
  $$('[data-theme-toggle]').forEach(function (b) {
    b.addEventListener('click', function () {
      var t = isDark() ? 'light' : 'dark';
      root.dataset.theme = t;
      try { localStorage.setItem('smg-theme', t); } catch (e) { /* bez zapamiętania */ }
      syncTheme();
    });
  });
  if (dark.addEventListener) dark.addEventListener('change', syncTheme);
  syncTheme();

  /* ---------- ikony serwisów ---------- */
  var SOCIAL = {
    instagram: ['Instagram', '<svg viewBox="0 0 24 24" class="ic"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.3" cy="6.7" r=".9" fill="currentColor" stroke="none"/></svg>'],
    spotify: ['Spotify', '<svg viewBox="0 0 24 24" class="ic"><circle cx="12" cy="12" r="9"/><path d="M7.5 9.8c3-.9 6.4-.6 9.3 1M8 12.8c2.5-.7 5.1-.4 7.4.8M8.6 15.6c1.9-.5 3.9-.3 5.6.6"/></svg>'],
    youtube: ['YouTube', '<svg viewBox="0 0 24 24" class="ic"><rect x="2.5" y="5.5" width="19" height="13" rx="4"/><path d="M10.2 9.4v5.2l4.6-2.6z" fill="currentColor" stroke="none"/></svg>'],
    fandom: ['Wiki Fandom', '<svg viewBox="0 0 24 24" class="ic ic-fill"><path d="M8.123.008a.431.431 0 00-.512.42v9.746L4.104 6.666a.432.432 0 00-.66.064.428.428 0 00-.071.239v10.064a2.387 2.387 0 00.701 1.694l4.565 4.57a2.4 2.4 0 001.693.703h3.34c.635 0 1.242-.252 1.691-.701l4.565-4.572a2.394 2.394 0 00.699-1.694V13.41a2.39 2.39 0 00-.7-1.693L8.343.125a.427.427 0 00-.219-.117zM9.646 12.51a.719.719 0 01.508.21l1.848 1.85 1.844-1.85a.714.714 0 011.015 0l1.32 1.321a.724.724 0 01.212.508v1.406a.72.72 0 01-.21.508l-3.68 3.7a.72.72 0 01-1.019 0l-3.668-3.7a.716.716 0 01-.209-.506v-1.408a.71.71 0 01.211-.506l1.32-1.322a.713.713 0 01.508-.211Z"/></svg>']
  };
  function initials(n) { return String(n).split(/\s+/).map(function (w) { return w.charAt(0); }).join('').slice(0, 2).toUpperCase(); }
  function socialsHtml(s) {
    return Object.keys(SOCIAL).map(function (k) {
      var href = s && s[k];
      if (typeof href !== 'string' || !/^https?:\/\//.test(href.trim())) return '';
      return '<a href="' + esc(href.trim()) + '" target="_blank" rel="noopener noreferrer" aria-label="' + SOCIAL[k][0] + '" title="' + SOCIAL[k][0] + '">' + SOCIAL[k][1] + '</a>';
    }).join('');
  }
  function artistHtml(a) {
    var links = socialsHtml(a.socials);
    return '<article class="artist">' +
      '<div class="artist-ph"><span class="initials" aria-hidden="true">' + esc(initials(a.name)) + '</span>' +
      (a.image ? '<img src="' + esc(a.image) + '" alt="' + esc(a.name) + '" loading="lazy" decoding="async" onerror="this.remove()">' : '') + '</div>' +
      '<div class="artist-body"><h3 class="artist-name">' + esc(a.name) + '</h3>' + (links ? '<div class="socials">' + links + '</div>' : '') + '</div></article>';
  }

  /* ---------- siatka artystów (strona główna: kilku, podstrona: wszyscy + wyszukiwarka) ---------- */
  $$('[data-artists]').forEach(function (box) {
    var limit = Number(box.dataset.artists) || 0;
    var list = DATA.artists.slice(0, limit || undefined);
    var q = $('#artist-q'), cnt = $('#artist-count');
    var draw = function () {
      var f = q ? fold(q.value.trim()) : '';
      var shown = f ? list.filter(function (a) { return fold(a.name).indexOf(f) >= 0; }) : list;
      box.innerHTML = shown.length ? shown.map(artistHtml).join('') : '<p class="empty" style="grid-column:1/-1">Nikogo takiego nie mamy (jeszcze).</p>';
      if (cnt) cnt.textContent = shown.length + ' z ' + list.length;
    };
    if (q) q.addEventListener('input', draw);
    draw();
  });
  $$('[data-artist-count]').forEach(function (el) { el.textContent = DATA.artists.length; });

  /* ---------- duże zdjęcie na stronie głównej (zmienia się co 5 s) ---------- */
  var feat = $('.feature');
  if (feat && DATA.featured.length) {
    var items = DATA.featured, i = 0, timer = 0;
    feat.insertAdjacentHTML('afterbegin', items.map(function (a, n) { return '<img src="' + esc(a.image) + '" alt="" ' + (n ? 'loading="lazy"' : 'fetchpriority="high"') + ' decoding="async">'; }).join('') +
      '<div class="feature-dots" aria-hidden="true">' + items.map(function () { return '<i></i>'; }).join('') + '</div>');
    var imgs = $$('img', feat), dots = $$('.feature-dots i', feat), name = $('.feature-name', feat);
    var show = function (n) {
      i = (n + items.length) % items.length;
      imgs.forEach(function (im, k) { im.classList.toggle('is-on', k === i); });
      dots.forEach(function (d, k) { d.classList.remove('is-on'); if (k === i) { void d.offsetWidth; d.classList.add('is-on'); } });
      if (name) name.textContent = items[i].name;
      clearTimeout(timer); timer = setTimeout(function () { show(i + 1); }, 5000);
    };
    $$('[data-feat]', feat).forEach(function (b) { b.addEventListener('click', function () { show(i + Number(b.dataset.feat)); }); });
    show(0);
  }

  /* ---------- najnowsze ze Śliska News (same tytuły, bez zdjęć) ---------- */
  var news = $('[data-news]');
  if (news) {
    fetch('https://api.sliska.pl/news/api/articles?limit=12', { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (d) {
      var list = (d.articles || []).filter(function (a) { return a && !a.quick && a.title; }).slice(0, 3);
      if (!list.length) return;
      news.innerHTML = list.map(function (a) {
        var cat = (a.categories && a.categories[0]) || a.category || 'Śliska News';
        var when = a.createdAt ? new Date(a.createdAt).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long' }) : '';
        return '<a class="card news-item" href="https://news.sliska.pl/a/' + encodeURIComponent(a.id) + '"><small>' + esc(cat) + '</small><b>' + esc(a.title) + '</b><span>' + (when ? esc(when) + ' · ' : '') + 'Śliska News</span></a>';
      }).join('');
      var sec = news.closest('section'); if (sec) sec.hidden = false;
    }).catch(function () { /* bez sekcji */ });
  }

  /* ---------- formularz kontaktowy: gotowa wiadomość w programie pocztowym ---------- */
  var form = $('#contact-form');
  if (form) {
    var MAIL = 'ssmlabel.kontakt@gmail.com';
    var btn = $('button[type="submit"]', form), guide = $('#demo-guide', form);
    var want = new URLSearchParams(location.search).get('temat');
    if (want) $$('input[name="topic"]', form).forEach(function (r) { if (fold(r.value) === fold(want)) r.checked = true; });
    var sync = function () {
      var t = (form.querySelector('input[name="topic"]:checked') || {}).value;
      if (guide) guide.hidden = t !== 'Demo';
      $('#message', form).placeholder = t === 'Demo' ? 'Kilka słów o sobie + link do utworu…' : 'Twoja wiadomość…';
      btn.disabled = !form.checkValidity();
    };
    form.addEventListener('input', sync); form.addEventListener('change', sync); sync();
    form.addEventListener('submit', function (e) {
      e.preventDefault(); if (!form.reportValidity()) return;
      var f = new FormData(form);
      var subject = (f.get('topic') + ' — ' + f.get('firstName') + ' ' + (f.get('lastName') || '')).trim();
      var body = ['Imię: ' + f.get('firstName'), 'Nazwisko: ' + (f.get('lastName') || ''), 'E-mail: ' + f.get('email'), '', f.get('message')].join('\r\n');
      location.href = 'mailto:' + MAIL + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
    });
  }
  $$('[data-copy]').forEach(function (b) {
    b.addEventListener('click', function () {
      var done = function () { var n = b.textContent; b.textContent = 'Skopiowano ✓'; setTimeout(function () { b.textContent = n; }, 1600); };
      if (navigator.clipboard) navigator.clipboard.writeText(b.dataset.copy).then(done, function () {});
    });
  });

  /* ---------- dokumenty: spis treści z nagłówków ---------- */
  var doc = $('.doc'), toc = $('.toc-list');
  if (doc && toc) {
    var hs = $$('h2', doc);
    hs.forEach(function (h, n) { if (!h.id) h.id = 'pkt-' + (n + 1); });
    toc.innerHTML = hs.map(function (h) { return '<a href="#' + h.id + '">' + esc(h.textContent) + '</a>'; }).join('');
    if ('IntersectionObserver' in window) {
      var links = $$('a', toc);
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) links.forEach(function (a) { a.classList.toggle('is-on', a.getAttribute('href') === '#' + e.target.id); }); });
      }, { rootMargin: '-20% 0px -70% 0px' });
      hs.forEach(function (h) { io.observe(h); });
    }
  }
  var y = $('[data-year]'); if (y) y.textContent = new Date().getFullYear();
})();
