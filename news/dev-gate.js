/* Śliska News – bramka środowiska deweloperskiego (dev.sliska.pl)
 * Wpuszcza zalogowane konta redakcji: Właściciel (wszystko), Moderator z koroną (aktualna + kluczowe wersje),
 * Redaktor (tylko aktualna wersja dev oraz narzędzia redakcji).
 * Działa wyłącznie na hostach dev.* (albo z ?gate=1 do testów). Na sliska.pl nie robi nic.
 * UWAGA: to bramka po stronie przeglądarki – chroni przed przypadkowym wejściem, ale pliki są publiczne.
 * Prawdziwa blokada = Cloudflare Access (opisane w INSTRUKCJA.md). */
(function () {
  'use strict';
  var H = location.hostname;
  var ON = /^dev\./.test(H) || /[?&]gate=1\b/.test(location.search);
  if (!ON) return;
  /** Poziom dostępu z odpowiedzi /me: owner > mod (korona) > editor; '' = brak dostępu. */
  function level(d) { if (!d) return ''; if (d.role === 'owner') return 'owner'; if (d.crown) return 'mod'; if (d.role === 'editor' || d.role === 'chief') return 'editor'; return ''; }
  var FB = { apiKey: 'AIzaSyDi7M7X4cwsfIkxTebYlGsJPFN-NoAtwAU', authDomain: 'sliska.pl', projectId: 'sliska-users', appId: '1:236153117470:web:6b4bd4db90314fed52470f' };
  var SDK = '10.12.2';
  var root = document.documentElement;
  root.classList.add('dgate-lock');
  var st = document.createElement('style');
  st.textContent = 'html.dgate-lock body>*:not(#dgate){visibility:hidden!important}html.dgate-lock{overflow:hidden}' +
    '#dgate{position:fixed;inset:0;z-index:2147483000;display:grid;place-items:center;padding:20px;overflow:hidden;color:#f4f1f8;font:15px/1.5 Figtree,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;background:radial-gradient(1000px 600px at 90% -10%,#46266f 0,transparent 60%),radial-gradient(900px 700px at 0% 110%,#3a0f2a 0,transparent 55%),#0f0b1d}' +
    '#dgate *{box-sizing:border-box}.dg-card{position:relative;z-index:2;width:100%;max-width:410px;background:rgba(21,17,38,.72);-webkit-backdrop-filter:blur(16px) saturate(120%);backdrop-filter:blur(16px) saturate(120%);border:1px solid rgba(255,255,255,.13);border-radius:22px;padding:32px 28px;box-shadow:0 30px 80px rgba(0,0,0,.5);animation:dgIn .5s ease both}' +
    '@keyframes dgIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}@media(prefers-reduced-motion:reduce){.dg-card{animation:none}}' +
    '.dg-logo{display:flex;align-items:center}.dg-logo img{height:32px;display:block}' +
    '.dg-card h1{margin:22px 0 6px;font:800 1.35rem/1.2 "Bricolage Grotesque",Figtree,sans-serif;letter-spacing:-.01em}.dg-card p{margin:0 0 18px;color:#b9b2cc;font-size:.9rem}' +
    '.dg-card label{display:block;margin:0 0 12px;font-size:.78rem;font-weight:700;color:#b9b2cc}.dg-card input{display:block;width:100%;margin-top:5px;padding:12px 14px;border-radius:12px;border:1px solid rgba(255,255,255,.16);background:rgba(8,6,18,.55);color:#fff;font:inherit}' +
    '.dg-card input:focus{outline:2px solid #e0243f;outline-offset:1px}.dg-btn{width:100%;margin-top:6px;padding:13px;border:0;border-radius:99px;background:#d6001c;color:#fff;font:inherit;font-weight:700;cursor:pointer;transition:background .15s,transform .15s}.dg-btn:hover{background:#e0243f}.dg-btn:active{transform:scale(.99)}.dg-btn:disabled{opacity:.6;cursor:wait}' +
    '.dg-btn.is-ghost{background:transparent;color:#d6d0e6;border:1px solid rgba(255,255,255,.2);font-weight:600}.dg-btn.is-ghost:hover{background:rgba(255,255,255,.08)}.dg-err{min-height:1.2em;margin:4px 0 8px;color:#ff7d92;font-size:.84rem}.dg-crown{width:46px;height:46px;display:block;margin-bottom:4px}';
  document.head.appendChild(st);

  var CROWN = '<svg class="dg-crown" viewBox="0 0 24 24" fill="#fbbf24" aria-hidden="true"><path d="M3 8l4.5 4L12 5l4.5 7L21 8l-1.6 10H4.6L3 8zm1.9 12h14.2v1.6H4.9V20z"/></svg>';
  var box;
  function ui(html) {
    if (!box) { box = document.createElement('div'); box.id = 'dgate'; document.body.appendChild(box); if (window.devArt) window.devArt(box, 6); }
    box.querySelectorAll('.dg-card').forEach(function (n) { n.remove(); }); box.insertAdjacentHTML('beforeend', '<div class="dg-card"><div class="dg-logo"><img src="/news/logo-dev-biale.svg" alt="Śliska News DEV"></div>' + html + '</div>');
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function open(role, d) {
    if (role === 'editor' && /^\/v\//.test(location.pathname)) { location.replace('/'); return; }      // Redaktor nie ogląda wersji archiwalnych
    window.devRole = role || ''; window.devInfo = { role: (d && d.role) || '', crown: !!(d && d.crown) }; try { window.dispatchEvent(new CustomEvent('devgate', { detail: { role: window.devRole, info: window.devInfo } })); } catch (e) {} root.classList.remove('dgate-lock'); if (box) { box.remove(); box = null; } }

  function loadScript(src) {
    return new Promise(function (ok, no) { var s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = function () { no(new Error('script')); }; document.head.appendChild(s); });
  }
  var ERR = {
    'auth/invalid-credential': 'Nieprawidłowy login lub hasło.', 'auth/wrong-password': 'Nieprawidłowy login lub hasło.', 'auth/user-not-found': 'Nieprawidłowy login lub hasło.',
    'auth/invalid-login-credentials': 'Nieprawidłowy login lub hasło.', 'auth/invalid-email': 'Nieprawidłowy login lub hasło.', 'auth/too-many-requests': 'Za dużo prób. Spróbuj za chwilę.',
    'bad_login': 'Nieprawidłowy login lub hasło.', 'banned': 'To konto jest zablokowane.', 'network': 'Brak połączenia. Spróbuj ponownie.'
  };
  function errMsg(e) {
    var c = (e && (e.code || e.error || e.message)) || '';
    if (/requests-from-referer/.test(c)) return 'Klucz API blokuje tę domenę (dodaj https://dev.sliska.pl/* w Google Cloud). [' + c + ']';
    return ERR[c] || ('Nie udało się zalogować. [' + (c || 'błąd') + ']');
  }

  var PW_HASH = 'e2a61487c6a2a14ec9930f9d8022f83bffc6e085d7cabdc6108256b1120de334';
  var PW_KEY = 'sliska-dev-pw';
  window.devLogout = function () {
    try { localStorage.removeItem(PW_KEY); } catch (e) {}
    var go = function () { location.href = '/'; };
    try { if (auth) auth.signOut().then(go, go); else go(); } catch (e) { go(); }
  };
  function sha(t) {
    var b = new TextEncoder().encode(t);
    return crypto.subtle.digest('SHA-256', b).then(function (h) { return Array.prototype.map.call(new Uint8Array(h), function (x) { return ('0' + x.toString(16)).slice(-2); }).join(''); });
  }
  function pwOk() { try { return localStorage.getItem(PW_KEY) === PW_HASH; } catch (e) { return false; } }
  function showPw(msg) {
    ui('<h1>Środowisko deweloperskie</h1><p>Wpisz hasło dostępu.</p><form id="dg-pf" novalidate><label>Hasło<input id="dg-pw" type="password" autocomplete="off" required></label><div class="dg-err" id="dg-pe" role="alert">' + esc(msg || '') + '</div><button class="dg-btn" type="submit">Dalej</button></form>');
    var f = box.querySelector('#dg-pf'); box.querySelector('#dg-pw').focus();
    f.addEventListener('submit', function (ev) {
      ev.preventDefault();
      sha(box.querySelector('#dg-pw').value).then(function (h) {
        if (h === PW_HASH) { try { localStorage.setItem(PW_KEY, h); } catch (e) {} start2(); }
        else box.querySelector('#dg-pe').textContent = 'Nieprawidłowe hasło.';
      });
    });
  }

  var auth = null;
  /** Token zalogowanego konta – dla narzędzi huba dev (np. baza reklam), które mówią z Workerem. */
  window.devToken = function () { return auth && auth.currentUser ? auth.currentUser.getIdToken() : Promise.reject(new Error('no-user')); };
  function showLogin(msg) {
    ui('<h1>Tylko dla redakcji</h1><p>To środowisko testowe. Zaloguj się kontem Redaktora, Moderatora lub Właściciela.</p>' +
      '<form id="dg-f" novalidate><label>Nazwa użytkownika lub e-mail<input id="dg-u" autocomplete="username" autocapitalize="off" spellcheck="false" required></label>' +
      '<label>Hasło<input id="dg-p" type="password" autocomplete="current-password" required></label><div class="dg-err" id="dg-e" role="alert">' + esc(msg || '') + '</div>' +
      '<button class="dg-btn" id="dg-go" type="submit">Zaloguj</button></form>');
    var f = box.querySelector('#dg-f'), e = box.querySelector('#dg-e'), b = box.querySelector('#dg-go');
    box.querySelector('#dg-u').focus();
    f.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var u = box.querySelector('#dg-u').value.trim(), p = box.querySelector('#dg-p').value;
      if (!u || !p) { e.textContent = 'Wpisz login i hasło.'; return; }
      b.disabled = true; b.textContent = 'Logowanie…'; e.textContent = '';
      var step = u.indexOf('@') >= 0 ? Promise.resolve(u) :
        fetch('/news/api/login-name', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: u, password: p }), cache: 'no-store' })
          .then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { if (!r.ok || !d.email) { var x = new Error(d.error || 'bad_login'); x.error = d.error || 'bad_login'; throw x; } return d.email; }); });
      step.then(function (mail) { return auth.signInWithEmailAndPassword(mail, p); })
        .catch(function (x) { b.disabled = false; b.textContent = 'Zaloguj'; e.textContent = errMsg(x); });
      /* sukces obsłuży onAuthStateChanged */
    });
  }
  function showDenied(role) {
    ui(CROWN + '<h1>Brak uprawnień</h1><p>To środowisko jest dostępne tylko dla redakcji' + (role === '' ? '' : '') + '. Poproś Właściciela Portalu o nadanie rangi Redaktor albo korony Moderatora.</p>' +
      '<button class="dg-btn is-ghost" id="dg-out" type="button">Wyloguj</button>');
    box.querySelector('#dg-out').onclick = function () { auth.signOut(); };
  }
  function check(user) {
    ui('<h1>Sprawdzam uprawnienia…</h1><p>Chwileczkę.</p>');
    user.getIdToken().then(function (t) {
      return fetch('/news/api/me', { headers: { authorization: 'Bearer ' + t }, cache: 'no-store' });
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (d) {
        if (!r.ok) { if (d.error === 'banned') { showLogin('To konto jest zablokowane.'); auth.signOut(); return; } throw new Error(d.error || 'http'); }
        if (d.banned) { auth.signOut(); showLogin('To konto jest zablokowane.'); return; }
        if (d.verified && level(d)) open(level(d), d);
        else if (!d.verified && level(d)) { ui('<h1>Potwierdź e-mail</h1><p>Konto redakcji musi mieć potwierdzony adres e-mail.</p><button class="dg-btn is-ghost" id="dg-out" type="button">Wyloguj</button>'); box.querySelector('#dg-out').onclick = function () { auth.signOut(); }; }
        else showDenied();
      });
    }).catch(function (x) {
      ui('<h1>Nie udało się sprawdzić</h1><p>' + esc(ERR.network) + ' [' + esc((x && x.message) || '') + ']</p><button class="dg-btn" id="dg-re" type="button">Spróbuj ponownie</button><button class="dg-btn is-ghost" id="dg-out" type="button">Wyloguj</button>');
      box.querySelector('#dg-re').onclick = function () { check(user); };
      box.querySelector('#dg-out').onclick = function () { auth.signOut(); };
    });
  }

  function start() { if (pwOk()) start2(); else showPw(); }
  function start2() {
    ui('<h1>Ładowanie…</h1><p>&nbsp;</p>');
    var base = 'https://www.gstatic.com/firebasejs/' + SDK + '/';
    (window.firebase && firebase.initializeApp ? Promise.resolve() : loadScript(base + 'firebase-app-compat.js'))
      .then(function () { return firebase.auth ? null : loadScript(base + 'firebase-auth-compat.js'); })
      .then(function () {
        var app = firebase.apps.filter(function (a) { return a.name === 'readers'; })[0] || firebase.initializeApp(FB, 'readers');
        auth = app.auth();
        return auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(function () {});
      })
      .then(function () {
        var first = true, lastUid = null;
        auth.onAuthStateChanged(function (u) {
          if (!u) { lastUid = null; showLogin(); return; }
          if (u.uid === lastUid && !first) return;
          first = false; lastUid = u.uid; check(u);
        });
      })
      .catch(function () { ui('<h1>Nie udało się wczytać logowania</h1><p>Sprawdź połączenie i odśwież stronę.</p>'); });
  }
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
})();
