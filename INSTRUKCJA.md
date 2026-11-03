# Śliska News – wgrywanie na GitHub

1. Wgraj do repozytorium (tego, z którego działa sliska.pl) cały folder `news` – z podmianą istniejących plików.
2. Jeśli w repozytorium został plik `.github/workflows/news-build.yml` (dawny automat tworzący strony artykułów), usuń go:
   na GitHubie wejdź w plik → ikona kosza → „Commit changes". Bez tego GitHub dalej będzie wysyłał maile o błędach.
3. Gotowe. Artykuły dodajesz w edytorze na sliska.pl/news – od razu są widoczne dla wszystkich (zapisują się w bazie Firebase,
   a repozytorium zmienia się tylko wtedy, gdy podmieniasz pliki strony).

Przycisk „Post IG" (obok „Edytuj") pobiera grafikę 1080×1350 i kopiuje opis posta do schowka.

---

## Wersje robocze tylko dla właściciela

Każda wersja robocza zapisuje identyfikator redaktora, który ją utworzył, a panel pokazuje tylko jego własne. Żeby to było wymuszone
także po stronie bazy (a nie tylko w wyglądzie strony), zmień w Firebase → Firestore → Reguły fragment dotyczący `drafts`:

```
match /drafts/{id} {
  allow read:   if request.auth != null && (resource == null || resource.data.ownerUid == request.auth.uid);
  allow create: if request.auth != null && request.resource.data.ownerUid == request.auth.uid;
  allow update: if request.auth != null && resource.data.ownerUid == request.auth.uid
                                        && request.resource.data.ownerUid == request.auth.uid;
  allow delete: if request.auth != null && resource.data.ownerUid == request.auth.uid;
}
```

(Reszta reguł – artykuły, zgłoszenia, `meta` – zostaje bez zmian.) Wersje robocze utworzone przed tą zmianą nie mają właściciela,
więc znikną z panelu; jeśli coś w nich było potrzebne, dokończ to przed wgraniem nowej wersji.

---

## Osobny profil (nazwa i zdjęcie) dla każdego konta

Profil zapisuje się teraz osobno dla każdego redaktora, w dokumencie `meta/profile_<identyfikator konta>`.
Dotychczasowy wspólny profil dostaje tylko pierwsze konto (identyfikator w `CONFIG.LEGACY_PROFILE_UID` w `app.js`);
nowe konta zaczynają z pustym profilem i ustawiają swój w „Ustawieniach".

Jeśli w regułach Firestore dokument `meta/profile` był wymieniony z nazwy, zamień ten fragment na:

```
match /meta/{docId} {
  allow read:  if request.auth != null;
  allow write: if request.auth != null && docId == ('profile_' + request.auth.uid);
}
```

## Aplikacja na telefon (PWA)
Do folderu `news/` doszły: `sw.js`, nowe ikony w `icons/` oraz ekrany startowe w `icons/splash/`. Wrzuć cały folder `news/` (z podfolderami). Po wdrożeniu na Androidzie w stopce pojawi się „Zainstaluj aplikację”, na iPhonie – podpowiedź „Do ekranu początkowego”. Starą ikonę z ekranu głównego telefonu trzeba usunąć i dodać ponownie, żeby pokazała się nowa.

## Osobny podgląd linku dla każdego artykułu (opcjonalnie)

Na hostingu statycznym adresy z `#` nie mają własnego podglądu, więc potrzebny jest mały Cloudflare Worker (darmowy plan wystarczy).

1. **Reguły Firestore** – dodaj kolekcję `og` (odczyt publiczny, zapis tylko dla zalogowanych):
   ```
   match /og/{id} {
     allow read: if true;
     allow write: if isEditor();
   }
   ```
   (Kolekcja `articles` musi mieć publiczny odczyt – tak jak teraz.)
2. **Cloudflare** – domena `sliska.pl` musi używać serwerów nazw Cloudflare (rekordy przez proxy – pomarańczowa chmurka). Workers → Create → wklej `og-worker.js` → Deploy.
3. **Trasy (Routes)** – dodaj `sliska.pl/news/a/*` oraz `sliska.pl/news/og/*` i przypisz do workera.
4. W `app.js` jest już ustawione `OG_WORKER: true`. Linki do udostępniania będą wtedy miały postać `sliska.pl/news/a/<id>`.
5. Zaloguj się, wejdź w *Robocze i zaplanowane* → **Podglądy linków** → „Wygeneruj podglądy dla wszystkich artykułów”. Nowe i edytowane artykuły robią to same.
6. Test: wklej link w Facebook Sharing Debugger (developers.facebook.com/tools/debug) i kliknij „Scrape Again”. Facebook i Messenger trzymają stary podgląd w pamięci podręcznej.
