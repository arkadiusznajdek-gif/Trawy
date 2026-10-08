import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { LOSS_REASONS } from "../../constants";
import { clampInt, containerLabel, money, resolveContainers } from "../../utils/helpers";
import { batchLabel } from "./PartiePanel";
import { NumberInput } from "../shared/NumberInput";

export function emptyLossForm(plants, containers) {
  return { plantId: plants[0] ? plants[0].id : "", container: containers && containers[0] ? containers[0] : "P9", ilosc: "", powod: LOSS_REASONS[0], komentarz: "", data: new Date().toISOString().slice(0, 10) };
}

export function StratyPanel({ plants, inventory, containers, plantContainerSizes, losses, onAdd, onDelete, costs, batchSegments, batches }) {
  const [addOpen, setAddOpen] = useState(false);
  const [typ, setTyp] = useState("strata");
  const [f, setF] = useState(() => emptyLossForm(plants, containers));
  const [trackAsBatch, setTrackAsBatch] = useState(false);
  const [segmentId, setSegmentId] = useState("");
  const [confirmingId, setConfirmingId] = useState(null);
  const [formError, setFormError] = useState("");

  const matchingSegments = (batchSegments || []).filter(
    (s) => s.plantId === f.plantId && s.container === f.container && s.status === "aktywny"
  );
  const currentStock = Number(inventory?.[f.plantId]?.[f.container] || 0);
  const selectedSegment = matchingSegments.find((s) => s.id === segmentId) || null;
  // NAPRAWA WARNING #4 (etap 10): wycena straty/usunięcia musi korzystać z KOSZTU
  // (costs — cena wytworzenia), nie z CENY sprzedaży (cennik) — to były pomylone
  // pojęcia. Segment wybrany jawnie przez użytkownika ma pierwszeństwo.
  const unitCost = selectedSegment ? Number(selectedSegment.kosztJednostkowy || 0) : Number(costs[f.plantId]?.[f.container] || 0);
  const wartosc = unitCost * clampInt(f.ilosc, 0);

  function selectPlant(plantId) {
    const avail = resolveContainers(plantContainerSizes, containers, plantId);
    setF((prev) => ({ ...prev, plantId, container: avail.includes(prev.container) ? prev.container : avail[0] }));
    setSegmentId("");
    setFormError("");
  }
  function selectContainer(container) {
    setF((prev) => ({ ...prev, container }));
    setSegmentId("");
    setFormError("");
  }
  function setTypAndReset(nextTyp) {
    setTyp(nextTyp);
    setF((prev) => ({ ...prev, powod: nextTyp === "strata" ? LOSS_REASONS[0] : "" }));
    setFormError("");
  }

  function submit() {
    setFormError("");
    if (!f.plantId) { setFormError("Wybierz odmianę."); return; }
    if (clampInt(f.ilosc, 0) <= 0) { setFormError("Podaj ilość większą od zera."); return; }
    if (!f.powod || !f.powod.trim()) { setFormError("Podaj powód."); return; }
    if (trackAsBatch && !segmentId) { setFormError("Zaznaczyłeś „Śledź jako partię” — wybierz rzeczywisty segment, albo odznacz śledzenie."); return; }
    if (trackAsBatch && selectedSegment && clampInt(f.ilosc, 0) > Number(selectedSegment.ilosc || 0)) {
      setFormError(`Ilość (${clampInt(f.ilosc, 0)}) przekracza stan segmentu (${selectedSegment.ilosc} szt.).`);
      return;
    }
    if (!trackAsBatch && clampInt(f.ilosc, 0) > currentStock) { setFormError(`Ilość (${clampInt(f.ilosc, 0)}) przekracza dostępny stan (${currentStock} szt.).`); return; }

    onAdd({ ...f, ilosc: clampInt(f.ilosc, 1), typ, trackAsBatch, segmentId: trackAsBatch ? segmentId : null });
    setF(emptyLossForm(plants, containers));
    setTyp("strata");
    setTrackAsBatch(false);
    setSegmentId("");
    setAddOpen(false);
  }

  const now = new Date();
  const curKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const monthLosses = losses.filter((l) => (l.typ || "strata") === "strata" && (l.data || "").startsWith(curKey));
  const monthCount = monthLosses.reduce((s, l) => s + Number(l.ilosc || 0), 0);
  const monthValue = monthLosses.reduce((s, l) => {
    const koszt = costs[l.plantId]?.[l.container] || 0;
    return s + koszt * Number(l.ilosc || 0);
  }, 0);

  return (
    <div>
      <div className="totals-row" style={{ marginTop: 12 }}>
        <div className="totals-chip">
          <span className="totals-num">{monthCount}</span>
          <span className="totals-label">strat w tym mies.</span>
        </div>
        <div className="totals-chip">
          <span className="totals-num">{money(monthValue)}</span>
          <span className="totals-label">szac. wartość (zł)</span>
        </div>
      </div>

      {!addOpen ? (
        <div className="form-actions">
          <button className="primary-btn" onClick={() => { setTypAndReset("strata"); setAddOpen(true); }}><Plus size={17} /> Zgłoś stratę</button>
          <button className="secondary-btn" onClick={() => { setTypAndReset("usuniecie"); setAddOpen(true); }}><Trash2 size={17} /> Zgłoś usunięcie</button>
        </div>
      ) : (
        <div className="order-form">
          <div className="segmented">
            <button className={typ === "strata" ? "active" : ""} onClick={() => setTypAndReset("strata")}>Strata</button>
            <button className={typ === "usuniecie" ? "active" : ""} onClick={() => setTypAndReset("usuniecie")}>Usunięcie</button>
          </div>
          <p className="hint-text">
            {typ === "strata"
              ? "Strata — roślina zginęła lub została utracona (choroba, warunki, szkodniki...)."
              : "Usunięcie — świadoma decyzja (np. wycofanie słabej jakości matecznika). To nie jest strata biologiczna."}
          </p>

          <label className="field">
            <span>Odmiana</span>
            <select value={f.plantId} onChange={(e) => selectPlant(e.target.value)}>
              {plants.map((p) => <option key={p.id} value={p.id}>{p.nazwa_pl} — {p.odmiana}</option>)}
            </select>
          </label>
          <label className="field">
            <span>Pojemnik — obecny stan: {currentStock} szt.</span>
            <select value={f.container} onChange={(e) => selectContainer(e.target.value)}>
              {resolveContainers(plantContainerSizes, containers, f.plantId).map((c) => <option key={c} value={c}>{containerLabel(c)}</option>)}
            </select>
          </label>

          <label className="checkbox-field">
            <input type="checkbox" checked={trackAsBatch} onChange={(e) => { setTrackAsBatch(e.target.checked); setSegmentId(""); setFormError(""); }} />
            <span>Śledź jako partię (wymaga wskazania rzeczywistego segmentu)</span>
          </label>
          {trackAsBatch && matchingSegments.length > 0 && (
            <label className="field">
              <span>Segment</span>
              <select value={segmentId} onChange={(e) => { setSegmentId(e.target.value); setFormError(""); }}>
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
            <p className="hint-text">Brak śledzonej partii dla tej odmiany i pojemnika — odznacz „Śledź jako partię”.</p>
          )}

          <div className="order-item-sub">
            <NumberInput inputMode="numeric" min="1" value={f.ilosc} onChange={(e) => setF({ ...f, ilosc: e.target.value })} />
            <span style={{ fontSize: 12, color: "var(--ink-muted)" }}>szt.</span>
          </div>

          {typ === "strata" ? (
            <label className="field">
              <span>Powód</span>
              <select value={f.powod} onChange={(e) => setF({ ...f, powod: e.target.value })}>
                {LOSS_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </label>
          ) : (
            <label className="field">
              <span>Powód (opisowo)</span>
              <input type="text" placeholder="np. wycofanie słabej jakości matecznika" value={f.powod} onChange={(e) => setF({ ...f, powod: e.target.value })} />
            </label>
          )}
          <label className="field">
            <span>Komentarz (opcjonalnie)</span>
            <input type="text" value={f.komentarz} onChange={(e) => setF({ ...f, komentarz: e.target.value })} />
          </label>
          <label className="field"><span>Data</span><input type="date" value={f.data} onChange={(e) => setF({ ...f, data: e.target.value })} /></label>

          <div className="order-item-subtotal">Wartość {typ === "strata" ? "straty" : "usunięcia"}: ~{money(wartosc)} zł ({clampInt(f.ilosc, 0)} × {money(unitCost)} zł/szt.)</div>

          {formError && <p className="hint-text" style={{ color: "var(--danger, #c0392b)" }}>{formError}</p>}

          <div className="form-actions">
            <button className="secondary-btn" onClick={() => setAddOpen(false)}>Anuluj</button>
            <button className="primary-btn" onClick={submit}>{typ === "strata" ? "Zapisz stratę" : "Usuń"}</button>
          </div>
        </div>
      )}

      <div className="order-list">
        {losses.length === 0 && !addOpen && <div className="empty-state">Brak zarejestrowanych strat i usunięć.</div>}
        {losses.map((l) => {
          const p = plants.find((pp) => pp.id === l.plantId);
          return (
            <div key={l.id} className="order-card">
              <div className="order-card-head static">
                <div>
                  <div className="order-client">{p ? `${p.nazwa_pl} (${p.odmiana})` : l.plantId}</div>
                  <div className="order-date">{l.data} · {containerLabel(l.container)} · {(l.typ || "strata") === "usuniecie" ? "Usunięcie" : "Strata"} · {l.powod}{l.komentarz ? ` — ${l.komentarz}` : ""}</div>
                </div>
                <div className="order-card-right">
                  <span className="order-sum">-{l.ilosc} szt.</span>
                  {confirmingId !== l.id && (
                    <button className="icon-btn danger" onClick={() => setConfirmingId(l.id)}><Trash2 size={14} /></button>
                  )}
                </div>
              </div>
              {confirmingId === l.id && (
                <div className="order-card-body">
                  <div className="confirm-box">
                    <span>Usunąć wpis? (nie przywróci to stanu magazynowego)</span>
                    <div className="confirm-actions">
                      <button className="danger-btn small" onClick={() => { onDelete(l.id); setConfirmingId(null); }}>Usuń</button>
                      <button className="ghost-btn small" onClick={() => setConfirmingId(null)}>Anuluj</button>
                    </div>
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
