import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { clampInt, money, uid } from "../../utils/helpers";

const PERIODS = ["miesięcznie", "rocznie", "jednorazowo"];

export function emptyOverheadForm() {
  return { nazwa: "", kwota: "", okres: "miesięcznie", data: new Date().toISOString().slice(0, 10) };
}

function annualizedValue(item) {
  const kwota = Number(item.kwota || 0);
  if (item.okres === "miesięcznie") return kwota * 12;
  if (item.okres === "rocznie") return kwota;
  return 0; // jednorazowe nie wchodzi do szacunku rocznego "na stałe"
}

export function KosztyStalePanel({ costs: overheadCosts, onAdd, onDelete }) {
  const [addOpen, setAddOpen] = useState(false);
  const [f, setF] = useState(emptyOverheadForm());
  const [confirmingId, setConfirmingId] = useState(null);

  const recurringYearly = overheadCosts.reduce((s, it) => s + annualizedValue(it), 0);
  const currentYear = new Date().getFullYear();
  const oneTimeThisYear = overheadCosts
    .filter((it) => it.okres === "jednorazowo" && (it.data || "").slice(0, 4) === String(currentYear))
    .reduce((s, it) => s + Number(it.kwota || 0), 0);

  function submit() {
    if (!f.nazwa.trim() || Number(f.kwota) <= 0) return;
    onAdd({ id: uid("oh"), nazwa: f.nazwa.trim(), kwota: Math.max(0, Number(f.kwota) || 0), okres: f.okres, data: f.data || new Date().toISOString().slice(0, 10) });
    setF(emptyOverheadForm());
    setAddOpen(false);
  }

  return (
    <div>
      <p className="hint-text">Koszty prowadzenia szkółki niezwiązane z konkretną rośliną — woda, prąd, nawozy, środki ochrony, ubezpieczenie itd. Nie wpływają na koszt/szt. w Cenniku.</p>

      <div className="stat-row" style={{ marginBottom: 12 }}>
        <div className="stat-box">
          <span className="stat-label">Stałe (miesięczne + roczne) w skali roku</span>
          <span className="stat-value">{money(recurringYearly)} zł</span>
        </div>
        <div className="stat-box">
          <span className="stat-label">Jednorazowe w {currentYear}</span>
          <span className="stat-value">{money(oneTimeThisYear)} zł</span>
        </div>
      </div>

      <div className="plant-list">
        {overheadCosts.length === 0 && <div className="empty-state">Brak wpisanych kosztów — dodaj poniżej.</div>}
        {overheadCosts.slice().sort((a, b) => (b.data || "").localeCompare(a.data || "")).map((it) => (
          <div key={it.id} className="supply-card">
            <div className="supply-card-main">
              <div className="plant-name">{it.nazwa}</div>
              <div className="supply-meta">{money(it.kwota)} zł · {it.okres}{it.okres === "jednorazowo" ? ` · ${it.data}` : ""}</div>
            </div>
            {confirmingId !== it.id ? (
              <button className="icon-btn danger" onClick={() => setConfirmingId(it.id)}><Trash2 size={16} /></button>
            ) : (
              <div className="confirm-box">
                <span>Usunąć?</span>
                <div className="confirm-actions">
                  <button className="danger-btn small" onClick={() => { onDelete(it.id); setConfirmingId(null); }}>Usuń</button>
                  <button className="ghost-btn small" onClick={() => setConfirmingId(null)}>Anuluj</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {!addOpen ? (
        <button className="ghost-btn add-plant-btn" onClick={() => setAddOpen(true)}><Plus size={15} /> Dodaj koszt</button>
      ) : (
        <div className="order-form">
          <label className="field"><span>Nazwa</span><input value={f.nazwa} onChange={(e) => setF({ ...f, nazwa: e.target.value })} placeholder="np. Prąd, Woda, Nawozy wiosenne" /></label>
          <label className="field"><span>Kwota (zł)</span><input type="number" inputMode="decimal" min="0" step="0.01" value={f.kwota} onChange={(e) => setF({ ...f, kwota: e.target.value })} placeholder="np. 250" /></label>
          <label className="field"><span>Okres</span>
            <select value={f.okres} onChange={(e) => setF({ ...f, okres: e.target.value })}>
              {PERIODS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </label>
          {f.okres === "jednorazowo" && (
            <label className="field"><span>Data</span><input type="date" value={f.data} onChange={(e) => setF({ ...f, data: e.target.value })} /></label>
          )}
          <div className="form-actions">
            <button className="secondary-btn" onClick={() => { setAddOpen(false); setF(emptyOverheadForm()); }}>Anuluj</button>
            <button className="primary-btn" disabled={!f.nazwa.trim() || !(Number(f.kwota) > 0)} onClick={submit}>Zapisz</button>
          </div>
        </div>
      )}
    </div>
  );
}
