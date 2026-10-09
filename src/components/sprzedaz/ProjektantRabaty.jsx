import { useMemo, useState } from "react";
import { Flower2, Plus, Trash2 } from "lucide-react";
import { money, resolvePotContainers, uid } from "../../utils/helpers";
import { calculatePlantingArea, estimatePlantingQuantity, getPlantStock, recommendPlants } from "../../utils/planerRabaty";
import { NumberInput } from "../shared/NumberInput";

const LIGHT_OPTIONS = [
  { value: "any", label: "Dowolne" },
  { value: "slonce", label: "Słońce" },
  { value: "polcien", label: "Półcień" },
  { value: "cien", label: "Cień" },
];

export function ProjektantRabaty({ plants, inventory, potSizes, plantContainerSizes, cennik, setZestawy }) {
  const [area, setArea] = useState("5");
  const [dimensionMode, setDimensionMode] = useState("area");
  const [length, setLength] = useState("5");
  const [width, setWidth] = useState("1");
  const [light, setLight] = useState("any");
  const [onlyInStock, setOnlyInStock] = useState(false);
  const [items, setItems] = useState([]);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const areaValue = calculatePlantingArea({
    mode: dimensionMode,
    areaM2: area,
    lengthM: length,
    widthM: width,
  });
  const lengthValue = Number(length);
  const widthValue = Number(width);

  const recommendations = useMemo(
    () => recommendPlants(plants, { light, onlyInStock, inventory }),
    [plants, light, onlyInStock, inventory]
  );
  const referencePrice = items.reduce(
    (sum, item) => sum + Number(cennik[item.plantId]?.[item.container] || 0) * Number(item.ilosc || 0),
    0
  );

  function addPlant(plant) {
    const quantity = estimatePlantingQuantity(areaValue, plant);
    const container = resolvePotContainers(plantContainerSizes, potSizes, plant.id)[0];
    if (!quantity || !container) return;
    const suggestedQty = Math.round((quantity.min + quantity.max) / 2);
    setItems((prev) => [...prev, {
      rowId: uid("row"),
      plantId: plant.id,
      container,
      ilosc: suggestedQty,
      etykieta: `Rząd ${prev.length + 1}`,
    }]);
  }

  function addEmptyRow() {
    const plant = plants[0];
    if (!plant) return;
    const container = resolvePotContainers(plantContainerSizes, potSizes, plant.id)[0];
    if (!container) return;
    const quantity = estimatePlantingQuantity(areaValue, plant);
    const suggestedQty = quantity ? Math.round((quantity.min + quantity.max) / 2) : 1;
    setItems((prev) => [...prev, {
      rowId: uid("row"),
      plantId: plant.id,
      container,
      ilosc: suggestedQty,
      etykieta: `Rząd ${prev.length + 1}`,
    }]);
  }

  function updateItem(rowId, patch) {
    setItems((prev) => prev.map((item) => {
      if (item.rowId !== rowId) return item;
      const next = { ...item, ...patch };
      if (patch.plantId !== undefined) {
        const containers = resolvePotContainers(plantContainerSizes, potSizes, next.plantId);
        if (!containers.includes(next.container)) next.container = containers[0] || potSizes[0];
      }
      return next;
    }));
  }

  function saveComposition() {
    const dimensionsLabel = dimensionMode === "linear"
      ? `${lengthValue} mb × ${widthValue} m`
      : `${areaValue} m²`;
    const trimmedName = name.trim() || `Rabata ${dimensionsLabel}`;
    if (!items.length || areaValue <= 0) return;
    setZestawy((prev) => [{
      id: uid("z"),
      nazwa: trimmedName,
      cena: Math.max(0, Number(price) || referencePrice),
      dlugosc_mb: dimensionMode === "linear" ? lengthValue : null,
      szerokosc_m: dimensionMode === "linear" ? widthValue : null,
      pozycje: items.map(({ rowId, ...item }) => item),
    }, ...prev]);
    setItems([]);
    setName("");
    setPrice("");
  }

  return (
    <div className="garden-planner">
      <div className="order-card garden-planner-intro">
        <div className="order-card-body">
          <div className="section-title small-title"><Flower2 size={16} /> Projektant rabaty</div>
          <p className="hint-text">Podaj wymiary rabaty i nasłonecznienie. Dobiorę trawy z katalogu z podaną gęstością sadzenia, a kompozycję zapiszesz od razu w zestawach do zamówień.</p>
          <div className="garden-filters">
            <label className="field">
              <span>Wymiary licz jako</span>
              <select value={dimensionMode} onChange={(e) => setDimensionMode(e.target.value)}>
                <option value="area">Powierzchnia (m²)</option>
                <option value="linear">Metry bieżące × szerokość</option>
              </select>
            </label>
            {dimensionMode === "linear" ? (
              <>
                <label className="field">
                  <span>Długość (mb)</span>
                  <NumberInput inputMode="decimal" min="0.1" step="0.1" value={length} onChange={(e) => setLength(e.target.value)} />
                </label>
                <label className="field">
                  <span>Szerokość (m)</span>
                  <NumberInput inputMode="decimal" min="0.1" step="0.1" value={width} onChange={(e) => setWidth(e.target.value)} />
                </label>
              </>
            ) : (
              <label className="field">
                <span>Powierzchnia rabaty (m²)</span>
                <NumberInput inputMode="decimal" min="0.1" step="0.5" value={area} onChange={(e) => setArea(e.target.value)} />
              </label>
            )}
            <label className="field">
              <span>Nasłonecznienie</span>
              <select value={light} onChange={(e) => setLight(e.target.value)}>
                {LIGHT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
          </div>
          <label className="checkbox-field garden-stock-filter">
            <input type="checkbox" checked={onlyInStock} onChange={(e) => setOnlyInStock(e.target.checked)} />
            <span>Pokaż tylko odmiany z jakimkolwiek stanem</span>
          </label>
        </div>
      </div>

      <div className="section-title small-title garden-section-title">Pasujące trawy ({recommendations.length})</div>
      {recommendations.length === 0 ? (
        <div className="empty-state">Brak odmian z podaną gęstością sadzenia dla tych warunków. Zmień nasłonecznienie albo wyłącz filtr stanu.</div>
      ) : (
        <div className="plant-list">
          {          recommendations.map((plant) => {
            const range = estimatePlantingQuantity(areaValue, plant);
            return (
              <article className="order-card garden-plant-card" key={plant.id}>
                <div className="order-card-body">
                  <div className="plant-name">{plant.nazwa_pl}</div>
                  <div className="plant-variety">{plant.odmiana}</div>
                  <div className="garden-plant-info">
                    <span>{plant.stanowisko}</span>
                    <span>Wys. {plant.wys_szer} cm</span>
                    <span>Kwitnienie: {plant.kwitnienie}</span>
                  </div>
                  {range && <div className="garden-quantity-hint">
                    {dimensionMode === "linear"
                      ? `Na ${lengthValue} mb × ${widthValue} m (${areaValue} m²): orientacyjnie ${range.min}–${range.max} szt.`
                      : `Na ${areaValue} m²: orientacyjnie ${range.min}–${range.max} szt.`}
                  </div>}
                  <div className="garden-plant-footer">
                    <span className={`garden-stock ${plant.availableStock > 0 ? "in-stock" : ""}`}>
                      Stan łączny: {plant.availableStock} szt.
                    </span>
                    <button className="secondary-btn small" type="button" disabled={!range} onClick={() => addPlant(plant)}>
                      <Plus size={14} /> Dodaj rząd
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {items.length > 0 && (
        <div className="order-card garden-composition">
          <div className="order-card-body">
            <div className="section-title small-title">Twoja kompozycja ({items.length})</div>
            <p className="hint-text">Ilości są wstępną podpowiedzią katalogową — skoryguj je do projektu, odstępów i warunków na miejscu.</p>
            {items.map((item, rowIndex) => {
              const plant = plants.find((candidate) => candidate.id === item.plantId);
              const containers = resolvePotContainers(plantContainerSizes, potSizes, item.plantId);
              return (
                <div className="garden-composition-row" key={item.rowId}>
                  <div className="zestaw-row-head">
                    <input
                      className="row-label-input"
                      value={item.etykieta}
                      onChange={(e) => updateItem(item.rowId, { etykieta: e.target.value })}
                      placeholder={`Rząd ${rowIndex + 1} (np. Tył, Środek, Przód)`}
                      aria-label={`Nazwa rzędu ${rowIndex + 1}`}
                    />
                    <button
                      className="icon-btn danger"
                      type="button"
                      aria-label={`Usuń rząd ${rowIndex + 1}`}
                      onClick={() => setItems((prev) => prev.filter((entry) => entry.rowId !== item.rowId))}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                  <select value={item.plantId} onChange={(e) => updateItem(item.rowId, { plantId: e.target.value })}>
                    {plants.map((option) => <option key={option.id} value={option.id}>{option.nazwa_pl} — {option.odmiana}</option>)}
                  </select>
                  <div className="order-item-sub">
                    <select value={item.container} onChange={(e) => updateItem(item.rowId, { container: e.target.value })}>
                      {containers.map((container) => <option key={container} value={container}>{container}</option>)}
                    </select>
                    <NumberInput inputMode="numeric" min="1" value={item.ilosc} onChange={(e) => updateItem(item.rowId, { ilosc: Math.max(1, Number(e.target.value) || 1) })} />
                  </div>
                  <div className="garden-stock-note">{plant?.nazwa_pl} — dostępne łącznie we wszystkich pojemnikach: {getPlantStock(inventory, item.plantId)} szt. Sprawdź stan wybranego rozmiaru przed sprzedażą.</div>
                </div>
              );
            })}
            <button className="ghost-btn" type="button" onClick={addEmptyRow} disabled={plants.length === 0}>
              <Plus size={15} /> Dodaj rząd / odmianę
            </button>
            <label className="field">
              <span>Nazwa zestawu</span>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder={`Rabata ${dimensionMode === "linear" ? `${lengthValue || ""} mb × ${widthValue || ""} m` : `${areaValue || ""} m²`}`} />
            </label>
            <label className="field">
              <span>Cena zestawu — wartość wg cennika: {money(referencePrice)} zł</span>
              <div className="price-input-wrap">
                <NumberInput inputMode="decimal" min="0" value={price} onChange={(e) => setPrice(e.target.value)} placeholder={String(referencePrice)} />
                <span className="pln">zł</span>
              </div>
            </label>
            <button className="primary-btn" type="button" disabled={areaValue <= 0} onClick={saveComposition}>Zapisz w zestawach sprzedażowych</button>
          </div>
        </div>
      )}
    </div>
  );
}
