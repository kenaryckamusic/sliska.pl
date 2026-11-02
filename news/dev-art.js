/* Śliska News (dev) – animowane, sztuczne „artykuły” (bez tekstu) jak na okładce OG: kolorowe kafle z plakietką i paskami.
 * Użycie: devArt(element). Ruch jest bardzo wolny, kolory stonowane; przy „ogranicz ruch” animacja się wyłącza. */
(function () {
  'use strict';
  if (window.devArt) return;
  var css = '.dart{position:absolute;inset:0;overflow:hidden;pointer-events:none;-webkit-mask-image:radial-gradient(120% 90% at 50% 50%,#000 40%,rgba(0,0,0,.35) 100%);mask-image:radial-gradient(120% 90% at 50% 50%,#000 40%,rgba(0,0,0,.35) 100%)}' +
    '.dart-field{position:absolute;left:-12%;right:-12%;top:-30%;bottom:-30%;display:flex;gap:18px;transform:rotate(-9deg);opacity:.17;filter:blur(2.5px) saturate(.8)}' +
    '.dart-col{flex:1;min-width:0;display:flex;flex-direction:column;gap:18px;will-change:transform;animation:dartUp var(--d,90s) linear infinite}.dart-col.is-dn{animation-name:dartDn}' +
    '@keyframes dartUp{from{transform:translateY(0)}to{transform:translateY(calc(-50% - 9px))}}@keyframes dartDn{from{transform:translateY(calc(-50% - 9px))}to{transform:translateY(0)}}' +
    '.dt{position:relative;flex:none;border-radius:22px;overflow:hidden;border:1px solid rgba(255,255,255,.1)}' +
    '.dt:before{content:"";position:absolute;inset:0;background:radial-gradient(70% 55% at 70% 18%,rgba(255,255,255,.2),transparent 70%)}' +
    '.dt i{position:absolute;left:14px;top:14px;height:18px;width:34%;border-radius:99px;background:rgba(0,0,0,.28)}' +
    '.dt b{position:absolute;left:14px;right:14px;height:9px;border-radius:99px;background:rgba(255,255,255,.88)}' +
    '.dt b:nth-of-type(1){bottom:46px}.dt b:nth-of-type(2){bottom:30px}.dt b:nth-of-type(3){bottom:14px;right:46%}' +
    '.dt.k1{background:linear-gradient(180deg,#e0243f,#8d0019)}.dt.k2{background:linear-gradient(180deg,#32285f,#1a1536)}.dt.k3{background:linear-gradient(180deg,#34343c,#1d1d22)}' +
    '.dt.k4{background:linear-gradient(180deg,#a3173d,#4b0b21)}.dt.k5{background:linear-gradient(180deg,#4a3a86,#241c4a)}' +
    '@media(prefers-reduced-motion:reduce){.dart-col{animation:none}}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  var KINDS = ['k1', 'k2', 'k3', 'k4', 'k5'], HS = [150, 210, 170, 250, 190, 230, 160, 200];
  function col(ci, n) {
    var tiles = '';
    for (var r = 0; r < 2; r++) for (var i = 0; i < n; i++) {
      var h = HS[(ci * 3 + i * 5) % HS.length], k = KINDS[(ci * 2 + i * 3 + (i % 2)) % KINDS.length];
      tiles += '<div class="dt ' + k + '" style="height:' + h + 'px"><i></i><b></b><b></b><b></b></div>';
    }
    return '<div class="dart-col' + (ci % 2 ? ' is-dn' : '') + '" style="--d:' + (80 + (ci * 17) % 50) + 's">' + tiles + '</div>';
  }
  window.devArt = function (host, cols) {
    if (!host || host.querySelector('.dart')) return;
    cols = cols || 7;
    var h = '<div class="dart"><div class="dart-field">';
    for (var c = 0; c < cols; c++) h += col(c, 6);
    host.insertAdjacentHTML('afterbegin', h + '</div></div>');
  };
})();
