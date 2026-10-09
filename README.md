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
  utils/storage.js            — lokalny zapis offline i synchronizacja
                                 zaszyfrowanych sesją użytkownika danych z Supabase
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

## Synchronizacja danych

Logowanie Supabase jest wymagane. Zaloguj się na to samo konto e-mail na
komputerze i telefonie, aby współdzielić rośliny, stany magazynowe, ustawienia
i zdjęcia. Zmiany są zapisywane lokalnie od razu; jeśli urządzenie jest offline,
zostaną wysłane do Supabase po odzyskaniu połączenia. Po przełączeniu na
urządzenie, które było w tle, aplikacja odświeża dane z bazy.

Przycisk **Cofnij** w nagłówku przywraca do 10 ostatnich zmian danych
operacyjnych. Historia cofania istnieje tylko w bieżącej karcie i znika po jej
odświeżeniu; zdjęcia nie są objęte cofaniem. Przywrócone dane zapisują się
normalnie i synchronizują z Supabase.

Na pulpicie jest też **Radar szkółki** z sezonowymi podpowiedziami. Można
dodać wybraną podpowiedź do listy zadań jednym kliknięciem; wskazówki należy
dopasować do pogody i wymagań konkretnych odmian.

**Centrum uwagi** na pulpicie zgłasza też niedobory konkretnych pojemników
względem łącznych potrzeb z niezrealizowanych zamówień, w tym pozycji
wchodzących w skład zestawów.

W zakładce **Etykiety** podgląd pokazuje ten sam układ co wydruk. Dla zwykłych
etykiet można wybierać widoczne pola i dopisać własny tekst. Paszport partii
zachowuje pola A/B/C/D, pozwala dodać własną notatkę i opcjonalny QR zawierający
te pola jako tekst do skanowania offline. Ustawienia etykiet synchronizują się
i trafiają do kopii zapasowej. Kod QR jest dodatkiem, nie zamiennikiem danych
wymaganych na paszporcie; przed użyciem handlowym zweryfikuj wzór z PIORiN.

W **Sprzedaż → Zestawy** projektant rabaty jest połączony z listą zestawów
sprzedażowych. Można podać powierzchnię w m² albo długość w metrach bieżących
i szerokość, filtrować odmiany według nasłonecznienia oraz zapisać kompozycję
jako zestaw dostępny przy tworzeniu zamówienia. Dobór uwzględnia maksymalną
szerokość dojrzałych roślin i zawęża listę przy kolejnych rzędach; orientacyjna
liczba sztuk jest liczona dla powierzchni przypisanej do rzędu. Można też
filtrować według wilgotności gleby; niejednoznaczne opisy katalogowe są
oznaczane do ręcznego sprawdzenia. To podpowiedź planistyczna, nie projekt
wykonawczy; przed sprzedażą sprawdź stan wybranego rozmiaru pojemnika.

Przed pierwszym użyciem uruchom zawartość `database/supabase.sql` w SQL Editor
projektu Supabase. Skrypt tworzy tabelę `app_data`, włącza Row Level Security i
ogranicza dostęp do danych do zalogowanego właściciela. Na urządzeniu, na którym
masz już dane lokalne, zaloguj się jako pierwszym: jego istniejące dane zostaną
zachowane i wysłane do bazy. Pozostałe urządzenia pobiorą je po zalogowaniu.

## Uruchomienie lokalne

```bash
npm install
npm run dev
```

Kod aplikacji publikuj przez push do gałęzi `main`; GitHub Actions wdraża nową
wersję na GitHub Pages. Zmiana schematu bazy wymaga osobnej migracji SQL i
uruchomienia jej w Supabase — sam push kodu nie zmienia bazy.

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
