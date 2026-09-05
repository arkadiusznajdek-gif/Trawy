import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { containerLabel, money } from "../../utils/helpers";
import { plantName, batchLabel, QUALITY_LABELS } from "./PartiePanel";

/*
 * ETAP „Co mam gdzie" (roadmapa, pkt 3): drugi ekran UI dla modelu Batch/
 * BatchSegment — tym razem grupowanie wg LOKALIZACJI zamiast wg partii.
 * CAŁKOWICIE read-only, czysta funkcja odczytu istniejących danych — bez
 * zmian w modelu, bez nowej logiki mutującej.
 *
 * Dwa różne „nieznane" trzeba pokazać osobno, żeby nie kłamać:
 * - segment ISTNIEJE i jest śledzony jako partia, ale nie ma podanej
 *   lokalizacji (location=null) — pojawia się w koszyku „Bez lokalizacji"
 *   jako zwykły wiersz z partią i kosztem.
 * - „gołe” sztuki — różnica między inventory[plantId][container] a sumą
 *   aktywnych segmentów tej odmiany+pojemnika (ugruntowane od etapu 4:
 *   legalny stan nieśledzonego stanu magazynowego). Nie mają partii ani
 *   znanego kosztu jednostkowego — pokazywane osobno, jawnie podpisane.
 */

const BEZ_LOKALIZACJI = "__bez_lokalizacji__";

export function buildLocationView(inventory, batchSegments) {
  const groups = {}; // location key -> { location, rows: [] }

  function ensureGroup(locationKey, locationLabel) {
    if (!groups[locationKey]) groups[locationKey] = { location: locationLabel, rows: [] };
    return groups[locationKey];
  }

  batchSegments
    .filter((s) => s.status === "aktywny" && Number(s.ilosc || 0) > 0)
    .forEach((s) => {
      const key = s.location || BEZ_LOKALIZACJI;
      const g = ensureGroup(key, s.location || null);
      g.rows.push({
        plantId: s.plantId, container: s.container, ilosc: Number(s.ilosc || 0),
        kosztJednostkowy: Number(s.kosztJednostkowy || 0), batchId: s.batchId, segmentId: s.id,
        jakosc: s.jakosc || null,
        kind: "segment",
      });
    });

  // "Gołe" sztuki: inventory - suma aktywnych segmentów tej odmiany+pojemnika (niezależnie od lokalizacji).
  const segSums = {}; // plantId -> container -> qty
  batchSegments
    .filter((s) => s.status === "aktywny")
    .forEach((s) => {
      segSums[s.plantId] = segSums[s.plantId] || {};
      segSums[s.plantId][s.container] = (segSums[s.plantId][s.container] || 0) + Number(s.ilosc || 0);
    });
  Object.entries(inventory).forEach(([plantId, row]) => {
    Object.entries(row || {}).forEach(([container, qty]) => {
      const tracked = Number(segSums[plantId]?.[container] || 0);
      const gole = Number(qty || 0) - tracked;
      if (gole > 0) {
        const g = ensureGroup(BEZ_LOKALIZACJI, null);
        g.rows.push({ plantId, container, ilosc: gole, kosztJednostkowy: null, batchId: null, segmentId: null, kind: "gole" });
      }
    });
  });

  const locations = Object.values(groups).map((g) => ({
    ...g,
    totalQty: g.rows.reduce((sum, r) => sum + r.ilosc, 0),
  }));

  locations.sort((a, b) => {
    if (a.location === null) return 1;
    if (b.location === null) return -1;
    return a.location.localeCompare(b.location, "pl");
  });

  return locations;
}

export function knownValueOf(rows) {
  return rows.reduce((sum, r) => (r.kind === "segment" ? sum + r.ilosc * r.kosztJednostkowy : sum), 0);
}

export function CoMamGdziePanel({ plants, inventory, batchSegments, batches }) {
  const [filterPlantId, setFilterPlantId] = useState("");
  const [selectedLocation, setSelectedLocation] = useState(undefined); // undefined = lista, string|null = szczegóły

  const allLocations = useMemo(() => buildLocationView(inventory, batchSegments), [inventory, batchSegments]);

  const visibleLocations = useMemo(() => {
    if (!filterPlantId) return allLocations;
    return allLocations
      .map((g) => ({ ...g, rows: g.rows.filter((r) => r.plantId === filterPlantId) }))
      .map((g) => ({ ...g, totalQty: g.rows.reduce((sum, r) => sum + r.ilosc, 0) }))
      .filter((g) => g.rows.length > 0);
  }, [allLocations, filterPlantId]);

  const totalKnownValue = useMemo(
    () => allLocations.reduce((sum, g) => sum + knownValueOf(g.rows), 0),
    [allLocations]
  );

  if (selectedLocation !== undefined) {
    const group = visibleLocations.find((g) => g.location === selectedLocation) || { location: selectedLocation, rows: [], totalQty: 0 };
    return (
      <LocationDetail
        group={group}
        plants={plants}
        batches={batches}
        onBack={() => setSelectedLocation(undefined)}
      />
    );
  }

  return (
    <div>
      <p className="hint-text" style={{ marginTop: 12 }}>
        Stan magazynowy pogrupowany wg lokalizacji — wyłącznie do odczytu. Kliknij lokalizację, żeby zobaczyć co dokładnie tam jest.
      </p>

      <div className="order-form" style={{ marginTop: 4 }}>
        <label className="field">
          <span>Odmiana</span>
          <select value={filterPlantId} onChange={(e) => setFilterPlantId(e.target.value)}>
            <option value="">— wszystkie —</option>
            {plants.map((p) => <option key={p.id} value={p.id}>{p.nazwa_pl} — {p.odmiana}</option>)}
          </select>
        </label>
      </div>

      <div className="totals-row" style={{ marginTop: 12 }}>
        <div className="totals-chip"><span className="totals-num">{money(totalKnownValue)}</span><span className="totals-label">wartość zł (znany koszt)</span></div>
      </div>

      <div className="order-list">
        {visibleLocations.length === 0 && (
          <div className="empty-state">Brak danych do pokazania — magazyn jest pusty albo żadna pozycja nie pasuje do filtra.</div>
        )}
        {visibleLocations.map((g) => (
          <div key={g.location ?? BEZ_LOKALIZACJI} className="order-card">
            <button className="order-card-head" onClick={() => setSelectedLocation(g.location)}>
              <div>
                <div className="order-client">{g.location || "Bez lokalizacji"}</div>
                <div className="order-date">{g.totalQty} szt. łącznie · {new Set(g.rows.map((r) => r.plantId)).size} odmian</div>
              </div>
              <div className="order-card-right"><ChevronRight size={16} /></div>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function LocationDetail({ group, plants, batches, onBack }) {
  const knownValue = knownValueOf(group.rows);
  const sortedRows = [...group.rows].sort((a, b) => plantName(plants, a.plantId).localeCompare(plantName(plants, b.plantId), "pl"));

  return (
    <div>
      <button className="ghost-btn" style={{ marginTop: 12 }} onClick={onBack}><ChevronLeft size={15} /> Wszystkie lokalizacje</button>

      <div className="order-card" style={{ marginTop: 10 }}>
        <div className="order-card-head static">
          <div>
            <div className="order-client">{group.location || "Bez lokalizacji"}</div>
            <div className="order-date">{group.totalQty} szt. łącznie · wartość znana: {money(knownValue)} zł</div>
          </div>
        </div>
      </div>

      {!group.location && (
        <p className="hint-text" style={{ marginTop: 8 }}>
          Tu trafiają dwie różne rzeczy: segmenty partii bez podanej lokalizacji (mają numer partii i koszt) oraz sztuki w ogóle nieśledzone jako partia („gołe" — bez partii, bez znanego kosztu jednostkowego). Rozróżnione poniżej.
        </p>
      )}

      <div className="section-title small-title" style={{ marginTop: 16 }}>Zawartość ({sortedRows.length})</div>
      {sortedRows.length === 0 && <div className="empty-state">Brak pozycji.</div>}
      {sortedRows.map((r, i) => (
        <div key={r.segmentId || `gole-${r.plantId}-${r.container}-${i}`} className="order-card">
          <div className="order-card-head static">
            <div>
              <div className="order-client">{plantName(plants, r.plantId)}{r.kind === "segment" && r.jakosc ? ` · ${QUALITY_LABELS[r.jakosc] || r.jakosc}` : ""}</div>
              <div className="order-date">
                {containerLabel(r.container)} · {r.ilosc} szt.
                {r.kind === "segment"
                  ? ` · ${money(r.kosztJednostkowy)} zł/szt. · partia ${batchLabel((batches || []).find((b) => b.id === r.batchId))}`
                  : " · bez partii, koszt nieznany"}
              </div>
            </div>
            <div className="order-card-right">
              <span className="order-sum">{r.kind === "segment" ? `${money(r.ilosc * r.kosztJednostkowy)} zł` : "—"}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
