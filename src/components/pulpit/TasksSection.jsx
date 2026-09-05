import { useState } from "react";
import { ListPlus, Trash2, Calendar } from "lucide-react";
import { TASK_STATUS_META } from "../../constants";
import { formatShortDate } from "../../utils/helpers";

export function TasksSection({ tasks, onAdd, onCycle, onDelete }) {
  const [text, setText] = useState("");
  const [date, setDate] = useState("");
  const [dateOpen, setDateOpen] = useState(false);
  const [showDone, setShowDone] = useState(false);
  const pending = tasks.filter((t) => t.status !== "done");
  const doneTasks = tasks.filter((t) => t.status === "done");

  function submit() {
    if (!text.trim()) return;
    onAdd(text, date || null);
    setText("");
    setDate("");
    setDateOpen(false);
  }

  return (
    <div>
      <div className="section-title" style={{ marginTop: 4 }}>
        <ListPlus size={17} />
        <span>Zadania{pending.length ? ` (${pending.length})` : ""}</span>
      </div>
      <div className="add-task-form" style={{ marginBottom: date || dateOpen ? 6 : 10 }}>
        <input placeholder="np. Zamówić C5, umyć tunel…" value={text} onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") submit(); }} />
        <button type="button" className={`icon-btn calendar-toggle ${date ? "active" : ""}`} onClick={() => setDateOpen(!dateOpen)} aria-label="Ustaw termin">
          <Calendar size={16} />
        </button>
        <button className="primary-btn small" onClick={submit} disabled={!text.trim()}>Dodaj</button>
      </div>
      {dateOpen && (
        <div className="add-task-form" style={{ marginBottom: 10 }}>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          {date && <button className="ghost-btn small" onClick={() => setDate("")}>Wyczyść</button>}
        </div>
      )}
      {pending.length === 0 ? (
        <div className="empty-state">Brak zadań w toku.</div>
      ) : (
        <div className="task-list" style={{ marginBottom: 8 }}>
          {pending.map((t) => {
            const meta = TASK_STATUS_META[t.status];
            return (
              <div key={t.id} className="task-row custom-row">
                {t.date && (
                  <span className="task-date-badge"><Calendar size={11} /> {formatShortDate(t.date)}</span>
                )}
                <button className="task-text-btn" onClick={() => onCycle(t.id)}>
                  <span className="task-plant">{t.text}</span>
                </button>
                <button className={`task-tag status-tag ${meta.cls}`} onClick={() => onCycle(t.id)}>{meta.label}</button>
                <button className="icon-btn danger" onClick={() => onDelete(t.id)}><Trash2 size={14} /></button>
              </div>
            );
          })}
        </div>
      )}
      {doneTasks.length > 0 && (
        <div>
          <button className="ghost-btn" style={{ width: "100%", justifyContent: "center" }} onClick={() => setShowDone(!showDone)}>
            {showDone ? "Ukryj" : "Pokaż"} zakończone ({doneTasks.length})
          </button>
          {showDone && (
            <div className="task-list" style={{ marginTop: 8 }}>
              {doneTasks.map((t) => (
                <div key={t.id} className="task-row custom-row done">
                  <button className="task-text-btn" onClick={() => onCycle(t.id)}>
                    <span className="task-plant">{t.text}</span>
                  </button>
                  <button className="icon-btn danger" onClick={() => onDelete(t.id)}><Trash2 size={14} /></button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Photo picker                                                           */
/* ---------------------------------------------------------------------- */
