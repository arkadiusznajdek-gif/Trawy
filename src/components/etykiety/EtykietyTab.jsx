import { useState } from "react";
import { Minus, Plus, Printer } from "lucide-react";
import { clampInt, containerLabel } from "../../utils/helpers";
import { plantName, batchLabel } from "../magazyn/PartiePanel";

/*
 * ROADMAPA pkt 5: etykiety z identyfikatorem partii. Dotychczasowy tryb
 * (druk wg samej odmiany, bez pojęcia pojemnika/lokalizacji/partii) zostaje
 * bez zmian jako domyślny — to nadal jedyna sensowna opcja dla użytkownika
 * niekorzystającego ze śledzenia partii. Nowy tryb „Partia" drukuje
 * etykiety per KONKRETNY aktywny segment (bo numer partii ma sens tylko
 * przy wybranym segmencie — jedna odmiana może mieć wiele aktywnych
 * segmentów w różnych partiach naraz), z dodatkową linią identyfikującą
 * partię, pojemnik i lokalizację na etykiecie.
 *
 * FUNKCJA DODATKOWA: Paszport roślin (UE) + drukarka termiczna. Treść
 * paszportu (pola A/B/C/D) wynika WPROST z Rozporządzenia (UE) 2016/2031
 * i 2017/2313: A = nazwa botaniczna, B = dwuliterowy kod państwa +
 * numer rejestracyjny podmiotu (nadany przez WIORiN), C = kod
 * identyfikacyjny partii (u nas: numer partii — dokładnie po to go
 * wprowadziliśmy), D = kod kraju pochodzenia. Numer PIORiN i kraj
 * pochodzenia to ustawienia globalne (jedna szkółka = jeden numer),
 * NIE dane samej partii. UWAGA: dokładny wygląd graficzny (flaga UE)
 * uproszczony do kolorowego oznaczenia „UE" — treść pól A/B/C/D jest
 * zgodna z przepisami, ale przed pierwszym użyciem produkcyjnym warto
 * zweryfikować wydruk fizycznie na własnej drukarce.
 *
 * Cztery czyste funkcje niżej (bez zmiany zachowania — wyłącznie
 * wydzielone z ciała komponentu) budują listę etykiet do wydruku;
 * testowalne wprost.
 */

export function filterActiveSegments(batchSegments, filterPlantId) {
  return (batchSegments || [])
    .filter((s) => s.status === "aktywny" && Number(s.ilosc || 0) > 0)
    .filter((s) => !filterPlantId || s.plantId === filterPlantId);
}

export function buildLabelList(plants, counts) {
  const labelPlants = [];
  plants.forEach((p) => {
    const n = counts[p.id] || 0;
    for (let i = 0; i < n; i++) labelPlants.push(p);
  });
  return labelPlants;
}

export function buildSegmentLabelList(activeSegments, segmentCounts) {
  const labelSegments = [];
  activeSegments.forEach((s) => {
    const n = segmentCounts[s.id] || 0;
    for (let i = 0; i < n; i++) labelSegments.push(s);
  });
  return labelSegments;
}

export function buildPassportFields(plant, batch, piorinNumber, originCountry) {
  return {
    A: plant ? plant.odmiana : "",
    B: piorinNumber || "",
    C: batch ? (batch.numer ? `#${batch.numer}` : batch.id) : "",
    D: originCountry || "",
  };
}

export function EtykietyTab({ plants, inventory, potSizes, batchSegments, batches, piorinNumber, setPiorinNumber, originCountry, setOriginCountry, thermalLabelSize, setThermalLabelSize }) {
  const [mode, setMode] = useState("odmiana");
  const [printMode, setPrintMode] = useState("a4"); // "a4" | "thermal"
  const [passportMode, setPassportMode] = useState(false);

  // --- Tryb "Odmiana" (bez zmian względem dotychczasowego zachowania) ---
  const [counts, setCounts] = useState({});
  function setCount(plantId, val) { setCounts((prev) => ({ ...prev, [plantId]: clampInt(val, 0) })); }
  function bump(plantId, delta) { setCount(plantId, (counts[plantId] || 0) + delta); }
  function fillFromStock() {
    const next = {};
    plants.forEach((p) => {
      const row = inventory[p.id] || {};
      next[p.id] = potSizes.reduce((s, c) => s + Number(row[c] || 0), 0);
    });
    setCounts(next);
  }
  function clearAll() { setCounts({}); }

  const labelPlants = buildLabelList(plants, counts);

  // --- Tryb "Partia" (nowy) ---
  const [filterPlantId, setFilterPlantId] = useState("");
  const [segmentCounts, setSegmentCounts] = useState({});
  const activeSegments = filterActiveSegments(batchSegments, filterPlantId);
  function setSegmentCount(segmentId, val, max) { setSegmentCounts((prev) => ({ ...prev, [segmentId]: Math.max(0, Math.min(clampInt(val, 0), max)) })); }
  function bumpSegment(segmentId, delta, max) { setSegmentCount(segmentId, (segmentCounts[segmentId] || 0) + delta, max); }
  function fillSegmentsFromStock() {
    const next = {};
    activeSegments.forEach((s) => { next[s.id] = Number(s.ilosc || 0); });
    setSegmentCounts(next);
  }
  function clearSegments() { setSegmentCounts({}); }

  const labelSegments = buildSegmentLabelList(activeSegments, segmentCounts);

  const totalLabels = mode === "odmiana" ? labelPlants.length : labelSegments.length;
  function handlePrint() { window.print(); }

  const previewPlant = plants[0];
  const w = Number(thermalLabelSize?.width || 40);
  const h = Number(thermalLabelSize?.height || 30);

  return (
    <div className="tab-pad">
      <div className="segmented">
        <button className={mode === "odmiana" ? "active" : ""} onClick={() => setMode("odmiana")}>Wg odmiany</button>
        <button className={mode === "partia" ? "active" : ""} onClick={() => setMode("partia")}>Wg partii</button>
      </div>

      <div className="segmented" style={{ marginTop: 8 }}>
        <button className={printMode === "a4" ? "active" : ""} onClick={() => setPrintMode("a4")}>Arkusz A4</button>
        <button className={printMode === "thermal" ? "active" : ""} onClick={() => setPrintMode("thermal")}>Drukarka termiczna</button>
      </div>
      {printMode === "thermal" && (
        <div className="order-form" style={{ marginTop: 4 }}>
          <label className="field">
            <span>Rozmiar etykiety (mm)</span>
            <div className="order-item-sub">
              <input type="number" inputMode="numeric" min="10" value={thermalLabelSize?.width || 40}
                onChange={(e) => setThermalLabelSize({ ...thermalLabelSize, width: clampInt(e.target.value, 10) })} style={{ maxWidth: 80 }} />
              <span style={{ fontSize: 12 }}>×</span>
              <input type="number" inputMode="numeric" min="10" value={thermalLabelSize?.height || 30}
                onChange={(e) => setThermalLabelSize({ ...thermalLabelSize, height: clampInt(e.target.value, 10) })} style={{ maxWidth: 80 }} />
              <span style={{ fontSize: 12, color: "var(--ink-muted)" }}>mm — dopasuj do rolki w Twojej drukarce</span>
            </div>
          </label>
          <p className="hint-text">Sprawdź pierwszy wydruk na próbnej etykiece — kalibracja zależy od konkretnej drukarki/sterownika.</p>
        </div>
      )}

      {mode === "partia" && (
        <div className="order-form" style={{ marginTop: 8 }}>
          <label className="checkbox-field">
            <input type="checkbox" checked={passportMode} onChange={(e) => setPassportMode(e.target.checked)} />
            <span>Dołącz jako Paszport roślin (UE) — pola A/B/C/D wg Rozporządzenia 2016/2031</span>
          </label>
          {passportMode && (
            <>
              <label className="field">
                <span>Numer rejestracyjny PIORiN (pole B)</span>
                <input type="text" placeholder="np. PL-12/345/6789" value={piorinNumber} onChange={(e) => setPiorinNumber(e.target.value)} />
              </label>
              <label className="field">
                <span>Kraj pochodzenia (pole D)</span>
                <input type="text" placeholder="PL" value={originCountry} onChange={(e) => setOriginCountry(e.target.value.toUpperCase())} style={{ maxWidth: 100 }} />
              </label>
              {!piorinNumber && <p className="hint-text" style={{ color: "var(--danger, #c0392b)" }}>Podaj numer PIORiN — bez niego pole B na paszporcie zostanie puste.</p>}
            </>
          )}
        </div>
      )}

      {mode === "odmiana" && previewPlant && (
        <div className="label-preview-section">
          <div className="section-title small-title" style={{ marginBottom: 6 }}>Wzór etykiety (podgląd)</div>
          <div className="label-preview-card">
            <div className="lp-name">{previewPlant.nazwa_pl}</div>
            <div className="lp-variety">{previewPlant.odmiana}</div>
            <div className="lp-row"><strong>Wys./Szer.:</strong> {previewPlant.wys_szer} cm</div>
            <div className="lp-row"><strong>Stanowisko:</strong> {previewPlant.stanowisko}</div>
            <div className="lp-row"><strong>Kwitnienie:</strong> {previewPlant.kwitnienie}</div>
            <div className="lp-row"><strong>Zimozielona:</strong> {previewPlant.zimozielona}</div>
          </div>
          <p className="hint-text" style={{ marginTop: 6 }}>Tak wygląda jedna etykieta — każda odmiana dostanie swoją z takimi danymi. Ustaw poniżej ile sztuk każdej potrzebujesz i drukuj.</p>
        </div>
      )}

      {mode === "odmiana" && (
        <>
          <div className="etykiety-actions">
            <button className="secondary-btn" onClick={fillFromStock}>Uzupełnij z magazynu</button>
            <button className="ghost-btn" onClick={clearAll}>Wyczyść</button>
          </div>
          <div className="plant-list">
            {plants.map((p) => (
              <div key={p.id} className="label-count-card">
                <div>
                  <div className="plant-name">{p.nazwa_pl}</div>
                  <div className="plant-variety">{p.odmiana}</div>
                </div>
                <div className="stepper">
                  <button className="stepper-btn" onClick={() => bump(p.id, -1)}><Minus size={15} /></button>
                  <input className="stepper-input" type="number" min="0" inputMode="numeric" value={counts[p.id] || 0} onChange={(e) => setCount(p.id, e.target.value)} />
                  <button className="stepper-btn" onClick={() => bump(p.id, 1)}><Plus size={15} /></button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {mode === "partia" && (
        <>
          <p className="hint-text" style={{ marginTop: 10 }}>
            Etykieta dla konkretnego segmentu partii — dodatkowo pokaże pojemnik, lokalizację i numer partii, żeby dało się później jednoznacznie powiązać roślinę z Partiami.
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
          <div className="etykiety-actions">
            <button className="secondary-btn" onClick={fillSegmentsFromStock}>Uzupełnij ilością segmentu</button>
            <button className="ghost-btn" onClick={clearSegments}>Wyczyść</button>
          </div>
          <div className="plant-list">
            {activeSegments.length === 0 && (
              <div className="empty-state">Brak aktywnych segmentów partii{filterPlantId ? " dla wybranej odmiany" : ""}. Etykiety wg partii wymagają śledzenia partii (Zakup/Podział/Przesadzenie z opcją „Śledź jako partię").</div>
            )}
            {activeSegments.map((s) => (
              <div key={s.id} className="label-count-card">
                <div>
                  <div className="plant-name">{plantName(plants, s.plantId)}</div>
                  <div className="plant-variety">{containerLabel(s.container)}{s.location ? ` — ${s.location}` : ""} · Partia {batchLabel((batches || []).find((b) => b.id === s.batchId))} · dostępne: {s.ilosc}</div>
                </div>
                <div className="stepper">
                  <button className="stepper-btn" onClick={() => bumpSegment(s.id, -1, s.ilosc)}><Minus size={15} /></button>
                  <input className="stepper-input" type="number" min="0" max={s.ilosc} inputMode="numeric" value={segmentCounts[s.id] || 0} onChange={(e) => setSegmentCount(s.id, e.target.value, s.ilosc)} />
                  <button className="stepper-btn" onClick={() => bumpSegment(s.id, 1, s.ilosc)}><Plus size={15} /></button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="print-bar">
        <span>{totalLabels} etykiet do wydruku</span>
        <button className="primary-btn" disabled={totalLabels === 0} onClick={handlePrint}><Printer size={17} /> Drukuj</button>
      </div>

      {printMode === "thermal" && (
        <style>{`@page thermal { size: ${w}mm ${h}mm; margin: 0; }`}</style>
      )}

      <div className={`print-area ${printMode === "thermal" ? "thermal" : ""}`}>
        <div className="print-grid">
          {mode === "odmiana" && labelPlants.map((p, i) => (
            <div className="print-label" key={i} style={printMode === "thermal" ? { width: `${w}mm`, height: `${h}mm` } : undefined}>
              <div className="pl-name">{p.nazwa_pl}</div>
              <div className="pl-variety">{p.odmiana}</div>
              <div className="pl-row"><strong>Wys./Szer.:</strong> {p.wys_szer} cm</div>
              <div className="pl-row"><strong>Stanowisko:</strong> {p.stanowisko}</div>
              <div className="pl-row"><strong>Kwitnienie:</strong> {p.kwitnienie}</div>
              <div className="pl-row"><strong>Zimozielona:</strong> {p.zimozielona}</div>
            </div>
          ))}
          {mode === "partia" && labelSegments.map((s, i) => {
            const p = plants.find((pp) => pp.id === s.plantId);
            const batch = (batches || []).find((b) => b.id === s.batchId);
            const style = printMode === "thermal" ? { width: `${w}mm`, height: `${h}mm` } : undefined;
            if (passportMode) {
              const f = buildPassportFields(p, batch, piorinNumber, originCountry);
              return (
                <div className="print-label" key={i} style={style}>
                  <div className="passport-header">
                    <span className="passport-flag">UE</span>
                    <span className="passport-title">Paszport roślin / Plant passport</span>
                  </div>
                  <div className="passport-row"><span className="passport-letter">A</span>{f.A}</div>
                  <div className="passport-row"><span className="passport-letter">B</span>{f.B}</div>
                  <div className="passport-row"><span className="passport-letter">C</span>{f.C}</div>
                  <div className="passport-row"><span className="passport-letter">D</span>{f.D}</div>
                </div>
              );
            }
            return (
              <div className="print-label" key={i} style={style}>
                <div className="pl-name">{p ? p.nazwa_pl : s.plantId}</div>
                <div className="pl-variety">{p ? p.odmiana : ""}</div>
                {p && <div className="pl-row"><strong>Wys./Szer.:</strong> {p.wys_szer} cm</div>}
                {p && <div className="pl-row"><strong>Stanowisko:</strong> {p.stanowisko}</div>}
                <div className="pl-row"><strong>Pojemnik:</strong> {containerLabel(s.container)}{s.location ? ` — ${s.location}` : ""}</div>
                <div className="pl-row"><strong>Partia:</strong> {batchLabel(batch)}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Style                                                                   */
/* ---------------------------------------------------------------------- */
