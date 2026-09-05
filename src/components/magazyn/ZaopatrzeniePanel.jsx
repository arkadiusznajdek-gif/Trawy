import { useState } from "react";
import { ChevronDown, ChevronRight, Plus, Trash2 } from "lucide-react";
import { clampInt, money } from "../../utils/helpers";

export function emptySupplyForm() { return { nazwa: "", ilosc: 0, jednostka: "szt.", prog: "", cena: 0, typ: "inne", rozmiar: "" }; }

export function ZaopatrzeniePanel({ supplies, onChangeQty, onAdd, onRemove, potSizes, potRecipes, substrateCostPerL, onSetPotRecipe, onSetSubstrateCostPerL }) {
  const [addOpen, setAddOpen] = useState(false);
  const [recipeOpen, setRecipeOpen] = useState(false);
  const [f, setF] = useState(emptySupplyForm());
  const [confirmingId, setConfirmingId] = useState(null);

  function submit() {
    if (!f.nazwa.trim()) return;
    if (f.typ === "donica" && !f.rozmiar.trim()) return;
    onAdd({
      nazwa: f.nazwa.trim(),
      ilosc: clampInt(f.ilosc, 0),
      jednostka: f.jednostka.trim() || "szt.",
      prog: f.prog === "" ? null : clampInt(f.prog, 0),
      cena: Math.max(0, Number(f.cena) || 0),
      typ: f.typ,
      rozmiar: f.typ === "donica" ? f.rozmiar.trim() : null,
    });
    setF(emptySupplyForm());
    setAddOpen(false);
  }

  return (
    <div>
      <div className="pot-size-manager" style={{ marginTop: 12 }}>
        <button className="pot-size-toggle" onClick={() => setRecipeOpen(!recipeOpen)}>
          <span>Receptura pojemników (koszt donicy + zużycie podłoża)</span>
          {recipeOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
        </button>
        {recipeOpen && (
          <div className="pot-size-body">
            <p className="hint-text" style={{ margin: "0 0 8px" }}>
              Wiersze poniżej odpowiadają materiałom typu „donica” z listy pod spodem — dodaj tam nowy rozmiar, a pojawi się tu automatycznie. Ustaw raz koszt pustej donicy i ile litrów podłoża zużywa każdy rozmiar — system użyje tego przy każdym Podziale.
            </p>
            <label className="field" style={{ marginBottom: 10 }}>
              <span>Cena podłoża za litr</span>
              <div className="price-input-wrap">
                <input type="number" inputMode="decimal" min="0" value={substrateCostPerL} onChange={(e) => onSetSubstrateCostPerL(Math.max(0, Number(e.target.value) || 0))} />
                <span className="pln">zł/l</span>
              </div>
            </label>
            {potSizes.map((size) => {
              const r = potRecipes[size] || { koszt_donicy: 0, podloze_l: 0 };
              return (
                <div key={size} className="recipe-row">
                  <span className="recipe-size">{size}</span>
                  <div className="recipe-inputs">
                    <label>
                      <span>Donica</span>
                      <div className="price-input-wrap small">
                        <input type="number" inputMode="decimal" min="0" value={r.koszt_donicy} onChange={(e) => onSetPotRecipe(size, { koszt_donicy: Math.max(0, Number(e.target.value) || 0) })} />
                        <span className="pln">zł</span>
                      </div>
                    </label>
                    <label>
                      <span>Podłoże</span>
                      <div className="price-input-wrap small">
                        <input type="number" inputMode="decimal" min="0" value={r.podloze_l} onChange={(e) => onSetPotRecipe(size, { podloze_l: Math.max(0, Number(e.target.value) || 0) })} />
                        <span className="pln">l</span>
                      </div>
                    </label>
                    <span className="recipe-total">= {money(Number(r.koszt_donicy || 0) + Number(r.podloze_l || 0) * Number(substrateCostPerL || 0))} zł</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <p className="hint-text">Materiały — donice, podłoże i inne zasoby. Materiał typu „donica” od razu staje się dostępnym rozmiarem pojemnika w całej aplikacji (Podział, Cennik, Zamówienia).</p>
      <div className="plant-list">
        {supplies.map((s) => {
          const low = s.prog != null && Number(s.ilosc) <= Number(s.prog);
          const linkedCena = s.typ === "donica" ? Number(potRecipes[s.rozmiar]?.koszt_donicy || 0) : s.typ === "podloze" ? Number(substrateCostPerL || 0) : null;
          const cena = linkedCena != null ? linkedCena : Number(s.cena || 0);
          const wartosc = Number(s.ilosc || 0) * cena;
          return (
            <div key={s.id} className={`supply-card ${low ? "low" : ""}`}>
              <div className="supply-card-main">
                <div className="plant-name">{s.nazwa} {low && <span className="low-badge">niski stan</span>}</div>
                <div className="supply-meta">
                  {s.prog != null ? `min ${s.prog} ${s.jednostka} · ` : ""}{money(cena)} zł/{s.jednostka} · wartość {money(wartosc)} zł
                  {linkedCena != null && <span className="recipe-linked-badge"> · z Receptury</span>}
                </div>
                <div className="supply-qty-row">
                  <input className="supply-qty-input" type="number" min="0" inputMode="numeric" value={s.ilosc} onChange={(e) => onChangeQty(s.id, e.target.value)} />
                  <span className="supply-unit">{s.jednostka}</span>
                  {confirmingId !== s.id ? (
                    <button className="icon-btn danger" onClick={() => setConfirmingId(s.id)}><Trash2 size={16} /></button>
                  ) : (
                    <div className="confirm-box">
                      <span>Usunąć?</span>
                      <div className="confirm-actions">
                        <button className="danger-btn small" onClick={() => { onRemove(s.id); setConfirmingId(null); }}>Usuń</button>
                        <button className="ghost-btn small" onClick={() => setConfirmingId(null)}>Anuluj</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {supplies.length === 0 && <div className="empty-state">Brak pozycji — dodaj poniżej.</div>}
      </div>
      {!addOpen ? (
        <button className="ghost-btn add-plant-btn" onClick={() => setAddOpen(true)}><Plus size={15} /> Dodaj materiał</button>
      ) : (
        <div className="order-form">
          <label className="field"><span>Rodzaj</span>
            <select value={f.typ} onChange={(e) => setF({ ...f, typ: e.target.value, rozmiar: "" })}>
              <option value="inne">Inny materiał</option>
              <option value="donica">Donica (rozmiar pojemnika)</option>
              <option value="podloze">Podłoże</option>
            </select>
          </label>
          {f.typ === "donica" && (
            <label className="field"><span>Rozmiar (np. C8, P9)</span><input value={f.rozmiar} onChange={(e) => setF({ ...f, rozmiar: e.target.value })} placeholder="np. C8" /></label>
          )}
          <label className="field"><span>Nazwa</span><input value={f.nazwa} onChange={(e) => setF({ ...f, nazwa: e.target.value })} placeholder={f.typ === "donica" ? "np. Donice C8 (puste)" : "np. Agrowłóknina 1.6m"} /></label>
          <div className="order-item-sub">
            <input type="number" inputMode="numeric" min="0" value={f.ilosc} onChange={(e) => setF({ ...f, ilosc: e.target.value })} placeholder="ilość" />
            <input value={f.jednostka} onChange={(e) => setF({ ...f, jednostka: e.target.value })} placeholder="jednostka (szt./l/mb)" />
          </div>
          {f.typ === "inne" ? (
            <label className="field"><span>Cena jednostkowa (zł)</span><input type="number" inputMode="decimal" min="0" step="0.01" value={f.cena} onChange={(e) => setF({ ...f, cena: e.target.value })} placeholder="np. 1.00" /></label>
          ) : (
            <p className="hint-text" style={{ marginTop: -6 }}>Cena tego materiału będzie pobierana z Receptury pojemników powyżej (ustaw ją tam po zapisaniu).</p>
          )}
          <label className="field"><span>Alarm przy ilości ≤ (opcjonalnie)</span><input type="number" inputMode="numeric" min="0" value={f.prog} onChange={(e) => setF({ ...f, prog: e.target.value })} placeholder="np. 20" /></label>
          <div className="form-actions">
            <button className="secondary-btn" onClick={() => { setAddOpen(false); setF(emptySupplyForm()); }}>Anuluj</button>
            <button className="primary-btn" disabled={!f.nazwa.trim() || (f.typ === "donica" && !f.rozmiar.trim())} onClick={submit}>Zapisz</button>
          </div>
        </div>
      )}
    </div>
  );
}
