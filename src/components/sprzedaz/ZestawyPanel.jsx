import { useState } from "react";
import { Boxes, Plus, Trash2, Calculator as CalcIcon } from "lucide-react";
import { clampInt, money, resolvePotContainers, uid } from "../../utils/helpers";
import { PlantingCalculator } from "../shared/PlantingCalculator";
import { NumberInput } from "../shared/NumberInput";
import { getPlantSpreadMeters, getRemainingBedWidth, plantFitsBedWidth } from "../../utils/planerRabaty";

export function emptyZestawItem(plants, potSizes) {
  return { plantId: plants[0] ? plants[0].id : "", container: potSizes && potSizes[0] ? potSizes[0] : "P9", ilosc: "", etykieta: "" };
}

export function ZestawyPanel({ plants, potSizes, plantContainerSizes, zestawy, setZestawy, cennik }) {
  const [formOpen, setFormOpen] = useState(false);
  const [nazwa, setNazwa] = useState("");
  const [cena, setCena] = useState("");
  const [modulMb, setModulMb] = useState("");
  const [szerokosc, setSzerokosc] = useState("");
  const [items, setItems] = useState([emptyZestawItem(plants, potSizes)]);
  const [confirmingId, setConfirmingId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [calcOpenIdx, setCalcOpenIdx] = useState(null);

  function resetForm() { setNazwa(""); setCena(""); setModulMb(""); setSzerokosc(""); setItems([emptyZestawItem(plants, potSizes)]); setFormOpen(false); setCalcOpenIdx(null); }
  function updateItem(idx, patch) {
    setItems((prev) => prev.map((it, i) => {
      if (i !== idx) return it;
      const next = { ...it, ...patch };
      if (patch.plantId !== undefined) {
        const avail = resolvePotContainers(plantContainerSizes, potSizes, next.plantId);
        if (!avail.includes(next.container)) next.container = avail[0] || potSizes[0];
      }
      return next;
    }));
  }
  function addItem() {
    const room = getRemainingBedWidth(szerokoscNum, items, plants);
    const plant = plants.find((candidate) => plantFitsBedWidth(candidate, room));
    if (!plant) return;
    const item = emptyZestawItem([plant], potSizes);
    const containers = resolvePotContainers(plantContainerSizes, potSizes, plant.id);
    item.container = containers[0] || item.container;
    setItems((prev) => [...prev, item]);
  }
  function removeItem(idx) { setItems((prev) => prev.filter((_, i) => i !== idx)); if (calcOpenIdx === idx) setCalcOpenIdx(null); }

  const referenceValue = items.reduce((s, it) => {
    const cn = cennik[it.plantId]?.[it.container] || 0;
    return s + cn * Number(it.ilosc || 0);
  }, 0);
  const modulMbNum = Number(modulMb) > 0 ? Number(modulMb) : null;
  const szerokoscNum = Number(szerokosc) > 0 ? Number(szerokosc) : null;
  const itemsFitWidth = !szerokoscNum || items.every((item, index) => {
    const room = getRemainingBedWidth(szerokoscNum, items, plants, index);
    return plantFitsBedWidth(plants.find((plant) => plant.id === item.plantId), room);
  });

  function saveZestaw() {
    if (!nazwa.trim() || items.length === 0 || !itemsFitWidth || items.some((it) => clampInt(it.ilosc, 0) <= 0)) return;
    const z = {
      id: uid("z"), nazwa: nazwa.trim(), cena: Math.max(0, Number(cena) || 0),
      dlugosc_mb: modulMbNum,
      szerokosc_m: szerokoscNum,
      pozycje: items.map((it) => ({ ...it, ilosc: clampInt(it.ilosc, 1) })),
    };
    setZestawy((prev) => [z, ...prev]);
    resetForm();
  }
  function deleteZestaw(id) { setZestawy((prev) => prev.filter((z) => z.id !== id)); setConfirmingId(null); }

  return (
    <div>
      {!formOpen ? (
        <button className="primary-btn" style={{ marginTop: 12 }} onClick={() => setFormOpen(true)}><Boxes size={17} /> Nowy zestaw</button>
      ) : (
        <div className="order-form">
          <label className="field"><span>Nazwa zestawu</span><input value={nazwa} onChange={(e) => setNazwa(e.target.value)} placeholder="np. Żywopłot 2mb (moduł) lub Rabata narożna" /></label>
          <label className="field">
            <span>Długość modułu (mb) — opcjonalnie</span>
            <NumberInput inputMode="decimal" min="0" step="0.1" value={modulMb} onChange={(e) => setModulMb(e.target.value)} placeholder="np. 2" />
          </label>
          <label className="field">
            <span>Szerokość rabaty (m) — opcjonalnie</span>
            <NumberInput inputMode="decimal" min="0" step="0.1" value={szerokosc} onChange={(e) => setSzerokosc(e.target.value)} placeholder="np. 2" />
          </label>
          <p className="hint-text" style={{ margin: "0 0 4px" }}>
            {modulMbNum
              ? `Wszystkie rzędy poniżej liczone są dla ${modulMbNum} mb — kalkulator sam podpowie ilość dla każdej odmiany. Przy zamówieniu wpiszesz mnożnik (np. 4,5 × ${modulMbNum} mb = ${(modulMbNum * 4.5).toFixed(1)} mb).`
              : "Podaj długość modułu, żeby kalkulator w każdym rzędzie liczył automatycznie tę samą długość (bez wpisywania jej za każdym razem). Zostaw puste, jeśli zestaw nie jest modułowy (np. gotowy zestaw doniczkowy)."}
          </p>
          {szerokoscNum && (
            <p className="hint-text" style={{ margin: "0 0 4px" }}>
              Pozostała szerokość: <b>{getRemainingBedWidth(szerokoscNum, items, plants).toFixed(2)} m</b>. Po wybraniu rośliny lista kolejnych odmian ograniczy się do mieszczących się w pozostałym miejscu.
            </p>
          )}
          {items.map((it, idx) => {
            const plant = plants.find((p) => p.id === it.plantId);
            const calcOpen = calcOpenIdx === idx;
            const remainingForRow = getRemainingBedWidth(szerokoscNum, items, plants, idx);
            const fittingPlants = plants.filter((candidate) =>
              plantFitsBedWidth(candidate, remainingForRow) || candidate.id === it.plantId
            );
            const currentSpread = getPlantSpreadMeters(plant);
            const rowFits = !szerokoscNum || (currentSpread != null && currentSpread <= remainingForRow + 0.000001);
            return (
              <div key={idx} className="order-item-row zestaw-row">
                <div className="zestaw-row-head">
                  <input className="row-label-input" value={it.etykieta} onChange={(e) => updateItem(idx, { etykieta: e.target.value })} placeholder={`Rząd ${idx + 1} (np. Tył, Środek, Przód)`} />
                  {items.length > 1 && <button className="icon-btn danger" onClick={() => removeItem(idx)}><Trash2 size={15} /></button>}
                </div>
                <select value={it.plantId} onChange={(e) => updateItem(idx, { plantId: e.target.value })}>
                  {fittingPlants.map((p) => {
                    const spread = getPlantSpreadMeters(p);
                    const fits = plantFitsBedWidth(p, remainingForRow);
                    return (
                      <option key={p.id} value={p.id} disabled={!fits && p.id !== it.plantId}>
                        {p.nazwa_pl} — {p.odmiana}{szerokoscNum ? ` · ${spread == null ? "brak danych o szerokości" : `${Math.round(spread * 100)} cm`}${fits ? "" : " · za szeroka"}` : ""}
                      </option>
                    );
                  })}
                </select>
                {szerokoscNum && !rowFits && (
                  <p className="price-warning">
                    Ten rząd przekracza dostępne miejsce lub brakuje danych o szerokości rośliny. Zmień odmianę albo szerokość rabaty.
                  </p>
                )}
                <div className="order-item-sub">
                  <select value={it.container} onChange={(e) => updateItem(idx, { container: e.target.value })}>
                    {resolvePotContainers(plantContainerSizes, potSizes, it.plantId).map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <NumberInput inputMode="numeric" min="1" value={it.ilosc} onChange={(e) => updateItem(idx, { ilosc: e.target.value })} placeholder="Ilość" />
                  <button type="button" className={`icon-btn ${calcOpen ? "calc-active" : ""}`} onClick={() => setCalcOpenIdx(calcOpen ? null : idx)} title="Kalkulator nasadzeń">
                    <CalcIcon size={16} />
                  </button>
                </div>
                {calcOpen && (
                  <PlantingCalculator plant={plant} compact lockedMb={modulMbNum} onApply={(qty) => { updateItem(idx, { ilosc: qty }); setCalcOpenIdx(null); }} />
                )}
              </div>
            );
          })}
          <button
            className="ghost-btn"
            onClick={addItem}
            disabled={szerokoscNum != null && !plants.some((plant) => plantFitsBedWidth(plant, getRemainingBedWidth(szerokoscNum, items, plants)))}
          >
            <Plus size={15} /> Dodaj rząd / odmianę
          </button>
          <label className="field">
            <span>Cena zestawu (wartość wg cennika: {money(referenceValue)} zł)</span>
            <div className="price-input-wrap">
              <NumberInput inputMode="decimal" min="0" value={cena} onChange={(e) => setCena(e.target.value)} />
              <span className="pln">zł</span>
            </div>
          </label>
          <div className="form-actions">
            <button className="secondary-btn" onClick={resetForm}>Anuluj</button>
            <button className="primary-btn" disabled={!nazwa.trim() || !itemsFitWidth || items.some((it) => clampInt(it.ilosc, 0) <= 0)} onClick={saveZestaw}>Zapisz zestaw</button>
          </div>
        </div>
      )}
      <div className="order-list">
        {zestawy.length === 0 && !formOpen && <div className="empty-state">Brak zestawów. Dodaj pierwszy powyżej — np. gotowy „Zestaw na taras” z 3-4 odmian w jednej cenie.</div>}
        {zestawy.map((z) => {
          const isOpen = expandedId === z.id;
          return (
            <div key={z.id} className="order-card">
              <button className="order-card-head" onClick={() => setExpandedId(isOpen ? null : z.id)}>
                <div>
                  <div className="order-client">
                    {z.nazwa}
                      {z.dlugosc_mb ? ` · moduł ${z.dlugosc_mb} mb` : ""}
                      {z.szerokosc_m ? ` · szer. ${z.szerokosc_m} m` : ""}
                  </div>
                  <div className="order-date">{z.pozycje.length} {z.pozycje.length === 1 ? "pozycja" : "pozycji"} w zestawie</div>
                </div>
                <div className="order-card-right"><span className="order-sum">{money(z.cena)} zł</span></div>
              </button>
              {isOpen && (
                <div className="order-card-body">
                  {z.pozycje.map((it, i) => {
                    const plant = plants.find((p) => p.id === it.plantId);
                    return (
                      <div key={i} className="order-line">
                        <span>{it.etykieta ? `${it.etykieta}: ` : ""}{plant ? `${plant.nazwa_pl} (${plant.odmiana})` : it.plantId} · {it.container} × {it.ilosc}</span>
                      </div>
                    );
                  })}
                  <div className="order-card-actions">
                    {confirmingId !== z.id ? (
                      <button className="icon-btn danger" onClick={() => setConfirmingId(z.id)}><Trash2 size={15} /></button>
                    ) : (
                      <div className="confirm-box">
                        <span>Usunąć zestaw?</span>
                        <div className="confirm-actions">
                          <button className="danger-btn small" onClick={() => deleteZestaw(z.id)}>Usuń</button>
                          <button className="ghost-btn small" onClick={() => setConfirmingId(null)}>Anuluj</button>
                        </div>
                      </div>
                    )}
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
