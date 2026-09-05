import { useState } from "react";
import { Calendar, ChevronDown, ChevronRight, ClipboardCheck } from "lucide-react";
import { MONTHS } from "../../constants";
import { monthKey } from "../../utils/helpers";
import { buildMonthTasks, tasksForMonth } from "./helpers";
import { TaskList } from "./TaskList";
import { CustomTaskBlock } from "./CustomTaskBlock";
import { GeneralTasksForMonth } from "./GeneralTasksForMonth";

export function HarmonogramTab({ plants, done, setDone, customTasks, setCustomTasks, tasks, onCycleTask, batchSegments, batches }) {
  const now = new Date();
  const curMonth = now.getMonth() + 1;
  const curYear = now.getFullYear();
  const [expandedMonth, setExpandedMonth] = useState(curMonth);

  function toggleDone(key) { setDone((prev) => ({ ...prev, [key]: !prev[key] })); }
  function addCustomTask(year, month, text) {
    const trimmed = text.trim();
    if (!trimmed) return;
    const key = monthKey(year, month);
    const task = { id: uid("t"), text: trimmed, done: false };
    setCustomTasks((prev) => ({ ...prev, [key]: [...(prev[key] || []), task] }));
  }
  function toggleCustomTask(year, month, id) {
    const key = monthKey(year, month);
    setCustomTasks((prev) => ({ ...prev, [key]: (prev[key] || []).map((t) => (t.id === id ? { ...t, done: !t.done } : t)) }));
  }
  function removeCustomTask(year, month, id) {
    const key = monthKey(year, month);
    setCustomTasks((prev) => ({ ...prev, [key]: (prev[key] || []).filter((t) => t.id !== id) }));
  }

  return (
    <div className="tab-pad">
      <div className="section-title">
        <ClipboardCheck size={17} />
        <span>Ten miesiąc: {MONTHS[curMonth]}</span>
      </div>
      <TaskList tasks={buildMonthTasks(plants, curMonth, batchSegments, batches)} month={curMonth} year={curYear} done={done} onToggle={toggleDone}
        emptyText="Brak zaplanowanych prac cyklicznych w tym miesiącu." />
      <GeneralTasksForMonth tasks={tasksForMonth(tasks, curYear, curMonth)} onCycleTask={onCycleTask} />
      <CustomTaskBlock year={curYear} month={curMonth} tasks={customTasks[monthKey(curYear, curMonth)] || []}
        onAdd={addCustomTask} onToggle={toggleCustomTask} onRemove={removeCustomTask} />

      <div className="section-title" style={{ marginTop: 22 }}>
        <Calendar size={17} />
        <span>Cały rok</span>
      </div>
      <div className="month-accordion">
        {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
          const monthTasks = buildMonthTasks(plants, m, batchSegments, batches);
          const custom = customTasks[monthKey(curYear, m)] || [];
          const generalForMonth = tasksForMonth(tasks, curYear, m);
          const totalCount = monthTasks.length + custom.length + generalForMonth.length;
          const isOpen = expandedMonth === m;
          return (
            <div key={m} className={`month-block ${m === curMonth ? "is-current" : ""}`}>
              <button className="month-head" onClick={() => setExpandedMonth(isOpen ? null : m)}>
                <span>{MONTHS[m]}</span>
                <span className="month-count">{totalCount ? `${totalCount} zad.` : "—"}</span>
                {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </button>
              {isOpen && (
                <>
                  <TaskList tasks={monthTasks} month={m} year={curYear} done={done} onToggle={toggleDone}
                    emptyText="Brak prac cyklicznych w tym miesiącu." compact />
                  <GeneralTasksForMonth tasks={generalForMonth} onCycleTask={onCycleTask} />
                  <CustomTaskBlock year={curYear} month={m} tasks={custom} onAdd={addCustomTask} onToggle={toggleCustomTask} onRemove={removeCustomTask} compact />
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
