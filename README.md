# Szkółka traw ozdobnych — projekt

Aplikacja rozbita na moduły z jednego pliku `Szkolka-Traw-App-9.jsx` na osobne
pliki źródłowe, żeby dało się nad nią dalej pracować bez przewijania tysięcy
linii jednego pliku.

## Struktura

```
src/
  data/plants.js              — katalog 26 odmian traw (dane, nie logika)
  constants.js                — MONTHS, DEFAULT_POT_SIZES, TASK_STATUS_META...
  utils/helpers.js            — czyste funkcje pomocnicze (bez Reacta)
  utils/storage.js            — warstwa zapisu: window.storage (Claude) lub
                                 localStorage (uruchomienie poza Claude)
  components/
    layout/                   — Header, BottomNav, GrassMark
    pulpit/                   — PulpitTab, TasksSection
    magazyn/                  — MagazynTab i 6 podpaneli (rośliny, podział,
                                 zaopatrzenie, straty, historia, rozmiary donic)
    harmonogram/               — HarmonogramTab i pomocnicze komponenty
    sprzedaz/                  — SprzedazTab: cennik, zestawy, zamówienia,
                                 klienci, raporty
    etykiety/                  — EtykietyTab (drukowanie etykiet)
    shared/PhotoThumb.jsx      — wspólny komponent zdjęcia rośliny
  styles/GlobalStyle.jsx       — cały CSS aplikacji (jeden komponent <style>)
  App.jsx                      — główny stan i logika łącząca wszystko
  main.jsx                     — punkt wejścia Reacta
```

## Uruchomienie lokalne (poza Claude)

```bash
npm install
npm run dev
```

Poza środowiskiem Claude Artifacts nie ma `window.storage`, więc `utils/storage.js`
automatycznie przełącza się na `localStorage` o identycznym kształcie API —
reszta aplikacji tego nie zauważa.

## Co zmieniło się względem oryginału (v9)

- **Zapis skonsolidowany do 3 kluczy** (`core-data`, `config-data`,
  `activity-data`) zamiast ~17 osobnych — mniej równoległych zapisów,
  mniejsze ryzyko trafienia w limit zapytań.
- **Zdjęcia roślin** zapisywane pojedynczo pod `photo:{id}` zamiast jednego
  wspólnego blobu — nie zbliża się do limitu 5MB na klucz przy większej
  liczbie zdjęć.
- **Realizacja zamówienia** ostrzega, jeśli stan magazynowy jest niższy niż
  zamówiona ilość, zamiast po cichu przycinać do zera.
- **Import kopii zapasowej** waliduje, że plik jest obiektem JSON zawierającym
  rozpoznawalne pola, zanim nadpisze dane.
- **Usuwanie materiału zaopatrzenia i własnej odmiany rośliny** wymaga teraz
  potwierdzenia, tak jak usuwanie klientów/zamówień/strat.

Cała logika biznesowa (podział, koszty, magazyn, zamówienia) jest
niezmieniona — to sam podział na pliki + wymienione poprawki.
