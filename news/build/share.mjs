// Śliska News – automatyczne wrzucanie nowych artykułów do Buffera (X / Twitter).
// Uruchamiane przez GitHub Actions po zbudowaniu stron. Bez zewnętrznych bibliotek.
//
// Jak to działa:
//  • bierze artykuły z bazy, pomija te już wysłane (lista w news/build/shared.json),
//  • wysyła tylko te z ostatnich 48 h, których strona jest już online (sprawdza adres),
//  • tekst posta = TYTUŁ + pusta linia + LINK, trafia do kolejki Buffera.
// Pierwsze uruchomienie tylko „zapamiętuje" istniejące artykuły – nic nie wysyła.
//
// Potrzebne sekrety w GitHubie: BUFFER_API_KEY, BUFFER_CHANNEL_ID.
// Lista kanałów (żeby znaleźć ID):  BUFFER_API_KEY=... node news/build/share.mjs --channels

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CFG, articleUrl, loadArticles } from './build.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const STATE = path.join(HERE, 'shared.json');
const API = process.env.BUFFER_API_URL || 'https://api.buffer.com';
const KEY = process.env.BUFFER_API_KEY || '';
const CHANNEL = process.env.BUFFER_CHANNEL_ID || '';
const MODE = process.env.BUFFER_MODE || 'addToQueue';   // addToQueue = następny wolny termin z grafiku w Bufferze
const MAX_AGE_H = 48;      // starszych artykułów nie wysyłamy
const MAX_PER_RUN = 3;     // zabezpieczenie przed zalewem postów

async function gql(query) {
  const res = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KEY}` },
    body: JSON.stringify({ query }),
  });
  const text = await res.text();
  let json; try { json = JSON.parse(text); } catch { json = null; }
  if (!res.ok || !json || json.errors) throw new Error(`Buffer ${res.status}: ${text.slice(0, 300)}`);
  return json.data;
}

const q = s => JSON.stringify(String(s));   // bezpieczny literał tekstowy w GraphQL

/** X: limit 280 znaków, link liczy się jako ~23 – tytuł skracamy z zapasem. */
export function composeText(title, url) {
  let t = title.replace(/\s+/g, ' ').trim();
  if (t.length > 240) t = t.slice(0, 239).replace(/\s+\S*$/, '') + '…';
  return `${t}\n\n${url}`;
}

async function pageIsLive(url) {
  if (process.env.SHARE_SKIP_URL_CHECK) return true;
  try { return (await fetch(url, { method: 'GET', redirect: 'follow' })).ok; } catch { return false; }
}

async function listChannels() {
  const orgs = (await gql('query { account { organizations { id name } } }')).account.organizations;
  for (const o of orgs) {
    const ch = (await gql(`query { channels(input: { organizationId: ${q(o.id)} }) { id name service } }`)).channels;
    for (const c of ch) console.log(`${c.service}\t${c.name}\tID: ${c.id}\t(organizacja: ${o.name})`);
  }
}

async function post(text) {
  const data = await gql(`mutation { createPost(input: {
    text: ${q(text)}, channelId: ${q(CHANNEL)}, schedulingType: automatic, mode: ${MODE}
  }) { ... on PostActionSuccess { post { id } } ... on MutationError { message } } }`);
  const r = data.createPost;
  if (r && r.message) throw new Error(`Buffer odrzucił post: ${r.message}`);
}

async function main() {
  if (process.argv.includes('--channels')) { if (!KEY) throw new Error('Brak BUFFER_API_KEY'); return listChannels(); }

  const all = (await loadArticles()).filter(a => a && a.id && a.title && a.createdAt && Date.parse(a.createdAt) <= Date.now());

  // pierwsze uruchomienie: zapamiętaj to, co już jest, niczego nie wysyłaj
  if (!fs.existsSync(STATE)) {
    const posted = {}; for (const a of all) posted[a.id] = 'przed-uruchomieniem';
    fs.writeFileSync(STATE, JSON.stringify({ posted }, null, 2) + '\n');
    console.log(`Zapamiętano ${all.length} istniejących artykułów (nic nie wysłano).`);
    return;
  }
  if (!KEY || !CHANNEL) { console.log('Brak BUFFER_API_KEY / BUFFER_CHANNEL_ID – pomijam wysyłkę do Buffera.'); return; }

  const state = JSON.parse(fs.readFileSync(STATE, 'utf8'));
  state.posted = state.posted || {};
  const fresh = all
    .filter(a => !state.posted[a.id] && Date.now() - Date.parse(a.createdAt) < MAX_AGE_H * 3600e3)
    .sort((x, y) => Date.parse(x.createdAt) - Date.parse(y.createdAt));

  let sent = 0;
  for (const a of fresh) {
    if (sent >= MAX_PER_RUN) break;
    const url = articleUrl(a);
    if (!(await pageIsLive(url))) { console.log(`Strona jeszcze niedostępna, spróbuję później: ${url}`); continue; }
    try {
      await post(composeText(a.title, url));
      state.posted[a.id] = new Date().toISOString();
      sent++;
      console.log(`Wysłano do Buffera: ${a.title}`);
    } catch (e) { console.error(`BŁĄD przy „${a.title}": ${e.message}`); }
  }
  // artykuły starsze niż limit uznajemy za załatwione, żeby nie sprawdzać ich w nieskończoność
  for (const a of all) if (!state.posted[a.id] && Date.now() - Date.parse(a.createdAt) >= MAX_AGE_H * 3600e3) state.posted[a.id] = 'pominięty-za-stary';
  fs.writeFileSync(STATE, JSON.stringify(state, null, 2) + '\n');
  console.log(`Wysłano: ${sent}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(err => { console.error('BŁĄD:', err.message); process.exit(1); });
}
