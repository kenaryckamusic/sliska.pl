/* Blokada przybliżania (szczypanie, podwójne dotknięcie) – w aplikacji i na stronie, na ekranach dotykowych */
(function () {
  try {
    var touch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (!touch) return;
    ['gesturestart', 'gesturechange', 'gestureend'].forEach(function (n) { document.addEventListener(n, function (e) { e.preventDefault(); }, { passive: false }); });
    document.addEventListener('touchmove', function (e) { if (e.touches && e.touches.length > 1) e.preventDefault(); }, { passive: false });
    var last = 0;
    document.addEventListener('touchend', function (e) { var n = Date.now(); if (n - last < 300 && e.target && !(e.target.closest && e.target.closest('input, textarea, select, [contenteditable]'))) e.preventDefault(); last = n; }, { passive: false });
  } catch (e) { /* ignoruj */ }
})();
(function () {
  try {
    var st = navigator.standalone === true || matchMedia('(display-mode: standalone)').matches;
    var de = document.documentElement;
    if (st) { de.classList.add('is-app'); if (/iPhone|iPod/.test(navigator.userAgent) && navigator.standalone === true) de.classList.add('ios-app'); }
  } catch (e) {}
})();
/* Śliska News DEV – mobilna „aplikacja”: dolna nawigacja, arkusz „Więcej”, kolor paska systemowego. Tylko dev. */
(function () {
  'use strict';
  var mq = matchMedia('(max-width: 860px)');
  var I = {
    home: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5 10v10h5v-6h4v6h5V10"/>',
    bolt: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
    chart: '<path d="M5 20V11M12 20V4M19 20v-6"/>',
    mark: '<path d="M6 4h12v17l-6-4-6 4z"/>',
    more: '<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.6-3.6"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7"/>',
    team: '<circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5"/><path d="M16 5.2a3 3 0 0 1 0 5.6M18 14.8c1.8.6 3 2.2 3 4.7"/>',
    spot: '<path d="M3 11v2a1 1 0 0 0 1 1h2l5 4V6L6 10H4a1 1 0 0 0-1 1z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/>',
    moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z"/>',
    pen: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
    flash: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
    panel: '<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',
    cog: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
    star: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
    out: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5M21 12H9"/>'
  };
  var svg = function (n) { return '<svg viewBox="0 0 24 24" aria-hidden="true">' + I[n] + '</svg>'; };
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var bar, sheet, bg, built = false;

  function tab(href, ico, label, key) { return '<a class="m-tab" href="' + href + '" data-k="' + key + '">' + svg(ico) + '<span>' + label + '</span></a>'; }
  function item(ico, label, attrs, cls) { return '<button type="button" class="m-item ' + (cls || '') + '" ' + attrs + '>' + svg(ico) + '<span>' + label + '</span></button>'; }
  function link(href, ico, label) { return '<a class="m-item" href="' + href + '">' + svg(ico) + '<span>' + label + '</span></a>'; }

  function build() {
    if (built) return; built = true;
    bar = document.createElement('nav'); bar.className = 'm-tabbar'; bar.setAttribute('aria-label', 'Nawigacja aplikacji');
    bar.innerHTML = tab('#/', 'home', 'Home', 'home') + tab('#/szybkie', 'bolt', 'Nowinki', 'quick') + tab('#/ranking', 'chart', 'Ranking', 'ranking') + tab('#/zapisane', 'mark', 'Zapisane', 'saved') +
      '<button type="button" class="m-tab" data-k="more">' + svg('more') + '<span>Więcej</span></button>';
    var ind = document.createElement('i'); ind.className = 'm-ind'; bar.insertBefore(ind, bar.firstChild);
    bg = document.createElement('div'); bg.className = 'm-sheet-bg';
    sheet = document.createElement('div'); sheet.className = 'm-sheet'; sheet.setAttribute('role', 'dialog'); sheet.setAttribute('aria-label', 'Więcej');
    document.body.append(bar, bg, sheet);
    bg.addEventListener('click', close);
    bar.querySelector('[data-k="more"]').addEventListener('click', function () { document.body.classList.contains('m-sheet-open') ? close() : open(); });
    sheet.addEventListener('click', function (e) {
      var b = e.target.closest('[data-m]'); if (!b) { if (e.target.closest('a')) close(); return; }
      close();
      var m = b.dataset.m;
      setTimeout(function () {
        if (m === 'theme') { var t = $('#btn-theme'); t && t.click(); }
        else if (m === 'account') { var a = $('#btn-account'); a && a.click(); }
        else if (m === 'search') toggleSearch(true);
        else { var el = document.querySelector(m); el && el.click(); }
      }, 140);
    });
    // przycisk szukania w nagłówku
    var auth = $('.auth'), hdr = $('.site-header');
    if (auth && hdr) {
      var sb = document.createElement('button'); sb.type = 'button'; sb.className = 'm-search-btn'; sb.setAttribute('aria-label', 'Szukaj'); sb.innerHTML = svg('search');
      auth.insertBefore(sb, auth.firstChild);
      sb.addEventListener('click', function () { toggleSearch(); });
    }
    window.addEventListener('hashchange', function () { mark(); toggleSearch(false); close(); });
    new MutationObserver(themeColor).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class'] });
    mark(); themeColor(); swipeBar(); window.addEventListener('resize', place); setTimeout(place, 60);
  }

  /* przesuwanie palcem po pasku: wskaźnik idzie za palcem, po puszczeniu przechodzi do zakładki pod palcem (jak na Instagramie) */
  function tabs() { return [].slice.call(bar.querySelectorAll('.m-tab')); }
  function place(t) {
    var ind = bar.querySelector('.m-ind'); if (!ind) return;
    t = t || bar.querySelector('.m-tab.is-on') || tabs()[0]; if (!t) return;
    ind.style.width = t.offsetWidth + 'px'; ind.style.transform = 'translateX(' + t.offsetLeft + 'px)';
  }
  function swipeBar() {
    var ind = bar.querySelector('.m-ind'), drag = false, moved = false, sx = 0, hover = null, suppress = false;
    function under(x) {
      var r = bar.getBoundingClientRect(), best = null;
      tabs().forEach(function (t) { var b = t.getBoundingClientRect(); if (x >= b.left && x <= b.right) best = t; });
      if (!best) best = x < r.left + r.width / 2 ? tabs()[0] : tabs()[tabs().length - 1];
      return best;
    }
    bar.addEventListener('pointerdown', function (e) {
      if (!document.documentElement.classList.contains('is-app')) return;
      drag = true; moved = false; sx = e.clientX; hover = under(e.clientX);
      try { bar.setPointerCapture(e.pointerId); } catch (x) {}
    });
    var raf = 0, cur = 0, tgt = 0;
    function loop() {
      if (!drag || !moved) { raf = 0; return; }
      var d = tgt - cur; cur += d * 0.3;
      var k = 1 + Math.min(Math.abs(d) / 110, 0.2);
      ind.style.transform = 'translateX(' + cur + 'px) scaleX(' + k + ')';
      raf = requestAnimationFrame(loop);
    }
    bar.addEventListener('pointermove', function (e) {
      if (!drag) return;
      if (!moved && Math.abs(e.clientX - sx) < 8) return;
      var r = bar.getBoundingClientRect(), w = ind.offsetWidth, pad = 6;
      if (!moved) { moved = true; bar.classList.add('is-drag'); var m = /translateX\(([-\d.]+)px/.exec(ind.style.transform); cur = m ? parseFloat(m[1]) : 0; }
      tgt = Math.max(pad, Math.min(r.width - pad - w, e.clientX - r.left - w / 2));
      if (!raf) raf = requestAnimationFrame(loop);
      hover = under(e.clientX);
      tabs().forEach(function (t) { t.classList.toggle('is-hover', t === hover); });
      if (navigator.vibrate && hover !== bar._last) { try { navigator.vibrate(6); } catch (z) {} }
      bar._last = hover;
    });
    function end() {
      if (!drag) return; drag = false;
      cancelAnimationFrame(raf); raf = 0; bar.classList.remove('is-drag'); tabs().forEach(function (t) { t.classList.remove('is-hover'); });
      if (moved && hover) { place(hover); hover.click(); suppress = true; setTimeout(function () { suppress = false; }, 350); setTimeout(function () { mark(); place(); }, 50); }
      else if (hover) { hover.click(); suppress = true; setTimeout(function () { suppress = false; }, 350); setTimeout(function () { mark(); place(); }, 50); }
      else place();
    }
    bar.addEventListener('dragstart', function (e) { e.preventDefault(); });
    bar.addEventListener('pointerup', end); bar.addEventListener('pointercancel', end);
    bar.addEventListener('click', function (e) { if (suppress) { e.preventDefault(); e.stopPropagation(); } }, true);
  }
  function toggleSearch(on) {
    var h = $('.site-header'); if (!h) return;
    var s = on === undefined ? !h.classList.contains('m-search-open') : on;
    h.classList.toggle('m-search-open', s);
    if (s) setTimeout(function () { var i = $('#search-input'); i && i.focus(); }, 60);
  }
  function mark() {
    var h = location.hash || '#/', k = /^#\/szybkie/.test(h) ? 'quick' : /^#\/ranking/.test(h) ? 'ranking' : /^#\/zapisane/.test(h) ? 'saved' : (/^#\/(konto|redakcja|panel|ustawienia|zglos|plus)/.test(h) ? 'more' : (h === '#/' || /^#\/(kategoria|artykul)?/.test(h) && !/^#\/[a-z]/.test(h.replace(/^#\/(kategoria|artykul).*/, '')) ? 'home' : 'home'));
    if (/^#\/(kategoria|artykul|tag|wykonawca|autor)/.test(h) || h === '#/' || h === '#' || h === '') k = 'home';
    bar.querySelectorAll('.m-tab').forEach(function (t) { t.classList.toggle('is-on', t.dataset.k === k); }); place();
  }
  function themeColor() {
    var m = document.querySelector('meta[name="theme-color"]'); if (!m) return;
    var c = getComputedStyle(document.documentElement).getPropertyValue('--surface').trim();
    if (mq.matches && c) m.setAttribute('content', c);
  }
  function open() {
    var staff = document.body.classList.contains('is-admin');
    var logged = document.body.classList.contains('is-reader') || staff;
    var h = '<div class="m-grip"></div>';
    if (staff) {
      h += '<h3>Narzędzia redakcji</h3><div class="m-grid">' +
        item('pen', 'Napisz artykuł', 'data-m="#btn-new"', 'is-main') +
        item('flash', 'Nowinka', 'data-m="[data-action=quick-new]"') +
        item('panel', 'Panel redaktora', 'data-m="#btn-panel"') +
        item('cog', 'Ustawienia', 'data-m="#btn-settings"') + '</div>';
    }
    h += '<h3>Aplikacja</h3><div class="m-grid">' +
      link('#/redakcja', 'team', 'Redakcja') +
      '<a class="m-item" href="spot">' + svg('spot') + '<span>Spot (reklama)</span></a>' +
      item('user', logged ? 'Moje konto' : 'Zaloguj się', 'data-m="account"') +
      item('moon', 'Motyw jasny/ciemny', 'data-m="theme"') +
      item('search', 'Szukaj w artykułach', 'data-m="search"', 'is-wide') + '</div>';
    if (staff) h += '<h3>Środowisko</h3><div class="m-grid"><a class="m-item" href="/">' + svg('home') + '<span>Wybór wersji</span></a>' +
      '<button type="button" class="m-item" data-m="#dev-logo">' + svg('star') + '<span>Logo: DEV / zwykłe</span></button>' +
      '<button type="button" class="m-item is-danger is-wide" data-m="#dev-out">' + svg('out') + '<span>Wyloguj</span></button></div>';
    sheet.innerHTML = h;
    document.body.classList.add('m-sheet-open');
  }
  function close() { document.body.classList.remove('m-sheet-open'); }
  function sync() { if (mq.matches) build(); }
  mq.addEventListener ? mq.addEventListener('change', sync) : mq.addListener(sync);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', sync); else sync();
})();

/* ===== Nawigacja po sekcjach: Moje konto / Ustawienia (chipsy „Na tej stronie”, podświetlają bieżącą sekcję) ===== */
(function () {
  var io = null;
  function build() {
    document.querySelectorAll('.sec-nav').forEach(function (n) { n.remove(); });
    if (io) { io.disconnect(); io = null; }
    var view = document.querySelector('#view-settings:not([hidden]), #view-account:not([hidden])');
    if (!view) return;
    var cards = [].slice.call(view.querySelectorAll('.st-card')).filter(function (c) { return c.querySelector('.st-h') && !c.hidden && c.offsetParent !== null; });
    if (cards.length < 3) return;
    var nav = document.createElement('nav'); nav.className = 'sec-nav'; nav.setAttribute('aria-label', 'Na tej stronie');
    cards.forEach(function (c, i) {
      c.id = c.id || ('sec-' + i);
      var h = c.querySelector('.st-h').textContent.trim();
      var a = document.createElement('a'); a.href = '#'; a.textContent = h; a.dataset.t = c.id;
      a.addEventListener('click', function (e) { e.preventDefault(); c.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
      nav.appendChild(a);
    });
    var anchor = view.querySelector('.hub-nav') || view.querySelector('.panel-sub') || view.querySelector('.panel-title');
    if (!anchor) return;
    anchor.insertAdjacentElement('afterend', nav);
    if ('IntersectionObserver' in window) {
      io = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) nav.querySelectorAll('a').forEach(function (a) { a.classList.toggle('is-on', a.dataset.t === e.target.id); }); });
      }, { rootMargin: '-20% 0px -70% 0px' });
      cards.forEach(function (c) { io.observe(c); });
    }
  }
  var t = null;
  function later() { clearTimeout(t); t = setTimeout(build, 220); }
  window.addEventListener('hashchange', later);
  var app = document.getElementById('app');
  if (app) new MutationObserver(later).observe(app, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden'] });
  later();
})();
