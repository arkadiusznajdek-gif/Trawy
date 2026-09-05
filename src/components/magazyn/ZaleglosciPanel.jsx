import { useState, useMemo } from "react";
import { containerLabel, money } from "../../utils/helpers";
import { plantName, batchLabel, QUALITY_LABELS } from "./PartiePanel";

/*
 * ROADMAPA (SHOULD HAVE, pkt 8): "towar stojący najdłużej" — pomaga
 * wychwycić materiał, który zalega bez żadnej operacji (podziału,
 * przesadzenia, sprzedaży, straty...). Całkowicie read-only, czysta
 * funkcja sortująca po `updatedAt` segmentu — to pole jest już dziś
 * konsekwentnie aktualizowane przy KAŻDEJ operacji na segmencie
 * (createSegment, transplantSegment, divideSegment, decreaseSegment),
 * więc "najstarsze updatedAt" = "najdłużej bez ruchu", bez potrzeby
 * żadnej zmiany w modelu ani w istniejących operacjach.
 */

export function daysSince(iso, nowMs) {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return null;
  return Math.max(0, Math.floor((nowMs - then) / (1000 * 60 * 60 * 24)));
}

export function sortByStaleness(batchSegments, nowMs) {
  return (batchSegments || [])
    .filter((s) => s.status === "aktywny" && Number(s.ilosc || 0) > 0)
    .map((s) => ({ ...s, daysIdle: daysSince(s.updatedAt, nowMs) }))
    .sort((a, b) => (b.daysIdle ?? 0) - (a.daysIdle ?? 0));
}

export function ZaleglosciPanel({ plants, batches, batchSegments }) {
  const [filterPlantId, setFilterPlantId] = useState("");
  const nowMs = useMemo(() => Date.now(), []);

  const sorted = useMemo(() => sortByStaleness(batchSegments, nowMs), [batchSegments, nowMs]);
  const visible = useMemo(
    () => (filterPlantId ? sorted.filter((s) => s.plantId === filterPlantId) : sorted),
    [sorted, filterPlantId]
  );

  return (
    <div>
      <p className="hint-text" style={{ marginTop: 12 }}>
        Aktywne segmenty posortowane od najdłużej bez żadnej operacji (podziału, przesadzenia, sprzedaży, straty...) — pomaga wychwycić towar, który się zalega.
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

      <div className="order-list">
        {visible.length === 0 && (
          <div className="empty-state">Brak aktywnych segmentów{filterPlantId ? " dla wybranej odmiany" : ""}.</div>
        )}
        {visible.map((s) => {
          const batch = (batches || []).find((b) => b.id === s.batchId);
          return (
            <div key={s.id} className="order-card">
              <div className="order-card-head static">
                <div>
                  <div className="order-client">{plantName(plants, s.plantId)}{s.jakosc ? ` · ${QUALITY_LABELS[s.jakosc] || s.jakosc}` : ""}</div>
                  <div className="order-date">
                    {containerLabel(s.container)}{s.location ? ` — ${s.location}` : ""} · {s.ilosc} szt. × {money(s.kosztJednostkowy)} zł/szt. · Partia {batchLabel(batch)}
                  </div>
                </div>
                <div className="order-card-right">
                  <span className="order-sum">{s.daysIdle} dni</span>
                  <span className="order-date">bez ruchu</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
