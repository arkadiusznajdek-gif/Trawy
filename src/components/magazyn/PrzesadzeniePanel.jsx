import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { containerLabel, clampInt, costOfContainer, money, resolveContainers } from "../../utils/helpers";
import { batchLabel } from "./PartiePanel";
import { LocationField } from "../shared/LocationField";

export function PrzesadzeniePanel({ plants, inventory, containers, plantContainerSizes, costs, potRecipes, substrateCostPerL, batchSegments, batches, onPerformTransplant }) {
  const [plantId, setPlantId] = useState(plants[0] ? plants[0].id : "");
  const avail = resolveContainers(plantContainerSizes, containers, plantId);
  const [sourceContainer, setSourceContainer] = useState(avail[0] || "grunt");
  const [trackAsBatch, setTrackAsBatch] = useState(false);
  const [sourceSegmentId, setSourceSegmentId] = useState("");
  const [ilosc, setIlosc] = useState("");
  const [toContainer, setToContainer] = useState(avail.find((c) => c !== (avail[0] || "grunt")) || avail[0] || "P9");
  const [toLocation, setToLocation] = useState("");
  const [formError, setFormError] = useState("");
  const [lastResult, setLastResult] = useState(null);

  const matchingSegments = (batchSegments || []).filter(
    (s) => s.plantId === plantId && s.container === sourceContainer && s.status === "aktywny"
  );
  const selectedSegment = matchingSegments.find((s) => s.id === sourceSegmentId) || null;

  function selectPlant(id) {
    setPlantId(id);
    const a = resolveContainers(plantContainerSizes, containers, id);
    setSourceContainer(a[0] || "grunt");
    setToContainer(a.find((c) => c !== (a[0] || "grunt")) || a[0] || "P9");
    setSourceSegmentId("");
    setFormError("");
  }
  function selectSourceContainer(c) {
    setSourceContainer(c);
    setSourceSegmentId("");
    if (toContainer === c) setToContainer(avail.find((x) => x !== c) || c);
    setFormError("");
  }

  const currentStock = Number(inventory[plantId]?.[sourceContainer] || 0);
  const sourceUnitCost = selectedSegment
    ? Number(selectedSegment.kosztJednostkowy || 0)
    : Number(costs[plantId]?.[sourceContainer] || 0);
  const recipeMissing = toContainer !== "grunt" && !potRecipes[toContainer];
  const extraCostPerUnit = recipeMissing ? 0 : costOfContainer(potRecipes, substrateCostPerL, toContainer);
  const newUnitCost = sourceUnitCost + extraCostPerUnit;
  const sameAsSource = toContainer === sourceContainer && (!trackAsBatch || (toLocation.trim() || null) === (selectedSegment?.location || null));

  function submit() {
    setFormError("");
    if (!plantId) { setFormError("Wybierz odmianę."); return; }
    const qty = clampInt(ilosc, 0);
    if (qty <= 0) { setFormError("Podaj ilość większą od zera."); return; }
    if (!toContainer) { setFormError("Wybierz pojemnik docelowy."); return; }
    if (recipeMissing) { setFormError(`Brak receptury dla pojemnika ${containerLabel(toContainer)} — uzupełnij ją w Zaopatrzeniu przed przesadzeniem.`); return; }
    if (sameAsSource) { setFormError("Cel jest identyczny ze źródłem — to nie byłoby przesadzenie."); return; }
    if (trackAsBatch && !sourceSegmentId) { setFormError("Zaznaczyłeś „Śledź jako partię” — wybierz rzeczywisty segment źródłowy, albo odznacz śledzenie."); return; }
    if (trackAsBatch && selectedSegment && qty > Number(selectedSegment.ilosc || 0)) {
      setFormError(`Ilość do przesadzenia (${qty}) przekracza stan segmentu źródłowego (${selectedSegment.ilosc} szt.).`);
      return;
    }
    if (!trackAsBatch && qty > currentStock) { setFormError(`Ilość do przesadzenia (${qty}) przekracza stan źródła (${currentStock} szt.).`); return; }

    const result = onPerformTransplant({
      plantId, sourceContainer, ilosc: qty, toContainer, toLocation: toLocation.trim() || null,
      trackAsBatch, sourceSegmentId: trackAsBatch && sourceSegmentId ? sourceSegmentId : null,
    });
    if (result) setLastResult(result);
    setIlosc("");
    setToLocation("");
  }

  return (
    <div>
      <p className="hint-text" style={{ marginTop: 12 }}>
        Przesadź lub przenieś istniejące rośliny do innego pojemnika i/lub lokalizacji. To NIE jest podział — liczba roślin się nie zmienia, tylko miejsce, w którym się znajdują. Koszt dokłada się na podstawie Receptury (Zaopatrzenie).
      </p>
      <div className="order-form" style={{ marginTop: 4 }}>
        <label className="field">
          <span>Odmiana</span>
          <select value={plantId} onChange={(e) => selectPlant(e.target.value)}>
            {plants.map((p) => <option key={p.id} value={p.id}>{p.nazwa_pl} — {p.odmiana}</option>)}
          </select>
        </label>

        <label className="field">
          <span>Pojemnik źródłowy — obecny stan: {currentStock} szt.</span>
          <select value={sourceContainer} onChange={(e) => selectSourceContainer(e.target.value)}>
            {avail.map((c) => <option key={c} value={c}>{containerLabel(c)}</option>)}
          </select>
        </label>

        <label className="checkbox-field">
          <input type="checkbox" checked={trackAsBatch} onChange={(e) => { setTrackAsBatch(e.target.checked); setSourceSegmentId(""); setFormError(""); }} />
          <span>Śledź jako partię (przesadzenie zostaje w tej samej partii — wymaga wskazania rzeczywistego segmentu źródłowego)</span>
        </label>

        {trackAsBatch && matchingSegments.length > 0 && (
          <label className="field">
            <span>Segment źródłowy</span>
            <select value={sourceSegmentId} onChange={(e) => { setSourceSegmentId(e.target.value); setFormError(""); }}>
              <option value="">— wybierz segment —</option>
              {matchingSegments.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.ilosc} szt. {s.location ? `— ${s.location}` : "— bez lokalizacji"} (partia {batchLabel((batches || []).find((b) => b.id === s.batchId))}, {money(s.kosztJednostkowy)} zł/szt.)
                </option>
              ))}
            </select>
          </label>
        )}
        {trackAsBatch && matchingSegments.length === 0 && (
          <p className="hint-text">Brak śledzonej partii dla tej odmiany i pojemnika — odznacz „Śledź jako partię” (przesadzenie zostanie wykonane tylko na magazynie, bez partii).</p>
        )}

        <div className="order-item-sub">
          <input type="number" inputMode="numeric" min="1" value={ilosc} onChange={(e) => setIlosc(e.target.value)} placeholder="Ilość" />
          <span style={{ fontSize: 12, color: "var(--ink-muted)" }}>szt. do przesadzenia</span>
        </div>

        <label className="field">
          <span>Pojemnik docelowy</span>
          <select value={toContainer} onChange={(e) => setToContainer(e.target.value)}>
            {avail.map((c) => <option key={c} value={c}>{containerLabel(c)}</option>)}
          </select>
        </label>

        <label className="field">
          <span>Lokalizacja docelowa (opcjonalnie)</span>
          <LocationField value={toLocation} onChange={setToLocation} />
        </label>

        <div className="order-item-subtotal">
          Koszt/szt. źródła: ~{money(sourceUnitCost)} zł
          {" "}+ pojemnik/podłoże: ~{money(extraCostPerUnit)} zł
          {" "}= <strong>~{money(newUnitCost)} zł/szt.</strong>
        </div>

        <div className="section-title small-title">Podsumowanie</div>
        <div className="order-item-subtotal">
          {plants.find((p) => p.id === plantId)?.nazwa_pl || "—"} · {clampInt(ilosc, 0)} szt.<br />
          {containerLabel(sourceContainer)}{trackAsBatch && selectedSegment?.location ? ` (${selectedSegment.location})` : ""}
          {" "}<ArrowRight size={13} style={{ verticalAlign: "middle" }} />{" "}
          {containerLabel(toContainer)}{toLocation.trim() ? ` (${toLocation.trim()})` : ""}
        </div>

        {formError && <p className="hint-text" style={{ color: "var(--danger, #c0392b)" }}>{formError}</p>}

        <button className="primary-btn" onClick={submit}>Przesadź</button>

        {lastResult && (
          <div className="division-result-banner" style={{ marginTop: 12, padding: 10, border: "1px solid var(--line, #ddd)", borderRadius: 8 }}>
            <div style={{ fontWeight: 600 }}>PRZESADZENIE</div>
            <div>{lastResult.plantLabel}</div>
            <div>{lastResult.ilosc} szt.</div>
            <div>{containerLabel(lastResult.fromContainer)}{lastResult.fromLocation ? ` (${lastResult.fromLocation})` : ""} → {containerLabel(lastResult.toContainer)}{lastResult.toLocation ? ` (${lastResult.toLocation})` : ""}</div>
            {lastResult.batchId && <div>Partia {batchLabel((batches || []).find((b) => b.id === lastResult.batchId))} — bez zmian (ta sama partia)</div>}
          </div>
        )}
      </div>
    </div>
  );
}
