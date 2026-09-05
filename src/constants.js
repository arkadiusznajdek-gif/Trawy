export const MONTHS = ["", "Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec", "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień"];
export const ROMAN_BY_MONTH = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
export const DEFAULT_POT_SIZES = ["P9", "C3", "C5"];
export const PHOTO_MAX_W = 380;
export const PHOTO_QUALITY = 0.55;
export const LOSS_REASONS = ["Choroba", "Wymarznięcie", "Susza", "Uszkodzenie mechaniczne", "Szkodniki", "Przesuszenie", "Nadmiar wody", "Nieprzyjęcie się", "Inne"];
export const DEFAULT_SUPPLIES = [
  { id: "sup-p9", nazwa: "Donice P9 (puste)", ilosc: 0, jednostka: "szt.", prog: null, cena: 0, typ: "donica", rozmiar: "P9" },
  { id: "sup-c3", nazwa: "Donice C3 (puste)", ilosc: 0, jednostka: "szt.", prog: null, cena: 0, typ: "donica", rozmiar: "C3" },
  { id: "sup-c5", nazwa: "Donice C5 (puste)", ilosc: 0, jednostka: "szt.", prog: null, cena: 0, typ: "donica", rozmiar: "C5" },
  { id: "sup-podloze", nazwa: "Podłoże uniwersalne", ilosc: 0, jednostka: "l", prog: null, cena: 0, typ: "podloze", rozmiar: null },
];

export const TAB_TITLES = {
  pulpit: "Pulpit",
  magazyn: "Magazyn",
  harmonogram: "Harmonogram prac",
  sprzedaz: "Sprzedaż",
  etykiety: "Etykiety",
};

export const TASK_STATUS_META = {
  todo: { label: "Do zrobienia", cls: "status-todo" },
  progress: { label: "W trakcie", cls: "status-progress" },
  done: { label: "Gotowe", cls: "status-done" },
};

/**
 * Identyfikator "dzierżawcy" (docelowo: jednej szkółki w wielu obsługiwanych przez SaaS).
 * Na tym etapie aplikacja jest jednoużytkownikowa — wszystkie dane partii/segmentów
 * są znakowane tą samą, stałą wartością. To wyłącznie fundament pod przyszłość:
 * nie ma dziś żadnego mechanizmu przełączania ani logowania się na różne dzierżawy.
 * Istniejące klucze zapisu (core-data/config-data/activity-data/photo:*) CELOWO
 * pozostają bez tego prefiksu, żeby nie zerwać już zapisanych danych użytkownika.
 */
export const DEFAULT_TENANT_ID = "default-tenant";
