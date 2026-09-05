import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { containerLabel, clampInt, costOfContainer, money, resolveContainers } from "../../utils/helpers";
import { batchLabel } from "./PartiePanel";

export function emptyDivisionTarget(containers, sourceContainer) {
  const opts = containers.filter((c) => c !== sourceContainer && c !== "grunt");
  return { container: opts[0] || containers[0] || "P9", ilosc: 1, location: "" };
}

export function PodzialPanel({ plants, inventory, containers, plantContainerSizes, costs, potRecipes, substrateCostPerL, onPerformDivision, batchSegments, batches }) {
  const [plantId, setPlantId] = useState(plants[0] ? plants[0].id : "");
  const avail = resolveContainers(plantContainerSizes, containers, plantId);
  const [sourceContainer, setSourceContainer] = useState(avail[0] || "grunt");
  const [sourceQty, setSourceQty] = useState(1);
  const [deductSource, setDeductSource] = useState(true);
  const [trackAsBatch, setTrackAsBatch] = useState(false);
  const [sourceSegmentId, setSourceSegmentId] = useState("");
  const [targets, setTargets] = useState([emptyDivisionTarget(avail, avail[0])]);
  const [lastResult, setLastResult] = useState(null);
  const [formError, setFormError] = useState("");

  const matchingSegments = (batchSegments || []).filter(
    (s) => s.plantId === plantId && s.container === sourceContainer && s.status === "aktywny"
  );

  function selectPlant(id) {
    setPlantId(id);
    const a = resolveContainers(plantContainerSizes, containers, id);
    setSourceContainer(a[0] || "grunt");
    setSourceSegmentId("");
    setTargets([emptyDivisionTarget(a, a[0])]);
    setFormError("");
  }
  function selectSource(c) {
    setSourceContainer(c);
    setSourceSegmentId("");
    setTargets((prev) => prev.map((t) => (t.container === c ? { ...t, container: avail.find((x) => x !== c) || c } : t)));
    setFormError("");
  }
  function updateTarget(idx, patch) { setTargets((prev) => prev.map((t, i) => (i === idx ? { ...t, ...patch } : t))); }
  function addTarget() { setTargets((prev) => [...prev, emptyDivisionTarget(avail, sourceContainer)]); }
  function removeTarget(idx) { setTargets((prev) => prev.filter((_, i) => i !== idx)); }

  // Cel jest ważny tylko gdy ma niepusty pojemnik ORAZ ilość > 0 (wymóg 7: pusty pojemnik/pusta ilość nie mogą przejść).
  const validTargets = targets.filter((t) => t.container && clampInt(t.ilosc, 0) > 0);
  const hasInvalidTarget = targets.some((t) => !t.container || clampInt(t.ilosc, 0) <= 0);
  const totalNewUnits = validTargets.reduce((s, t) => s + clampInt(t.ilosc, 0), 0);
  const selectedSourceSegment = matchingSegments.find((s) => s.id === sourceSegmentId) || null;
  // NAPRAWA WARNING #3 (etap 10): podgląd kosztu ma korzystać z kosztu rzeczywistego
  // segmentu źródłowego, jeśli wybrany — zgodnie z tym, co faktycznie zapisze App.jsx
  // (naprawione w etapie 7.5). Fallback do agregatu costs[...] tylko w starym flow.
  const srcCostPerSzt = trackAsBatch && selectedSourceSegment
    ? Number(selectedSourceSegment.kosztJednostkowy || 0)
    : Number(costs[plantId]?.[sourceContainer] || 0);
  const totalSrcCost = deductSource ? clampInt(sourceQty, 0) * srcCostPerSzt : 0;
  const srcCostPerNewUnit = totalNewUnits > 0 ? totalSrcCost / totalNewUnits : 0;
  const currentStock = Number(inventory[plantId]?.[sourceContainer] || 0);

  // Wymóg 7: śledzenie partii bez wybranego rzeczywistego segmentu źródłowego nie może zostać zapisane.
  const trackingBlocked = trackAsBatch && !sourceSegmentId;

  function submit() {
    setFormError("");
    if (!plantId) { setFormError("Wybierz odmianę."); return; }
    if (validTargets.length === 0) { setFormError("Podaj przynajmniej jedną pozycję docelową: pojemnik i ilość większą od zera."); return; }
    if (hasInvalidTarget) { setFormError("Usuń lub uzupełnij pozycje z pustym pojemnikiem albo ilością ≤ 0."); return; }
    if (deductSource && clampInt(sourceQty, 0) > currentStock) { setFormError(`Ubytek źródła (${clampInt(sourceQty, 0)}) przekracza dostępną ilość (${currentStock} szt.).`); return; }
    if (trackingBlocked) { setFormError("Zaznaczyłeś „Śledź jako partię” — wybierz rzeczywisty segment źródłowy, albo odznacz śledzenie."); return; }

    const result = onPerformDivision({
      plantId, sourceContainer, sourceQty: clampInt(sourceQty, 0), deductSource,
      targets: validTargets.map((t) => ({ container: t.container, ilosc: clampInt(t.ilosc, 0), location: (t.location || "").trim() || null })),
      trackAsBatch, sourceSegmentId: trackAsBatch && sourceSegmentId ? sourceSegmentId : null,
    });
    if (result) setLastResult(result);
    setTargets([emptyDivisionTarget(avail, sourceContainer)]);
    setSourceQty(1);
  }

  return (
    <div>
      <p className="hint-text" style={{ marginTop: 12 }}>
        Podziel roślinę matczyną (np. z gruntu) na nowe sztuki w doniczkach — jednym ruchem, na kilka rozmiarów naraz. Koszt nowych sztuk liczy się sam na podstawie receptury pojemników (zakładka Zaopatrzenie).
      </p>
      <div className="order-form" style={{ marginTop: 4 }}>
        <label className="field">
          <span>Odmiana</span>
          <select value={plantId} onChange={(e) => selectPlant(e.target.value)}>
            {plants.map((p) => <option key={p.id} value={p.id}>{p.nazwa_pl} — {p.odmiana}</option>)}
          </select>
        </label>

        <label className="field">
          <span>Źródło (roślina matczyna) — obecny stan: {currentStock} szt.</span>
          <select value={sourceContainer} onChange={(e) => selectSource(e.target.value)}>
            {avail.map((c) => <option key={c} value={c}>{containerLabel(c)}</option>)}
          </select>
        </label>

        <div className="order-item-sub">
          <input type="number" inputMode="numeric" min="1" value={sourceQty} onChange={(e) => setSourceQty(clampInt(e.target.value, 1))} />
          <span style={{ fontSize: 12, color: "var(--ink-muted)" }}>szt. źródła wykorzystane (ubytek — niezależne od liczby nowych roślin)</span>
        </div>

        <label className="checkbox-field">
          <input type="checkbox" checked={deductSource} onChange={(e) => setDeductSource(e.target.checked)} />
          <span>Odejmij tę ilość ze źródła (odznacz, jeśli roślina mateczna zostaje — np. dzielisz kępę w gruncie)</span>
        </label>

        <label className="checkbox-field">
          <input type="checkbox" checked={trackAsBatch} onChange={(e) => { setTrackAsBatch(e.target.checked); setFormError(""); }} />
          <span>Śledź jako partię (wymaga wskazania rzeczywistego segmentu źródłowego)</span>
        </label>

        {trackAsBatch && matchingSegments.length > 0 && (
          <label className="field">
            <span>Segment źródłowy partii (rzeczywiste pochodzenie)</span>
            <select value={sourceSegmentId} onChange={(e) => { setSourceSegmentId(e.target.value); setFormError(""); }}>
              <option value="">— wybierz segment —</option>
              {matchingSegments.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.ilosc} szt. {s.location ? `— ${s.location}` : "— bez lokalizacji"} (partia {batchLabel((batches || []).find((b) => b.id === s.batchId))})
                </option>
              ))}
            </select>
          </label>
        )}
        {trackAsBatch && matchingSegments.length === 0 && (
          <p className="hint-text">Brak śledzonej partii dla tej odmiany i pojemnika — nie można tu zaznaczyć śledzenia. Odznacz „Śledź jako partię” (podział zostanie wykonany po staremu) albo najpierw zarejestruj to źródło jako partię (np. przez Zakup z opcją śledzenia).</p>
        )}

        <div className="section-title small-title">Dokąd (można kilka naraz, każda pozycja może mieć własną lokalizację)</div>
        {targets.map((t, idx) => {
          const containerCost = costOfContainer(potRecipes, substrateCostPerL, t.container);
          const unitCost = srcCostPerNewUnit + containerCost;
          return (
            <div key={idx} className="order-item-row">
              <div className="order-item-sub">
                <select value={t.container} onChange={(e) => updateTarget(idx, { container: e.target.value })}>
                  {avail.filter((c) => c !== "grunt" || true).map((c) => <option key={c} value={c}>{containerLabel(c)}</option>)}
                </select>
                <input type="number" inputMode="numeric" min="1" value={t.ilosc} onChange={(e) => updateTarget(idx, { ilosc: clampInt(e.target.value, 1) })} />
                {targets.length > 1 && <button className="icon-btn danger" onClick={() => removeTarget(idx)}><Trash2 size={15} /></button>}
              </div>
              <input
                type="text"
                placeholder="Lokalizacja (opcjonalnie, np. Kwatera B)"
                value={t.location || ""}
                onChange={(e) => updateTarget(idx, { location: e.target.value })}
                style={{ marginTop: 4 }}
              />
              <div className="order-item-subtotal">koszt/szt.: ~{money(unitCost)} zł</div>
            </div>
          );
        })}
        <button className="ghost-btn" onClick={addTarget}><Plus size={15} /> Dodaj kolejny rozmiar docelowy</button>

        <div className="order-total">Nowych sztuk łącznie: <strong>{totalNewUnits}</strong></div>

        {formError && <p className="hint-text" style={{ color: "var(--danger, #c0392b)" }}>{formError}</p>}

        <button className="primary-btn" disabled={validTargets.length === 0 || trackingBlocked} onClick={submit}>Wykonaj podział</button>

        {lastResult && (
          <div className="division-result-banner" style={{ marginTop: 12, padding: 10, border: "1px solid var(--line, #ddd)", borderRadius: 8 }}>
            {lastResult.source && (
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontWeight: 600 }}>ŹRÓDŁO:</div>
                <div>{lastResult.source.label}{lastResult.source.location ? ` — ${lastResult.source.location}` : ""}</div>
                <div>{lastResult.source.before} → {lastResult.source.after}</div>
              </div>
            )}
            <div style={{ marginBottom: lastResult.newBatch ? 8 : 0 }}>
              <div style={{ fontWeight: 600 }}>PRODUKCJA:</div>
              {lastResult.production.map((p, i) => (
                <div key={i}>{p.ilosc} × {containerLabel(p.container)}{p.location ? ` → ${p.location}` : ""}</div>
              ))}
            </div>
            {lastResult.newBatch && (
              <div>
                <div style={{ fontWeight: 600 }}>NOWA PARTIA:</div>
                <div>#{lastResult.newBatch.id}</div>
                <div>pochodzenie: {lastResult.newBatch.originLabel}</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
