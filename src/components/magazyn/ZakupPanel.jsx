import { useState } from "react";
import { containerLabel, clampInt, resolveContainers } from "../../utils/helpers";

export function ZakupPanel({ plants, containers, plantContainerSizes, onPerformPurchase }) {
  const [plantId, setPlantId] = useState(plants[0] ? plants[0].id : "");
  const avail = resolveContainers(plantContainerSizes, containers, plantId);
  const [container, setContainer] = useState(avail[0] || "grunt");
  const [ilosc, setIlosc] = useState(1);
  const [kosztJednostkowy, setKosztJednostkowy] = useState(0);
  const [location, setLocation] = useState("");
  const [trackAsBatch, setTrackAsBatch] = useState(false);
  const [customLabel, setCustomLabel] = useState("");

  function selectPlant(id) {
    setPlantId(id);
    const a = resolveContainers(plantContainerSizes, containers, id);
    setContainer(a[0] || "grunt");
  }

  function submit() {
    onPerformPurchase({
      plantId,
      container,
      ilosc: clampInt(ilosc, 0),
      kosztJednostkowy: Math.max(0, Number(kosztJednostkowy) || 0),
      location: location.trim() || null,
      trackAsBatch,
      customLabel: customLabel.trim(),
    });
    setIlosc(1);
    setLocation("");
    setCustomLabel("");
  }

  return (
    <div>
      <p className="hint-text" style={{ marginTop: 12 }}>
        Zarejestruj zakup lub dostawę roślin — zwiększa stan magazynowy i koszt jednostkowy (średnia ważona z tym, co już jest). Opcjonalnie zakłada nową śledzoną partię z pochodzeniem.
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
          <select value={container} onChange={(e) => setContainer(e.target.value)}>
            {avail.map((c) => <option key={c} value={c}>{containerLabel(c)}</option>)}
          </select>
        </label>

        <div className="order-item-sub">
          <input type="number" inputMode="numeric" min="1" value={ilosc} onChange={(e) => setIlosc(clampInt(e.target.value, 1))} />
          <span style={{ fontSize: 12, color: "var(--ink-muted)" }}>szt.</span>
        </div>

        <label className="field">
          <span>Koszt / szt.</span>
          <input type="number" inputMode="decimal" min="0" step="0.01" value={kosztJednostkowy} onChange={(e) => setKosztJednostkowy(e.target.value)} />
        </label>

        <label className="field">
          <span>Lokalizacja (opcjonalnie)</span>
          <input type="text" placeholder="np. Kwatera A" value={location} onChange={(e) => setLocation(e.target.value)} />
        </label>

        <label className="checkbox-field">
          <input type="checkbox" checked={trackAsBatch} onChange={(e) => setTrackAsBatch(e.target.checked)} />
          <span>Śledź jako partię (zakłada nową partię i pierwszy segment z tym pochodzeniem)</span>
        </label>

        {trackAsBatch && (
          <label className="field">
            <span>Opis partii (opcjonalnie — trafi do kodu partii i na Paszport roślin)</span>
            <input type="text" placeholder="np. wiosna-2026" value={customLabel} onChange={(e) => setCustomLabel(e.target.value)} />
          </label>
        )}

        <button className="primary-btn" disabled={clampInt(ilosc, 0) <= 0} onClick={submit}>Zarejestruj zakup</button>
      </div>
    </div>
  );
}
