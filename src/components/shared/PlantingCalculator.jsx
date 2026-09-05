import { useState, useEffect } from "react";
import { Calculator } from "lucide-react";
import { suggestPlantingQty } from "../../utils/helpers";

export function PlantingCalculator({ plant, onApply, compact, lockedMb }) {
  const [mode, setMode] = useState("mb");
  const [value, setValue] = useState("");
  const [chosenQty, setChosenQty] = useState("");

  const canMb = plant && plant.gestosc_rozstaw_cm_min != null;
  const canM2 = plant && plant.gestosc_m2_min != null;
  const useLocked = lockedMb != null && canMb;
  const effectiveMode = useLocked ? "mb" : mode;
  const effectiveValue = useLocked ? lockedMb : value;

  const result = plant ? suggestPlantingQty(plant, effectiveMode, effectiveValue) : null;

  useEffect(() => {
    if (result) setChosenQty(String(Math.round((result.min + result.max) / 2)));
    else setChosenQty("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result?.min, result?.max]);

  if (!plant) return null;
  if (plant.gestosc_brak) {
    return <p className="hint-text calc-note">{plant.gestosc_text || "Brak danych o gęstości nasadzeń dla tej odmiany."}</p>;
  }

  return (
    <div className={`planting-calc ${compact ? "compact" : ""}`}>
      <div className="planting-calc-head"><Calculator size={13} /> Kalkulator nasadzeń {plant.gestosc_typ ? `· ${plant.gestosc_typ}` : ""}</div>

      {useLocked ? (
        <p className="hint-text" style={{ margin: "0 0 4px" }}>
          Rząd: <b>{lockedMb} mb</b> · rozstaw co {plant.gestosc_rozstaw_cm_min}{plant.gestosc_rozstaw_cm_max !== plant.gestosc_rozstaw_cm_min ? `–${plant.gestosc_rozstaw_cm_max}` : ""} cm
        </p>
      ) : (
        <>
          <div className="planting-calc-row">
            <div className="chip-btn-group">
              {canMb && <button type="button" className={`chip-btn ${mode === "mb" ? "chip-active" : ""}`} onClick={() => setMode("mb")}>metry bieżące</button>}
              {canM2 && <button type="button" className={`chip-btn ${mode === "m2" ? "chip-active" : ""}`} onClick={() => setMode("m2")}>powierzchnia m²</button>}
            </div>
            <input
              type="number" inputMode="decimal" min="0" step="0.1"
              placeholder={mode === "mb" ? "np. 12" : "np. 8"}
              value={value} onChange={(e) => setValue(e.target.value)}
            />
          </div>
          <p className="hint-text" style={{ margin: "4px 0" }}>
            {mode === "mb"
              ? `Rozstaw co ${plant.gestosc_rozstaw_cm_min}${plant.gestosc_rozstaw_cm_max !== plant.gestosc_rozstaw_cm_min ? `–${plant.gestosc_rozstaw_cm_max}` : ""} cm`
              : `Gęstość ${plant.gestosc_m2_min}${plant.gestosc_m2_max !== plant.gestosc_m2_min ? `–${plant.gestosc_m2_max}` : ""} szt./m²`}
          </p>
        </>
      )}

      {result && (
        <div className="planting-calc-result">
          <span>Widełki: {result.min}–{result.max} szt.</span>
          <div className="planting-calc-pick">
            <button type="button" className="chip-btn tiny" onClick={() => setChosenQty(String(result.min))}>Min</button>
            <input type="number" inputMode="numeric" min="0" className="qty-pick-input" value={chosenQty} onChange={(e) => setChosenQty(e.target.value)} />
            <button type="button" className="chip-btn tiny" onClick={() => setChosenQty(String(result.max))}>Maks</button>
          </div>
          {onApply && (
            <button type="button" className="primary-btn small" onClick={() => onApply(Math.max(1, Number(chosenQty) || 0))} disabled={!(Number(chosenQty) > 0)}>
              Zastosuj {chosenQty || ""} szt.
            </button>
          )}
        </div>
      )}
    </div>
  );
}
