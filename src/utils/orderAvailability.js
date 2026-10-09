export function findOrderShortages(orders, sets, inventory) {
  const demand = new Map();

  function addDemand(plantId, container, quantity) {
    const qty = Number(quantity);
    if (!plantId || !container || !Number.isFinite(qty) || qty <= 0) return;
    const key = `${plantId}\u0000${container}`;
    const current = demand.get(key) || { plantId, container, required: 0 };
    current.required += qty;
    demand.set(key, current);
  }

  (orders || []).filter((order) => order.status !== "zrealizowane").forEach((order) => {
    (order.pozycje || []).forEach((item) => {
      const multiplier = Number(item.ilosc || 0);
      if (item.kind === "plant") {
        addDemand(item.plantId, item.container, multiplier);
      } else if (item.kind === "zestaw") {
        const set = (sets || []).find((candidate) => candidate.id === item.zestawId);
        (set?.pozycje || []).forEach((component) => {
          addDemand(component.plantId, component.container, Number(component.ilosc || 0) * multiplier);
        });
      }
    });
  });

  return [...demand.values()]
    .map((item) => ({
      ...item,
      available: Math.max(0, Number(inventory?.[item.plantId]?.[item.container]) || 0),
      shortage: Math.max(
        0,
        item.required - Math.max(0, Number(inventory?.[item.plantId]?.[item.container]) || 0)
      ),
    }))
    .filter((item) => item.shortage > 0)
    .sort((a, b) => b.shortage - a.shortage);
}
