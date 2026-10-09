const BEZ_LOKALIZACJI = "__bez_lokalizacji__";

export function buildLocationView(inventory = {}, batchSegments = []) {
  const groups = {};

  function ensureGroup(locationKey, locationLabel) {
    if (!groups[locationKey]) groups[locationKey] = { location: locationLabel, rows: [] };
    return groups[locationKey];
  }

  batchSegments
    .filter((segment) => segment.status === "aktywny" && Number(segment.ilosc || 0) > 0)
    .forEach((segment) => {
      const key = segment.location || BEZ_LOKALIZACJI;
      const group = ensureGroup(key, segment.location || null);
      group.rows.push({
        plantId: segment.plantId,
        container: segment.container,
        ilosc: Number(segment.ilosc || 0),
        kosztJednostkowy: Number(segment.kosztJednostkowy || 0),
        batchId: segment.batchId,
        segmentId: segment.id,
        jakosc: segment.jakosc || null,
        kind: "segment",
      });
    });

  const segmentSums = {};
  batchSegments
    .filter((segment) => segment.status === "aktywny")
    .forEach((segment) => {
      segmentSums[segment.plantId] = segmentSums[segment.plantId] || {};
      segmentSums[segment.plantId][segment.container] =
        (segmentSums[segment.plantId][segment.container] || 0) + Number(segment.ilosc || 0);
    });

  Object.entries(inventory).forEach(([plantId, row]) => {
    Object.entries(row || {}).forEach(([container, qty]) => {
      const tracked = Number(segmentSums[plantId]?.[container] || 0);
      const untracked = Number(qty || 0) - tracked;
      if (untracked > 0) {
        const group = ensureGroup(BEZ_LOKALIZACJI, null);
        group.rows.push({
          plantId,
          container,
          ilosc: untracked,
          kosztJednostkowy: null,
          batchId: null,
          segmentId: null,
          kind: "gole",
        });
      }
    });
  });

  const locations = Object.values(groups).map((group) => ({
    ...group,
    totalQty: group.rows.reduce((sum, row) => sum + row.ilosc, 0),
  }));

  locations.sort((a, b) => {
    if (a.location === null) return 1;
    if (b.location === null) return -1;
    return a.location.localeCompare(b.location, "pl");
  });

  return locations;
}

export function knownValueOf(rows) {
  return rows.reduce((sum, row) => (row.kind === "segment" ? sum + row.ilosc * row.kosztJednostkowy : sum), 0);
}

export function buildLocationStockSummary(inventory = {}, batchSegments = []) {
  const locations = buildLocationView(inventory, batchSegments);
  const locationless = locations.find((group) => group.location === null);
  const untrackedQty = locationless
    ? locationless.rows.filter((row) => row.kind === "gole").reduce((sum, row) => sum + row.ilosc, 0)
    : 0;
  const unlocatedTrackedQty = locationless
    ? locationless.rows.filter((row) => row.kind === "segment").reduce((sum, row) => sum + row.ilosc, 0)
    : 0;

  const trackedByPlantContainer = new Map();
  batchSegments
    .filter((segment) => segment.status === "aktywny")
    .forEach((segment) => {
      const key = JSON.stringify([segment.plantId, segment.container]);
      trackedByPlantContainer.set(
        key,
        (trackedByPlantContainer.get(key) || 0) + Number(segment.ilosc || 0)
      );
    });

  const segmentsAboveInventory = [];
  trackedByPlantContainer.forEach((trackedQty, key) => {
    const [plantId, container] = JSON.parse(key);
    const inventoryQty = Number(inventory[plantId]?.[container] || 0);
    if (trackedQty > inventoryQty) {
      segmentsAboveInventory.push({
        plantId,
        container,
        inventoryQty,
        trackedQty,
        difference: trackedQty - inventoryQty,
      });
    }
  });

  return {
    inventoryQty: Object.values(inventory).reduce(
      (total, row) => total + Object.values(row || {}).reduce((sum, qty) => sum + Number(qty || 0), 0),
      0
    ),
    locations: locations.filter((group) => group.location !== null),
    unlocatedTrackedQty,
    untrackedQty,
    segmentsAboveInventory,
  };
}
