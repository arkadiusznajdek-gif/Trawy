import test from "node:test";
import assert from "node:assert/strict";
import { PLANTS } from "../src/data/plants.js";
import { calculatePlantRowArea, calculatePlantingArea, estimatePlantingQuantity, getPlantMoistureClass, getPlantSpreadMeters, getRemainingBedWidth, getPlantStock, plantFitsBedWidth, recommendPlants } from "../src/utils/planerRabaty.js";

test("recommendations match sun and partial shade from plant descriptions", () => {
  const sunny = recommendPlants(PLANTS, { light: "slonce" });
  const partial = recommendPlants(PLANTS, { light: "polcien" });

  assert.ok(sunny.length > 0);
  assert.ok(sunny.every((plant) => /słońce/i.test(plant.stanowisko)));
  assert.ok(partial.length > 0);
  assert.ok(partial.every((plant) => /półcień/i.test(plant.stanowisko)));
});

test("moisture filtering distinguishes dry, ordinary, wet, and flexible grasses", () => {
  const dry = PLANTS.find((plant) => plant.odmiana.includes("Pony Tails"));
  const wet = PLANTS.find((plant) => plant.odmiana.includes("giganteus"));
  const flexible = PLANTS.find((plant) => plant.odmiana.includes("Northwind"));
  const dryPicks = recommendPlants(PLANTS, { moisture: "dry" });
  const wetPicks = recommendPlants(PLANTS, { moisture: "wet" });

  assert.equal(getPlantMoistureClass(dry), "dry");
  assert.equal(getPlantMoistureClass(wet), "wet");
  assert.equal(getPlantMoistureClass(flexible), "flexible");
  assert.ok(dryPicks.some((plant) => plant.id === dry.id));
  assert.ok(dryPicks.some((plant) => plant.id === flexible.id));
  assert.ok(wetPicks.some((plant) => plant.id === wet.id));
  assert.ok(wetPicks.some((plant) => plant.id === flexible.id));
  assert.ok(!wetPicks.some((plant) => plant.id === dry.id));
});

test("planting quantities scale the catalog density to the requested area", () => {
  const plant = {
    gestosc_m2_min: 2,
    gestosc_m2_max: 3,
    gestosc_brak: false,
  };

  assert.deepEqual(estimatePlantingQuantity(4, plant), { min: 8, max: 12 });
  assert.equal(estimatePlantingQuantity(0, plant), null);
  assert.equal(estimatePlantingQuantity(4, { gestosc_brak: true }), null);
});

test("linear dimensions convert to square meters for planting estimates", () => {
  assert.equal(calculatePlantingArea({ mode: "linear", lengthM: 8, widthM: 1.5 }), 12);
  assert.equal(calculatePlantingArea({ mode: "linear", lengthM: 8, widthM: 0 }), 0);
  assert.equal(calculatePlantingArea({ mode: "area", areaM2: 6 }), 6);
  assert.deepEqual(
    estimatePlantingQuantity(calculatePlantingArea({ mode: "linear", lengthM: 8, widthM: 1.5 }), {
      gestosc_m2_min: 2,
      gestosc_m2_max: 3,
    }),
    { min: 24, max: 36 }
  );
});

test("plant spread filters varieties using the remaining bed width", () => {
  const giant = PLANTS.find((plant) => plant.odmiana === "Miscanthus giganteus");
  const milos = PLANTS.find((plant) => plant.odmiana.includes("'Milos'"));
  const zebra = PLANTS.find((plant) => plant.odmiana.includes("'Zebrinus'"));
  const compact = { id: "compact", wys_szer: "40–50 / 40–50" };
  const plants = [...PLANTS, compact];
  const rows = [{ rowId: "back", plantId: milos.id }];

  assert.equal(getPlantSpreadMeters(giant), 1.5);
  assert.equal(plantFitsBedWidth(giant, 0.5), false);
  assert.equal(getRemainingBedWidth(2, rows, plants), 1);
  assert.equal(getRemainingBedWidth(2, [{ plantId: milos.id }, { plantId: compact.id }], plants, 0), 1.5);
  assert.equal(getPlantSpreadMeters(zebra), 1.2);
  assert.equal(plantFitsBedWidth(zebra, 1), false);
  assert.equal(plantFitsBedWidth(compact, 1), true);
  assert.equal(plantFitsBedWidth(giant, 2), true);
  assert.equal(plantFitsBedWidth({ wys_szer: "300 / Duża" }, 2), false);
  assert.equal(plantFitsBedWidth(zebra, 1.3), true);
  assert.equal(calculatePlantRowArea(5, 2, milos), 2.5);
});

test("recommendations can be restricted to plants with stock", () => {
  const plants = [
    { id: "available", nazwa_pl: "A", wys_szer: "100 / 50", stanowisko: "Słońce", gestosc_m2_min: 1, gestosc_m2_max: 2 },
    { id: "empty", nazwa_pl: "B", wys_szer: "80 / 40", stanowisko: "Słońce", gestosc_m2_min: 1, gestosc_m2_max: 2 },
  ];
  const inventory = { available: { P9: 3, C3: 2 }, empty: { P9: 0 } };
  const filtered = recommendPlants(plants, { light: "slonce", onlyInStock: true, inventory });

  assert.deepEqual(filtered.map((plant) => plant.id), ["available"]);
  assert.equal(filtered[0].availableStock, 5);
  assert.equal(getPlantStock(inventory, "empty"), 0);
});
