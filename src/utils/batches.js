import { uid } from "./helpers";

/*
 * ETAP 1 — fundament danych dla śledzenia pochodzenia roślin (Batch/BatchSegment).
 *
 * Batch (partia) = tożsamość pochodzenia. Nigdy sama nie trzyma ilości ani kosztu —
 * to suma jej aktywnych segmentów. Powstaje przy zakupie, przy podziale/rozmnażaniu
 * (z parentBatchId wskazującym partię/segment źródłowy) lub przy korekcie bez
 * znanego pochodzenia.
 *
 * BatchSegment (segment) = fizyczne miejsce, w którym aktualnie znajduje się część
 * partii: konkretny gatunek + pojemnik + (opcjonalnie) lokalizacja, z własną ilością
 * i własnym kosztem jednostkowym. Jedna partia może mieć wiele aktywnych segmentów
 * naraz (różne pojemniki/lokalizacje).
 *
 * WAŻNE: ten moduł NIE dotyka istniejącego `inventory` ani `costs` w App.jsx.
 * To osobna, równoległa struktura — na tym etapie nieużywana przez żaden ekran.
 */

function nowIso() {
  return new Date().toISOString();
}

function historyEvent(typ, opis, dane) {
  return { id: uid("hev"), ts: nowIso(), typ, opis, dane: dane || null };
}

/** Średnia ważona kosztu jednostkowego przy łączeniu dwóch ilości tego samego gatunku/pojemnika. */
export function weightedCost(qtyA, costA, qtyB, costB) {
  const totalQty = Number(qtyA || 0) + Number(qtyB || 0);
  if (totalQty <= 0) return 0;
  const raw = (Number(qtyA || 0) * Number(costA || 0) + Number(qtyB || 0) * Number(costB || 0)) / totalQty;
  return Math.round(raw * 100) / 100;
}

/* ------------------------------- Batch -------------------------------- */

/**
 * Tworzy nową partię. `source.type`: "zakup" | "podzial" | "korekta".
 * `initialQty` jest niezmienne po założeniu — to referencja do liczenia
 * wydajności rozmnażania w przyszłości, nie bieżący stan.
 */
function slugify(text) {
  return (text || "")
    .trim()
    .toUpperCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24);
}

/*
 * ZMIANA (na życzenie użytkownika): kod partii nadawany po dacie +
 * opcjonalnym opisie użytkownika, zamiast gołego licznika #N — te
 * identyfikatory trafiają na Paszporty Roślin (pole C), gdzie muszą mieć
 * czytelną logikę. Format: RRRRMMDD-N (N = kolejny numer TEGO DNIA, dla
 * jednoznaczności gdy powstaje kilka partii jednego dnia) + opcjonalnie
 * "-OPIS" (slug z opisu podanego przez użytkownika). Stare pole `numer`
 * zostaje zachowane jako wewnętrzny fallback; `batchLabel()` w UI
 * preferuje `kod`, potem `numer`, potem techniczne ID.
 */
export function createBatch({ tenantId, plantId, source, initialQty, opis, existingBatches, customLabel }) {
  const numer = Math.max(0, ...(existingBatches || []).map((b) => Number(b.numer) || 0)) + 1;
  const now = nowIso();
  const dateStr = now.slice(0, 10).replace(/-/g, "");
  const sameDay = (existingBatches || []).filter((b) => (b.createdAt || "").slice(0, 10) === now.slice(0, 10));
  const dailySeq = sameDay.length + 1;
  const slug = slugify(customLabel);
  const kod = `${dateStr}-${dailySeq}${slug ? `-${slug}` : ""}`;
  const batch = {
    id: uid("batch"),
    numer,
    kod,
    customLabel: customLabel || "",
    tenantId,
    plantId,
    source: source || { type: "zakup", parentBatchId: null, parentSegmentId: null },
    initialQty: Number(initialQty || 0),
    createdAt: now,
    status: "aktywna",
    closedAt: null,
    historia: [],
  };
  batch.historia.push(historyEvent("zalozenie", opis || `Założono partię (${batch.source.type}).`, { source: batch.source, initialQty: batch.initialQty }));
  return batch;
}

/** Zamyka partię, jeśli WSZYSTKIE jej segmenty (w przekazanej liście) mają ilość 0 / status zamknięty. Nie mutuje wejścia. */
export function closeBatchIfAllSegmentsEmpty(batch, allSegments) {
  if (!batch || batch.status === "zamknieta") return batch;
  const own = allSegments.filter((s) => s.batchId === batch.id);
  if (own.length === 0) return batch; // brak segmentów — nie ma czego zamykać
  const allEmpty = own.every((s) => s.status === "zamkniety" || Number(s.ilosc || 0) <= 0);
  if (!allEmpty) return batch;
  return {
    ...batch,
    status: "zamknieta",
    closedAt: nowIso(),
    historia: [...batch.historia, historyEvent("zamkniecie", "Zamknięto partię — wszystkie segmenty wyzerowane.")],
  };
}

/* ----------------------------- BatchSegment ----------------------------- */

export function createSegment({ tenantId, batchId, plantId, container, location, ilosc, kosztJednostkowy, originEventOpis, originEventDane, jakosc }) {
  const segment = {
    id: uid("seg"),
    tenantId,
    batchId,
    plantId,
    container,
    location: location || null,
    ilosc: Number(ilosc || 0),
    kosztJednostkowy: Math.round(Number(kosztJednostkowy || 0) * 100) / 100,
    jakosc: jakosc || null,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    status: "aktywny",
    closedAt: null,
    historia: [],
  };
  segment.historia.push(historyEvent("zalozenie", originEventOpis || "Utworzono segment.", originEventDane));
  return segment;
}

export const SEGMENT_QUALITY_VALUES = ["dobra", "do_obserwacji", "slaba"];

/*
 * ROADMAPA (SHOULD HAVE, pkt 11): opcjonalny status jakości segmentu —
 * pomaga wychwycić problem zanim zmieni się w stratę. Świadomie NIE
 * dotyka `updatedAt` (w przeciwieństwie do wszystkich innych mutacji
 * segmentu) — oznaczenie jakości to obserwacja, nie operacja fizyczna na
 * roślinach, więc segment ma dalej liczyć się jako "bez ruchu" w ekranie
 * Zaległości, jeśli faktycznie nic z nim nie zrobiono.
 */
export function setSegmentQuality({ segments, segmentId, jakosc }) {
  const segment = segments.find((s) => s.id === segmentId);
  if (!segment) return { ok: false, error: "Nie znaleziono segmentu.", segments };
  if (jakosc !== null && !SEGMENT_QUALITY_VALUES.includes(jakosc)) {
    return { ok: false, error: "Nieprawidłowa wartość jakości.", segments };
  }
  const updated = {
    ...segment,
    jakosc,
    historia: [...segment.historia, historyEvent("jakosc", `Oznaczono jakość: ${jakosc || "brak"}.`, { jakosc })],
  };
  return { ok: true, segments: segments.map((s) => (s.id === segmentId ? updated : s)) };
}

/** Zamyka segment, jeśli ilość spadła do zera (lub poniżej przez błąd zaokrągleń). Nie mutuje wejścia. */
export function closeSegmentIfEmpty(segment) {
  if (!segment || segment.status === "zamkniety") return segment;
  if (Number(segment.ilosc || 0) > 0) return segment;
  return { ...segment, status: "zamkniety", closedAt: nowIso(), historia: [...segment.historia, historyEvent("zamkniecie", "Segment wyzerowany.")] };
}

export function findActiveSegment(segments, { batchId, container, location }) {
  return segments.find(
    (s) => s.batchId === batchId && s.container === container && (s.location || null) === (location || null) && s.status === "aktywny"
  );
}

/* ------------------------------ Operacje ------------------------------- */

/**
 * PRZESADZENIE (częściowe lub całkowite) w obrębie TEJ SAMEJ partii.
 * Nie tworzy nowej partii. Ilość łączna partii się nie zmienia — przenosi się
 * tylko między jej segmentami. Jeśli w partii istnieje już aktywny segment
 * w pojemniku/lokalizacji docelowej, ilości i koszty się łączą (średnia ważona);
 * w przeciwnym razie powstaje nowy segment.
 *
 * `extraCostPerUnit` — koszt nowego pojemnika/podłoża na sztukę (liczony przez
 * wywołującego na podstawie Receptury — ten moduł świadomie tego nie zna).
 *
 * Zwraca { ok, error, segments, sourceSegmentId, targetSegmentId }.
 */
export function transplantSegment({ segments, sourceSegmentId, ilosc, toContainer, toLocation = null, extraCostPerUnit = 0 }) {
  const source = segments.find((s) => s.id === sourceSegmentId);
  if (!source) return { ok: false, error: "Nie znaleziono segmentu źródłowego.", segments };
  const qty = Number(ilosc || 0);
  if (qty <= 0) return { ok: false, error: "Ilość do przesadzenia musi być większa od zera.", segments };
  if (qty > Number(source.ilosc || 0)) return { ok: false, error: "Ilość do przesadzenia przekracza stan segmentu źródłowego.", segments };
  if (toContainer === source.container && (toLocation || null) === (source.location || null)) {
    return { ok: false, error: "Pojemnik i lokalizacja docelowa są takie same jak źródłowe.", segments };
  }

  const newUnitCost = Math.round((Number(source.kosztJednostkowy || 0) + Number(extraCostPerUnit || 0)) * 100) / 100;
  const existingTarget = findActiveSegment(segments, { batchId: source.batchId, container: toContainer, location: toLocation });

  // ETAP 6: targetSegmentId jest znany PRZED zbudowaniem historii źródła,
  // żeby oba wpisy historii (źródłowy i docelowy) mogły wzajemnie się
  // referencjonować — pozwala to później w pełni odtworzyć operację:
  // skąd → dokąd, ile, kiedy, jaki batch, jaki segment źródłowy/docelowy.
  const targetSegmentId = existingTarget ? existingTarget.id : uid("seg");
  const commonDane = {
    batchId: source.batchId,
    ilosc: qty,
    zSegmentu: source.id,
    doSegmentu: targetSegmentId,
    zContainer: source.container,
    zLocation: source.location || null,
    doContainer: toContainer,
    doLocation: toLocation || null,
  };

  let sourceUpdated = {
    ...source,
    ilosc: Number(source.ilosc || 0) - qty,
    updatedAt: nowIso(),
    historia: [
      ...source.historia,
      historyEvent("przesadzenie_z", `Przesadzono ${qty} szt. ${source.container}${source.location ? ` (${source.location})` : ""} → ${toContainer}${toLocation ? ` (${toLocation})` : ""}.`, commonDane),
    ],
  };
  sourceUpdated = closeSegmentIfEmpty(sourceUpdated);

  let next;
  if (existingTarget) {
    const blendedCost = weightedCost(existingTarget.ilosc, existingTarget.kosztJednostkowy, qty, newUnitCost);
    const targetUpdated = {
      ...existingTarget,
      ilosc: Number(existingTarget.ilosc || 0) + qty,
      kosztJednostkowy: blendedCost,
      updatedAt: nowIso(),
      historia: [
        ...existingTarget.historia,
        historyEvent("przesadzenie_do", `Przyjęto ${qty} szt. z segmentu ${source.id} (${source.container}${source.location ? `, ${source.location}` : ""}).`, commonDane),
      ],
    };
    next = segments.map((s) => (s.id === sourceUpdated.id ? sourceUpdated : s.id === targetUpdated.id ? targetUpdated : s));
  } else {
    const created = createSegment({
      tenantId: source.tenantId,
      batchId: source.batchId,
      plantId: source.plantId,
      container: toContainer,
      location: toLocation,
      ilosc: qty,
      kosztJednostkowy: newUnitCost,
      originEventOpis: `Utworzono przez przesadzenie ${qty} szt. z segmentu ${source.id} (${source.container}${source.location ? `, ${source.location}` : ""}).`,
      originEventDane: commonDane,
    });
    // createSegment generuje własne id przez uid("seg") — nadpisujemy je
    // wcześniej wygenerowanym targetSegmentId, żeby zgadzało się z tym,
    // które zostało zapisane w historii segmentu źródłowego.
    const createdWithId = { ...created, id: targetSegmentId };
    next = segments.map((s) => (s.id === sourceUpdated.id ? sourceUpdated : s)).concat(createdWithId);
  }

  return { ok: true, segments: next, sourceSegmentId: sourceUpdated.id, targetSegmentId };
}

/**
 * PODZIAŁ / ROZMNAŻANIE — zawsze tworzy NOWĄ partię (potomną), z parentBatchId
 * wskazującym partię/segment źródłowy. `zrodloUbytek` to ilość odejmowana od
 * segmentu źródłowego: 0 dla rośliny matecznej, która nie ubywa (model A),
 * pełna ilość segmentu dla całkowicie dzielonej doniczki (model B).
 *
 * `nowePozycje`: [{ container, location, ilosc, kosztJednostkowy }] — koszt
 * każdej nowej pozycji liczy wywołujący (na podstawie Receptury) i przekazuje
 * gotowy — ten moduł nie zna kosztów pojemników.
 *
 * Zwraca { ok, error, batches, segments, newBatchId }.
 */
export function divideSegment({ batches, segments, sourceSegmentId, zrodloUbytek = 0, nowePozycje, tenantId, opis }) {
  const source = segments.find((s) => s.id === sourceSegmentId);
  if (!source) return { ok: false, error: "Nie znaleziono segmentu źródłowego.", batches, segments };
  const ubytek = Number(zrodloUbytek || 0);
  if (ubytek < 0 || ubytek > Number(source.ilosc || 0)) {
    return { ok: false, error: "Nieprawidłowy ubytek segmentu źródłowego.", batches, segments };
  }
  const pozycje = (nowePozycje || []).filter((p) => Number(p.ilosc || 0) > 0);
  if (pozycje.length === 0) return { ok: false, error: "Podaj przynajmniej jedną nową pozycję z ilością większą od zera.", batches, segments };

  const totalNewQty = pozycje.reduce((s, p) => s + Number(p.ilosc || 0), 0);

  const newBatch = createBatch({
    tenantId: tenantId || source.tenantId,
    plantId: source.plantId,
    source: { type: "podzial", parentBatchId: source.batchId, parentSegmentId: source.id },
    initialQty: totalNewQty,
    opis: opis || `Powstała z podziału segmentu ${source.id} (partia ${source.batchId}).`,
    existingBatches: batches,
  });

  const newSegments = pozycje.map((p) =>
    createSegment({
      tenantId: tenantId || source.tenantId,
      batchId: newBatch.id,
      plantId: source.plantId,
      container: p.container,
      location: p.location || null,
      ilosc: p.ilosc,
      kosztJednostkowy: p.kosztJednostkowy,
      originEventOpis: `Podział: ${p.ilosc} szt. z segmentu ${source.id}.`,
      originEventDane: { zSegmentu: source.id, zPartii: source.batchId },
    })
  );

  let sourceUpdated = {
    ...source,
    ilosc: Number(source.ilosc || 0) - ubytek,
    updatedAt: nowIso(),
    historia: [
      ...source.historia,
      historyEvent("podzial_zrodlo", `Podział: -${ubytek} szt. → nowa partia ${newBatch.id} (${totalNewQty} szt.).`, { ubytek, doPartii: newBatch.id, nowaIlosc: totalNewQty }),
    ],
  };
  sourceUpdated = closeSegmentIfEmpty(sourceUpdated);

  let nextSegments = segments.map((s) => (s.id === sourceUpdated.id ? sourceUpdated : s)).concat(newSegments);
  let nextBatches = batches.concat(newBatch);

  const sourceBatch = nextBatches.find((b) => b.id === source.batchId);
  if (sourceBatch) {
    const maybeClosedSourceBatch = closeBatchIfAllSegmentsEmpty(sourceBatch, nextSegments);
    nextBatches = nextBatches.map((b) => (b.id === maybeClosedSourceBatch.id ? maybeClosedSourceBatch : b));
  }

  return { ok: true, batches: nextBatches, segments: nextSegments, newBatchId: newBatch.id };
}

/** Sprzedaż z segmentu — pomniejsza ilość, loguje koszt/cenę, zamyka segment i (jeśli trzeba) partię. */
/*
 * ETAP 7: rdzeń współdzielony przez stratę / usunięcie / ujemną korektę
 * inwentaryzacyjną — mechanicznie to zawsze to samo (pomniejszenie ilości
 * aktywnego segmentu, bez zmiany kosztu jednostkowego, zamknięcie segmentu/
 * partii jeśli trzeba), różni je tylko `typ` zdarzenia historii i kształt
 * zapisywanych danych. Zgodnie z wymogiem „nie przebudowuj modelu, wykorzystaj
 * istniejącą kategorię zdarzenia” — jeden mechanizm, trzy cienkie wrappery.
 */
function decreaseSegment({ batches, segments, segmentId, ilosc, typ, opis, dane }) {
  const segment = segments.find((s) => s.id === segmentId);
  if (!segment) return { ok: false, error: "Nie znaleziono segmentu.", batches, segments };
  const qty = Number(ilosc || 0);
  if (qty <= 0 || qty > Number(segment.ilosc || 0)) return { ok: false, error: "Nieprawidłowa ilość.", batches, segments };

  let updated = {
    ...segment,
    ilosc: Number(segment.ilosc || 0) - qty,
    updatedAt: nowIso(),
    historia: [...segment.historia, historyEvent(typ, opis, dane)],
  };
  updated = closeSegmentIfEmpty(updated);
  let nextSegments = segments.map((s) => (s.id === updated.id ? updated : s));

  let nextBatches = batches;
  const batch = batches.find((b) => b.id === segment.batchId);
  if (batch) {
    const maybeClosed = closeBatchIfAllSegmentsEmpty(batch, nextSegments);
    nextBatches = batches.map((b) => (b.id === maybeClosed.id ? maybeClosed : b));
  }
  return { ok: true, batches: nextBatches, segments: nextSegments };
}

/** Strata z segmentu — roślina zginęła/została utracona. Nie zmienia kosztu jednostkowego pozostałych sztuk. */
export function recordSegmentLoss({ batches, segments, segmentId, ilosc, powod, komentarz }) {
  const segment = segments.find((s) => s.id === segmentId);
  const qty = Number(ilosc || 0);
  const wartosc = segment ? Math.round(qty * Number(segment.kosztJednostkowy || 0) * 100) / 100 : 0;
  return decreaseSegment({
    batches, segments, segmentId, ilosc,
    typ: "strata",
    opis: `Strata: ${qty} szt. — ${powod || "brak podanego powodu"}.${komentarz ? ` (${komentarz})` : ""}`,
    dane: { ilosc: qty, powod: powod || null, komentarz: komentarz || null, wartosc },
  });
}

/** Usunięcie z segmentu — świadoma decyzja użytkownika (NIE strata biologiczna, NIE rozmnożenie). */
export function recordSegmentRemoval({ batches, segments, segmentId, ilosc, powod, komentarz }) {
  const qty = Number(ilosc || 0);
  return decreaseSegment({
    batches, segments, segmentId, ilosc,
    typ: "usuniecie",
    opis: `Usunięcie: ${qty} szt. — ${powod || "brak podanego powodu"}.${komentarz ? ` (${komentarz})` : ""}`,
    dane: { ilosc: qty, powod: powod || null, komentarz: komentarz || null },
  });
}

/** Ujemna korekta inwentaryzacyjna segmentu — stan fizyczny niższy niż systemowy. Nie zmienia kosztu jednostkowego. */
export function recordSegmentInventoryCorrection({ batches, segments, segmentId, stanSystemowy, stanFizyczny, powod }) {
  const roznica = Number(stanFizyczny || 0) - Number(stanSystemowy || 0);
  const ubytek = Math.abs(roznica);
  return decreaseSegment({
    batches, segments, segmentId, ilosc: ubytek,
    typ: "inwentaryzacja_korekta",
    opis: `Inwentaryzacja: ${roznica} szt. Stan systemowy: ${stanSystemowy}. Stan fizyczny: ${stanFizyczny}. Powód: ${powod || "brak podanego powodu"}.`,
    dane: { stanSystemowy: Number(stanSystemowy || 0), stanFizyczny: Number(stanFizyczny || 0), roznica, powod: powod || null },
  });
}

export function recordSegmentSale({ batches, segments, segmentId, ilosc, cena, orderId }) {
  const segment = segments.find((s) => s.id === segmentId);
  if (!segment) return { ok: false, error: "Nie znaleziono segmentu.", batches, segments };
  const qty = Number(ilosc || 0);
  if (qty <= 0 || qty > Number(segment.ilosc || 0)) return { ok: false, error: "Nieprawidłowa ilość sprzedaży.", batches, segments };

  const kosztCalosci = Math.round(qty * Number(segment.kosztJednostkowy || 0) * 100) / 100;
  let updated = {
    ...segment,
    ilosc: Number(segment.ilosc || 0) - qty,
    updatedAt: nowIso(),
    historia: [...segment.historia, historyEvent("sprzedaz", `Sprzedano ${qty} szt.`, { ilosc: qty, cena: Number(cena || 0), koszt: kosztCalosci, orderId: orderId || null })],
  };
  updated = closeSegmentIfEmpty(updated);
  let nextSegments = segments.map((s) => (s.id === updated.id ? updated : s));

  let nextBatches = batches;
  const batch = batches.find((b) => b.id === segment.batchId);
  if (batch) {
    const maybeClosed = closeBatchIfAllSegmentsEmpty(batch, nextSegments);
    nextBatches = batches.map((b) => (b.id === maybeClosed.id ? maybeClosed : b));
  }
  return { ok: true, batches: nextBatches, segments: nextSegments };
}

/* ---------------------------- Agregacja --------------------------------- */

/**
 * BatchSegment → inventory. Czysta funkcja, NIEUŻYWANA jeszcze przez App.jsx —
 * przygotowana do podłączenia w kolejnym etapie. Sumuje ilości aktywnych
 * segmentów po gatunku i pojemniku, dokładnie w kształcie dzisiejszego `inventory`.
 */
export function aggregateSegmentsToInventory(segments) {
  const inventory = {};
  segments.forEach((s) => {
    if (s.status !== "aktywny" || Number(s.ilosc || 0) <= 0) return;
    if (!inventory[s.plantId]) inventory[s.plantId] = {};
    inventory[s.plantId][s.container] = Number(inventory[s.plantId][s.container] || 0) + Number(s.ilosc || 0);
  });
  return inventory;
}

/**
 * BatchSegment → costs (średnia ważona kosztu po aktywnych segmentach danego
 * gatunku/pojemnika). Tak samo: czysta funkcja, nieużywana jeszcze w App.jsx.
 */
export function aggregateSegmentsToCosts(segments) {
  const sums = {}; // plantId -> container -> { qty, value }
  segments.forEach((s) => {
    if (s.status !== "aktywny" || Number(s.ilosc || 0) <= 0) return;
    sums[s.plantId] = sums[s.plantId] || {};
    const cur = sums[s.plantId][s.container] || { qty: 0, value: 0 };
    cur.qty += Number(s.ilosc || 0);
    cur.value += Number(s.ilosc || 0) * Number(s.kosztJednostkowy || 0);
    sums[s.plantId][s.container] = cur;
  });
  const costs = {};
  Object.entries(sums).forEach(([plantId, byContainer]) => {
    costs[plantId] = {};
    Object.entries(byContainer).forEach(([container, { qty, value }]) => {
      costs[plantId][container] = qty > 0 ? Math.round((value / qty) * 100) / 100 : 0;
    });
  });
  return costs;
}

/* ----------------------------- Statystyki -------------------------------- */

function sumEventQty(historia, typ) {
  return historia
    .filter((h) => h.typ === typ)
    .reduce((sum, h) => sum + Number((h.dane && (h.dane.nowaIlosc ?? h.dane.ilosc)) || 0), 0);
}

/**
 * Statystyki jednej partii — WYŁĄCZNIE odczyt, nic nie modyfikuje i nic nie
 * zapisuje. `currentQty` liczone jest zawsze na żywo z aktywnych segmentów
 * (nie trzymamy go jako osobnego pola na Batch — jedno źródło prawdy).
 * `propagatedQty`/`lossQty`/`soldQty` sumują historię WSZYSTKICH segmentów
 * partii — aktywnych i zamkniętych, bo zamknięcie segmentu nie kasuje jego
 * historii, tylko oznacza wyzerowanie ilości.
 *
 * `propagatedQty` liczy tylko BEZPOŚREDNIE potomstwo tej partii (zdarzenia
 * "podzial_zrodlo" na jej własnych segmentach) — nie schodzi po parentBatchId
 * do partii wnuków. To świadome uproszczenie na ten etap.
 */
export function computeBatchStats(batch, allSegments) {
  const own = allSegments.filter((s) => s.batchId === batch.id);
  const active = own.filter((s) => s.status === "aktywny");
  const closed = own.filter((s) => s.status === "zamkniety");

  const currentQty = active.reduce((sum, s) => sum + Number(s.ilosc || 0), 0);
  const propagatedQty = own.reduce((sum, s) => sum + sumEventQty(s.historia, "podzial_zrodlo"), 0);
  const lossQty = own.reduce((sum, s) => sum + sumEventQty(s.historia, "strata"), 0);
  const soldQty = own.reduce((sum, s) => sum + sumEventQty(s.historia, "sprzedaz"), 0);

  return {
    initialQty: Number(batch.initialQty || 0),
    currentQty,
    propagatedQty,
    lossQty,
    soldQty,
    activeSegmentCount: active.length,
    closedSegmentCount: closed.length,
  };
}

/** Statystyki wszystkich partii naraz — mapa batchId → wynik computeBatchStats. Też wyłącznie odczyt. */
export function computeAllBatchStats(batches, segments) {
  const result = {};
  batches.forEach((b) => {
    result[b.id] = computeBatchStats(b, segments);
  });
  return result;
}
