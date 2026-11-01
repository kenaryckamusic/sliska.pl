/* Formularz reklam: wczytanie grafik, kadrowanie, kompresja, podgląd, wysyłka do właściciela. */
(function () {
  'use strict';
  var API = (location.protocol === 'file:' ? 'https://sliska.pl' : '') + '/news/api/spot/submit';
  var MAX_IN = 20 * 1024 * 1024;       // największy plik, który w ogóle wczytujemy
  var MAX_OUT = 500 * 1024;            // limit po kompresji (taki sam w Workerze)
  var QUAL = [0.95, 0.92, 0.89, 0.86, 0.82, 0.78, 0.74];   // zaczynamy od prawie bezstratnej, niżej 74% nie schodzimy – grafika nie traci widocznie na jakości
  var F = {
    long: { name: 'Długi pasek', css: [728, 90], out: [1456, 180], where: 'góra strony (dwie reklamy obok siebie), w środku artykułu, na końcu list' },
    box:  { name: 'Okienko', css: [300, 250], out: [600, 500], where: 'okienko w rogu ekranu (co kilka minut) i popup na środku' },
    card: { name: 'Kafelek', css: [450, 500], out: [900, 1000], where: 'kafelek między artykułami na stronie głównej' }
  };
  var ORDER = ['long', 'box', 'card'];
  var S = { long: {}, box: {}, card: {} };      // S[f] = { src, name, bytes, res, err }
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var esc = function (t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var kb = function (b) { return b < 1048576 ? Math.round(b / 1024) + ' KB' : (b / 1048576).toFixed(1).replace('.', ',') + ' MB'; };

  /* ---------- sloty ---------- */
  function slotHtml(f) {
    var d = F[f], s = S[f], o = d.out, c = d.css;
    var head = '<div class="ar-slot-h"><b>' + d.name + ' <small>' + c[0] + '×' + c[1] + '</small></b><small>' + (s.res ? 'gotowe' : 'opcjonalnie') + '</small></div>' +
      '<p class="ar-spec">Wymagany plik: <b>' + o[0] + '×' + o[1] + ' px</b> (JPG). Minimum: ' + c[0] + '×' + c[1] + ' px. Pokaże się: ' + d.where + '.</p>';
    var body = '';
    if (s.err) body += '<p class="ar-err">' + esc(s.err) + '</p>';
    if (s.res) {
      var r = s.res, warn = r.q < 0.8 || r.soft;
      body += '<div class="ar-res"><div class="ar-thumb"><img src="' + r.dataUrl + '" alt="Podgląd: ' + d.name + '"></div><div class="ar-meta">' +
        '<span class="ar-chip' + (warn ? ' is-warn' : '') + '">' + (warn ? '⚠ ' : '✓ ') + o[0] + '×' + o[1] + ' · ' + kb(r.bytes) + '</span>' +
        '<span>' + (s.bytes > r.bytes * 1.15 ? 'z ' + kb(s.bytes) + ' → ' + kb(r.bytes) + ', ' : '') + 'jakość ' + Math.round(r.q * 100) + '%</span>' +
        (r.soft ? '<span>grafika w niższej rozdzielczości – na ekranach Retina będzie nieco mniej ostra</span>' : '') + '</div>' +
        '<div class="ar-btns"><button type="button" class="btn btn-sm" data-act="crop" data-f="' + f + '">Przytnij ponownie</button><label class="btn btn-sm">Zmień plik<input type="file" accept="image/*" data-f="' + f + '" hidden></label><button type="button" class="btn btn-sm btn-danger" data-act="remove" data-f="' + f + '">Usuń</button></div></div>';
    } else {
      body += '<label class="ar-drop" data-f="' + f + '"><input type="file" accept="image/jpeg,image/png,image/webp,image/gif" data-f="' + f + '"><span><b>Wybierz plik</b> lub upuść go tutaj</span><small>JPG, PNG, WebP · do 20 MB</small></label>';
      var from = ORDER.filter(function (g) { return g !== f && S[g].src; })[0];
      if (from) body += '<div class="ar-btns"><button type="button" class="btn btn-sm" data-act="reuse" data-f="' + f + '" data-from="' + from + '">Użyj pliku z formatu „' + F[from].name + '” i przytnij</button></div>';
    }
    return '<div class="ar-slot" data-f="' + f + '">' + head + body + '</div>';
  }
  function renderSlots() { $('#slots').innerHTML = ORDER.map(slotHtml).join(''); preview(); check(); }

  /* ---------- wczytanie pliku ---------- */
  function decode(file) {
    if (window.createImageBitmap) return createImageBitmap(file).catch(function () { return viaImg(file); });
    return viaImg(file);
  }
  function viaImg(file) {
    return new Promise(function (ok, no) { var u = URL.createObjectURL(file), im = new Image(); im.onload = function () { URL.revokeObjectURL(u); ok(im); }; im.onerror = function () { URL.revokeObjectURL(u); no(); }; im.src = u; });
  }
  var dimsOf = function (im) { return { w: im.width || im.naturalWidth, h: im.height || im.naturalHeight }; };

  function onFile(f, file) {
    var s = S[f], d = F[f];
    if (!file) return;
    s.err = '';
    if (!/^image\/(jpeg|png|webp|gif)$/.test(file.type) && !/\.(jpe?g|png|webp|gif)$/i.test(file.name)) { s.err = 'To nie jest obsługiwany plik graficzny. Użyj JPG, PNG lub WebP.'; return renderSlots(); }
    if (file.size > MAX_IN) { s.err = 'Plik ma ' + kb(file.size) + ' – to za dużo, maksimum do wczytania to 20 MB. Zmniejsz go i spróbuj ponownie.'; return renderSlots(); }
    decode(file).then(function (im) {
      var m = dimsOf(im);
      if (m.w < d.css[0] || m.h < d.css[1]) {
        s.err = 'Ta grafika ma ' + m.w + '×' + m.h + ' px – za mało. Minimalny rozmiar dla formatu „' + d.name + '” to ' + d.css[0] + '×' + d.css[1] + ' px (zalecany: ' + d.out[0] + '×' + d.out[1] + ' px).';
        return renderSlots();
      }
      s.src = im; s.name = file.name; s.bytes = file.size; s.res = null;
      var ratioOk = Math.abs(m.w / m.h - d.out[0] / d.out[1]) / (d.out[0] / d.out[1]) < 0.01;
      if (ratioOk) finish(f, { sx: 0, sy: 0, sw: m.w, sh: m.h }); else openCrop(f, true);
    }).catch(function () { s.err = 'Nie udało się odczytać tej grafiki. Spróbuj zapisać ją jako JPG lub PNG.'; renderSlots(); });
  }

  /* ---------- kompresja do pliku wyjściowego ---------- */
  function finish(f, r) {
    var d = F[f], s = S[f], cv = document.createElement('canvas'); cv.width = d.out[0]; cv.height = d.out[1];
    var ctx = cv.getContext('2d'); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.drawImage(s.src, r.sx, r.sy, r.sw, r.sh, 0, 0, cv.width, cv.height);
    var soft = r.sw < d.out[0] || r.sh < d.out[1], i = 0;
    (function next() {
      cv.toBlob(function (blob) {
        if (!blob) { s.err = 'Nie udało się przetworzyć grafiki w tej przeglądarce.'; s.res = null; return renderSlots(); }
        if (blob.size > MAX_OUT && i < QUAL.length - 1) { i++; return next(); }
        if (blob.size > MAX_OUT) { s.err = 'Po kompresji grafika nadal waży ' + kb(blob.size) + ' (limit ' + kb(MAX_OUT) + '), a mocniejsza kompresja zauważalnie zepsułaby jej jakość. Uprość tło albo usuń ziarno i szum, i wgraj ją jeszcze raz.'; s.res = null; return renderSlots(); }
        var fr = new FileReader();
        fr.onload = function () { s.err = ''; s.res = { dataUrl: fr.result, bytes: blob.size, q: QUAL[i], soft: soft }; renderSlots(); };
        fr.readAsDataURL(blob);
      }, 'image/jpeg', QUAL[i]);
    })();
  }

  /* ---------- narzędzie kadrowania ---------- */
  var C = null;   // stan kadrowania
  function openCrop(f, fresh) {
    var d = F[f], s = S[f], im = s.src, m = dimsOf(im);
    var box = $('#crop'), cv = $('#cv'), dpr = Math.min(window.devicePixelRatio || 1, 2);
    box.hidden = false; document.body.style.overflow = 'hidden';
    var maxW = Math.min(690, window.innerWidth - 64), maxH = Math.max(160, Math.min(430, window.innerHeight * 0.46));
    var cw = maxW, ch = cw * d.out[1] / d.out[0];
    if (ch > maxH) { ch = maxH; cw = ch * d.out[0] / d.out[1]; }
    cw = Math.round(cw); ch = Math.round(ch);
    cv.width = cw * dpr; cv.height = ch * dpr; cv.style.width = cw + 'px'; cv.style.height = ch + 'px';
    C = { f: f, im: im, iw: m.w, ih: m.h, cw: cw, ch: ch, dpr: dpr, min: Math.max(cw / m.w, ch / m.h), z: 1, ox: 0, oy: 0 };
    $('#crop-t').textContent = 'Przytnij: ' + d.name + ' (' + d.out[0] + '×' + d.out[1] + ')';
    $('#crop-info').textContent = (fresh ? 'Ta grafika ma inne proporcje (' + m.w + '×' + m.h + ' px), więc ustaw kadr. ' : '') + 'Jasna ramka to to, co zobaczą czytelnicy.';
    $('#zoom').value = 1; reset();
  }
  function clamp() { var s = C.min * C.z; C.ox = Math.min(0, Math.max(C.cw - C.iw * s, C.ox)); C.oy = Math.min(0, Math.max(C.ch - C.ih * s, C.oy)); }
  function reset() { C.z = 1; $('#zoom').value = 1; var s = C.min; C.ox = (C.cw - C.iw * s) / 2; C.oy = (C.ch - C.ih * s) / 2; draw(); }
  function rect() { var s = C.min * C.z; return { sx: -C.ox / s, sy: -C.oy / s, sw: C.cw / s, sh: C.ch / s }; }
  function draw() {
    clamp();
    var cv = $('#cv'), ctx = cv.getContext('2d'), s = C.min * C.z;
    ctx.setTransform(C.dpr, 0, 0, C.dpr, 0, 0); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, C.cw, C.ch);
    ctx.imageSmoothingQuality = 'high'; ctx.drawImage(C.im, C.ox, C.oy, C.iw * s, C.ih * s);
    var r = rect(), d = F[C.f], tooSmall = r.sw < d.css[0] || r.sh < d.css[1], soft = !tooSmall && (r.sw < d.out[0] || r.sh < d.out[1]);
    var w = $('#crop-warn');
    w.hidden = !(tooSmall || soft);
    w.textContent = tooSmall ? 'Za mocne przybliżenie – wycinek ma tylko ' + Math.round(r.sw) + '×' + Math.round(r.sh) + ' px, a minimum to ' + d.css[0] + '×' + d.css[1] + ' px. Oddal grafikę.' : soft ? 'Wycinek ma ' + Math.round(r.sw) + '×' + Math.round(r.sh) + ' px (zalecane ' + d.out[0] + '×' + d.out[1] + '). Zadziała, ale na ekranach Retina będzie lekko miękka.' : '';
    $('#crop-ok').disabled = tooSmall;
  }
  function zoomTo(z, px, py) {
    var old = C.min * C.z; C.z = Math.min(4, Math.max(1, z)); var n = C.min * C.z;
    px = px == null ? C.cw / 2 : px; py = py == null ? C.ch / 2 : py;
    C.ox = px - (px - C.ox) / old * n; C.oy = py - (py - C.oy) / old * n; $('#zoom').value = C.z; draw();
  }
  function closeCrop() { $('#crop').hidden = true; document.body.style.overflow = ''; C = null; }
  (function bindCrop() {
    var cv = $('#cv'), drag = null, pts = {}, pinch = 0;
    cv.addEventListener('pointerdown', function (e) { cv.setPointerCapture(e.pointerId); pts[e.pointerId] = [e.clientX, e.clientY]; if (Object.keys(pts).length === 1) drag = { x: e.clientX, y: e.clientY, ox: C.ox, oy: C.oy }; pinch = 0; });
    cv.addEventListener('pointermove', function (e) {
      if (!C || !pts[e.pointerId]) return; pts[e.pointerId] = [e.clientX, e.clientY];
      var k = Object.keys(pts);
      if (k.length === 2) { var a = pts[k[0]], b = pts[k[1]], dist = Math.hypot(a[0] - b[0], a[1] - b[1]); if (pinch) zoomTo(C.z * dist / pinch); pinch = dist; return; }
      if (drag) { C.ox = drag.ox + (e.clientX - drag.x); C.oy = drag.oy + (e.clientY - drag.y); draw(); }
    });
    function up(e) { delete pts[e.pointerId]; drag = null; pinch = 0; }
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
    cv.addEventListener('wheel', function (e) { if (!C) return; e.preventDefault(); var b = cv.getBoundingClientRect(); zoomTo(C.z * (e.deltaY < 0 ? 1.08 : 1 / 1.08), e.clientX - b.left, e.clientY - b.top); }, { passive: false });
    $('#zoom').addEventListener('input', function () { zoomTo(parseFloat(this.value)); });
    $('#crop-reset').addEventListener('click', function () { if (C) reset(); });
    $('#crop-cancel').addEventListener('click', function () { var f = C && C.f; closeCrop(); if (f && !S[f].res) S[f].src = null; renderSlots(); });
    $('#crop-ok').addEventListener('click', function () { if (!C) return; var f = C.f, r = rect(); closeCrop(); finish(f, r); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && C) $('#crop-cancel').click(); });
  })();

  /* ---------- obsługa slotów (delegacja) ---------- */
  var slots = $('#slots');
  slots.addEventListener('change', function (e) { var t = e.target; if (t.type === 'file' && t.dataset.f) { onFile(t.dataset.f, t.files[0]); t.value = ''; } });
  slots.addEventListener('click', function (e) {
    var b = e.target.closest('[data-act]'); if (!b) return; var f = b.dataset.f, a = b.dataset.act;
    if (a === 'remove') { S[f] = {}; renderSlots(); }
    else if (a === 'crop') openCrop(f, false);
    else if (a === 'reuse') { S[f].src = S[b.dataset.from].src; S[f].name = S[b.dataset.from].name; S[f].bytes = S[b.dataset.from].bytes; S[f].err = ''; openCrop(f, true); }
  });
  ['dragenter', 'dragover'].forEach(function (n) { slots.addEventListener(n, function (e) { var z = e.target.closest('.ar-drop'); if (z) { e.preventDefault(); z.classList.add('is-over'); } }); });
  ['dragleave', 'drop'].forEach(function (n) { slots.addEventListener(n, function (e) { var z = e.target.closest('.ar-drop'); if (z) { z.classList.remove('is-over'); if (n === 'drop') { e.preventDefault(); onFile(z.dataset.f, e.dataTransfer.files[0]); } } }); });
  window.addEventListener('dragover', function (e) { e.preventDefault(); }); window.addEventListener('drop', function (e) { e.preventDefault(); });

  /* ---------- podgląd ---------- */
  var TABS = [
    { id: 'top', name: 'Góra strony', f: 'long' }, { id: 'art', name: 'W artykule', f: 'long' }, { id: 'box', name: 'Okienko w rogu', f: 'box' },
    { id: 'popup', name: 'Popup', f: 'box' }, { id: 'card', name: 'Kafelek', f: 'card' }
  ];
  var tab = 'top', dev = 'desktop';
  var lines = function () { return '<div class="pv-line"></div><div class="pv-line m"></div><div class="pv-line"></div><div class="pv-line s"></div>'; };
  function creative() {
    var c = { id: 'preview', group: 'preview', link: '#', alt: ($('#f-name').value || 'Twoja reklama'), img: {} };
    ORDER.forEach(function (f) { if (S[f].res) c.img[f] = S[f].res.dataUrl; }); return c;
  }
  function preview() {
    var t = TABS.filter(function (x) { return x.id === tab; })[0], c = creative(), pv = $('#pv'), A = window.SliskaSpot;
    $('#pv-tabs').innerHTML = TABS.map(function (x) { return '<button type="button" role="tab" class="' + (x.id === tab ? 'is-on' : '') + '" data-tab="' + x.id + '">' + x.name + (S[x.f].res ? '' : ' ·') + '</button>'; }).join('');
    pv.className = 'pv pv-' + dev; pv.style.minHeight = '';
    var note = '';
    if (!A) { pv.innerHTML = '<div class="pv-miss">Nie udało się wczytać podglądu.</div>'; return; }
    if (!S[t.f].res) { pv.innerHTML = '<div class="pv-miss">Dodaj grafikę „' + F[t.f].name + '” (' + F[t.f].out[0] + '×' + F[t.f].out[1] + '), żeby zobaczyć ten podgląd.</div>'; $('#pv-note').textContent = ''; return; }
    var h = '<div class="pv-bar"></div>';
    if (tab === 'top') { h += '<div class="pv-top"><div class="sp-slot sp-slot-long">' + A.html('top', c) + '</div><div class="sp-slot sp-slot-short">' + A.html('top', A.house[1]) + '</div></div><div class="pv-h"></div>' + lines(); note = dev === 'phone' ? 'Na telefonie w górnym rzędzie jest jedna reklama.' : 'Na komputerze w górnym rzędzie są dwie reklamy obok siebie, zmieniają się co 10 sekund.'; }
    else if (tab === 'art') { h += '<div class="pv-h"></div>' + lines() + '<div class="sp-inline">' + A.html('strip', c) + '</div>' + lines(); note = 'Pojawia się w połowie tekstu w części artykułów.'; }
    else if (tab === 'box') { if (dev === 'phone') { h = '<div class="pv-miss">Na telefonie okienko w rogu się nie pokazuje (brak miejsca). Zobacz, jak działa na komputerze.</div>'; } else { h += '<div class="pv-h"></div>' + lines() + lines() + '<div class="sp-dock sp-dock-r">' + A.html('box', c) + '</div>'; pv.style.minHeight = '400px'; note = 'Wyskakuje w rogu po kilkudziesięciu sekundach i potem co kilka minut. Czytelnik może je zamknąć.'; } }
    else if (tab === 'popup') { h += '<div class="pv-h"></div>' + lines() + '<div class="sp-overlay">' + A.html('popup', c) + '</div>'; pv.style.minHeight = '420px'; note = 'Pojawia się na środku po kilku sekundach. Zamknąć można po 3 sekundach.'; }
    else { h += '<div class="pv-grid"><div class="pv-skel"></div>' + A.html('card', c) + '<div class="pv-skel"></div></div>'; note = 'Kafelek stoi w siatce artykułów na stronie głównej.'; }
    pv.innerHTML = h; $('#pv-note').textContent = note;
  }
  $('#pv-tabs').addEventListener('click', function (e) { var b = e.target.closest('[data-tab]'); if (b) { tab = b.dataset.tab; preview(); } });
  document.querySelector('.ar-seg').addEventListener('click', function (e) { var b = e.target.closest('[data-dev]'); if (!b) return; dev = b.dataset.dev; [].forEach.call(this.children, function (x) { x.classList.toggle('is-on', x === b); }); preview(); });
  $('#pv').addEventListener('click', function (e) { if (e.target.closest('a, button')) e.preventDefault(); });

  /* ---------- formularz ---------- */
  var ids = ['name', 'email', 'link'], form = $('#f');
  try { var dr = JSON.parse(localStorage.getItem('sliska_ad_draft') || '{}'); ids.forEach(function (k) { if (dr[k]) $('#f-' + k).value = dr[k]; }); } catch (e) {}
  function saveDraft() { try { var o = {}; ids.forEach(function (k) { o[k] = $('#f-' + k).value; }); localStorage.setItem('sliska_ad_draft', JSON.stringify(o)); } catch (e) {} }
  function fixLink() { var v = $('#f-link').value.trim(); if (v && !/^https?:\/\//i.test(v)) $('#f-link').value = 'https://' + v; }
  var validLink = function (v) { return /^https?:\/\/[^\s]+\.[^\s]{2,}$/i.test(v); }, validMail = function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v); };
  function missing() {
    var m = [];
    if (!ORDER.some(function (f) { return S[f].res; })) m.push('dodaj co najmniej jedną grafikę');
    if ($('#f-name').value.trim().length < 2) m.push('imię i nazwisko');
    if (!validMail($('#f-email').value.trim())) m.push('poprawny e-mail');
    var l = $('#f-link').value.trim(); if (l && !/^https?:\/\//i.test(l)) l = 'https://' + l;
    if (!validLink(l)) m.push('poprawny link');
    if (!$('#f-ok').checked) m.push('zgoda');
    return m;
  }
  function check() { var m = missing(); $('#f-send').disabled = m.length > 0; $('#f-hint').textContent = m.length ? 'Brakuje: ' + m.join(', ') + '.' : ''; }
  form.addEventListener('input', function (e) { saveDraft(); if (e.target.id === 'f-note') $('#f-note-n').textContent = e.target.value.length + '/600'; if (e.target.id === 'f-name') preview(); check(); });
  form.addEventListener('change', check);
  $('#f-link').addEventListener('blur', function () { fixLink(); check(); });
  var ERR = { endpoint: 'Serwer reklam jeszcze nie został zaktualizowany (właściciel musi wdrożyć nowego Workera). Spróbuj później.', server: 'Błąd po stronie serwera. Spróbuj za chwilę.', rate: 'Z tej sieci wysłano już sporo zgłoszeń. Spróbuj za godzinę.', full: 'Skrzynka właściciela jest chwilowo pełna. Spróbuj za kilka dni.', too_big: 'Zgłoszenie jest za duże. Usuń jeden z formatów i spróbuj ponownie.', img_dim: 'Jedna z grafik ma zły rozmiar. Wgraj ją jeszcze raz.', img_size: 'Jedna z grafik jest za ciężka. Wgraj ją jeszcze raz.', img: 'Jedna z grafik jest uszkodzona. Wgraj ją jeszcze raz.', email: 'Podaj poprawny adres e-mail.', link: 'Podaj poprawny link (zaczynający się od https://).', fields: 'Wpisz imię i nazwisko.', accept: 'Zaznacz zgodę.', method: 'Nie można wysłać z tej strony. Otwórz formularz na sliska.pl.' };
  form.addEventListener('submit', function (e) {
    e.preventDefault(); fixLink(); if (missing().length) return check();
    var btn = $('#f-send'), er = $('#f-err'); er.hidden = true; btn.disabled = true; btn.textContent = 'Wysyłam…';
    var imgs = {}; ORDER.forEach(function (f) { if (S[f].res) imgs[f] = S[f].res.dataUrl; });
    fetch(API, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: $('#f-name').value, email: $('#f-email').value, link: $('#f-link').value, note: $('#f-note').value, accept: $('#f-ok').checked, age: Math.round(performance.now()), imgs: imgs }) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { if (!r.ok || d.error) throw new Error(ERR[d.error] || 'Nie udało się wysłać. Spróbuj za chwilę.'); }); })
      .then(function () { $('#done-mail').textContent = $('#f-email').value.trim(); form.hidden = true; $('#done').hidden = false; window.scrollTo({ top: $('#done').getBoundingClientRect().top + scrollY - 120, behavior: 'smooth' }); })
      .catch(function (ex) { er.textContent = ex && ex.message && !/Failed to fetch|NetworkError|Load failed/i.test(ex.message) ? ex.message : 'Brak połączenia z serwerem. Spróbuj za chwilę.'; er.hidden = false; })
      .then(function () { btn.textContent = 'Wyślij reklamę'; check(); });
  });
  $('#again').addEventListener('click', function () { ORDER.forEach(function (f) { S[f] = {}; }); $('#f-note').value = ''; $('#f-note-n').textContent = '0/600'; $('#f-ok').checked = false; form.hidden = false; $('#done').hidden = true; renderSlots(); window.scrollTo({ top: 0, behavior: 'smooth' }); });

  renderSlots();
})();
