// Funkcje pomocnicze — czyste, bez zależności od Reacta ani storage.
import { MONTHS } from "../constants";
/** Sugerowana ilość sztuk na podstawie gęstości nasadzeń zapisanej przy odmianie. mode: "mb" (metry bieżące rzędu) lub "m2" (powierzchnia). */
export function suggestPlantingQty(plant, mode, value) {
  const v = Number(value);
  if (!plant || !v || v <= 0 || plant.gestosc_brak) return null;
  if (mode === "mb") {
    const { gestosc_rozstaw_cm_min: rMin, gestosc_rozstaw_cm_max: rMax } = plant;
    if (!rMin || !rMax) return null;
    const cm = v * 100;
    const max = Math.ceil(cm / rMin);
    const min = Math.floor(cm / rMax);
    return { min: Math.max(1, min), max: Math.max(1, max) };
  }
  if (mode === "m2") {
    const { gestosc_m2_min: mMin, gestosc_m2_max: mMax } = plant;
    if (mMin == null || mMax == null) return null;
    return { min: Math.max(1, Math.round(v * mMin)), max: Math.max(1, Math.round(v * mMax)) };
  }
  return null;
}
export function containerLabel(c) { return c === "grunt" ? "Grunt" : c; }
export function uid(prefix) {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}
export function resolveContainers(plantContainerSizes, catalog, plantId) {
  const arr = plantContainerSizes[plantId];
  return arr && arr.length ? arr : catalog;
}
export function resolvePotContainers(plantContainerSizes, potSizes, plantId) {
  const catalog = [...potSizes, "grunt"];
  return resolveContainers(plantContainerSizes, catalog, plantId).filter((c) => c !== "grunt");
}
export function costOfContainer(potRecipes, substrateCostPerL, size) {
  const r = potRecipes[size];
  if (!r) return 0;
  return Number(r.koszt_donicy || 0) + Number(r.podloze_l || 0) * Number(substrateCostPerL || 0);
}
export function findSupplyByContainer(supplies, size) {
  const typed = supplies.find((s) => s.typ === "donica" && s.rozmiar === size);
  if (typed) return typed;
  return supplies.find((s) => !s.typ && s.nazwa.toLowerCase().includes(size.toLowerCase()));
}
export function findSubstrateSupply(supplies) {
  const typed = supplies.find((s) => s.typ === "podloze");
  if (typed) return typed;
  return supplies.find((s) => { const n = s.nazwa.toLowerCase(); return !s.typ && (n.includes("podłoż") || n.includes("podloz")); });
}
/** Rozmiary pojemników wynikają z materiałów typu "donica" w Zaopatrzeniu (kolejność pierwszego wystąpienia). */
export function deriveContainerSizes(supplies) {
  const sizes = [];
  supplies.forEach((s) => {
    if (s.typ === "donica" && s.rozmiar && !sizes.includes(s.rozmiar)) sizes.push(s.rozmiar);
  });
  return sizes;
}
/** Migracja starszych zapisów materiałów bez pól typ/rozmiar — dopasowuje po nazwie, nic nie gubi. */
export function migrateSupplies(rawSupplies, legacySizes) {
  const known = legacySizes && legacySizes.length ? legacySizes : [];
  let changed = false;
  const migrated = (rawSupplies || []).map((s) => {
    if (s.typ) return s;
    changed = true;
    const n = s.nazwa.toLowerCase();
    if (n.includes("podłoż") || n.includes("podloz")) return { ...s, typ: "podloze", rozmiar: null, cena: s.cena ?? 0 };
    const matched = known.find((sz) => n.includes(sz.toLowerCase()));
    if (matched) return { ...s, typ: "donica", rozmiar: matched, cena: s.cena ?? 0 };
    return { ...s, typ: "inne", rozmiar: null, cena: s.cena ?? 0 };
  });
  known.forEach((sz) => {
    const has = migrated.some((s) => s.typ === "donica" && s.rozmiar === sz);
    if (!has) {
      changed = true;
      migrated.push({ id: uid("sup"), nazwa: `Donice ${sz} (puste)`, ilosc: 0, jednostka: "szt.", prog: null, cena: 0, typ: "donica", rozmiar: sz });
    }
  });
  return { supplies: migrated, changed };
}
export function money(n) {
  const v = Number(n);
  return (Number.isFinite(v) ? v : 0).toFixed(2);
}
export function clampInt(v, min = 0) {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n)) return min;
  return Math.max(min, n);
}
export function monthsToRomanText(months) {
  return months.map((m) => ROMAN_BY_MONTH[m]).join("/");
}
export function monthKey(year, month) { return `${year}-${month}`; }
export function taskKey(year, month, plantId, type) { return `${year}-${month}-${plantId}-${type}`; }
export function formatLogTime(ts) {
  const d = new Date(ts);
  return d.toLocaleString("pl-PL", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}
/*
 * ROADMAPA (SHOULD HAVE, pkt 9): rentowność z realnego kosztu sprzedaży.
 * Dotąd COGS liczony był zawsze z BIEŻĄCEGO agregatu costs[...], niezależnie
 * od tego, kiedy sprzedaż faktycznie miała miejsce — więc zmiana kosztu
 * dziś retroaktywnie przeliczała zyski sprzed miesięcy. Od etapu 9
 * `recordSegmentSale` zapisuje w historii segmentu prawdziwy koszt z
 * MOMENTU sprzedaży (`dane.koszt`) — ta funkcja go wykorzystuje tam, gdzie
 * jest dostępny, a dla ilości nieobjętej żadnym segmentem (towar "gołęobsłużony
 * spoza partii, legalny stan od etapu 4) spada do starego zachowania
 * (bieżący agregat) — dokładnie ta sama zasada uczciwego rozróżnienia
 * "znane/nieznane", co w ekranie "Co mam gdzie".
 */
export function orderCogsBreakdown(order, zestawy, costs, batchSegments) {
  const needed = {}; // plantId -> container -> ilosc
  function addNeed(plantId, container, qty) {
    needed[plantId] = needed[plantId] || {};
    needed[plantId][container] = (needed[plantId][container] || 0) + qty;
  }
  (order.pozycje || []).forEach((it) => {
    if (it.kind === "plant") {
      addNeed(it.plantId, it.container, Number(it.ilosc || 0));
    } else if (it.kind === "zestaw") {
      const z = zestawy.find((zz) => zz.id === it.zestawId);
      if (z) (z.pozycje || []).forEach((comp) => addNeed(comp.plantId, comp.container, Number(comp.ilosc || 0) * Number(it.ilosc || 0)));
    }
  });

  const soldFromSegments = {}; // plantId -> container -> { ilosc, koszt }
  (batchSegments || []).forEach((s) => {
    (s.historia || []).forEach((h) => {
      if (h.typ !== "sprzedaz" || h.dane?.orderId !== order.id) return;
      soldFromSegments[s.plantId] = soldFromSegments[s.plantId] || {};
      const row = soldFromSegments[s.plantId][s.container] || { ilosc: 0, koszt: 0 };
      row.ilosc += Number(h.dane.ilosc || 0);
      row.koszt += Number(h.dane.koszt || 0);
      soldFromSegments[s.plantId][s.container] = row;
    });
  });

  const rows = [];
  Object.entries(needed).forEach(([plantId, row]) => {
    Object.entries(row).forEach(([container, ilosc]) => {
      const tracked = soldFromSegments[plantId]?.[container] || { ilosc: 0, koszt: 0 };
      const trackedQty = Math.min(ilosc, tracked.ilosc);
      const untrackedQty = Math.max(0, ilosc - trackedQty);
      const untrackedCogs = untrackedQty * Number(costs[plantId]?.[container] || 0);
      rows.push({ plantId, container, ilosc, cogs: tracked.koszt + untrackedCogs, trackedQty, untrackedQty });
    });
  });
  return rows;
}

export function computeOrderCogs(order, zestawy, costs) {
  return (order.pozycje || []).reduce((sum, it) => {
    if (it.kind === "plant") {
      return sum + Number(costs[it.plantId]?.[it.container] || 0) * Number(it.ilosc || 0);
    }
    if (it.kind === "zestaw") {
      const z = zestawy.find((zz) => zz.id === it.zestawId);
      if (!z) return sum;
      const zCogs = (z.pozycje || []).reduce((s2, comp) => s2 + Number(costs[comp.plantId]?.[comp.container] || 0) * Number(comp.ilosc || 0), 0);
      return sum + zCogs * Number(it.ilosc || 0);
    }
    return sum;
  }, 0);
}

/** Pełny raport rentowności dla danego roku: przychód, koszt sprzedanych, koszty stałe, zysk — miesiąc po miesiącu. */
export function computeYearlyProfitReport(orders, zestawy, costs, overheadCosts, year, batchSegments) {
  const monthly = Array.from({ length: 12 }, (_, i) => ({ month: i + 1, revenue: 0, cogs: 0, overhead: 0, ordersCount: 0 }));
  orders.forEach((o) => {
    if (o.status !== "zrealizowane") return;
    const parts = (o.data || "").split("-");
    const y = Number(parts[0]);
    const m = Number(parts[1]);
    if (y !== year || !m || m < 1 || m > 12) return;
    const row = monthly[m - 1];
    row.revenue += Number(o.suma || 0);
    row.cogs += orderCogsBreakdown(o, zestawy, costs, batchSegments).reduce((s, r) => s + r.cogs, 0);
    row.ordersCount += 1;
  });
  (overheadCosts || []).forEach((it) => {
    const kwota = Number(it.kwota || 0);
    if (it.okres === "miesięcznie") {
      monthly.forEach((row) => { row.overhead += kwota; });
    } else if (it.okres === "rocznie") {
      monthly.forEach((row) => { row.overhead += kwota / 12; });
    } else if (it.okres === "jednorazowo") {
      const parts = (it.data || "").split("-");
      const y = Number(parts[0]);
      const m = Number(parts[1]);
      if (y === year && m >= 1 && m <= 12) monthly[m - 1].overhead += kwota;
    }
  });
  monthly.forEach((row) => {
    row.grossProfit = row.revenue - row.cogs;
    row.netProfit = row.grossProfit - row.overhead;
  });
  const totals = monthly.reduce(
    (acc, row) => ({
      revenue: acc.revenue + row.revenue, cogs: acc.cogs + row.cogs, overhead: acc.overhead + row.overhead,
      grossProfit: acc.grossProfit + row.grossProfit, netProfit: acc.netProfit + row.netProfit, ordersCount: acc.ordersCount + row.ordersCount,
    }),
    { revenue: 0, cogs: 0, overhead: 0, grossProfit: 0, netProfit: 0, ordersCount: 0 }
  );
  return { monthly, totals };
}

/** Ranking odmian wg zysku w danym roku (dla zestawów liczymy tylko ilość/koszt — przychód zestawu nie da się rozbić 1:1 na odmiany). */
export function computeTopVarietiesByProfit(orders, zestawy, costs, year, limit = 5, batchSegments) {
  const map = {};
  orders.forEach((o) => {
    if (o.status !== "zrealizowane") return;
    if (Number((o.data || "").split("-")[0]) !== year) return;

    // Przychód i ilość — bez zmian, per pozycja (przychód zestawu nadal nierozbijalny 1:1 na odmiany).
    (o.pozycje || []).forEach((it) => {
      if (it.kind === "plant") {
        const key = `${it.plantId}|${it.container}`;
        if (!map[key]) map[key] = { plantId: it.plantId, container: it.container, ilosc: 0, revenue: 0, cogs: 0, fromZestaw: false };
        map[key].ilosc += Number(it.ilosc || 0);
        map[key].revenue += Number(it.ilosc || 0) * Number(it.cena || 0);
      } else if (it.kind === "zestaw") {
        const z = zestawy.find((zz) => zz.id === it.zestawId);
        if (!z) return;
        (z.pozycje || []).forEach((comp) => {
          const key = `${comp.plantId}|${comp.container}`;
          const compQty = Number(comp.ilosc || 0) * Number(it.ilosc || 0);
          if (!map[key]) map[key] = { plantId: comp.plantId, container: comp.container, ilosc: 0, revenue: 0, cogs: 0, fromZestaw: true };
          map[key].ilosc += compQty;
          map[key].fromZestaw = true;
        });
      }
    });

    // Koszt — raz per (odmiana+pojemnik) na CAŁE zamówienie, z realnego kosztu
    // sprzedaży segmentu tam, gdzie dostępny (patrz orderCogsBreakdown wyżej).
    orderCogsBreakdown(o, zestawy, costs, batchSegments).forEach((row) => {
      const key = `${row.plantId}|${row.container}`;
      if (!map[key]) map[key] = { plantId: row.plantId, container: row.container, ilosc: 0, revenue: 0, cogs: 0, fromZestaw: false };
      map[key].cogs += row.cogs;
    });
  });
  return Object.values(map)
    .map((v) => ({ ...v, profit: v.revenue - v.cogs }))
    .sort((a, b) => b.profit - a.profit)
    .slice(0, limit);
}

export function computeMonthlySales(orders) {
  const map = {};
  orders.forEach((o) => {
    const d = o.data || "";
    const parts = d.split("-");
    if (parts.length < 2) return;
    const y = Number(parts[0]);
    const m = Number(parts[1]);
    if (!y || !m) return;
    const key = `${y}-${m}`;
    if (!map[key]) map[key] = { key, year: y, month: m, count: 0, sum: 0, countDone: 0, sumDone: 0, orders: [] };
    map[key].count += 1;
    map[key].sum += Number(o.suma || 0);
    if (o.status === "zrealizowane") { map[key].countDone += 1; map[key].sumDone += Number(o.suma || 0); }
    map[key].orders.push(o);
  });
  return Object.values(map).sort((a, b) => (b.year - a.year) || (b.month - a.month));
}

/* ---------------------------------------------------------------------- */
/* Storage helpers                                                        */
/* ---------------------------------------------------------------------- */
export function resizeImageToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("read-failed"));
    reader.onload = (e) => {
      const img = new window.Image();
      img.onerror = () => reject(new Error("decode-failed"));
      img.onload = () => {
        const scale = Math.min(1, PHOTO_MAX_W / img.width);
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, w, h);
        try {
          resolve(canvas.toDataURL("image/jpeg", PHOTO_QUALITY));
        } catch (err) {
          reject(err);
        }
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}
export function formatShortDate(dateStr) {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length < 3) return dateStr;
  const day = parts[2];
  const month = Number(parts[1]);
  return `${day} ${MONTHS[month] ? MONTHS[month].slice(0, 3).toLowerCase() : ""}`;
}
