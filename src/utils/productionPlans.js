import { uid } from "./helpers";

/*
 * ROADMAPA (SHOULD HAVE, pkt 6): planowanie produkcji. Celowo CAŁKOWICIE
 * oddzielone od modelu Batch/BatchSegment — plan to tylko notatka "zamierzam
 * w kwietniu podzielić Segment X, spodziewam się ~500 nowych sztuk", nie
 * rezerwacja ani operacja. Nie zmienia inventory/costs/segmentów. Realne
 * wykonanie nadal dzieje się przez istniejący ekran Podział — plan tylko
 * ręcznie oznaczany jako "wykonany" po fakcie (świadomie bez automatycznego
 * wykrywania powiązanej operacji, żeby nie komplikować i nie ryzykować
 * błędnego dopasowania).
 */

export const PLAN_STATUS_VALUES = ["planowane", "wykonane", "anulowane"];

export function createProductionPlan({ plantId, sourceSegmentId, targetContainer, targetLocation, expectedQty, plannedYear, plannedMonth, note }) {
  return {
    id: uid("plan"),
    plantId,
    sourceSegmentId: sourceSegmentId || null,
    targetContainer: targetContainer || null,
    targetLocation: targetLocation || null,
    expectedQty: Number(expectedQty || 0),
    plannedYear: Number(plannedYear),
    plannedMonth: Number(plannedMonth),
    note: note || "",
    status: "planowane",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function setPlanStatus(plans, planId, status) {
  if (!PLAN_STATUS_VALUES.includes(status)) return { ok: false, error: "Nieprawidłowy status.", plans };
  const plan = plans.find((p) => p.id === planId);
  if (!plan) return { ok: false, error: "Nie znaleziono planu.", plans };
  const updated = { ...plan, status, updatedAt: new Date().toISOString() };
  return { ok: true, plans: plans.map((p) => (p.id === planId ? updated : p)) };
}

export function plansForMonth(plans, year, month) {
  return plans.filter((p) => p.plannedYear === year && p.plannedMonth === month);
}
