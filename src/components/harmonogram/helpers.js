

import { batchLabel } from "../magazyn/PartiePanel";

export function buildMonthTasks(plants, month, batchSegments, batches) {
  const tasks = [];
  plants.forEach((p) => {
    if (p.ciecie_months.includes(month)) tasks.push({ plant: p, type: p.special ? "pielegnacja" : "ciecie" });
    if (p.podzial_months.includes(month)) {
      // ROADMAPA (SHOULD HAVE, pkt 7): dla zadania "Podział" dociągamy realne
      // aktywne segmenty tej odmiany — zamiast czysto gatunkowego przypomnienia
      // ("Ice Dance dzieli się w kwietniu") pokazujemy KONKRETNE partie, które
      // faktycznie masz i które wchodzą w to okno. Brak śledzonych segmentów
      // (stary flow / towar "gołe") nie jest błędem — zadanie i tak się
      // pokazuje, tylko bez listy partii pod spodem. Etykieta partii ("#N")
      // rozwiązywana od razu tutaj (mamy tu `batches`), żeby TaskList nie
      // musiał znać całej tablicy partii.
      const segments = (batchSegments || [])
        .filter((s) => s.plantId === p.id && s.status === "aktywny" && Number(s.ilosc || 0) > 0)
        .map((s) => ({ ...s, resolvedBatchLabel: batchLabel((batches || []).find((b) => b.id === s.batchId)) }));
      tasks.push({ plant: p, type: "podzial", segments });
    }
  });
  return tasks;
}
export const TASK_META = {
  ciecie: { label: "Cięcie", cls: "tag-ciecie" },
  podzial: { label: "Podział", cls: "tag-podzial" },
  pielegnacja: { label: "Pielęgnacja", cls: "tag-pielegnacja" },
};

export function tasksForMonth(tasks, year, month) {
  return tasks.filter((t) => {
    if (!t.date) return false;
    const parts = t.date.split("-");
    return Number(parts[0]) === year && Number(parts[1]) === month;
  });
}
