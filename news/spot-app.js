/* Formularz spotu (dev): wygląd jak reszta serwisu, dolna nawigacja na telefonie, logo DEV i auto-uzupełnianie danych z konta. */
(function () {
  'use strict';
  try { var st = navigator.standalone === true || matchMedia('(display-mode: standalone)').matches; if (st) { document.documentElement.classList.add('is-app'); if (/iPhone|iPod/.test(navigator.userAgent) && navigator.standalone === true) document.documentElement.classList.add('ios-app'); } } catch (e) {}
  var $ = function (s) { return document.querySelector(s); };
  var DEV = /^dev\./.test(location.hostname);
  var FB = { apiKey: 'AIzaSyDi7M7X4cwsfIkxTebYlGsJPFN-NoAtwAU', authDomain: 'sliska.pl', projectId: 'sliska-users', appId: '1:236153117470:web:6b4bd4db90314fed52470f' };

  /* logo DEV (jak w aplikacji; przełącznik w aplikacji ustawia localStorage 'sliska-dev-logo') */
  try {
    if (DEV && localStorage.getItem('sliska-dev-logo') !== 'off') {
      var l = $('.ar-logo .lg-l'), d = $('.ar-logo .lg-d');
      if (l) l.src = 'logo-dev.svg'; if (d) d.src = 'logo-dev-biale.svg';
    }
  } catch (e) {}

  /* dolna nawigacja jak w aplikacji */
  var ic = {
    home: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5 10v10h5v-6h4v6h5V10"/>', bolt: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
    chart: '<path d="M5 20V11M12 20V4M19 20v-6"/>', mark: '<path d="M6 4h12v17l-6-4-6 4z"/>',
    spot: '<path d="M3 11v2a1 1 0 0 0 1 1h2l5 4V6L6 10H4a1 1 0 0 0-1 1z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/>'
  };
  function tab(h, i, t, on) { return '<a class="m-tab' + (on ? ' is-on' : '') + '" href="' + h + '"><svg viewBox="0 0 24 24" aria-hidden="true">' + ic[i] + '</svg><span>' + t + '</span></a>'; }
  var nav = document.createElement('nav'); nav.className = 'm-tabbar'; nav.setAttribute('aria-label', 'Nawigacja aplikacji');
  nav.innerHTML = tab('./', 'home', 'Home') + tab('./#/szybkie', 'bolt', 'Nowinki') + tab('./#/ranking', 'chart', 'Ranking') + tab('./#/zapisane', 'mark', 'Zapisane') + tab('spot', 'spot', 'Spot', true);
  document.body.appendChild(nav);

  /* dane z konta */
  var sx = document.createElement('p'); sx.className = 'ar-acct'; sx.hidden = true;
  var grid = $('.ar-grid'); if (grid) grid.parentNode.insertBefore(sx, grid);
  function fill(id, v) {
    var el = document.getElementById(id); if (!el) return false;
    if (!v) { el.readOnly = false; el.classList.remove('is-locked'); return false; }
    var ch = el.value !== v; el.value = v; el.readOnly = true; el.classList.add('is-locked'); el.title = 'Dane z Twojego konta – zmienisz je w ustawieniach konta';
    if (ch) el.dispatchEvent(new Event('input', { bubbles: true })); return true;
  }
  function onUser(u) {
    if (!u) { fill('f-name', ''); fill('f-email', ''); sx.hidden = false; sx.innerHTML = 'Masz konto? <a href="./#/konto">Zaloguj się</a>, a wypełnimy imię i e-mail za Ciebie.'; return; }
    var name = u.displayName || '';
    var a = fill('f-name', name), b = fill('f-email', u.email || '');
    sx.hidden = false; sx.innerHTML = '<span class="ar-acct-dot"></span>Zalogowano jako <b>' + (name || u.email || 'czytelnik').replace(/[<>&]/g, '') + '</b>' + (a || b ? ' · imię i e-mail pochodzą z konta i nie można ich zmienić' : '');
  }
  function load(src) { return new Promise(function (ok, no) { var s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = no; document.head.appendChild(s); }); }
  var base = 'https://www.gstatic.com/firebasejs/10.12.2/';
  (window.firebase && firebase.initializeApp ? Promise.resolve() : load(base + 'firebase-app-compat.js'))
    .then(function () { return firebase.auth ? null : load(base + 'firebase-auth-compat.js'); })
    .then(function () {
      var app = firebase.apps.filter(function (a) { return a.name === 'readers'; })[0] || firebase.initializeApp(FB, 'readers');
      app.auth().onAuthStateChanged(onUser);
    }).catch(function () {});
})();
