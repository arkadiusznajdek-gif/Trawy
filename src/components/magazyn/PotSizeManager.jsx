import { useState } from "react";
import { ChevronDown, ChevronRight, Plus } from "lucide-react";

export function PotSizeManager({ sizesOpen, setSizesOpen, potSizes, onAdd }) {
  const [text, setText] = useState("");
  function submit() {
    if (!text.trim()) return;
    onAdd(text);
    setText("");
  }
  return (
    <div className="pot-size-manager">
      <button className="pot-size-toggle" onClick={() => setSizesOpen(!sizesOpen)}>
        <span>Rozmiary pojemników w użyciu: {potSizes.join(", ")}</span>
        {sizesOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
      </button>
      {sizesOpen && (
        <div className="pot-size-body">
          <p className="hint-text" style={{ margin: "0 0 8px" }}>
            Rozmiary pochodzą z materiałów oznaczonych jako „donica” w Zaopatrzeniu — każda taka pozycja pojawia się tu automatycznie, w cenniku i w zamówieniach. Żeby usunąć rozmiar, usuń odpowiadający mu materiał w Zaopatrzeniu (nie da się, jeśli są w nim jeszcze rośliny).
          </p>
          <div className="month-chips">
            {potSizes.map((s) => (
              <span key={s} className="pot-size-chip">{s}</span>
            ))}
          </div>
          <div className="add-task-form" style={{ marginTop: 8 }}>
            <input placeholder="np. C10 lub Kontener 30L" value={text} onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") submit(); }} />
            <button className="primary-btn small" onClick={submit} disabled={!text.trim()}><Plus size={14} /> Dodaj</button>
          </div>
        </div>
      )}
    </div>
  );
}
