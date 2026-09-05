import { useState, useEffect } from "react";
import { ChevronDown, ChevronRight, Minus, Plus, PlusCircle, Search, Trash2, X } from "lucide-react";
import { containerLabel, clampInt, resolveContainers } from "../../utils/helpers";
import { PhotoThumb } from "../shared/PhotoThumb";
import { PlantingCalculator } from "../shared/PlantingCalculator";
import { PotSizeManager } from "./PotSizeManager";
import { AddPlantForm } from "./AddPlantForm";

function PlantInfoGrid({ plant: p }) {
  const [wys, szer] = (p.wys_szer || "").split("/").map((s) => (s || "").trim());
  const uwagi = [p.ciecie_text, p.podzial_text].filter(Boolean).join(" | ");
  return (
    <div className="plant-info-grid-wrap">
      <div className="plant-info-grid">
        <div className="info-item"><span className="info-label">Wysokość</span><span className="info-value">{wys || "—"} cm</span></div>
        <div className="info-item"><span className="info-label">Szerokość</span><span className="info-value">{szer || "—"} cm</span></div>
        <div className="info-item"><span className="info-label">Stanowisko</span><span className="info-value">{p.stanowisko || "—"}</span></div>
        <div className="info-item"><span className="info-label">Zimozielona</span><span className="info-value">{p.zimozielona || "—"}</span></div>
        <div className="info-item"><span className="info-label">Kwitnienie</span><span className="info-value">{p.kwitnienie || "—"}</span></div>
      </div>
      {p.opis && <div className="info-block"><b>Zastosowanie:</b> {p.opis}</div>}
      {uwagi && <div className="info-block"><b>Uwagi produkcyjne:</b> {uwagi}</div>}
      {p.gestosc_text && <div className="info-block"><b>Gęstość:</b> {p.gestosc_text}</div>}
    </div>
  );
}

export function RoslinyPanel({ plants, inventory, onQtyChange, totals, containers, potSizes, onAddPotSize, plantContainerSizes, onTogglePlantContainer, photos, setPhotos, onPhotoError, onAddPlant, onRemovePlant, onSettleDivision }) {
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [sizesOpen, setSizesOpen] = useState(false);
  const [sessionDeltas, setSessionDeltas] = useState({});
  const [confirmingRemoveId, setConfirmingRemoveId] = useState(null);

  useEffect(() => { setSessionDeltas({}); }, [openId]);

  function handleQtyChange(plantId, container, nextVal, oldVal) {
    const n = clampInt(nextVal, 0);
    onQtyChange(plantId, container, n);
    const delta = n - oldVal;
    if (delta !== 0) {
      setSessionDeltas((prev) => ({ ...prev, [container]: (prev[container] || 0) + delta }));
    }
  }

  const filtered = plants.filter((p) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return p.nazwa_pl.toLowerCase().includes(q) || p.odmiana.toLowerCase().includes(q);
  });

  return (
    <div>
      <div className="totals-row">
        {containers.map((c) => (
          <div key={c} className="totals-chip">
            <span className="totals-num">{totals[c] || 0}</span>
            <span className="totals-label">{containerLabel(c)}</span>
          </div>
        ))}
      </div>

      <PotSizeManager sizesOpen={sizesOpen} setSizesOpen={setSizesOpen} potSizes={potSizes} onAdd={onAddPotSize} />

      {!addOpen ? (
        <button className="ghost-btn add-plant-btn" onClick={() => setAddOpen(true)}>
          <PlusCircle size={15} /> Dodaj nową odmianę
        </button>
      ) : (
        <AddPlantForm onSave={(data) => { onAddPlant(data); setAddOpen(false); }} onCancel={() => setAddOpen(false)} />
      )}
      {!addOpen && (
        <p className="hint-text">Odmiany dodane tutaj żyją tylko w tej aplikacji — nie synchronizują się automatycznie z Twoim plikiem Excel.</p>
      )}

      <div className="search-bar" style={{ marginTop: 4 }}>
        <Search size={17} />
        <input placeholder="Szukaj odmiany…" value={query} onChange={(e) => setQuery(e.target.value)} />
        {query && <button className="icon-btn" onClick={() => setQuery("")}><X size={16} /></button>}
      </div>

      <div className="plant-list">
        {filtered.map((p) => {
          const row = inventory[p.id] || {};
          const plantContainers = resolveContainers(plantContainerSizes, containers, p.id);
          const rowTotal = plantContainers.reduce((s, c) => s + Number(row[c] || 0), 0);
          const isOpen = openId === p.id;
          return (
            <div key={p.id} className={`plant-card ${isOpen ? "open" : ""}`}>
              <div className="plant-card-head">
                <PhotoThumb plantId={p.id} photos={photos} setPhotos={setPhotos} onError={onPhotoError} />
                <button className="plant-card-head-btn" onClick={() => setOpenId(isOpen ? null : p.id)}>
                  <div className="plant-card-info">
                    <div className="plant-name">{p.nazwa_pl} {p.custom && <span className="custom-badge">własna</span>}</div>
                    <div className="plant-variety">{p.odmiana}</div>
                    <div className="plant-opis-preview">{p.opis}</div>
                  </div>
                  <div className="plant-card-right">
                    <span className="plant-total-badge">{rowTotal} szt.</span>
                    {isOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                  </div>
                </button>
              </div>
              {isOpen && (
                <div className="plant-card-body">
                  <PlantInfoGrid plant={p} />
                  <PlantingCalculator plant={p} />
                  {plantContainers.map((c) => (
                    <div key={c} className="qty-row">
                      <span className="qty-label">{containerLabel(c)}</span>
                      <div className="stepper">
                        <button className="stepper-btn" onClick={() => handleQtyChange(p.id, c, Number(row[c] || 0) - 1, Number(row[c] || 0))}><Minus size={15} /></button>
                        <input className="stepper-input" type="number" min="0" inputMode="numeric"
                          value={row[c] || 0} onChange={(e) => handleQtyChange(p.id, c, e.target.value, Number(row[c] || 0))} />
                        <button className="stepper-btn" onClick={() => handleQtyChange(p.id, c, Number(row[c] || 0) + 1, Number(row[c] || 0))}><Plus size={15} /></button>
                      </div>
                    </div>
                  ))}
                  {(() => {
                    const negEntries = Object.entries(sessionDeltas).filter(([, d]) => d < 0);
                    const posEntries = Object.entries(sessionDeltas).filter(([, d]) => d > 0);
                    if (negEntries.length === 0 || posEntries.length === 0) return null;
                    const fromText = negEntries.map(([c, d]) => `${Math.abs(d)}× ${containerLabel(c)}`).join(" + ");
                    const toText = posEntries.map(([c, d]) => `${d}× ${containerLabel(c)}`).join(" + ");
                    return (
                      <div className="division-banner">
                        <span>Wygląda na podział: {fromText} → {toText}. Rozliczyć jak podział (donice, podłoże, koszt)?</span>
                        <div className="confirm-actions">
                          <button className="primary-btn small" onClick={() => { onSettleDivision(p.id, sessionDeltas); setSessionDeltas({}); }}>Tak, rozlicz</button>
                          <button className="ghost-btn small" onClick={() => setSessionDeltas({})}>Nie, to korekta</button>
                        </div>
                      </div>
                    );
                  })()}
                  <div className="plant-containers-editor">
                    <span className="plant-containers-label">Dostępne pojemniki dla tej odmiany:</span>
                    <div className="month-chips">
                      {containers.map((c) => {
                        const active = plantContainers.includes(c);
                        return (
                          <button type="button" key={c} className={`month-chip ${active ? "active" : ""}`}
                            onClick={() => onTogglePlantContainer(p.id, c)}>
                            {containerLabel(c)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  {p.custom && (
                    confirmingRemoveId !== p.id ? (
                      <button className="remove-plant-btn" onClick={() => setConfirmingRemoveId(p.id)}><Trash2 size={14} /> Usuń własną odmianę</button>
                    ) : (
                      <div className="confirm-box">
                        <span>Usunąć tę odmianę?</span>
                        <div className="confirm-actions">
                          <button className="danger-btn small" onClick={() => { onRemovePlant(p.id); setConfirmingRemoveId(null); }}>Usuń</button>
                          <button className="ghost-btn small" onClick={() => setConfirmingRemoveId(null)}>Anuluj</button>
                        </div>
                      </div>
                    )
                  )}
                </div>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && <div className="empty-state">Brak wyników dla „{query}”.</div>}
      </div>
    </div>
  );
}
