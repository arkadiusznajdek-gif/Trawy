import { Calendar } from "lucide-react";
import { TASK_STATUS_META } from "../../constants";
import { formatShortDate } from "../../utils/helpers";

export function GeneralTasksForMonth({ tasks, onCycleTask }) {
  if (tasks.length === 0) return null;
  return (
    <div className="task-list" style={{ marginTop: 8 }}>
      {tasks.map((t) => {
        const meta = TASK_STATUS_META[t.status];
        return (
          <div key={t.id} className="task-row custom-row">
            <span className="task-date-badge"><Calendar size={11} /> {formatShortDate(t.date)}</span>
            <button className="task-text-btn" onClick={() => onCycleTask(t.id)}>
              <span className="task-plant">{t.text}</span>
            </button>
            <button className={`task-tag status-tag ${meta.cls}`} onClick={() => onCycleTask(t.id)}>{meta.label}</button>
          </div>
        );
      })}
    </div>
  );
}
