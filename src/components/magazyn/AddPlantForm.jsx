import { useState } from "react";
import { MONTHS } from "../../constants";

export function MonthChips({ selected, onToggle }) {
  return (
    <div className="month-chips">
      {MONTHS.slice(1).map((name, i) => {
        const m = i + 1;
        const active = selected.includes(m);
        return (
          <button type="button" key={m} className={`month-chip ${active ? "active" : ""}`} onClick={() => onToggle(m)}>
            {name.slice(0, 3)}
          </button>
        );
      })}
    </div>
  );
}

export function AddPlantForm({ onSave, onCancel }) {
  const [f, setF] = useState({
    nazwa_pl: "", odmiana: "", wys_szer: "", stanowisko: "", kwitnienie: "", zimozielona: "Nie",
    opis: "", ciecie_months: [], podzial_months: [], special: false,
  });
  function toggleMonth(field, m) {
    setF((prev) => {
      const arr = prev[field].includes(m) ? prev[field].filter((x) => x !== m) : [...prev[field], m].sort((a, b) => a - b);
      return { ...prev, [field]: arr };
    });
  }
  function submit() {
    if (!f.nazwa_pl.trim() || !f.odmiana.trim()) return;
    onSave(f);
  }
  return (
    <div className="order-form">
      <label className="field"><span>Nazwa polska</span><input value={f.nazwa_pl} onChange={(e) => setF({ ...f, nazwa_pl: e.target.value })} placeholder="np. Rozplenica" /></label>
      <label className="field"><span>Odmiana / nazwa łacińska</span><input value={f.odmiana} onChange={(e) => setF({ ...f, odmiana: e.target.value })} placeholder="np. Pennisetum 'Nowa'" /></label>
      <label className="field"><span>Wys./szer. (cm)</span><input value={f.wys_szer} onChange={(e) => setF({ ...f, wys_szer: e.target.value })} placeholder="80-100 / 60" /></label>
      <label className="field"><span>Stanowisko</span><input value={f.stanowisko} onChange={(e) => setF({ ...f, stanowisko: e.target.value })} placeholder="Słońce; żyzna, wilgotna" /></label>
      <label className="field"><span>Kwitnienie</span><input value={f.kwitnienie} onChange={(e) => setF({ ...f, kwitnienie: e.target.value })} placeholder="VIII-X; beżowe" /></label>
      <label className="field">
        <span>Zimozielona</span>
        <select value={f.zimozielona} onChange={(e) => setF({ ...f, zimozielona: e.target.value })}>
          <option value="Nie">Nie</option><option value="Tak">Tak</option><option value="Częściowo">Częściowo</option>
        </select>
      </label>
      <label className="field"><span>Krótki opis (sprzedażowy)</span><input value={f.opis} onChange={(e) => setF({ ...f, opis: e.target.value })} placeholder="1 zdanie — do czego się nadaje" /></label>
      <label className="field"><span>Miesiące cięcia</span><MonthChips selected={f.ciecie_months} onToggle={(m) => toggleMonth("ciecie_months", m)} /></label>
      <label className="field"><span>Miesiące podziału</span><MonthChips selected={f.podzial_months} onToggle={(m) => toggleMonth("podzial_months", m)} /></label>
      <label className="checkbox-field">
        <input type="checkbox" checked={f.special} onChange={(e) => setF({ ...f, special: e.target.checked })} />
        <span>Nie ścinać — tylko pielęgnacja/wyczesywanie</span>
      </label>
      <div className="form-actions">
        <button className="secondary-btn" onClick={onCancel}>Anuluj</button>
        <button className="primary-btn" disabled={!f.nazwa_pl.trim() || !f.odmiana.trim()} onClick={submit}>Zapisz odmianę</button>
      </div>
    </div>
  );
}

/* ---- Zaopatrzenie (donice, podłoże, materiały) ---- */
