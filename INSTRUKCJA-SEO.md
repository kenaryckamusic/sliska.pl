# Śliska News – SEO (osobne strony artykułów) – instrukcja

## Co jest w paczce
- `news/` – cała strona (index.html, app.js, style.css, og-image.png) + generator `news/build/build.mjs`
- `.github/workflows/news-build.yml` – robot GitHub, który co 30 minut odświeża strony artykułów

## Wgranie (jednorazowo)
1. Wejdź na GitHub do repozytorium, z którego działa sliska.pl.
2. Wgraj do niego zawartość paczki: folder `news` i folder `.github` (Add file → Upload files; przeciągnij oba foldery).
   Jeśli w repozytorium masz już folder `news`, nadpisz jego pliki.
3. Settings → Pages: sprawdź, że "Source" to "Deploy from a branch" (domyślnie tak jest).
4. Zakładka Actions: jeśli GitHub zapyta, zezwól na uruchamianie workflowów.
5. Actions → "Śliska News – strony artykułów" → Run workflow. Po minucie w folderze `news` pojawią się `artykul/`, `img/`, `sitemap.xml`.
6. Od tej pory robot robi to sam co 30 minut.

## Google
1. Wejdź na https://search.google.com/search-console i dodaj usługę dla sliska.pl.
2. W "Mapy witryn" dodaj: `news/sitemap.xml`.
3. Opcjonalnie dopisz do pliku `robots.txt` w głównym folderze strony linijkę:
   `Sitemap: https://sliska.pl/news/sitemap.xml`

## Dobrze wiedzieć
- Nowy artykuł ma osobną stronę po max. ok. 30–40 minutach. Do tego czasu przycisk "Udostępnij" daje adres z "#", który działa od razu.
- Zmiana tytułu zmienia adres; stary adres sam przekierowuje na nowy.
- Usunięty lub schowany do roboczych artykuł znika też z osobnych stron.
- GitHub wyłącza zaplanowane zadania w publicznych repozytoriach po 60 dniach bez żadnej aktywności. Publikowanie artykułów (commity robota) liczy się jako aktywność.

## Nowości w tej wersji
- Strona "O nas i kontakt" (#/o-nas) i link w stopce.
- "Zapisz / Zapisane" – czytelnik zapisuje artykuły na później (tylko w jego przeglądarce).
- Odtwarzacze YouTube i Spotify w artykułach: w edytorze przycisk z ikoną "play" na pasku narzędzi, wklejasz link.
- Aplikacja na ekran główny telefonu (manifest + ikony w folderze news/icons).

---

## Automatyczne posty na X (Twitter) przez Buffer

Po dodaniu artykułu robot sam wrzuca do Buffera post: **tytuł + link**. Post pojawia się po ok. 30–45 min od publikacji (gdy strona artykułu jest już online) i trafia do kolejki Buffera.

**Jednorazowa konfiguracja:**
1. Załóż konto na X, w Bufferze podłącz je (Channels → Connect).
2. Buffer → Settings → API (publish.buffer.com/settings/api) → utwórz klucz API i skopiuj go.
3. Znajdź ID kanału: w repozytorium Actions → uruchom ręcznie albo lokalnie `BUFFER_API_KEY=... node news/build/share.mjs --channels` – wypisze kanały i ich ID.
4. GitHub → repozytorium → Settings → Secrets and variables → Actions → New repository secret:
   - `BUFFER_API_KEY` – klucz z kroku 2
   - `BUFFER_CHANNEL_ID` – ID kanału X z kroku 3
5. W Bufferze ustaw grafik publikacji (posting schedule) dla kanału X – posty z kolejki wychodzą w tych godzinach.

**Dobrze wiedzieć:**
- Pierwsze uruchomienie tylko zapamiętuje istniejące artykuły (nic nie wysyła), żeby nie zalać profilu starymi wpisami.
- Wysyłane są artykuły z ostatnich 48 h; max 3 na jedno uruchomienie.
- Lista wysłanych jest w `news/build/shared.json` – nie ruszaj tego pliku.
- Bez sekretów skrypt po prostu nic nie robi, strona działa normalnie.
- Tryb publikacji można zmienić zmienną `BUFFER_MODE` (domyślnie `addToQueue`).
