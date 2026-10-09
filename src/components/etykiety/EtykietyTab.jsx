import { useState } from "react";
import { Minus, Plus, Printer, QrCode } from "lucide-react";
import { DEFAULT_LABEL_SETTINGS } from "../../constants";
import { QRCodeSVG } from "qrcode.react";
import { clampInt, containerLabel } from "../../utils/helpers";
import { plantName, batchLabel } from "../magazyn/PartiePanel";
import { NumberInput } from "../shared/NumberInput";

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
 * Paszport zawiera pola A/B/C/D i może mieć dodatkowy QR z ich tekstową
 * zawartością. Ten uproszczony wzór nie jest potwierdzeniem zgodności
 * prawnej — przed użyciem handlowym trzeba zweryfikować dane i układ
 * z aktualnymi wymaganiami PIORiN.
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

export function buildPassportQrPayload(fields) {
  return `Plant Passport\nA: ${fields.A}\nB: ${fields.B}\nC: ${fields.C}\nD: ${fields.D}`;
}

const LABEL_FIELD_OPTIONS = [
  ["commonName", "Nazwa polska"],
  ["botanicalName", "Nazwa botaniczna"],
  ["dimensions", "Wysokość i szerokość"],
  ["exposure", "Stanowisko"],
  ["bloom", "Kwitnienie"],
  ["evergreen", "Zimozieloność"],
  ["container", "Pojemnik"],
  ["location", "Lokalizacja"],
  ["batch", "Numer partii"],
];

function LabelArtwork({ plant, segment, batch, passportMode, settings, piorinNumber, originCountry, thermal = false, thermalSize }) {
  const fields = buildPassportFields(plant, batch, piorinNumber, originCountry);
  const labelFields = settings.labelFields || {};
  const containerText = segment
    ? `${containerLabel(segment.container)}${segment.location ? ` — ${segment.location}` : ""}`
    : "";

  return (
    <div
      className={`print-label ${thermal ? "thermal-label" : ""}`}
      style={thermal && thermalSize ? { width: `${thermalSize.width}mm`, height: `${thermalSize.height}mm` } : undefined}
    >
      {passportMode ? (
        <>
          <div className="passport-header">
            <span className="passport-flag">UE</span>
            <span className="passport-title">Paszport roślin / Plant passport</span>
          </div>
          <div className="passport-content">
            <div className="passport-fields">
              {["A", "B", "C", "D"].map((key) => (
                <div className="passport-row" key={key}><span className="passport-letter">{key}</span>{fields[key]}</div>
              ))}
              {settings.passportNote && <div className="passport-note">{settings.passportNote}</div>}
            </div>
            {settings.passportQr && (
              <div className="passport-qr" aria-label="Kod QR z danymi pól paszportu A, B, C i D">
                <QRCodeSVG value={buildPassportQrPayload(fields)} size={72} level="M" marginSize={1} />
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          {labelFields.commonName && plant && <div className="pl-name">{plant.nazwa_pl}</div>}
          {labelFields.botanicalName && plant && <div className="pl-variety">{plant.odmiana}</div>}
          {labelFields.dimensions && plant && <div className="pl-row"><strong>Wys./Szer.:</strong> {plant.wys_szer} cm</div>}
          {labelFields.exposure && plant && <div className="pl-row"><strong>Stanowisko:</strong> {plant.stanowisko}</div>}
          {labelFields.bloom && plant && <div className="pl-row"><strong>Kwitnienie:</strong> {plant.kwitnienie}</div>}
          {labelFields.evergreen && plant && <div className="pl-row"><strong>Zimozielona:</strong> {plant.zimozielona}</div>}
          {segment && labelFields.container && <div className="pl-row"><strong>Pojemnik:</strong> {containerText}</div>}
          {segment && labelFields.batch && <div className="pl-row"><strong>Partia:</strong> {batchLabel(batch)}</div>}
          {settings.labelNote && <div className="pl-row label-note">{settings.labelNote}</div>}
        </>
      )}
    </div>
  );
}

export function EtykietyTab({ plants, inventory, potSizes, batchSegments, batches, piorinNumber, setPiorinNumber, originCountry, setOriginCountry, thermalLabelSize, setThermalLabelSize, labelSettings, setLabelSettings }) {
  const [mode, setMode] = useState("odmiana");
  const [printMode, setPrintMode] = useState("a4"); // "a4" | "thermal"
  const [passportMode, setPassportMode] = useState(false);
  const isPassportMode = mode === "partia" && passportMode;
  const settings = {
    ...DEFAULT_LABEL_SETTINGS,
    ...(labelSettings || {}),
    labelFields: { ...DEFAULT_LABEL_SETTINGS.labelFields, ...(labelSettings?.labelFields || {}) },
  };
  function updateSettings(patch) {
    setLabelSettings((prev) => ({ ...prev, ...patch }));
  }
  function toggleLabelField(field) {
    setLabelSettings((prev) => ({
      ...prev,
      labelFields: { ...prev.labelFields, [field]: !prev.labelFields[field] },
    }));
  }

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

  const firstSelectedSegment = labelSegments[0] || activeSegments[0] || null;
  const preview = mode === "odmiana"
    ? { plant: labelPlants[0] || plants[0] || null, segment: null, batch: null }
    : {
      plant: plants.find((plant) => plant.id === (firstSelectedSegment?.plantId || filterPlantId)) || plants[0] || null,
      segment: firstSelectedSegment,
      batch: (batches || []).find((item) => item.id === firstSelectedSegment?.batchId) || null,
    };
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
              <NumberInput inputMode="numeric" min="10" value={thermalLabelSize?.width || 40}
                onChange={(e) => setThermalLabelSize({ ...thermalLabelSize, width: clampInt(e.target.value, 10) })} style={{ maxWidth: 80 }} />
              <span style={{ fontSize: 12 }}>×</span>
              <NumberInput inputMode="numeric" min="10" value={thermalLabelSize?.height || 30}
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
            <span>Paszport roślin (UE) — wymagane pola A/B/C/D</span>
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
              <label className="checkbox-field">
                <input type="checkbox" checked={settings.passportQr} onChange={(e) => updateSettings({ passportQr: e.target.checked })} />
                <span><QrCode size={15} /> Dodaj kod QR z polami A/B/C/D (nie zastępuje pól na paszporcie)</span>
              </label>
              <label className="field">
                <span>Dodatkowa własna treść (opcjonalnie)</span>
                <input type="text" maxLength="80" value={settings.passportNote} onChange={(e) => updateSettings({ passportNote: e.target.value })} placeholder="np. nazwa szkółki lub kontakt" />
              </label>
              {!piorinNumber && <p className="hint-text" style={{ color: "var(--danger, #c0392b)" }}>Podaj numer PIORiN — bez niego pole B na paszporcie zostanie puste.</p>}
              <p className="hint-text">Kod QR zawiera tekst pól A/B/C/D, działa bez internetu i jest tylko dodatkiem. Przed użyciem sprawdź zgodność wzoru paszportu z aktualnymi wymaganiami PIORiN.</p>
            </>
          )}
        </div>
      )}

      {!isPassportMode && (
        <div className="label-preview-section">
          <div className="section-title small-title" style={{ marginBottom: 6 }}>Treść etykiety — wybierz widoczne pola</div>
          <div className="label-field-options">
            {LABEL_FIELD_OPTIONS.map(([field, label]) => (
              <label className="checkbox-field" key={field}>
                <input type="checkbox" checked={Boolean(settings.labelFields[field])} onChange={() => toggleLabelField(field)} />
                <span>{label}</span>
              </label>
            ))}
          </div>
          <label className="field label-note-input">
            <span>Własny tekst na etykiecie (opcjonalnie)</span>
            <input type="text" maxLength="80" value={settings.labelNote} onChange={(e) => updateSettings({ labelNote: e.target.value })} placeholder="np. Szkółka Trawy · www…" />
          </label>
          <div className="section-title small-title" style={{ margin: "12px 0 6px" }}>Podgląd przed drukiem</div>
          {preview.plant ? (
            <div className="label-preview-card" style={printMode === "thermal" ? { width: `${w}mm`, minHeight: `${h}mm` } : undefined}>
              <LabelArtwork {...preview} passportMode={false} settings={settings} piorinNumber={piorinNumber} originCountry={originCountry} thermal={printMode === "thermal"} thermalSize={{ width: w, height: h }} />
            </div>
          ) : <div className="empty-state">Dodaj roślinę, aby zobaczyć podgląd etykiety.</div>}
          <p className="hint-text" style={{ marginTop: 6 }}>Podgląd używa tego samego układu co wydruk. Zmiany pól i tekstu zostaną zapisane i użyte przy kolejnych wydrukach.</p>
        </div>
      )}

      {isPassportMode && (
        <div className="label-preview-section">
          <div className="section-title small-title" style={{ marginBottom: 6 }}>Podgląd paszportu przed drukiem</div>
          {preview.plant ? (
            <div className="label-preview-card passport-preview" style={printMode === "thermal" ? { width: `${w}mm`, minHeight: `${h}mm` } : undefined}>
              <LabelArtwork {...preview} passportMode settings={settings} piorinNumber={piorinNumber} originCountry={originCountry} thermal={printMode === "thermal"} thermalSize={{ width: w, height: h }} />
            </div>
          ) : <div className="empty-state">Wybierz odmianę lub partię, aby zobaczyć podgląd paszportu.</div>}
          <p className="hint-text" style={{ marginTop: 6 }}>Pola A/B/C/D pozostają widoczne na paszporcie; dodatkowy tekst i kod QR można ustawić powyżej.</p>
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
                  <NumberInput className="stepper-input" min="0" inputMode="numeric" value={counts[p.id] || 0} onChange={(e) => setCount(p.id, e.target.value)} />
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
                  <NumberInput className="stepper-input" min="0" max={s.ilosc} inputMode="numeric" value={segmentCounts[s.id] || 0} onChange={(e) => setSegmentCount(s.id, e.target.value, s.ilosc)} />
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
            <LabelArtwork
              key={i}
              plant={p}
              segment={null}
              batch={null}
              passportMode={false}
              settings={settings}
              piorinNumber={piorinNumber}
              originCountry={originCountry}
              thermal={printMode === "thermal"}
              thermalSize={{ width: w, height: h }}
            />
          ))}
          {mode === "partia" && labelSegments.map((s, i) => {
            const p = plants.find((pp) => pp.id === s.plantId);
            const batch = (batches || []).find((b) => b.id === s.batchId);
            return (
              <LabelArtwork
                key={i}
                plant={p}
                segment={s}
                batch={batch}
                passportMode={isPassportMode}
                settings={settings}
                piorinNumber={piorinNumber}
                originCountry={originCountry}
                thermal={printMode === "thermal"}
                thermalSize={{ width: w, height: h }}
              />
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
