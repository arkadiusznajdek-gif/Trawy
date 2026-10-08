import { useState } from "react";
import { ChevronDown, ChevronRight, Search, X, Download } from "lucide-react";
import { costOfContainer, money, resolvePotContainers } from "../../utils/helpers";
import { NumberInput } from "../shared/NumberInput";

/*
 * FUNKCJA DODATKOWA: eksport cennika (wszystkie odmiany × wszystkie
 * rozmiary doniczek) do pliku CSV — do otwarcia w Excelu i wydruku.
 * Świadomie eksportuje CAŁĄ listę odmian, niezależnie od aktualnego
 * filtra wyszukiwania na ekranie — użytkownik prosił o pełny cennik.
 * Separator ";" i przecinek jako separator dziesiętny — zgodnie z polskim
 * Excelem (przecinek jako część liczby przy separatorze ";" jest
 * interpretowany poprawnie, w przeciwieństwie do kropki).
 */
function csvCell(value) {
  const s = String(value ?? "");
  if (s.includes(";") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function buildCennikCsv(plants, potSizes, plantContainerSizes, cennik) {
  const header = ["Odmiana (PL)", "Nazwa łacińska", ...potSizes];
  const rows = [header];
  plants.forEach((p) => {
    const allowed = resolvePotContainers(plantContainerSizes, potSizes, p.id);
    const row = cennik[p.id] || {};
    const cells = potSizes.map((c) => {
      if (!allowed.includes(c)) return "";
      const cena = Number(row[c] || 0);
      return cena > 0 ? cena.toFixed(2).replace(".", ",") : "";
    });
    rows.push([p.nazwa_pl, p.odmiana, ...cells]);
  });
  return rows.map((r) => r.map(csvCell).join(";")).join("\r\n");
}

export function CennikPanel({ plants, potSizes, plantContainerSizes, cennik, setCennik, costs, potRecipes, substrateCostPerL, onSetCost }) {
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState(null);
  const filtered = plants.filter((p) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return p.nazwa_pl.toLowerCase().includes(q) || p.odmiana.toLowerCase().includes(q);
  });
  function setPrice(plantId, container, val) {
    const n = Math.max(0, Number(val) || 0);
    setCennik((prev) => ({ ...prev, [plantId]: { ...(prev[plantId] || {}), [container]: n } }));
  }
  function exportCsv() {
    try {
      const csv = buildCennikCsv(plants, potSizes, plantContainerSizes, cennik);
      const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `cennik-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      // po cichu
    }
  }
  return (
    <div>
      <div className="form-actions" style={{ marginTop: 12 }}>
        <button className="secondary-btn" onClick={exportCsv}><Download size={15} /> Pobierz cennik (CSV)</button>
      </div>
      <div className="search-bar" style={{ marginTop: 8 }}>
        <Search size={17} />
        <input placeholder="Szukaj odmiany…" value={query} onChange={(e) => setQuery(e.target.value)} />
        {query && <button className="icon-btn" onClick={() => setQuery("")}><X size={16} /></button>}
      </div>
      <div className="price-list">
        {filtered.map((p) => {
          const row = cennik[p.id] || {};
          const costRow = costs[p.id] || {};
          const isOpen = openId === p.id;
          return (
            <div key={p.id} className="price-card">
              <button className="price-card-head" onClick={() => setOpenId(isOpen ? null : p.id)}>
                <div>
                  <div className="plant-name">{p.nazwa_pl}</div>
                  <div className="plant-variety">{p.odmiana}</div>
                </div>
                {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </button>
              <div className="price-inputs">
                {resolvePotContainers(plantContainerSizes, potSizes, p.id).map((c) => (
                  <label key={c} className="price-field">
                    <span>{c}</span>
                    <div className="price-input-wrap">
                      <NumberInput inputMode="decimal" min="0" value={row[c] ?? ""} onChange={(e) => setPrice(p.id, c, e.target.value)} />
                      <span className="pln">zł</span>
                    </div>
                  </label>
                ))}
              </div>
              {isOpen && (
                <div className="cost-margin-body">
                  {resolvePotContainers(plantContainerSizes, potSizes, p.id).map((c) => {
                    const cena = Number(row[c] || 0);
                    const hasRecordedCost = Object.prototype.hasOwnProperty.call(costRow, c) && costRow[c] != null;
                    const koszt = hasRecordedCost
                      ? Number(costRow[c] || 0)
                      : costOfContainer(potRecipes, substrateCostPerL, c);
                    const marza = cena - koszt;
                    const marzaPct = cena > 0 ? (marza / cena) * 100 : 0;
                    return (
                      <div key={c} className="cost-margin-row">
                        <span className="cost-margin-label">{c}</span>
                        <label className="price-field">
                          <span>Koszt/szt.</span>
                          <div className="price-input-wrap small">
                            <NumberInput inputMode="decimal" min="0" step="0.01" value={Math.round(koszt * 100) / 100} onChange={(e) => onSetCost(p.id, c, e.target.value)} />
                            <span className="pln">zł</span>
                          </div>
                        </label>
                        {!hasRecordedCost && potRecipes[c] && (
                          <span className="hint-text">Z receptury</span>
                        )}
                        <span className={`margin-badge ${marza < 0 ? "neg" : ""}`}>Marża: {money(marza)} zł ({marzaPct.toFixed(0)}%)</span>
                      </div>
                    );
                  })}
                  <p className="hint-text" style={{ margin: "6px 0 0" }}>Jeśli brak kosztu zakupu lub produkcji, koszt/szt. bierze się z Receptury. Koszt znanych sztuk ma pierwszeństwo; możesz go też wpisać ręcznie.</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---- Zestawy ---- */
