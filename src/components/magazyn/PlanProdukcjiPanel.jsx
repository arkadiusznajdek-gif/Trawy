import { useState, useMemo } from "react";
import { containerLabel } from "../../utils/helpers";
import { plantName, batchLabel } from "./PartiePanel";

/*
 * ROADMAPA (SHOULD HAVE, pkt 6): planowanie produkcji. Plan to notatka
 * "zamierzam w kwietniu podzielić Segment X, spodziewam się ~500 nowych
 * sztuk" — całkowicie oddzielona od modelu Batch/BatchSegment (patrz
 * utils/productionPlans.js). Realne wykonanie nadal dzieje się przez
 * istniejący ekran Podział; ten panel tylko pomaga zaplanować z wyprzedzeniem
 * i ręcznie oznaczyć plan jako wykonany/anulowany po fakcie.
 */

const STATUS_LABELS = { planowane: "Planowane", wykonane: "Wykonane", anulowane: "Anulowane" };
const MONTH_NAMES = ["Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec", "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień"];

export function PlanProdukcjiPanel({ plants, batchSegments, batches, productionPlans, onAddPlan, onSetStatus, onDeletePlan }) {
  const [addOpen, setAddOpen] = useState(false);
  const [plantId, setPlantId] = useState(plants[0] ? plants[0].id : "");
  const [sourceSegmentId, setSourceSegmentId] = useState("");
  const [targetContainer, setTargetContainer] = useState("");
  const [targetLocation, setTargetLocation] = useState("");
  const [expectedQty, setExpectedQty] = useState(0);
  const now = new Date();
  const [plannedYear, setPlannedYear] = useState(now.getFullYear());
  const [plannedMonth, setPlannedMonth] = useState(now.getMonth() + 1);
  const [note, setNote] = useState("");
  const [showDone, setShowDone] = useState(false);

  const matchingSegments = (batchSegments || []).filter((s) => s.plantId === plantId && s.status === "aktywny" && Number(s.ilosc || 0) > 0);

  function submit() {
    onAddPlan({ plantId, sourceSegmentId: sourceSegmentId || null, targetContainer: targetContainer.trim() || null, targetLocation: targetLocation.trim() || null, expectedQty: Number(expectedQty || 0), plannedYear: Number(plannedYear), plannedMonth: Number(plannedMonth), note: note.trim() });
    setSourceSegmentId(""); setTargetContainer(""); setTargetLocation(""); setExpectedQty(0); setNote("");
    setAddOpen(false);
  }

  const visible = useMemo(
    () => productionPlans.filter((p) => (showDone ? true : p.status === "planowane")).sort((a, b) => (a.plannedYear - b.plannedYear) || (a.plannedMonth - b.plannedMonth)),
    [productionPlans, showDone]
  );

  return (
    <div>
      <p className="hint-text" style={{ marginTop: 12 }}>
        Notatka na przyszłość — nie tworzy żadnej partii ani nie rezerwuje stanu. Wykonanie nadal robisz przez ekran Podział; tu tylko planujesz z wyprzedzeniem i odhaczasz po fakcie.
      </p>

      <div className="form-actions">
        <button className="primary-btn" onClick={() => setAddOpen((v) => !v)}>{addOpen ? "Anuluj" : "Dodaj plan"}</button>
        <label className="checkbox-field" style={{ marginLeft: "auto" }}>
          <input type="checkbox" checked={showDone} onChange={(e) => setShowDone(e.target.checked)} />
          <span>Pokaż wykonane/anulowane</span>
        </label>
      </div>

      {addOpen && (
        <div className="order-form">
          <label className="field">
            <span>Odmiana</span>
            <select value={plantId} onChange={(e) => { setPlantId(e.target.value); setSourceSegmentId(""); }}>
              {plants.map((p) => <option key={p.id} value={p.id}>{p.nazwa_pl} — {p.odmiana}</option>)}
            </select>
          </label>

          <label className="field">
            <span>Segment źródłowy (opcjonalnie)</span>
            <select value={sourceSegmentId} onChange={(e) => setSourceSegmentId(e.target.value)}>
              <option value="">— nie wskazuję / bez śledzonej partii —</option>
              {matchingSegments.map((s) => (
                <option key={s.id} value={s.id}>
                  {containerLabel(s.container)}{s.location ? ` — ${s.location}` : ""} · {s.ilosc} szt. · partia {batchLabel((batches || []).find((b) => b.id === s.batchId))}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Planowany miesiąc</span>
            <div className="order-item-sub">
              <select value={plannedMonth} onChange={(e) => setPlannedMonth(e.target.value)}>
                {MONTH_NAMES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
              </select>
              <input type="number" inputMode="numeric" value={plannedYear} onChange={(e) => setPlannedYear(e.target.value)} style={{ maxWidth: 90 }} />
            </div>
          </label>

          <label className="field">
            <span>Docelowy pojemnik (opcjonalnie)</span>
            <input type="text" placeholder="np. P9" value={targetContainer} onChange={(e) => setTargetContainer(e.target.value)} />
          </label>
          <label className="field">
            <span>Docelowa lokalizacja (opcjonalnie)</span>
            <input type="text" placeholder="np. Kwatera B" value={targetLocation} onChange={(e) => setTargetLocation(e.target.value)} />
          </label>
          <label className="field">
            <span>Spodziewana ilość nowych sztuk</span>
            <input type="number" inputMode="numeric" min="0" value={expectedQty} onChange={(e) => setExpectedQty(e.target.value)} />
          </label>
          <label className="field">
            <span>Notatka (opcjonalnie)</span>
            <input type="text" value={note} onChange={(e) => setNote(e.target.value)} />
          </label>

          <button className="primary-btn" onClick={submit}>Zapisz plan</button>
        </div>
      )}

      <div className="order-list">
        {visible.length === 0 && <div className="empty-state">Brak {showDone ? "żadnych" : "aktywnych"} planów produkcji.</div>}
        {visible.map((p) => {
          const seg = p.sourceSegmentId ? (batchSegments || []).find((s) => s.id === p.sourceSegmentId) : null;
          return (
            <div key={p.id} className="order-card">
              <div className="order-card-head static">
                <div>
                  <div className="order-client">{plantName(plants, p.plantId)} — {MONTH_NAMES[p.plannedMonth - 1]} {p.plannedYear}</div>
                  <div className="order-date">
                    {seg ? `źródło: ${containerLabel(seg.container)}${seg.location ? ` (${seg.location})` : ""} · ` : ""}
                    {p.targetContainer ? `cel: ${containerLabel(p.targetContainer)}${p.targetLocation ? ` (${p.targetLocation})` : ""} · ` : ""}
                    {p.expectedQty ? `~${p.expectedQty} szt.` : "ilość nieokreślona"}
                    {p.note ? ` · ${p.note}` : ""}
                  </div>
                </div>
                <div className="order-card-right">
                  <span className={`status-badge ${p.status === "wykonane" ? "ok" : p.status === "anulowane" ? "" : "new"}`}>{STATUS_LABELS[p.status]}</span>
                </div>
              </div>
              {p.status === "planowane" && (
                <div className="order-card-body">
                  <div className="form-actions">
                    <button className="secondary-btn small" onClick={() => onSetStatus(p.id, "wykonane")}>Oznacz jako wykonane</button>
                    <button className="ghost-btn small" onClick={() => onSetStatus(p.id, "anulowane")}>Anuluj plan</button>
                    <button className="icon-btn danger" onClick={() => onDeletePlan(p.id)}>Usuń</button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
