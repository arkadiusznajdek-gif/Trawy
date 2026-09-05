import { Check } from "lucide-react";
import { taskKey, containerLabel } from "../../utils/helpers";
import { TASK_META } from "./helpers";

export function TaskList({ tasks, month, year, done, onToggle, emptyText, compact }) {
  if (tasks.length === 0) return <div className="empty-state">{emptyText}</div>;
  return (
    <div className={`task-list ${compact ? "compact" : ""}`}>
      {tasks.map((t, idx) => {
        const key = taskKey(year, month, t.plant.id, t.type);
        const isDone = !!done[key];
        const meta = TASK_META[t.type];
        const hasSegments = t.type === "podzial" && t.segments && t.segments.length > 0;
        return (
          <div key={idx}>
            <button className={`task-row ${isDone ? "done" : ""}`} onClick={() => onToggle(key)}>
              <span className={`task-check ${isDone ? "checked" : ""}`}>{isDone && <Check size={13} strokeWidth={3} />}</span>
              <span className="task-text">
                <span className="task-plant">{t.plant.nazwa_pl}</span>
                <span className="task-variety">{t.plant.odmiana}</span>
              </span>
              <span className={`task-tag ${meta.cls}`}>{meta.label}</span>
            </button>
            {hasSegments && (
              <div className="hint-text" style={{ marginLeft: 30, marginTop: -4, marginBottom: 4 }}>
                Masz w tym oknie: {t.segments.map((s) => `${s.ilosc} szt. ${containerLabel(s.container)}${s.location ? ` (${s.location})` : ""} — partia ${s.resolvedBatchLabel}`).join("; ")}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
