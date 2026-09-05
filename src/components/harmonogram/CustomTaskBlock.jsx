import { useState } from "react";
import { Check, ListPlus, Trash2 } from "lucide-react";
import { MONTHS } from "../../constants";

export function CustomTaskBlock({ year, month, tasks, onAdd, onToggle, onRemove, compact }) {
  const [text, setText] = useState("");
  const [adding, setAdding] = useState(false);
  function submit() {
    if (!text.trim()) return;
    onAdd(year, month, text);
    setText("");
    setAdding(false);
  }
  return (
    <div className={`custom-task-block ${compact ? "compact" : ""}`}>
      {tasks.length > 0 && (
        <div className="task-list">
          {tasks.map((t) => (
            <div key={t.id} className={`task-row custom-row ${t.done ? "done" : ""}`}>
              <button className="task-check-btn" onClick={() => onToggle(year, month, t.id)}>
                <span className={`task-check ${t.done ? "checked" : ""}`}>{t.done && <Check size={13} strokeWidth={3} />}</span>
              </button>
              <button className="task-text-btn" onClick={() => onToggle(year, month, t.id)}>
                <span className="task-plant">{t.text}</span>
              </button>
              <span className="task-tag tag-wlasne">Własne</span>
              <button className="icon-btn danger" onClick={() => onRemove(year, month, t.id)}><Trash2 size={14} /></button>
            </div>
          ))}
        </div>
      )}
      {!adding ? (
        <button className="ghost-btn add-task-btn" onClick={() => setAdding(true)}>
          <ListPlus size={15} /> Dodaj zadanie na {MONTHS[month].toLowerCase()}
        </button>
      ) : (
        <div className="add-task-form">
          <input autoFocus placeholder="np. Podlanie donic w tunelu" value={text} onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") submit(); if (e.key === "Escape") { setAdding(false); setText(""); } }} />
          <button className="primary-btn small" onClick={submit} disabled={!text.trim()}>Dodaj</button>
          <button className="ghost-btn small" onClick={() => { setAdding(false); setText(""); }}>Anuluj</button>
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Tab: SPRZEDAŻ (Cennik / Zestawy / Zamówienia / Klienci / Raporty)      */
/* ---------------------------------------------------------------------- */
