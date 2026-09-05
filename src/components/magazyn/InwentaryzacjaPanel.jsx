import { useState } from "react";
import { containerLabel, clampInt, money, resolveContainers } from "../../utils/helpers";
import { batchLabel } from "./PartiePanel";

export function InwentaryzacjaPanel({ plants, inventory, containers, plantContainerSizes, batchSegments, batches, onPerformInventoryCount }) {
  const [plantId, setPlantId] = useState(plants[0] ? plants[0].id : "");
  const avail = resolveContainers(plantContainerSizes, containers, plantId);
  const [container, setContainer] = useState(avail[0] || "grunt");
  const [trackAsBatch, setTrackAsBatch] = useState(false);
  const [segmentId, setSegmentId] = useState("");
  const [stanFizyczny, setStanFizyczny] = useState(0);
  const [powod, setPowod] = useState("");
  const [kosztJednostkowy, setKosztJednostkowy] = useState(0);
  const [location, setLocation] = useState("");
  const [formError, setFormError] = useState("");
  const [lastResult, setLastResult] = useState(null);

  const matchingSegments = (batchSegments || []).filter(
    (s) => s.plantId === plantId && s.container === container && s.status === "aktywny"
  );
  const selectedSegment = matchingSegments.find((s) => s.id === segmentId) || null;
  const stanSystemowy = trackAsBatch && selectedSegment ? Number(selectedSegment.ilosc || 0) : Number(inventory[plantId]?.[container] || 0);
  const roznica = clampInt(stanFizyczny, 0) - stanSystemowy;

  function selectPlant(id) {
    setPlantId(id);
    const a = resolveContainers(plantContainerSizes, containers, id);
    setContainer(a[0] || "grunt");
    setSegmentId("");
    setFormError("");
    setLastResult(null);
  }
  function selectContainer(c) {
    setContainer(c);
    setSegmentId("");
    setFormError("");
    setLastResult(null);
  }

  function submit() {
    setFormError("");
    if (!plantId) { setFormError("Wybierz odmianę."); return; }
    if (!container) { setFormError("Wybierz pojemnik."); return; }
    if (!powod.trim()) { setFormError("Podaj powód inwentaryzacji."); return; }
    if (trackAsBatch && !segmentId) { setFormError("Zaznaczyłeś „Śledź jako partię” — wybierz rzeczywisty segment, albo odznacz śledzenie."); return; }
    if (roznica === 0) { setFormError("Brak różnicy między stanem systemowym a fizycznym — nic do zatwierdzenia."); return; }
    if (roznica > 0 && Math.max(0, Number(kosztJednostkowy || 0)) <= 0) {
      setFormError("Nadwyżka wymaga podania kosztu jednostkowego.");
      return;
    }

    const result = onPerformInventoryCount({
      plantId, container, trackAsBatch, segmentId: trackAsBatch ? segmentId : null,
      stanFizyczny: clampInt(stanFizyczny, 0), powod: powod.trim(),
      kosztJednostkowy: Math.max(0, Number(kosztJednostkowy || 0)), location: location.trim() || null,
    });
    if (result) setLastResult(result);
    setPowod("");
    setKosztJednostkowy(0);
    setLocation("");
  }

  return (
    <div>
      <p className="hint-text" style={{ marginTop: 12 }}>
        Porównaj stan systemowy z rzeczywistym stanem fizycznym i zatwierdź różnicę. Ujemna różnica pomniejsza stan (bez zmiany kosztu jednostkowego); dodatnia różnica bez znanego pochodzenia — jeśli śledzisz partie — zakłada nową partię oznaczoną jako korekta.
      </p>
      <div className="order-form" style={{ marginTop: 4 }}>
        <label className="field">
          <span>Odmiana</span>
          <select value={plantId} onChange={(e) => selectPlant(e.target.value)}>
            {plants.map((p) => <option key={p.id} value={p.id}>{p.nazwa_pl} — {p.odmiana}</option>)}
          </select>
        </label>

        <label className="field">
          <span>Pojemnik</span>
          <select value={container} onChange={(e) => selectContainer(e.target.value)}>
            {avail.map((c) => <option key={c} value={c}>{containerLabel(c)}</option>)}
          </select>
        </label>

        <label className="checkbox-field">
          <input type="checkbox" checked={trackAsBatch} onChange={(e) => { setTrackAsBatch(e.target.checked); setSegmentId(""); setFormError(""); }} />
          <span>Śledź jako partię (porównaj konkretny segment zamiast łącznego stanu magazynu)</span>
        </label>
        {trackAsBatch && matchingSegments.length > 0 && (
          <label className="field">
            <span>Segment</span>
            <select value={segmentId} onChange={(e) => { setSegmentId(e.target.value); setFormError(""); }}>
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
          <p className="hint-text">Brak śledzonej partii dla tej odmiany i pojemnika — odznacz „Śledź jako partię” (inwentaryzacja zadziała na łącznym stanie magazynu).</p>
        )}

        <div className="order-item-subtotal">ILOŚĆ W SYSTEMIE: <strong>{stanSystemowy}</strong></div>

        <label className="field">
          <span>Ilość fizyczna (rzeczywiście policzona)</span>
          <input type="number" inputMode="numeric" min="0" value={stanFizyczny} onChange={(e) => setStanFizyczny(clampInt(e.target.value, 0))} />
        </label>

        <div className="order-item-subtotal" style={{ color: roznica < 0 ? "var(--danger, #c0392b)" : roznica > 0 ? "var(--accent, #2e7d32)" : undefined }}>
          RÓŻNICA: <strong>{roznica > 0 ? "+" : ""}{roznica}</strong>
        </div>

        <label className="field">
          <span>Powód</span>
          <input type="text" placeholder="np. inwentaryzacja kwartalna, znaleziono więcej niż w systemie..." value={powod} onChange={(e) => setPowod(e.target.value)} />
        </label>

        {roznica > 0 && (
          <>
            <label className="field">
              <span>Koszt jednostkowy nadwyżki (wymagane)</span>
              <input type="number" inputMode="decimal" min="0" step="0.01" value={kosztJednostkowy} onChange={(e) => setKosztJednostkowy(e.target.value)} />
            </label>
            {trackAsBatch && (
              <>
                <p className="hint-text">Nadwyżka o nieznanym pochodzeniu — zostanie założona jako osobna partia „korekta”, nie zostanie dopisana anonimowo do istniejącego segmentu.</p>
                <label className="field">
                  <span>Lokalizacja (opcjonalnie)</span>
                  <input type="text" placeholder="np. Kwatera A" value={location} onChange={(e) => setLocation(e.target.value)} />
                </label>
              </>
            )}
          </>
        )}

        {formError && <p className="hint-text" style={{ color: "var(--danger, #c0392b)" }}>{formError}</p>}

        <button className="primary-btn" disabled={roznica === 0} onClick={submit}>Zatwierdź inwentaryzację</button>

        {lastResult && (
          <div className="division-result-banner" style={{ marginTop: 12, padding: 10, border: "1px solid var(--line, #ddd)", borderRadius: 8 }}>
            <div style={{ fontWeight: 600 }}>INWENTARYZACJA</div>
            <div>Stan systemowy: {lastResult.stanSystemowy}</div>
            <div>Stan fizyczny: {lastResult.stanFizyczny}</div>
            <div>Różnica: {lastResult.roznica > 0 ? "+" : ""}{lastResult.roznica}</div>
            {lastResult.newBatch && (
              <div style={{ marginTop: 6 }}>
                Nowa partia (nieznane pochodzenie): #{lastResult.newBatch.id} — {lastResult.newBatch.ilosc} szt.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
