import test from "node:test";
import assert from "node:assert/strict";
import { findOrderShortages } from "../src/utils/orderAvailability.js";

test("finds aggregate shortages for direct items and set components, excluding fulfilled orders", () => {
  const orders = [
    {
      status: "nowe",
      pozycje: [
        { kind: "plant", plantId: "p1", container: "P9", ilosc: 4 },
        { kind: "zestaw", zestawId: "set-1", ilosc: 2 },
      ],
    },
    { status: "nowe", pozycje: [{ kind: "plant", plantId: "p1", container: "P9", ilosc: 3 }] },
    { status: "zrealizowane", pozycje: [{ kind: "plant", plantId: "p2", container: "C3", ilosc: 20 }] },
  ];
  const sets = [{
    id: "set-1",
    pozycje: [
      { plantId: "p1", container: "P9", ilosc: 2 },
      { plantId: "p2", container: "C3", ilosc: 1 },
    ],
  }];
  const inventory = { p1: { P9: 8 }, p2: { C3: 1 } };

  assert.deepEqual(findOrderShortages(orders, sets, inventory), [
    { plantId: "p1", container: "P9", required: 11, available: 8, shortage: 3 },
    { plantId: "p2", container: "C3", required: 2, available: 1, shortage: 1 },
  ]);
});

test("returns no shortages when pending order needs are covered", () => {
  assert.deepEqual(
    findOrderShortages(
      [{ status: "nowe", pozycje: [{ kind: "plant", plantId: "p1", container: "P9", ilosc: 2 }] }],
      [],
      { p1: { P9: 2 } }
    ),
    []
  );
});
