import test from "node:test";
import assert from "node:assert/strict";
import { buildLocationStockSummary, buildLocationView } from "../src/utils/locationInventory.js";

test("location stock summary separates located segments, unlocated stock, and untracked inventory", () => {
  const inventory = {
    grassA: { P9: 10, C3: 5 },
    grassB: { C5: 3 },
  };
  const batchSegments = [
    { id: "s1", plantId: "grassA", container: "P9", location: "Kontenerownia A", ilosc: 6, status: "aktywny" },
    { id: "s2", plantId: "grassA", container: "P9", location: null, ilosc: 2, status: "aktywny" },
    { id: "s3", plantId: "grassA", container: "C3", location: "Tunel A", ilosc: 5, status: "aktywny" },
    { id: "s4", plantId: "grassB", container: "C5", location: "Tunel B", ilosc: 9, status: "zamkniety" },
  ];

  const summary = buildLocationStockSummary(inventory, batchSegments);
  assert.equal(summary.inventoryQty, 18);
  assert.deepEqual(
    summary.locations.map(({ location, totalQty }) => [location, totalQty]),
    [["Kontenerownia A", 6], ["Tunel A", 5]]
  );
  assert.equal(summary.unlocatedTrackedQty, 2);
  assert.equal(summary.untrackedQty, 5);
  assert.deepEqual(summary.segmentsAboveInventory, []);

  const noLocation = buildLocationView(inventory, batchSegments).find((group) => group.location === null);
  assert.deepEqual(
    noLocation.rows.map(({ kind, ilosc }) => [kind, ilosc]),
    [["segment", 2], ["gole", 2], ["gole", 3]]
  );
});

test("location stock summary reports active batch quantities exceeding registered inventory", () => {
  const summary = buildLocationStockSummary(
    { grassA: { P9: 4 } },
    [{ id: "s1", plantId: "grassA", container: "P9", location: "Kontenerownia A", ilosc: 7, status: "aktywny" }]
  );

  assert.deepEqual(summary.segmentsAboveInventory, [{
    plantId: "grassA",
    container: "P9",
    inventoryQty: 4,
    trackedQty: 7,
    difference: 3,
  }]);
});
